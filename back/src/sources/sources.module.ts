import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesController } from './sources.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SourcesController],
})
export class SourcesModule {}
