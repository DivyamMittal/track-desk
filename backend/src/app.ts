import cors from "cors";
import express from "express";
import morgan from "morgan";

import { errorHandler } from "./common/middleware/error-handler";
import { activitiesRouter } from "./features/activities/presentation/activity-routes";
import { analyticsRouter } from "./features/analytics/presentation/analytics-routes";
import { approvalsRouter } from "./features/approvals/presentation/approval-routes";
import { authRouter } from "./features/auth/presentation/auth-routes";
import { calendarRouter } from "./features/calendar/presentation/calendar-routes";
import { commentsRouter } from "./features/comments/presentation/comment-routes";
import { projectsRouter } from "./features/projects/presentation/project-routes";
import { tasksRouter } from "./features/tasks/presentation/task-routes";
import { timeTrackingRouter } from "./features/time-tracking/presentation/time-tracking-routes";
import { usersRouter } from "./features/users/presentation/user-routes";

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan("dev"));
  app.use(express.json());

  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/projects", projectsRouter);
  app.use("/api/v1/activities", activitiesRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/time-tracking", timeTrackingRouter);
  app.use("/api/v1/approvals", approvalsRouter);
  app.use("/api/v1/comments", commentsRouter);
  app.use("/api/v1/calendar", calendarRouter);
  app.use("/api/v1/analytics", analyticsRouter);

  app.use(errorHandler);

  return app;
};
