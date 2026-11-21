import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import type { ApiError } from "@/types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // MANDATORY: send and receive HTTP-only session cookies
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return data.message;
    }
    if (error.response?.status === 401) {
      return "Session expired or invalid credentials.";
    }
    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.response?.status === 404) {
      return "The requested resource was not found.";
    }
    if (error.response?.status === 409) {
      return "Conflict: Action violates a business rule.";
    }
    if (error.response?.status === 413) {
      return "File is too large (maximum allowed is 10 MB).";
    }
    if (error.response?.status === 415) {
      return "Unsupported file type.";
    }
    if (error.response?.status === 429) {
      return "Too many requests. Please wait a minute and try again.";
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;

    if (status === 429) {
      toast.error("Rate Limit Exceeded", {
        description: "Too many attempts. Please slow down and wait a minute.",
      });
    }

    return Promise.reject(error);
  }
);
