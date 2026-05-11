import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  ordinalPosition: number;
  recommendedCursor: boolean;
}

@Injectable()
export class PostgresMetadataService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly previewLimit: number;

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({
      host:
        this.config.get<string>('SOURCE_PGHOST') ??
        this.config.getOrThrow<string>('PGHOST'),
      port:
        this.config.get<number>('SOURCE_PGPORT') ??
        this.config.get<number>('PGPORT', 5432),
      database:
        this.config.get<string>('SOURCE_PGDATABASE') ??
        this.config.getOrThrow<string>('PGDATABASE'),
      user:
        this.config.get<string>('SOURCE_PGUSER') ??
        this.config.getOrThrow<string>('PGUSER'),
      password:
        this.config.get<string>('SOURCE_PGPASSWORD') ??
        this.config.getOrThrow<string>('PGPASSWORD'),
    });

    this.previewLimit = this.config.get<number>('PREVIEW_ROW_LIMIT', 20);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async testConnection(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async listSchemas(): Promise<string[]> {
    const result = await this.pool.query<{ schema_name: string }>(
      `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
      `,
    );

    return result.rows.map((row) => row.schema_name);
  }

  async listTables(schema?: string, includeViews = true): Promise<TableInfo[]> {
    const targetSchema = schema ?? 'public';
    this.assertIdentifier(targetSchema, 'schema');

    const types = includeViews
      ? ['BASE TABLE', 'VIEW']
      : ['BASE TABLE'];

    const result = await this.pool.query<{
      table_schema: string;
      table_name: string;
      table_type: string;
    }>(
      `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = ANY($2)
      ORDER BY table_name
      `,
      [targetSchema, types],
    );

    return result.rows.map((row) => ({
      schema: row.table_schema,
      name: row.table_name,
      type: row.table_type === 'VIEW' ? 'view' : 'table',
    }));
  }

  async listColumns(schema: string, table: string): Promise<ColumnInfo[]> {
    const targetSchema = schema ?? 'public';
    this.assertIdentifier(targetSchema, 'schema');
    this.assertIdentifier(table, 'table');

    const result = await this.pool.query<{
      column_name: string;
      data_type: string;
      is_nullable: 'YES' | 'NO';
      ordinal_position: number;
      constraint_type: string | null;
    }>(
      `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.ordinal_position,
        tc.constraint_type
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_schema = kcu.table_schema
        AND c.table_name = kcu.table_name
        AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
        AND kcu.table_name = tc.table_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position
      `,
      [targetSchema, table],
    );

    return result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      isPrimaryKey: row.constraint_type === 'PRIMARY KEY',
      ordinalPosition: row.ordinal_position,
      recommendedCursor: this.isTimeLike(row.data_type),
    }));
  }

  async previewRows(
    schema: string,
    table: string,
    columns?: string[],
    limit?: number,
  ): Promise<Record<string, unknown>[]> {
    const targetSchema = schema ?? 'public';
    this.assertIdentifier(targetSchema, 'schema');
    this.assertIdentifier(table, 'table');

    const columnList = this.buildColumnList(columns);
    const safeLimit = Math.min(limit ?? this.previewLimit, this.previewLimit);

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT ${columnList} FROM ${this.quoteIdent(targetSchema)}.${this.quoteIdent(
        table,
      )} LIMIT $1`,
      [safeLimit],
    );

    return result.rows;
  }

  async columnExists(
    schema: string,
    table: string,
    column: string,
  ): Promise<boolean> {
    const targetSchema = schema ?? 'public';
    this.assertIdentifier(targetSchema, 'schema');
    this.assertIdentifier(table, 'table');
    this.assertIdentifier(column, 'column');

    const result = await this.pool.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
        AND column_name = $3
      `,
      [targetSchema, table, column],
    );

    return (result.rowCount ?? 0) > 0;
  }

  private buildColumnList(columns?: string[]): string {
    if (!columns || columns.length === 0) {
      return '*';
    }

    const safeColumns = columns.map((column) => {
      this.assertIdentifier(column, 'column');
      return this.quoteIdent(column);
    });

    return safeColumns.join(', ');
  }

  private quoteIdent(value: string): string {
    return `"${value}"`;
  }

  private assertIdentifier(value: string, label: string): void {
    if (!IDENTIFIER_REGEX.test(value)) {
      throw new BadRequestException(
        `Invalid ${label}. Only letters, numbers, and underscore are allowed.`,
      );
    }
  }

  private isTimeLike(dataType: string): boolean {
    return [
      'timestamp without time zone',
      'timestamp with time zone',
      'timestamp',
      'date',
      'time',
    ].includes(dataType);
  }
}
