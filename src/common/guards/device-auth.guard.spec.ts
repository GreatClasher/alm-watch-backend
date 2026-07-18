import { DeviceAuthGuard } from './device-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('DeviceAuthGuard', () => {
  let guard: DeviceAuthGuard;
  let logger: any;
  let jwtService: any;

  beforeEach(() => {
    logger = { warn: jest.fn() };
    jwtService = { verify: jest.fn() };

    guard = new DeviceAuthGuard(logger, jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should validate HTTP request', () => {
      const request = { headers: { authorization: 'Bearer valid-token' } } as any;
      const context = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jwtService.verify.mockReturnValue({ sub: '1', deviceId: 'dev1', userId: 'user1' });

      expect(guard.canActivate(context)).toBe(true);
      expect(request.deviceId).toBe('dev1');
    });

    it('should throw UnauthorizedException if HTTP header missing', () => {
      const request = { headers: {} } as any;
      const context = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw if token invalid', () => {
      const request = { headers: { authorization: 'Bearer invalid-token' } } as any;
      const context = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw if payload shape invalid', () => {
      const request = { headers: { authorization: 'Bearer valid-token' } } as any;
      const context = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      jwtService.verify.mockReturnValue({ sub: '1', userId: 'user1' }); // missing deviceId

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should validate WS request', () => {
      const client = { handshake: { auth: { token: 'valid-token' } }, data: {}, disconnect: jest.fn() } as any;
      const context = {
        getType: jest.fn().mockReturnValue('ws'),
        switchToWs: jest.fn().mockReturnValue({
          getClient: () => client,
        }),
      } as unknown as ExecutionContext;

      jwtService.verify.mockReturnValue({ sub: '1', deviceId: 'dev1', userId: 'user1' });

      expect(guard.canActivate(context)).toBe(true);
      expect(client.data.deviceId).toBe('dev1');
    });

    it('should throw and disconnect WS if token missing', () => {
      const client = { handshake: { auth: {} }, data: {}, disconnect: jest.fn() } as any;
      const context = {
        getType: jest.fn().mockReturnValue('ws'),
        switchToWs: jest.fn().mockReturnValue({
          getClient: () => client,
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });
});
