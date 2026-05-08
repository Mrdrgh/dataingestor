export interface AirflowHealthResponse {
  metadatabase?: { status: string };
  scheduler?: { status: string };
}

export interface AirflowDagRun {
  dag_run_id: string;
  state?: string;
  execution_date?: string;
  start_date?: string;
  end_date?: string;
  run_type?: string;
  data_interval_start?: string;
  data_interval_end?: string;
  conf?: Record<string, unknown> | null;
}

export interface AirflowDagRunsResponse {
  dag_runs: AirflowDagRun[];
  total_entries?: number;
}

export interface AirflowTaskInstance {
  task_id: string;
  state?: string;
  try_number?: number;
  start_date?: string;
  end_date?: string;
  duration?: number;
}

export interface AirflowTaskInstancesResponse {
  task_instances: AirflowTaskInstance[];
}

export interface AirflowDagResponse {
  dag_id: string;
  is_paused?: boolean;
  schedule_interval?: unknown;
  timetable_summary?: string | null;
  next_dagrun?: string | null;
}
