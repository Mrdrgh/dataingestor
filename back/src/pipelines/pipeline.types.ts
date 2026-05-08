export type IngestionMode = 'full' | 'incremental';
export type DestinationMode = 'overwrite' | 'append';

export interface PipelineSource {
  schema: string;
  table: string;
  columns?: string[];
}

export interface PipelineIngestion {
  mode: IngestionMode;
  watermarkColumn?: string;
}

export interface PipelineDestination {
  path: string;
  mode: DestinationMode;
}

export interface PipelineSchedule {
  cron?: string | null;
}

export interface PipelineDag {
  dagId: string;
  filePath: string;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  source: PipelineSource;
  ingestion: PipelineIngestion;
  destination: PipelineDestination;
  schedule: PipelineSchedule;
  dag: PipelineDag;
}

export interface PipelinesFile {
  pipelines: PipelineDefinition[];
}
