import { IsString, IsNotEmpty, IsDateString, IsObject } from 'class-validator';

export class HealthMetricDto {
  @IsString()
  @IsNotEmpty()
  metricType!: string; // 'heart_rate' | 'steps' | 'sleep' | 'spo2' | 'stress_score'

  @IsObject()
  value!: Record<string, unknown>; // { bpm: 85 } | { count: 1200 } | etc.

  @IsDateString()
  recordedAt!: string; // ISO 8601 string - exact sensor timestamp
}
