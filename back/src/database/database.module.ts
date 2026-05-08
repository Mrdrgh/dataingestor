import { Module } from '@nestjs/common';
import { PostgresMetadataService } from './postgres-metadata.service';

@Module({
  providers: [PostgresMetadataService],
  exports: [PostgresMetadataService],
})
export class DatabaseModule {}
