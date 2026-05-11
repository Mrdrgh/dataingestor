import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  AirflowDagRun,
  AirflowDagResponse,
  AirflowDagRunsResponse,
  AirflowHealthResponse,
  AirflowTaskInstancesResponse,
} from './airflow.types';

type AirflowAuthType = 'none' | 'basic' | 'bearer';

@Injectable()
export class AirflowService {
  private readonly http: AxiosInstance;
  private readonly dagId: string;
  private readonly authType: AirflowAuthType;
  private readonly authConfig: Pick<AxiosRequestConfig, 'auth' | 'headers'>;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.getOrThrow<string>('AIRFLOW_BASE_URL');
    const timeout = this.config.get<number>('AIRFLOW_TIMEOUT_MS', 10000);
    this.dagId = this.config.getOrThrow<string>('AIRFLOW_DAG_ID');
    this.authType = (this.config.get<string>('AIRFLOW_AUTH_TYPE') ||
      'none') as AirflowAuthType;

    this.http = axios.create({
      baseURL,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.authConfig = this.buildAuthConfig();
  }

  getDagId(): string {
    return this.dagId;
  }

  async getHealth(): Promise<AirflowHealthResponse> {
    return this.request<AirflowHealthResponse>({
      method: 'GET',
      url: '/api/v1/health',
    });
  }

  async listDagRuns(
    dagId?: string,
    params?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    state?: string;
    },
  ): Promise<AirflowDagRunsResponse> {
    const targetDagId = this.resolveDagId(dagId);
    return this.request<AirflowDagRunsResponse>({
      method: 'GET',
      url: `/api/v1/dags/${targetDagId}/dagRuns`,
      params: {
        limit: params?.limit,
        offset: params?.offset,
        order_by: params?.orderBy,
        state: params?.state,
      },
    });
  }

  async getDagRun(
    dagRunId: string,
    dagId?: string,
  ): Promise<AirflowDagRun> {
    const targetDagId = this.resolveDagId(dagId);
    return this.request<AirflowDagRun>({
      method: 'GET',
      url: `/api/v1/dags/${targetDagId}/dagRuns/${encodeURIComponent(
        dagRunId,
      )}`,
    });
  }

  async triggerDagRun(
    dagId?: string,
    dagRunId?: string,
    conf?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const targetDagId = this.resolveDagId(dagId);
    const maxAttempts = 15;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.request<Record<string, unknown>>({
          method: 'POST',
          url: `/api/v1/dags/${targetDagId}/dagRuns`,
          data: {
            dag_run_id: dagRunId,
            conf: conf ?? {},
          },
        });
      } catch (error) {
        lastError = error;
        if (error instanceof HttpException && error.getStatus() === 404) {
          if (attempt < maxAttempts) {
            await this.delay(2000);
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }

  async listTaskInstances(
    dagRunId: string,
    dagId?: string,
  ): Promise<AirflowTaskInstancesResponse> {
    const targetDagId = this.resolveDagId(dagId);
    return this.request<AirflowTaskInstancesResponse>({
      method: 'GET',
      url: `/api/v1/dags/${targetDagId}/dagRuns/${encodeURIComponent(
        dagRunId,
      )}/taskInstances`,
    });
  }

  async getTaskLog(
    dagRunId: string,
    taskId: string,
    tryNumber: number,
    dagId?: string,
  ): Promise<string> {
    const targetDagId = this.resolveDagId(dagId);
    return this.request<string>({
      method: 'GET',
      url: `/api/v1/dags/${targetDagId}/dagRuns/${encodeURIComponent(
        dagRunId,
      )}/taskInstances/${encodeURIComponent(
        taskId,
      )}/logs/${encodeURIComponent(String(tryNumber))}`,
      params: {
        full_content: true,
      },
      headers: {
        Accept: 'text/plain',
      },
    });
  }

  async getDag(dagId?: string): Promise<AirflowDagResponse> {
    const targetDagId = this.resolveDagId(dagId);
    return this.request<AirflowDagResponse>({
      method: 'GET',
      url: `/api/v1/dags/${targetDagId}`,
    });
  }

  private resolveDagId(dagId?: string): string {
    return dagId ?? this.dagId;
  }

  private buildAuthConfig(): Pick<AxiosRequestConfig, 'auth' | 'headers'> {
    if (this.authType === 'basic') {
      return {
        auth: {
          username: this.config.getOrThrow<string>('AIRFLOW_USERNAME'),
          password: this.config.getOrThrow<string>('AIRFLOW_PASSWORD'),
        },
      };
    }

    if (this.authType === 'bearer') {
      return {
        headers: {
          Authorization: `Bearer ${this.config.getOrThrow<string>(
            'AIRFLOW_TOKEN',
          )}`,
        },
      };
    }

    return {};
  }

  private async request<T>(
    config: AxiosRequestConfig,
    attempts = 3,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.http.request<T>({
          ...config,
          auth: this.authConfig.auth ?? config.auth,
          headers: {
            ...(config.headers ?? {}),
            ...(this.authConfig.headers ?? {}),
          },
        });
        return response.data;
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === attempts) {
          break;
        }
        await this.delay(250 * attempt);
      }
    }

    throw this.toHttpException(lastError);
  }

  private isRetryable(error: unknown): boolean {
    const axiosError = error as AxiosError;
    if (!axiosError || !axiosError.isAxiosError) {
      return false;
    }

    if (!axiosError.response) {
      return true;
    }

    return axiosError.response.status >= 500;
  }

  private toHttpException(error: unknown): HttpException {
    const axiosError = error as AxiosError;
    if (axiosError?.isAxiosError) {
      const status = axiosError.response?.status ?? HttpStatus.BAD_GATEWAY;
      const data = axiosError.response?.data as
        | { detail?: string; message?: string }
        | string
        | undefined;
      const message =
        typeof data === 'string'
          ? data
          : data?.detail || data?.message || 'Airflow request failed';

      return new HttpException({ message, status }, status);
    }

    return new HttpException(
      { message: 'Airflow request failed', status: HttpStatus.BAD_GATEWAY },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
