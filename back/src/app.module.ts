import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { AirflowModule } from './airflow/airflow.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { ConnectionsModule } from './connections/connections.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AlertsModule } from './alerts/alerts.module';
import { HealthModule } from './health/health.module';
import { LogsModule } from './logs/logs.module';
import { DatabaseModule } from './database/database.module';
import { SourcesModule } from './sources/sources.module';
import { PipelinesModule } from './pipelines/pipelines.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
    }),
    AirflowModule,
    DatabaseModule,
    SourcesModule,
    PipelinesModule,
    IngestionModule,
    ConnectionsModule,
    SchedulesModule,
    AlertsModule,
    HealthModule,
    LogsModule,
  ],
})
export class AppModule {}
