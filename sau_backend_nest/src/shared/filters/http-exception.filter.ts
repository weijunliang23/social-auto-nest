import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';

/** 将 401 等 HTTP 异常转为前端兼容的 { code, msg, data } 格式 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const msg =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] }).message ??
          exception.message);

    response.status(status).json({
      code: status,
      msg: Array.isArray(msg) ? msg.join(', ') : msg,
      data: null,
    });
  }
}

export { UnauthorizedException };
