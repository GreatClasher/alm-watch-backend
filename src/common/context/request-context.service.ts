import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
  traceId: string;
  deviceId?: string;
  userId?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly als = new AsyncLocalStorage<RequestContextStore>();

  run<T>(store: RequestContextStore, fn: () => T): T {
    return RequestContextService.als.run(store, fn);
  }

  getStore(): RequestContextStore | undefined {
    return RequestContextService.als.getStore();
  }

  getRequestId(): string | undefined {
    return this.getStore()?.requestId;
  }

  getTraceId(): string | undefined {
    return this.getStore()?.traceId;
  }

  getDeviceId(): string | undefined {
    return this.getStore()?.deviceId;
  }

  getUserId(): string | undefined {
    return this.getStore()?.userId;
  }

  setAuthContext(deviceId: string, userId: string): void {
    const store = this.getStore();
    if (store) {
      store.deviceId = deviceId;
      store.userId = userId;
    }
  }
}
