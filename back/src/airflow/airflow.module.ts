import { Module } from '@nestjs/common';
import { AirflowService } from './airflow.service';

@Module({
  providers: [AirflowService],
  exports: [AirflowService],
})
export class AirflowModule {}
