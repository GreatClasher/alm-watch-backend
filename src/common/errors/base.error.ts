/**
 * Base error class for all typed domain errors.
 * Never throw plain `new Error('string')` — use a typed subclass instead.
 *
 * Usage:
 *   class DeviceNotFoundError extends BaseError {
 *     constructor(deviceId: string) {
 *       super('Device not found', { deviceId });
 *       this.name = 'DeviceNotFoundError';
 *     }
 *   }
 */
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
