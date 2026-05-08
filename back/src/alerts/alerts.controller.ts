import { Controller, Get, Query } from '@nestjs/common';
import { AirflowService } from '../airflow/airflow.service';
import { AirflowDagRun } from '../airflow/airflow.types';
import { PipelinesService } from '../pipelines/pipelines.service';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly airflow: AirflowService,
    private readonly pipelines: PipelinesService,
  ) {}

  @Get()
  async getAlerts(
    @Query('pipelineId') pipelineId?: string,
  ): Promise<Record<string, unknown>> {
    const pipeline = pipelineId
      ? await this.pipelines.getByIdOrThrow(pipelineId)
      : null;
    const response = await this.airflow.listDagRuns(pipeline?.dag.dagId, {
      limit: 20,
      orderBy: '-execution_date',
    });

    const failedRuns = response.dag_runs.filter(
      (run) => run.state === 'failed',
    );

    return {
      dagId: pipeline?.dag.dagId ?? this.airflow.getDagId(),
      pipelineId: pipeline?.id ?? null,
      alertLevel: failedRuns.length > 0 ? 'warning' : 'ok',
      failedRuns: failedRuns.slice(0, 5).map((run) => this.mapDagRun(run)),
      totalFailed: failedRuns.length,
    };
  }

  private mapDagRun(run: AirflowDagRun): Record<string, unknown> {
    return {
      runId: run.dag_run_id,
      state: run.state ?? 'unknown',
      executionDate: run.execution_date ?? null,
      startDate: run.start_date ?? null,
      endDate: run.end_date ?? null,
    };
  }
}
