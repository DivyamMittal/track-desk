import { clearAccessToken, getAccessToken } from "@/features/auth/session";
import { showErrorToast } from "@/lib/toast";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const api = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  try {
    const token = getAccessToken();
    const headers = new Headers(init.headers);

    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new ApiError(data.message ?? "Request failed", response.status, data.details);
      if (response.status === 401) {
        clearAccessToken();
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
      showErrorToast(error.message);
      throw error;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Network request failed";
    showErrorToast(message);
    throw error;
  }
};
