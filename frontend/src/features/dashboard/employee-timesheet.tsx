import { useEffect, useMemo, useState } from "react";

import {
  TaskStatus,
  TimerState,
  type Activity,
  type Project,
  type Task,
  type TimeEntry,
} from "@/shared";
import { api } from "@/lib/api";
import { showSuccessToast } from "@/lib/toast";

type EmployeeDashboardResponse = {
  utilizationCards: Array<{ label: string; value: string; helper: string }>;
};

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const statusClassMap: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "timesheet-status timesheet-status--neutral",
  [TaskStatus.WIP]: "timesheet-status timesheet-status--muted",
  [TaskStatus.ON_HOLD]: "timesheet-status timesheet-status--outline",
  [TaskStatus.APPROVAL_PENDING]: "timesheet-status timesheet-status--outline",
  [TaskStatus.REJECTED]: "timesheet-status timesheet-status--danger",
  [TaskStatus.COMPLETED]: "timesheet-status timesheet-status--dark",
};

const statusLabelMap: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "Pending",
  [TaskStatus.WIP]: "WIP",
  [TaskStatus.ON_HOLD]: "On Hold",
  [TaskStatus.APPROVAL_PENDING]: "Approval Pending",
  [TaskStatus.REJECTED]: "Rejected",
  [TaskStatus.COMPLETED]: "Completed",
};

