import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { RequestContextService } from '../context/request-context.service';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let contextService: RequestContextService;

  beforeEach(() => {
    contextService = new RequestContextService();
    middleware = new CorrelationIdMiddleware(contextService);
  });

  it('generates UUIDv4 and sets traceId equal to requestId when headers are omitted', (done) => {
    const req: any = { headers: {} };
    const headers: Record<string, string> = {};
    const res: any = {
      setHeader: jest.fn((k, v) => {
        headers[k] = v;
      }),
      on: jest.fn(),
    };

    middleware.use(req, res, () => {
      expect(headers['X-Request-Id']).toBeDefined();
      expect(contextService.getRequestId()).toBe(headers['X-Request-Id']);
      expect(contextService.getTraceId()).toBe(headers['X-Request-Id']);
      done();
    });
  });

  it('preserves existing X-Request-Id', (done) => {
    const req: any = { headers: { 'x-request-id': 'client-trace-999' } };
    const headers: Record<string, string> = {};
    const res: any = {
      setHeader: jest.fn((k, v) => {
        headers[k] = v;
      }),
      on: jest.fn(),
    };

    middleware.use(req, res, () => {
      expect(headers['X-Request-Id']).toBe('client-trace-999');
      expect(contextService.getRequestId()).toBe('client-trace-999');
      done();
    });
  });

  it('extracts 32-hex trace ID from W3C traceparent', (done) => {
    const req: any = {
      headers: {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      },
    };
    const headers: Record<string, string> = {};
    const res: any = {
      setHeader: jest.fn((k, v) => {
        headers[k] = v;
      }),
      on: jest.fn(),
    };

    middleware.use(req, res, () => {
      expect(contextService.getTraceId()).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      done();
    });
  });
});
