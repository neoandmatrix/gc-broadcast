import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  BadRequestException,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { MongooseError } from 'mongoose';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    if (exception instanceof MongooseError) {
      const error = new BadRequestException(exception);

      return response.status(error.getStatus()).json(error.getResponse());
    }

    console.error(exception);

    response.status(500).json({
      statusCode: 500,
      timestamp: new Date().toISOString(),
      error: {
        name: exception.name,
        message: exception.message || 'Internal Server Error',
        // todo: remove stack in production
        stack: exception.stack,
      },
      path: request.url,
    });
  }
}