export const EmployeeTimesheetPage = () => {
  const [dashboard, setDashboard] = useState<EmployeeDashboardResponse | null>(
    null,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualLogForm, setShowManualLogForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [manualLog, setManualLog] = useState({
    taskId: "",
    startTimeUtc: "",
    endTimeUtc: "",
    description: "",
    reason: "",
  });

  const load = async () => {
    const [
      dashboardData,
      projectsData,
      activitiesData,
      tasksData,
      entriesData,
    ] = await Promise.all([
      api<EmployeeDashboardResponse>("/analytics/dashboard"),
      api<Project[]>("/projects"),
      api<Activity[]>("/activities"),
      api<Task[]>("/tasks"),
      api<TimeEntry[]>("/time-tracking/entries"),
    ]);
    const runningEntryData =
      entriesData.find((entry) => entry.timerState === TimerState.RUNNING) ??
      null;

    setDashboard(dashboardData);
    setProjects(projectsData);
    setActivities(activitiesData);
    setTasks(tasksData);
    setEntries(entriesData);
    const nextDefaultTaskId =
      tasksData.find((task) => task.id === runningEntryData?.taskId)?.id ??
      tasksData.find((task) => task.id === selectedTaskId)?.id ??
      tasksData[0]?.id ??
      "";

    setSelectedTaskId((current) => {
      if (current && tasksData.some((task) => task.id === current)) {
        return current;
      }

      return nextDefaultTaskId;
    });
    setManualLog((current) => ({
      ...current,
      taskId:
        current.taskId ||
        tasksData.find((task) => task.status !== TaskStatus.COMPLETED)?.id ||
        "",
    }));
  };

  useEffect(() => {
    void load();
  }, []);

  const runningEntry = useMemo(
    () =>
      entries.find((entry) => entry.timerState === TimerState.RUNNING) ?? null,
    [entries],
  );

  const runningTask = useMemo(
    () => tasks.find((task) => task.id === runningEntry?.taskId) ?? null,
    [tasks, runningEntry],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const currentActionTask = selectedTask ?? runningTask ?? null;

  const selectedTaskEntries = useMemo(
    () => entries.filter((entry) => entry.taskId === currentActionTask?.id),
    [currentActionTask?.id, entries],
  );

  const selectedTaskRunningEntry = useMemo(
    () =>
      selectedTaskEntries.find(
        (entry) => entry.timerState === TimerState.RUNNING,
      ) ?? null,
    [selectedTaskEntries],
  );

  const selectedTaskIsRunning = Boolean(selectedTaskRunningEntry);

  const selectedTaskTotalSeconds = useMemo(
    () =>
      selectedTaskEntries.reduce(
        (sum, entry) =>
          sum + (entry.durationSeconds ?? entry.durationMinutes * 60),
        0,
      ),
    [selectedTaskEntries],
  );

  const selectedTaskPreviouslyLoggedSeconds = useMemo(
    () =>
      selectedTaskEntries
        .filter((entry) => entry.id !== selectedTaskRunningEntry?.id)
        .reduce(
          (sum, entry) =>
            sum + (entry.durationSeconds ?? entry.durationMinutes * 60),
          0,
        ),
    [selectedTaskEntries, selectedTaskRunningEntry?.id],
  );

  const canStartTask =
    Boolean(currentActionTask) &&
    !runningEntry &&
    currentActionTask?.status !== TaskStatus.APPROVAL_PENDING &&
    currentActionTask?.status !== TaskStatus.COMPLETED;

  const canRequestCompletion =
    Boolean(currentActionTask) &&
    currentActionTask?.status !== TaskStatus.PENDING &&
    currentActionTask?.status !== TaskStatus.WIP &&
    currentActionTask?.status !== TaskStatus.APPROVAL_PENDING &&
    currentActionTask?.status !== TaskStatus.COMPLETED;

  const canStartFromCard =
    Boolean(currentActionTask) &&
    !runningEntry &&
    currentActionTask?.status !== TaskStatus.APPROVAL_PENDING &&
    currentActionTask?.status !== TaskStatus.COMPLETED;

  const startableTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === TaskStatus.PENDING ||
          task.status === TaskStatus.ON_HOLD ||
          task.status === TaskStatus.REJECTED,
      ),
    [tasks],
  );

  const getProjectName = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name ?? projectId;

  const getActivityName = (activityId: string) =>
    activities.find((activity) => activity.id === activityId)?.name ??
    activityId;

  useEffect(() => {
    if (!currentActionTask) {
      setElapsedSeconds(0);
      return;
    }

    const compute = () => {
      if (!selectedTaskRunningEntry) {
        setElapsedSeconds(selectedTaskTotalSeconds);
        return;
      }

      const startMs = new Date(selectedTaskRunningEntry.startTimeUtc).getTime();
      const storedSeconds =
        selectedTaskRunningEntry.durationSeconds ??
        selectedTaskRunningEntry.durationMinutes * 60;
      const liveSeconds = Math.max(
        0,
        Math.floor((Date.now() - startMs) / 1000),
      );
      setElapsedSeconds(
        selectedTaskPreviouslyLoggedSeconds +
          Math.max(storedSeconds, liveSeconds),
      );
    };

    compute();
    const timerId = window.setInterval(compute, 1000);
    return () => window.clearInterval(timerId);
  }, [
    currentActionTask?.id,
    selectedTaskRunningEntry?.id,
    selectedTaskTotalSeconds,
    selectedTaskPreviouslyLoggedSeconds,
  ]);

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [selectedTaskId, tasks]);

  return (
    <div className="timesheet-page">
      <div className="timesheet-section-header">
        <h2>Work Log Summary</h2>
        <div className="timesheet-action-row">
          <select
            className="timesheet-task-select"
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
          >
            <option value="">Select Task</option>
            {startableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {getProjectName(task.projectId)} |{" "}
                {getActivityName(task.activityId)} | {task.title}
              </option>
            ))}
          </select>
          {canStartTask ? (
            <button
              className="timesheet-primary-button"
              onClick={() => {
                setSelectedTaskId(currentActionTask!.id);
                return void api(`/tasks/${currentActionTask!.id}/start-timer`, {
                  method: "POST",
                }).then(() => {
                  showSuccessToast("Timer started");
                  return load();
                });
              }}
              type="button"
            >
              Start Task
            </button>
          ) : null}
          <button
            className="timesheet-secondary-button"
            onClick={() => setShowManualLogForm((current) => !current)}
            type="button"
          >
            + Log Manually
          </button>
        </div>
      </div>

      {currentActionTask ? (
        <section className="timesheet-timer-card">
          <div className="timesheet-timer-meta">
            <div
              className={`timesheet-dot ${selectedTaskIsRunning ? "timesheet-dot--active" : ""}`}
            />
            <span className="timesheet-label">
              {selectedTaskIsRunning ? "Active Timer" : "Selected Task"}
            </span>
          </div>
          <div className="timesheet-timer-grid">
            <div>
              <h3>{getProjectName(currentActionTask.projectId)}</h3>
              <p className="timesheet-secondary-meta">
                {getActivityName(currentActionTask.activityId)}
              </p>
              <p className="timesheet-inline-meta">
                <span>Task: {currentActionTask.title}</span>
                <span>|</span>
                <span>
                  Status:{" "}
                  <span className={statusClassMap[currentActionTask.status]}>
                    {statusLabelMap[currentActionTask.status]}
                  </span>
                </span>
              </p>
            </div>
            <div className="timesheet-running-time">
              {formatDuration(elapsedSeconds)}
            </div>
            <div className="timesheet-timer-actions">
              {selectedTaskIsRunning ? (
                <div className="timesheet-button-inline">
                  <button
                    className="timesheet-secondary-button"
                    onClick={() =>
                      void api(
                        `/tasks/${currentActionTask.id}/timer-transition`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            timerState: TimerState.PAUSED,
                          }),
                        },
                      ).then(() => {
                        showSuccessToast("Timer paused");
                        return load();
                      })
                    }
                    type="button"
                  >
                    Pause
                  </button>
                  <button
                    className="timesheet-primary-button"
                    onClick={() =>
                      void api(
                        `/tasks/${currentActionTask.id}/timer-transition`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            timerState: TimerState.STOPPED,
                          }),
                        },
                      ).then(() => {
                        showSuccessToast("Timer stopped");
                        return load();
                      })
                    }
                    type="button"
                  >
                    Stop
                  </button>
                </div>
              ) : canStartFromCard ? (
                <button
                  className="timesheet-primary-button"
                  onClick={() => {
                    setSelectedTaskId(currentActionTask.id);
                    return void api(
                      `/tasks/${currentActionTask.id}/start-timer`,
                      { method: "POST" },
                    ).then(() => {
                      showSuccessToast("Work resumed");
                      return load();
                    });
                  }}
                  type="button"
                >
                  {currentActionTask.status === TaskStatus.ON_HOLD
                    ? "Resume"
                    : "Start Timer"}
                </button>
              ) : null}
              {canRequestCompletion ? (
                <button
                  className="timesheet-secondary-button"
                  onClick={() =>
                    void api(`/tasks/${currentActionTask.id}/request-completion`, {
                      method: "POST",
                    }).then(() => {
                      showSuccessToast("Completion request submitted");
                      return load();
                    })
                  }
                  type="button"
                >
                  Mark Completed
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showManualLogForm ? (
        <section className="timesheet-manual-card">
          <form
            className="timesheet-manual-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await api(`/tasks/${manualLog.taskId}/manual-log`, {
                method: "POST",
                body: JSON.stringify({
                  ...manualLog,
                  startTimeUtc: new Date(manualLog.startTimeUtc).toISOString(),
                  endTimeUtc: new Date(manualLog.endTimeUtc).toISOString(),
                }),
              });
              showSuccessToast("Manual log request submitted");
              setManualLog({
                taskId: currentActionTask?.id ?? "",
                startTimeUtc: "",
                endTimeUtc: "",
                description: "",
                reason: "",
              });
              setShowManualLogForm(false);
              await load();
            }}
          >
            <select
              className="input"
              value={manualLog.taskId}
              onChange={(event) =>
                setManualLog((current) => ({
                  ...current,
                  taskId: event.target.value,
                }))
              }
            >
              <option value="">Select task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="datetime-local"
              value={manualLog.startTimeUtc}
              onChange={(event) =>
                setManualLog((current) => ({
                  ...current,
                  startTimeUtc: event.target.value,
                }))
              }
            />
            <input
              className="input"
              type="datetime-local"
              value={manualLog.endTimeUtc}
              onChange={(event) =>
                setManualLog((current) => ({
                  ...current,
                  endTimeUtc: event.target.value,
                }))
              }
            />
            <input
              className="input"
              placeholder="Description"
              value={manualLog.description}
              onChange={(event) =>
                setManualLog((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <input
              className="input"
              placeholder="Reason for approval"
              value={manualLog.reason}
              onChange={(event) =>
                setManualLog((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
            <button className="timesheet-primary-button" type="submit">
              Submit Manual Log
            </button>
          </form>
        </section>
      ) : null}

      <section className="timesheet-entries-section">
        <h3>
          Today's Entries —{" "}
          {new Intl.DateTimeFormat("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </h3>
        <div style={{ paddingTop: "10px" }}></div>
        <div className="timesheet-table-card">
          <table className="timesheet-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Activity</th>
                <th>Task</th>
                <th>Logged Time</th>
                <th>Status</th>
                <th>Comments</th>
                <th>Timer</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const taskEntries = entries.filter(
                  (entry) => entry.taskId === task.id,
                );
                const totalSeconds = taskEntries.reduce(
                  (sum, entry) =>
                    sum + (entry.durationSeconds ?? entry.durationMinutes * 60),
                  0,
                );
                return (
                  <tr
                    key={task.id}
                    className={`timesheet-table-row ${selectedTaskId === task.id ? "timesheet-table-row--selected" : ""}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <td className="timesheet-strong-cell">
                      {getProjectName(task.projectId)}
                    </td>
                    <td>{getActivityName(task.activityId)}</td>
                    <td>{task.title}</td>
                    <td>{formatDuration(totalSeconds)}</td>
                    <td>
                      <span className={statusClassMap[task.status]}>
                        {statusLabelMap[task.status]}
                      </span>
                    </td>
                    <td className="timesheet-comment-cell">
                      {task.description.length > 26
                        ? `${task.description.slice(0, 26)}...`
                        : task.description}
                    </td>
                    <td>
                      {runningEntry?.taskId === task.id ? (
                        <span className="timesheet-status timesheet-status--success">
                          Active Timer
                        </span>
                      ) : (
                        <span className="timesheet-status timesheet-status--ghost">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="timesheet-utilization">
        <h3>My Utilization Summary</h3>
        <div className="timesheet-kpi-grid">
          {(dashboard?.utilizationCards ?? []).map((stat) => {
            const numericValue = Number.parseInt(
              stat.value.replace("%", ""),
              10,
            );
            return (
              <div key={stat.label} className="timesheet-kpi-card">
                <span className="timesheet-kpi-label">{stat.label}</span>
                <strong className="timesheet-kpi-value">{stat.value}</strong>
                <p>{stat.helper}</p>
                {Number.isNaN(numericValue) ? null : (
                  <div className="timesheet-progress-track">
                    <div
                      className="timesheet-progress-fill"
                      style={{ width: `${numericValue}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
