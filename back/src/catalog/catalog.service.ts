import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface CatalogColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
}

export interface CatalogTable {
  name: string;
  format: string;
  rows: string | number;
  size: string;
  lastUpdated: string;
  columns: CatalogColumn[];
}

export interface CatalogSchema {
  name: string;
  tables: CatalogTable[];
}

export interface Catalog {
  name: string;
  schemas: CatalogSchema[];
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly deltaBasePath: string;

  constructor(private readonly config: ConfigService) {
    const basePath = this.config.get<string>('DELTA_BASE_PATH') ?? '../delta';
    this.deltaBasePath = path.resolve(process.cwd(), basePath);
  }

  async getCatalog(): Promise<Catalog[]> {
    const catalogs: Catalog[] = [];

    try {
      if (!(await this.isDirectory(this.deltaBasePath))) {
        return [];
      }

      const catalogDirs = await this.safeReadDir(this.deltaBasePath);
      
      for (const catalogName of catalogDirs) {
        const catalogPath = path.join(this.deltaBasePath, catalogName);
        if (!(await this.isDirectory(catalogPath))) continue;

        const schemas: CatalogSchema[] = [];
        const schemaDirs = await this.safeReadDir(catalogPath);

        for (const schemaName of schemaDirs) {
          const schemaPath = path.join(catalogPath, schemaName);
          if (!(await this.isDirectory(schemaPath))) continue;

          const tables: CatalogTable[] = [];
          const tableDirs = await this.safeReadDir(schemaPath);

          for (const tableName of tableDirs) {
            const tablePath = path.join(schemaPath, tableName);
            if (!(await this.isDirectory(tablePath))) continue;

            const tableData = await this.parseDeltaTable(tablePath, tableName);
            if (tableData) {
              tables.push(tableData);
            }
          }

          if (tables.length > 0) {
            schemas.push({ name: schemaName, tables });
          }
        }

        if (schemas.length > 0) {
          catalogs.push({ name: catalogName, schemas });
        }
      }
    } catch (e) {
      this.logger.error(`Failed to read catalog from ${this.deltaBasePath}`, e);
    }

    return catalogs;
  }

  private async parseDeltaTable(tablePath: string, tableName: string): Promise<CatalogTable | null> {
    const deltaLogPath = path.join(tablePath, '_delta_log');
    if (!(await this.isDirectory(deltaLogPath))) return null;

    try {
      const files = await this.safeReadDir(deltaLogPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
      if (jsonFiles.length === 0) return null;

      let schemaString = '';
      const activeFiles = new Map<string, any>();
      let lastUpdatedMs = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(deltaLogPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.metaData && entry.metaData.schemaString) {
              schemaString = entry.metaData.schemaString;
            }
            if (entry.add) {
              activeFiles.set(entry.add.path, entry.add);
              if (entry.add.modificationTime > lastUpdatedMs) {
                lastUpdatedMs = entry.add.modificationTime;
              }
            }
            if (entry.remove) {
              activeFiles.delete(entry.remove.path);
            }
            if (entry.commitInfo && entry.commitInfo.timestamp > lastUpdatedMs) {
               lastUpdatedMs = entry.commitInfo.timestamp;
            }
          } catch (e) {
            this.logger.warn(`Failed to parse delta log line in ${file}`, e);
          }
        }
      }

      let totalRows = 0;
      let totalSize = 0;

      for (const add of activeFiles.values()) {
        totalSize += add.size || 0;
        if (add.stats) {
           const stats = typeof add.stats === 'string' ? JSON.parse(add.stats) : add.stats;
           totalRows += stats.numRecords || 0;
        }
      }

      let columns: CatalogColumn[] = [];
      if (schemaString) {
        try {
          const parsedSchema = JSON.parse(schemaString);
          if (parsedSchema.fields) {
            columns = parsedSchema.fields.map((f: any) => ({
              name: f.name,
              type: this.mapSparkType(f.type),
              nullable: f.nullable,
              pk: false,
            }));
          }
        } catch (e) {
           this.logger.warn(`Failed to parse schema JSON for table ${tableName}`, e);
        }
      }

      return {
        name: tableName,
        format: 'Delta',
        rows: new Intl.NumberFormat('en-US').format(totalRows),
        size: this.formatBytes(totalSize),
        lastUpdated: this.formatTimeAgo(lastUpdatedMs),
        columns,
      };

    } catch (e) {
      this.logger.error(`Failed to parse delta table at ${tablePath}`, e);
      return null;
    }
  }

  private mapSparkType(type: any): string {
    if (typeof type === 'string') {
      const lower = type.toLowerCase();
      if (lower.includes('int')) return 'BIGINT';
      if (lower.includes('string') || lower.includes('varchar') || lower.includes('char')) return 'STRING';
      if (lower.includes('decimal') || lower.includes('double') || lower.includes('float')) return 'DECIMAL';
      if (lower.includes('timestamp')) return 'TIMESTAMP';
      if (lower.includes('date')) return 'DATE';
      if (lower.includes('bool')) return 'BOOLEAN';
      return type.toUpperCase();
    }
    return 'COMPLEX';
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  private formatTimeAgo(timestamp: number): string {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' min ago';
    if (seconds < 5) return 'Just now';
    return Math.floor(seconds) + 's ago';
  }

  private async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async safeReadDir(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch {
      return [];
    }
  }
}
