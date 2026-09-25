/** Envelope every backend endpoint returns (backend: resources/ApiResource.java). */
export type FieldErrorType = {
  field: string;
  message: string;
};

export type ErrorType = {
  code: string;
  details: FieldErrorType[];
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: ErrorType;
  traceId?: string;
  timestamp: string;
};

/** Shape of a paginated `data` (backend: resources/PageResource.java). */
export type PageType<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
