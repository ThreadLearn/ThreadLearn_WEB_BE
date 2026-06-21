export interface ApiResponsePayload<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
  code?: string;
  errors?: any[] | null;
}

export class ApiResponse {
  static success<T = any>({
    message = 'Success',
    data,
    meta,
    statusCode: _statusCode = 200,
  }: {
    message?: string;
    data?: T;
    meta?: any;
    statusCode?: number;
  }): ApiResponsePayload<T> {
    return {
      success: true,
      message,
      data,
      meta,
    };
  }

  static error({
    message = 'An error occurred',
    errors = null,
    code,
    statusCode: _statusCode = 500,
  }: {
    message?: string;
    errors?: any[] | null;
    code?: string;
    statusCode?: number;
  }): ApiResponsePayload {
    return {
      success: false,
      message,
      code,
      errors,
    };
  }
}
export default ApiResponse;
