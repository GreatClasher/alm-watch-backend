import { BaseError } from './base.error';

/**
 * Thrown when a session ID is not found in the database.
 * Maps to HTTP 404 in the exception filter.
 */
export class SessionNotFoundError extends BaseError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, { sessionId });
    this.name = 'SessionNotFoundError';
  }
}
