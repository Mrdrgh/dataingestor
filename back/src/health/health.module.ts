import { Module } from '@nestjs/common';
import { AirflowModule } from '../airflow/airflow.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AirflowModule],
  controllers: [HealthController],
})
export class HealthModule {}
