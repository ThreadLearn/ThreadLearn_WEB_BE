import { NextResponse } from 'next/server';

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
    statusCode = 200,
  }: {
    message?: string;
    data?: T;
    meta?: any;
    statusCode?: number;
  }): NextResponse<ApiResponsePayload<T>> {
    return NextResponse.json(
      {
        success: true,
        message,
        data,
        meta,
      },
      { status: statusCode }
    );
  }

  static error({
    message = 'An error occurred',
    errors = null,
    statusCode = 500,
  }: {
    message?: string;
    errors?: any[] | null;
    statusCode?: number;
  }): NextResponse<ApiResponsePayload> {
    return NextResponse.json(
      {
        success: false,
        message,
        errors,
      },
      { status: statusCode }
    );
  }
}
export default ApiResponse;
