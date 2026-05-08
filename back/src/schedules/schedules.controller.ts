import { Controller, Get, Query } from '@nestjs/common';
import { AirflowService } from '../airflow/airflow.service';
import { AirflowDagResponse } from '../airflow/airflow.types';
import { PipelinesService } from '../pipelines/pipelines.service';

@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly airflow: AirflowService,
    private readonly pipelines: PipelinesService,
  ) {}

  @Get()
  async getSchedule(
    @Query('pipelineId') pipelineId?: string,
  ): Promise<Record<string, unknown>> {
    const pipeline = pipelineId
      ? await this.pipelines.getByIdOrThrow(pipelineId)
      : null;
    const dag = await this.airflow.getDag(pipeline?.dag.dagId);

    return {
      dagId: pipeline?.dag.dagId ?? this.airflow.getDagId(),
      pipelineId: pipeline?.id ?? null,
      schedule: this.normalizeSchedule(dag.schedule_interval),
      isPaused: dag.is_paused ?? false,
      nextDagrun: dag.next_dagrun ?? null,
      timetableSummary: dag.timetable_summary ?? null,
    };
  }

  private normalizeSchedule(schedule: AirflowDagResponse['schedule_interval']):
    | string
    | null {
    if (!schedule) {
      return null;
    }

    if (typeof schedule === 'string') {
      return schedule;
    }

    if (typeof schedule === 'object') {
      const value = schedule as {
        value?: string;
        expression?: string;
        cron?: string;
      };
      return value.value ?? value.expression ?? value.cron ?? JSON.stringify(schedule);
    }

    return null;
  }
}
