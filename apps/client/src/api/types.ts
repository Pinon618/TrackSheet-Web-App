// Mirror of the server's consistent response envelope

export interface ApiOk<T> {
  success: true;
  data: T;
}

export interface ApiErr {
  success: false;
  error: string;
  errors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: { field: string; message: string }[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toFieldErrors(
  errors: { field: string; message: string }[] | undefined
): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {};
  for (const err of errors ?? []) {
    if (!fieldErrors[err.field]) fieldErrors[err.field] = err.message;
  }
  return fieldErrors;
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

// Query param shapes used by list endpoints
export interface OrderListParams {
  supplier?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaymentListParams {
  invoiceSerial?: string;
  page?: number;
  limit?: number;
}

export interface SupplierListParams {
  search?: string;
}
