import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AirflowService } from '../airflow/airflow.service';
import { AirflowDagRun, AirflowTaskInstance } from '../airflow/airflow.types';
import { PipelinesService } from '../pipelines/pipelines.service';
import { ListRunsQueryDto } from './dto/list-runs-query.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly airflow: AirflowService,
    private readonly pipelines: PipelinesService,
  ) {}

  @Get('runs')
  async listRuns(
    @Query() query: ListRunsQueryDto,
  ): Promise<Record<string, unknown>> {
    const response = await this.airflow.listDagRuns(undefined, {
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      state: query.state,
    });

    return {
      dagId: this.airflow.getDagId(),
      totalEntries: response.total_entries ?? response.dag_runs.length,
      runs: response.dag_runs.map((run) => this.mapDagRun(run)),
    };
  }

  @Post('runs')
  async triggerRun(
    @Body() body: TriggerRunDto,
  ): Promise<Record<string, unknown>> {
    return this.airflow.triggerDagRun(undefined, body.dagRunId, body.conf);
  }

  @Get('runs/:runId')
  async getRun(@Param('runId') runId: string): Promise<Record<string, unknown>> {
    const response = await this.airflow.getDagRun(runId);
    return this.mapDagRun(response);
  }

  @Get('runs/:runId/tasks')
  async listTasks(
    @Param('runId') runId: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.airflow.listTaskInstances(runId);
    return {
      dagId: this.airflow.getDagId(),
      runId,
      tasks: response.task_instances.map((task) => this.mapTask(task)),
    };
  }

  @Get('pipelines/:pipelineId/runs')
  async listPipelineRuns(
    @Param('pipelineId') pipelineId: string,
    @Query() query: ListRunsQueryDto,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    const response = await this.airflow.listDagRuns(pipeline.dag.dagId, {
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      state: query.state,
    });

    return {
      dagId: pipeline.dag.dagId,
      pipelineId: pipeline.id,
      totalEntries: response.total_entries ?? response.dag_runs.length,
      runs: response.dag_runs.map((run) => this.mapDagRun(run)),
    };
  }

  @Post('pipelines/:pipelineId/runs')
  async triggerPipelineRun(
    @Param('pipelineId') pipelineId: string,
    @Body() body: TriggerRunDto,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    const conf = { pipelineId: pipeline.id, ...(body.conf ?? {}) };
    const run = await this.airflow.triggerDagRun(
      pipeline.dag.dagId,
      body.dagRunId,
      conf,
    );

    return {
      pipelineId: pipeline.id,
      dagId: pipeline.dag.dagId,
      ...run,
    };
  }

  @Get('pipelines/:pipelineId/runs/:runId')
  async getPipelineRun(
    @Param('pipelineId') pipelineId: string,
    @Param('runId') runId: string,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    const response = await this.airflow.getDagRun(
      runId,
      pipeline.dag.dagId,
    );

    return {
      pipelineId: pipeline.id,
      dagId: pipeline.dag.dagId,
      ...this.mapDagRun(response),
    };
  }

  @Get('pipelines/:pipelineId/runs/:runId/tasks')
  async listPipelineTasks(
    @Param('pipelineId') pipelineId: string,
    @Param('runId') runId: string,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    const response = await this.airflow.listTaskInstances(
      runId,
      pipeline.dag.dagId,
    );

    return {
      dagId: pipeline.dag.dagId,
      pipelineId: pipeline.id,
      runId,
      tasks: response.task_instances.map((task) => this.mapTask(task)),
    };
  }

  private mapDagRun(run: AirflowDagRun): Record<string, unknown> {
    return {
      runId: run.dag_run_id,
      state: run.state ?? 'unknown',
      runType: run.run_type ?? null,
      executionDate: run.execution_date ?? null,
      startDate: run.start_date ?? null,
      endDate: run.end_date ?? null,
      dataIntervalStart: run.data_interval_start ?? null,
      dataIntervalEnd: run.data_interval_end ?? null,
      conf: run.conf ?? null,
    };
  }

  private mapTask(task: AirflowTaskInstance): Record<string, unknown> {
    return {
      taskId: task.task_id,
      state: task.state ?? 'unknown',
      tryNumber: task.try_number ?? 0,
      startDate: task.start_date ?? null,
      endDate: task.end_date ?? null,
      duration: task.duration ?? null,
    };
  }
}
