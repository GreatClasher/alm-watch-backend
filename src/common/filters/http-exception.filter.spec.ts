import { AllHttpExceptionsFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('AllHttpExceptionsFilter', () => {
  let filter: AllHttpExceptionsFilter;
  let mockRequest: any;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllHttpExceptionsFilter();
    mockRequest = { headers: { 'x-request-id': '123' } };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should handle HttpException with string message', () => {
    const error = new HttpException('Bad req', HttpStatus.BAD_REQUEST);
    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'INVALID_REQUEST',
        message: 'Bad req',
      }),
    });
  });

  it('should handle HttpException with object response', () => {
    const error = new HttpException({ message: 'Missing field' }, HttpStatus.UNAUTHORIZED);
    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'Missing field',
      }),
    });
  });

  it('should handle HttpException with array message', () => {
    const error = new HttpException({ message: ['err1', 'err2'] }, HttpStatus.NOT_FOUND);
    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'NOT_FOUND',
        message: 'err1, err2',
      }),
    });
  });

  it('should handle generic errors as 500', () => {
    const error = new Error('Random error');
    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      }),
    });
  });
});
