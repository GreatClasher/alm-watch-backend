import { BaseError } from './base.error';

/**
 * Thrown when a device ID is not found in the database.
 * Maps to HTTP 404 in the exception filter.
 */
export class DeviceNotFoundError extends BaseError {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`, { deviceId });
    this.name = 'DeviceNotFoundError';
  }
}
