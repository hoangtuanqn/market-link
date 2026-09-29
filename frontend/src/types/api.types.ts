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

export type PageType<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
