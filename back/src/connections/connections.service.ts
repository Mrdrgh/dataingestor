import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresMetadataService } from '../database/postgres-metadata.service';
import { PostgresConnectionDto } from './dto/postgres-connection.dto';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly config: ConfigService,
    private readonly metadata: PostgresMetadataService,
  ) {}

  getPostgresConnection(): Record<string, unknown> {
    const password = this.config.getOrThrow<string>('PGPASSWORD');

    return {
      type: 'postgres',
      host: this.config.getOrThrow<string>('PGHOST'),
      port: this.config.getOrThrow<number>('PGPORT'),
      database: this.config.getOrThrow<string>('PGDATABASE'),
      user: this.config.getOrThrow<string>('PGUSER'),
      password: password ? '***' : null,
      passwordSet: Boolean(password),
      status: 'configured',
    };
  }

  async testPostgresConnection(): Promise<void> {
    await this.metadata.testConnection();
  }

  async setupPostgresConnection(dto: PostgresConnectionDto): Promise<void> {
    const pool = new Pool({
      host: dto.host,
      port: dto.port,
      database: dto.database,
      user: dto.user,
      password: dto.password,
    });

    try {
      await pool.query('SELECT 1');
    } catch (error) {
      throw new BadRequestException('Database connection failed: ' + (error as Error).message);
    } finally {
      await pool.end();
    }

    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf8');
    } catch (e) {
      // File does not exist, start fresh
    }

    const lines = content.split('\n');
    const envVars: Record<string, string> = {
      PGHOST: dto.host,
      PGPORT: String(dto.port),
      PGDATABASE: dto.database,
      PGUSER: dto.user,
      PGPASSWORD: dto.password,
    };

    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
      const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
      if (idx !== -1) {
        lines[idx] = `${key}=${value}`;
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    await fs.writeFile(envPath, lines.join('\n').trim() + '\n', 'utf8');
  }
}
