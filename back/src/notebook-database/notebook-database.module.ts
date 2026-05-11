import { Module, Global } from '@nestjs/common';
import { NotebookDatabaseService } from './notebook-database.service';

/**
 * Global module that provides the NotebookDatabaseService (connection to
 * the notebooks PostgreSQL database) to all other notebook-related modules.
 */
@Global()
@Module({
  providers: [NotebookDatabaseService],
  exports: [NotebookDatabaseService],
})
export class NotebookDatabaseModule {}
