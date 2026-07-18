/**
 * Response DTO for POST /v1/devices/register
 * Returns device ID, signed JWT token, and expiration timestamp.
 */
export class RegisterDeviceResponseDto {
  readonly deviceId!: string;
  readonly token!: string;
  readonly expiresAt!: string; // ISO-8601
}
