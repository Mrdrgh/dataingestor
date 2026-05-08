import { Module } from '@nestjs/common';
import { AirflowModule } from '../airflow/airflow.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [AirflowModule, PipelinesModule],
  controllers: [AlertsController],
})
export class AlertsModule {}
