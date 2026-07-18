import { AllWsExceptionsFilter } from './ws-exception.filter';
import { WsException } from '@nestjs/websockets';

describe('AllWsExceptionsFilter', () => {
  let filter: AllWsExceptionsFilter;
  let mockClient: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllWsExceptionsFilter();
    mockClient = { emit: jest.fn() };
    mockHost = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: () => mockClient,
      }),
    };
  });

  it('should handle WsException', () => {
    const error = new WsException('WS error');
    filter.catch(error, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('exception', {
      error: expect.objectContaining({
        code: 'WS_ERROR',
        message: 'WS error',
      }),
    });
  });

  it('should handle standard Error', () => {
    const error = new Error('Generic error');
    filter.catch(error, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('exception', {
      error: expect.objectContaining({
        code: 'WS_ERROR',
        message: 'Generic error',
      }),
    });
  });
});
