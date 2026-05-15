import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data && 'success' in data && 'statusCode' in data) return data;
        const statusCode = context.switchToHttp().getResponse().statusCode;
        return { success: true, data, message: 'OK', statusCode };
      }),
    );
  }
}
