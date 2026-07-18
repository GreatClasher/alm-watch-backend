import { BaseError } from './base.error';

/**
 * Thrown when packet checksum does not match computed CRC32.
 * Maps to HTTP 422 / WS rejection in the exception filter.
 */
export class PacketValidationError extends BaseError {
  constructor(
    message: string,
    context: Record<string, unknown>,
  ) {
    super(message, context);
    this.name = 'PacketValidationError';
  }
}
