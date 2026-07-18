import { BaseError } from './base.error';

/**
 * Thrown when a device serial is already registered.
 * Maps to HTTP 409 in the exception filter.
 */
export class DeviceAlreadyRegisteredError extends BaseError {
  constructor(deviceSerial: string) {
    super(`Device already registered: ${deviceSerial}`, { deviceSerial });
    this.name = 'DeviceAlreadyRegisteredError';
  }
}
