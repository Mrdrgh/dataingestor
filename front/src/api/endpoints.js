import { apiClient } from './client';

export const api = {
  // Health
  getHealth: () => apiClient('/health'),

  // Connections
  getConnection: () => apiClient('/connections'),
  testConnection: () => apiClient('/connections/test'),
  saveConnection: (payload) => apiClient('/connections/postgres', { method: 'POST', body: payload }),

  // Sources
  getSchemas: () => apiClient('/sources/schemas'),
  getTables: (schema = 'public', includeViews = true) => 
    apiClient(`/sources/tables?schema=${encodeURIComponent(schema)}&includeViews=${includeViews}`),
  getColumns: (table, schema = 'public') => 
    apiClient(`/sources/tables/${encodeURIComponent(table)}/columns?schema=${encodeURIComponent(schema)}`),
  getPreview: (table, schema = 'public', limit = 20, columns) => {
    let url = `/sources/tables/${encodeURIComponent(table)}/preview?schema=${encodeURIComponent(schema)}&limit=${limit}`;
    if (columns && columns.length > 0) {
      url += `&columns=${encodeURIComponent(columns.join(','))}`;
    }
    return apiClient(url);
  },

  // Pipelines
  getPipelines: () => apiClient('/pipelines'),
  createPipeline: (payload) => apiClient('/pipelines', { method: 'POST', body: payload }),
  validatePipeline: (payload) => apiClient('/pipelines/validate', { method: 'POST', body: payload }),
  getPipeline: (pipelineId) => apiClient(`/pipelines/${encodeURIComponent(pipelineId)}`),
  updatePipeline: (pipelineId, payload) => apiClient(`/pipelines/${encodeURIComponent(pipelineId)}`, { method: 'PUT', body: payload }),
  deletePipeline: (pipelineId) => apiClient(`/pipelines/${encodeURIComponent(pipelineId)}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (pipelineId) => {
    let url = '/schedules';
    if (pipelineId) url += `?pipelineId=${encodeURIComponent(pipelineId)}`;
    return apiClient(url);
  },

  // Alerts
  getAlerts: (pipelineId) => {
    let url = '/alerts';
    if (pipelineId) url += `?pipelineId=${encodeURIComponent(pipelineId)}`;
    return apiClient(url);
  },

  // Ingestion Runs (Global)
  getRuns: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.offset) searchParams.append('offset', params.offset);
    if (params.orderBy) searchParams.append('orderBy', params.orderBy);
    if (params.state) searchParams.append('state', params.state);
    
    const qs = searchParams.toString();
    return apiClient(`/ingestion/runs${qs ? `?${qs}` : ''}`);
  },
  triggerRun: (payload) => apiClient('/ingestion/runs', { method: 'POST', body: payload }),
  getRun: (runId) => apiClient(`/ingestion/runs/${encodeURIComponent(runId)}`),
  getRunTasks: (runId) => apiClient(`/ingestion/runs/${encodeURIComponent(runId)}/tasks`),

  // Ingestion Runs (Pipeline-specific)
  getPipelineRuns: (pipelineId, params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.offset) searchParams.append('offset', params.offset);
    if (params.orderBy) searchParams.append('orderBy', params.orderBy);
    if (params.state) searchParams.append('state', params.state);
    
    const qs = searchParams.toString();
    return apiClient(`/ingestion/pipelines/${encodeURIComponent(pipelineId)}/runs${qs ? `?${qs}` : ''}`);
  },
  triggerPipelineRun: (pipelineId, payload) => 
    apiClient(`/ingestion/pipelines/${encodeURIComponent(pipelineId)}/runs`, { method: 'POST', body: payload }),
  getPipelineRun: (pipelineId, runId) => 
    apiClient(`/ingestion/pipelines/${encodeURIComponent(pipelineId)}/runs/${encodeURIComponent(runId)}`),
  getPipelineRunTasks: (pipelineId, runId) => 
    apiClient(`/ingestion/pipelines/${encodeURIComponent(pipelineId)}/runs/${encodeURIComponent(runId)}/tasks`),

  // Logs
  getRunTaskLog: (runId, taskId, tryNumber = 1) => 
    apiClient(`/logs/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}?tryNumber=${tryNumber}`),
  getPipelineRunTaskLog: (pipelineId, runId, taskId, tryNumber = 1) => 
    apiClient(`/logs/pipelines/${encodeURIComponent(pipelineId)}/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}?tryNumber=${tryNumber}`),

  // Catalog
  getCatalog: () => apiClient('/catalog'),
};
