export class ResponseDto<T = any> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;

  static ok<T>(data: T, message = 'OK', statusCode = 200): ResponseDto<T> {
    return { success: true, data, message, statusCode };
  }

  static created<T>(data: T, message = 'Created'): ResponseDto<T> {
    return { success: true, data, message, statusCode: 201 };
  }

  static error(message: string, statusCode = 400): ResponseDto<null> {
    return { success: false, data: null, message, statusCode };
  }
}
