import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";

type ApiErrorPayload = {
  message?: string;
};

type CreateHttpClientOptions = {
  baseURL?: string;
  timeout?: number;
  withCredentials?: boolean;
  onUnauthorized?: () => void;
};

export function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 60_000,
    withCredentials: options.withCredentials ?? false,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        options.onUnauthorized?.();
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

export function getResponseHeader(
  headers: AxiosResponseHeaders | RawAxiosResponseHeaders | undefined,
  headerName: string
) {
  if (!headers) {
    return null;
  }

  const normalizedHeaderName = headerName.toLowerCase();
  const value =
    headers[normalizedHeaderName] ??
    headers[headerName] ??
    headers[headerName.toUpperCase()];

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return typeof value === "string" ? value : null;
}

export async function postJson<TResponse, TBody>(
  client: AxiosInstance,
  url: string,
  body: TBody,
  config?: AxiosRequestConfig<TBody>
) {
  const response = await client.post<TResponse>(url, body, config);
  return response.data;
}

export async function putJson<TResponse, TBody>(
  client: AxiosInstance,
  url: string,
  body: TBody,
  config?: AxiosRequestConfig<TBody>
) {
  const response = await client.put<TResponse>(url, body, config);
  return response.data;
}
