import { Controller, Get, Param, Query } from '@nestjs/common';
import { AirflowService } from '../airflow/airflow.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { LogsQueryDto } from './dto/logs-query.dto';

@Controller('logs')
export class LogsController {
  constructor(
    private readonly airflow: AirflowService,
    private readonly pipelines: PipelinesService,
  ) {}

  @Get('runs/:runId/tasks/:taskId')
  async getLog(
    @Param('runId') runId: string,
    @Param('taskId') taskId: string,
    @Query() query: LogsQueryDto,
  ): Promise<Record<string, unknown>> {
    const tryNumber = query.tryNumber ?? 1;
    const content = await this.airflow.getTaskLog(runId, taskId, tryNumber);

    return {
      dagId: this.airflow.getDagId(),
      runId,
      taskId,
      tryNumber,
      content,
    };
  }

  @Get('pipelines/:pipelineId/runs/:runId/tasks/:taskId')
  async getPipelineLog(
    @Param('pipelineId') pipelineId: string,
    @Param('runId') runId: string,
    @Param('taskId') taskId: string,
    @Query() query: LogsQueryDto,
  ): Promise<Record<string, unknown>> {
    const pipeline = await this.pipelines.getByIdOrThrow(pipelineId);
    const tryNumber = query.tryNumber ?? 1;
    const content = await this.airflow.getTaskLog(
      runId,
      taskId,
      tryNumber,
      pipeline.dag.dagId,
    );

    return {
      dagId: pipeline.dag.dagId,
      pipelineId: pipeline.id,
      runId,
      taskId,
      tryNumber,
      content,
    };
  }
}
