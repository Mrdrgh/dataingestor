import { Module } from '@nestjs/common';
import { AirflowModule } from '../airflow/airflow.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { LogsController } from './logs.controller';

@Module({
  imports: [AirflowModule, PipelinesModule],
  controllers: [LogsController],
})
export class LogsModule {}
