export type JobStatus = 'pending' | 'queued' | 'in-progress' | 'completed' | 'failed';

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  site_name: string;
  url: string;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
  result_location?: string;
  error_message?: string;
  correlation_id: string;
}

export interface AnalysisRequest {
  site_name: string;
  url: string;
}

export interface AnalysisResponse {
  job_id: string;
  status: 'pending' | 'queued';
  message: string;
  correlation_id: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  site_name: string;
  url: string;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
  result_location?: string;
  error_message?: string;
}

