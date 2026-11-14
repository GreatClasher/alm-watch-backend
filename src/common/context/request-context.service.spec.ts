import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('should isolate context across concurrent executions', async () => {
    const run1 = service.run({ requestId: 'req-1', traceId: 'trace-1' }, async () => {
      await new Promise((res) => setTimeout(res, 20));
      return {
        req: service.getRequestId(),
        trace: service.getTraceId(),
      };
    });

    const run2 = service.run({ requestId: 'req-2', traceId: 'trace-2' }, async () => {
      await new Promise((res) => setTimeout(res, 10));
      return {
        req: service.getRequestId(),
        trace: service.getTraceId(),
      };
    });

    const [res1, res2] = await Promise.all([run1, run2]);

    expect(res1).toEqual({ req: 'req-1', trace: 'trace-1' });
    expect(res2).toEqual({ req: 'req-2', trace: 'trace-2' });
  });

  it('should allow setting auth context', () => {
    service.run({ requestId: 'req-3', traceId: 'trace-3' }, () => {
      service.setAuthContext('dev-abc', 'user-123');
      expect(service.getDeviceId()).toBe('dev-abc');
      expect(service.getUserId()).toBe('user-123');
    });
  });
});
