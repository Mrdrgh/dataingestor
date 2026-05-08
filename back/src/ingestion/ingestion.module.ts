import { Module } from '@nestjs/common';
import { AirflowModule } from '../airflow/airflow.module';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [AirflowModule, PipelinesModule],
  controllers: [IngestionController],
})
export class IngestionModule {}
