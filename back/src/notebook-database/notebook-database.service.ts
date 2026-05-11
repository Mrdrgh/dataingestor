import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

/**
 * Manages the dedicated PostgreSQL connection pool for the notebooks database
 * (postgres-notebooks container on port 5434).
 *
 * Automatically creates the `compute_profiles` and `notebooks` tables on startup.
 */
@Injectable()
export class NotebookDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(NotebookDatabaseService.name);

  constructor(private readonly config: ConfigService) {
    this.pool = new Pool({
      host: this.config.get<string>('NB_PGHOST', 'localhost'),
      port: this.config.get<number>('NB_PGPORT', 5434),
      database: this.config.get<string>('NB_PGDATABASE', 'notebooks_db'),
      user: this.config.get<string>('NB_PGUSER', 'notebooks'),
      password: this.config.get<string>('NB_PGPASSWORD', 'notebooks'),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initTables();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /** Expose the pool for services to run queries */
  getPool(): Pool {
    return this.pool;
  }

  /** Run a parameterised query */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<import('pg').QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  private async initTables(): Promise<void> {
    this.logger.log('Initializing notebooks database tables...');

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS compute_profiles (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(255) NOT NULL,
        kernel_gateway_url VARCHAR(512) NOT NULL,
        auth_token      VARCHAR(512),
        delta_base_path VARCHAR(512) NOT NULL DEFAULT '/opt/spark/delta',
        spark_config    JSONB DEFAULT '{}',
        status          VARCHAR(50) DEFAULT 'unknown',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notebooks (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title               VARCHAR(255) NOT NULL DEFAULT 'Untitled Notebook',
        cells               JSONB NOT NULL DEFAULT '[]',
        compute_profile_id  UUID REFERENCES compute_profiles(id) ON DELETE SET NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.logger.log('Notebooks database tables ready.');
  }
}
