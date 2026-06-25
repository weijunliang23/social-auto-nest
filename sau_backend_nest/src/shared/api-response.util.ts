export interface ApiResponse<T = unknown> {
  code: number;
  msg: string | null;
  data: T | null;
}

export function apiOk<T>(data: T, msg: string | null = null): ApiResponse<T> {
  return { code: 200, msg, data };
}

export function apiErr<T = unknown>(code: number, msg: string): ApiResponse<T> {
  return { code, msg, data: null };
}
