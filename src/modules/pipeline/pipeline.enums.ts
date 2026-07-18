export enum TargetLayer {
  OBSERVATION = 'observation',
  EPISODE = 'episode',
  MEMORY = 'memory'
}

export enum PipelineStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
