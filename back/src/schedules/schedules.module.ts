import { Module } from '@nestjs/common';
import { AirflowModule } from '../airflow/airflow.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [AirflowModule, PipelinesModule],
  controllers: [SchedulesController],
})
export class SchedulesModule {}
