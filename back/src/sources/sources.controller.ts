import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostgresMetadataService } from '../database/postgres-metadata.service';
import { ColumnsQueryDto } from './dto/columns-query.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { PreviewQueryDto } from './dto/preview-query.dto';

@Controller('sources')
export class SourcesController {
  constructor(private readonly metadata: PostgresMetadataService) {}

  @Get('schemas')
  async listSchemas(): Promise<Record<string, unknown>> {
    const schemas = await this.metadata.listSchemas();
    return { schemas };
  }

  @Get('tables')
  async listTables(
    @Query() query: ListTablesQueryDto,
  ): Promise<Record<string, unknown>> {
    const tables = await this.metadata.listTables(
      query.schema,
      query.includeViews ?? true,
    );

    return { schema: query.schema ?? 'public', tables };
  }

  @Get('tables/:table/columns')
  async listColumns(
    @Param('table') table: string,
    @Query() query: ColumnsQueryDto,
  ): Promise<Record<string, unknown>> {
    const schema = query.schema ?? 'public';
    const columns = await this.metadata.listColumns(schema, table);

    return {
      schema,
      table,
      columns,
    };
  }

  @Get('tables/:table/preview')
  async previewTable(
    @Param('table') table: string,
    @Query() query: PreviewQueryDto,
  ): Promise<Record<string, unknown>> {
    const schema = query.schema ?? 'public';
    const columns = this.parseColumns(query.columns);
    const rows = await this.metadata.previewRows(
      schema,
      table,
      columns,
      query.limit,
    );

    return {
      schema,
      table,
      columns: columns ?? null,
      rows,
    };
  }

  private parseColumns(value?: string): string[] | undefined {
    if (!value) {
      return undefined;
    }

    return value
      .split(',')
      .map((column) => column.trim())
      .filter((column) => column.length > 0);
  }
}
