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
    statusCode: _statusCode = 500,
  }: {
    message?: string;
    errors?: any[] | null;
    statusCode?: number;
  }): ApiResponsePayload {
    return {
      success: false,
      message,
      errors,
    };
  }
}
export default ApiResponse;
