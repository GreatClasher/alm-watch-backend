import { LoggingInterceptor } from './logging.interceptor';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: any;
  let mockContext: any;
  let mockNext: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    interceptor = new LoggingInterceptor(logger);

    req = { method: 'GET', url: '/test' };
    res = { statusCode: 200 };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => req,
        getResponse: () => res,
      }),
    };

    mockNext = {
      handle: jest.fn(),
    };
  });

  it('should log success', (done) => {
    mockNext.handle.mockReturnValue(of('response'));

    interceptor.intercept(mockContext, mockNext).subscribe({
      next: () => {
        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET', url: '/test', statusCode: 200 }),
          'HTTP request completed'
        );
        done();
      },
    });
  });

  it('should log error', (done) => {
    mockNext.handle.mockReturnValue(throwError(() => new Error('test err')));

    interceptor.intercept(mockContext, mockNext).subscribe({
      error: () => {
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET', url: '/test', error: 'test err' }),
          'HTTP request failed'
        );
        done();
      },
    });
  });
});
