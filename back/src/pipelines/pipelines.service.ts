import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PostgresMetadataService } from '../database/postgres-metadata.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import {
  PipelineDefinition,
  PipelineDestination,
  PipelineIngestion,
  PipelineSchedule,
  PipelineSource,
  PipelinesFile,
} from './pipeline.types';

@Injectable()
export class PipelinesService implements OnModuleInit {
  private readonly filePath: string;
  private readonly dagsDir: string;
  private readonly sparkJobsDir: string;
  private readonly deltaBasePath: string;
  private readonly defaultCatalog = 'fusion_catalog';
  private readonly defaultLayer = 'raw';
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: ConfigService,
    private readonly metadata: PostgresMetadataService,
  ) {
    const pipelinesFile =
      this.config.get<string>('PIPELINES_FILE') ?? './data/pipelines.json';
    this.filePath = path.resolve(process.cwd(), pipelinesFile);

    const dagsDir =
      this.config.get<string>('AIRFLOW_DAGS_DIR') ?? '../airflow/dags/generated';
    this.dagsDir = path.resolve(process.cwd(), dagsDir);

    const sparkJobsDir =
      this.config.get<string>('AIRFLOW_SPARK_JOBS_DIR') ??
      '../airflow_spark_delta/spark/jobs';
    this.sparkJobsDir = path.resolve(process.cwd(), sparkJobsDir);

    this.deltaBasePath =
      this.config.get<string>('DELTA_BASE_PATH') ?? '../airflow_spark_delta/delta';
  }

  async onModuleInit(): Promise<void> {
    await this.migrateLegacyDestinations();
  }

  async list(): Promise<PipelineDefinition[]> {
    const data = await this.loadFile();
    return data.pipelines;
  }

  async getById(pipelineId: string): Promise<PipelineDefinition | undefined> {
    const data = await this.loadFile();
    return data.pipelines.find((pipeline) => pipeline.id === pipelineId);
  }

  async getByIdOrThrow(pipelineId: string): Promise<PipelineDefinition> {
    const pipeline = await this.getById(pipelineId);
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return pipeline;
  }

  async create(dto: CreatePipelineDto): Promise<PipelineDefinition> {
    const data = await this.loadFile();
    const pipeline = await this.buildPipeline(dto);

    data.pipelines.push(pipeline);
    await this.saveFile(data);
    await this.writeSparkConfigFile(pipeline);
    await this.writeDagFile(pipeline);

    return pipeline;
  }

  async update(
    pipelineId: string,
    dto: UpdatePipelineDto,
  ): Promise<PipelineDefinition> {
    const data = await this.loadFile();
    const index = data.pipelines.findIndex((p) => p.id === pipelineId);

    if (index === -1) {
      throw new NotFoundException('Pipeline not found');
    }

    const current = data.pipelines[index];
    const updated = await this.mergePipeline(current, dto);

    data.pipelines[index] = updated;
    await this.saveFile(data);
    await this.writeSparkConfigFile(updated);
    await this.writeDagFile(updated);

    return updated;
  }

  async delete(pipelineId: string): Promise<void> {
    const data = await this.loadFile();
    const index = data.pipelines.findIndex((pipeline) => pipeline.id === pipelineId);

    if (index === -1) {
      throw new NotFoundException('Pipeline not found');
    }

    const [removed] = data.pipelines.splice(index, 1);
    await this.saveFile(data);
    await this.removeDagFile(removed);
    await this.removeSparkConfigFile(removed);
  }

  async validate(dto: CreatePipelineDto): Promise<Record<string, unknown>> {
    await this.validatePipelineInput(dto);
    return { valid: true };
  }

  private async buildPipeline(dto: CreatePipelineDto): Promise<PipelineDefinition> {
    await this.validatePipelineInput(dto);

    const id = randomUUID();
    const now = new Date().toISOString();
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Pipeline name is required');
    }
    const slug = this.slugify(name);
    const dagId = `ingest_${slug}_${id.replace(/-/g, '').slice(0, 8)}`;
    const source = this.buildSource(dto.source);
    const destination = this.buildDestination(
      dto.destination,
      source,
      dto.ingestion.mode,
    );

    return {
      id,
      name,
      description: dto.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
      source,
      ingestion: this.buildIngestion(dto.ingestion),
      destination,
      schedule: this.buildSchedule(dto.schedule),
      dag: {
        dagId,
        filePath: this.buildDagRelativePath(dagId),
      },
      spark: {
        configPath: this.buildSparkConfigRelativePath(dagId),
      },
    };
  }

  private async mergePipeline(
    current: PipelineDefinition,
    dto: UpdatePipelineDto,
  ): Promise<PipelineDefinition> {
    const name = dto.name?.trim() ?? current.name;
    if (!name) {
      throw new BadRequestException('Pipeline name is required');
    }

    const merged: PipelineDefinition = {
      ...current,
      name,
      description: dto.description?.trim() ?? current.description ?? null,
      source: {
        ...current.source,
        ...this.normalizeSource(dto.source),
      },
      ingestion: {
        ...current.ingestion,
        ...this.normalizeIngestion(dto.ingestion),
      },
      destination: {
        ...current.destination,
        ...this.normalizeDestination(dto.destination),
      },
      schedule: {
        ...current.schedule,
        ...this.normalizeSchedule(dto.schedule),
      },
      spark: current.spark ?? {
        configPath: this.buildSparkConfigRelativePath(current.dag.dagId),
      },
      updatedAt: new Date().toISOString(),
    };

    if (merged.ingestion.mode === 'full') {
      delete merged.ingestion.watermarkColumn;
    }

    await this.validatePipelineInput({
      name: merged.name,
      description: merged.description ?? undefined,
      source: merged.source,
      ingestion: merged.ingestion,
      destination: merged.destination,
      schedule: merged.schedule,
    });

    return merged;
  }

  private buildSource(input: CreatePipelineDto['source']): PipelineSource {
    const schema = input.schema?.trim() || 'public';
    const table = input.table.trim();
    if (!table) {
      throw new BadRequestException('Source table is required');
    }
    return {
      schema,
      table,
      columns: input.columns,
    };
  }

  private normalizeSource(
    input?: UpdatePipelineDto['source'],
  ): Partial<PipelineSource> {
    if (!input) {
      return {};
    }

    const result: Partial<PipelineSource> = {};

    if (input.schema !== undefined) {
      result.schema = input.schema.trim();
    }

    if (input.table !== undefined) {
      result.table = input.table.trim();
    }

    if (input.columns !== undefined) {
      result.columns = input.columns;
    }

    return result;
  }

  private buildIngestion(input: CreatePipelineDto['ingestion']): PipelineIngestion {
    return {
      mode: input.mode,
      watermarkColumn: input.watermarkColumn,
    };
  }

  private normalizeIngestion(
    input?: UpdatePipelineDto['ingestion'],
  ): Partial<PipelineIngestion> {
    if (!input) {
      return {};
    }

    const result: Partial<PipelineIngestion> = {};

    if (input.mode !== undefined) {
      result.mode = input.mode;
    }

    if (input.watermarkColumn !== undefined) {
      result.watermarkColumn = input.watermarkColumn;
    }

    return result;
  }

  private buildDestination(
    input: CreatePipelineDto['destination'] | undefined,
    source: PipelineSource,
    ingestionMode: PipelineIngestion['mode'],
  ): PipelineDestination {
    const defaultMode = ingestionMode === 'incremental' ? 'append' : 'overwrite';
    const explicitPath = input?.path?.trim();

    return {
      path: explicitPath && explicitPath.length > 0
        ? explicitPath
        : this.buildDefaultDestinationPath(source),
      mode: input?.mode ?? defaultMode,
    };
  }

  private normalizeDestination(
    input: UpdatePipelineDto['destination'] | undefined,
  ): Partial<PipelineDestination> {
    if (!input) {
      return {};
    }

    const result: Partial<PipelineDestination> = {};

    if (input.path !== undefined) {
      result.path = input.path.trim();
    }

    if (input.mode !== undefined) {
      result.mode = input.mode;
    }

    return result;
  }

  private buildDefaultDestinationPath(source: PipelineSource): string {
    return this.joinPath(
      this.deltaBasePath,
      this.defaultCatalog,
      this.defaultLayer,
      source.table,
    );
  }

  private joinPath(basePath: string, ...segments: string[]): string {
    const trimmedBase = basePath.trim().replace(/\/+$/, '');
    const cleanedSegments = segments
      .map((segment) => segment.trim().replace(/^\/+|\/+$/g, ''))
      .filter((segment) => segment.length > 0);

    if (!trimmedBase) {
      return cleanedSegments.join('/');
    }

    return [trimmedBase, ...cleanedSegments].join('/');
  }

  private isLegacyLocalDeltaPath(value: string): boolean {
    const trimmed = value.trim();
    return (
      trimmed === '../delta' ||
      trimmed.startsWith('../delta/') ||
      trimmed === '../airflow_spark_delta/delta' ||
      trimmed.startsWith('../airflow_spark_delta/delta/')
    );
  }

  private async migrateLegacyDestinations(): Promise<void> {
    const data = await this.loadFile();
    const pipelinesToUpdate: PipelineDefinition[] = [];
    const now = new Date().toISOString();

    for (const pipeline of data.pipelines) {
      const currentPath = pipeline.destination?.path?.trim() ?? '';
      const shouldRewrite =
        !currentPath || this.isLegacyLocalDeltaPath(currentPath);

      if (!shouldRewrite) {
        continue;
      }

      const nextPath = this.buildDefaultDestinationPath(pipeline.source);
      if (nextPath === currentPath) {
        continue;
      }

      pipeline.destination = {
        ...pipeline.destination,
        path: nextPath,
      } as PipelineDestination;
      pipeline.updatedAt = now;
      pipelinesToUpdate.push(pipeline);
    }

    if (pipelinesToUpdate.length === 0) {
      return;
    }

    await this.saveFile(data);

    for (const pipeline of pipelinesToUpdate) {
      await this.writeSparkConfigFile(pipeline);
    }
  }

  private buildSchedule(
    input: CreatePipelineDto['schedule'] | undefined,
  ): PipelineSchedule {
    const cron = input?.cron?.trim();

    return {
      cron: cron && cron.length > 0 ? cron : null,
    };
  }

  private normalizeSchedule(
    input: UpdatePipelineDto['schedule'] | undefined,
  ): Partial<PipelineSchedule> {
    if (!input) {
      return {};
    }

    const result: Partial<PipelineSchedule> = {};

    if (input.cron !== undefined) {
      const cron = input.cron?.trim();
      result.cron = cron && cron.length > 0 ? cron : null;
    }

    return result;
  }

  private async validatePipelineInput(dto: CreatePipelineDto): Promise<void> {
    const source = this.buildSource(dto.source);
    const ingestion = this.buildIngestion(dto.ingestion);

    const columns = await this.metadata.listColumns(source.schema, source.table);
    if (columns.length === 0) {
      throw new BadRequestException('Source table not found');
    }

    const columnNames = new Set(columns.map((column) => column.name));

    if (source.columns && source.columns.length > 0) {
      const missing = source.columns.filter((col) => !columnNames.has(col));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Columns not found: ${missing.join(', ')}`,
        );
      }
    }

    if (ingestion.mode === 'incremental') {
      if (!ingestion.watermarkColumn) {
        throw new BadRequestException('Watermark column is required');
      }

      if (!columnNames.has(ingestion.watermarkColumn)) {
        throw new BadRequestException('Watermark column not found');
      }

      if (
        source.columns &&
        source.columns.length > 0 &&
        !source.columns.includes(ingestion.watermarkColumn)
      ) {
        throw new BadRequestException(
          'Watermark column must be included in selected columns',
        );
      }
    }
  }

  private async loadFile(): Promise<PipelinesFile> {
    await this.ensureStorageFile();
    const raw = await fs.readFile(this.filePath, 'utf-8');
    const parsed = JSON.parse(raw) as PipelinesFile;
    parsed.pipelines = parsed.pipelines ?? [];
    return parsed;
  }

  private async saveFile(data: PipelinesFile): Promise<void> {
    await this.withWriteLock(async () => {
      await this.ensureStorageFile();
      const tempFile = `${this.filePath}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
      await fs.rename(tempFile, this.filePath);
    });
  }

  private async ensureStorageFile(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.mkdir(this.dagsDir, { recursive: true });
    await fs.mkdir(this.sparkJobsDir, { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(
        this.filePath,
        JSON.stringify({ pipelines: [] }, null, 2),
      );
    }
  }

  private async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.writeQueue;
    let release: () => void = () => undefined;
    this.writeQueue = new Promise((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await fn();
    } finally {
      release();
    }
  }

  private buildDagRelativePath(dagId: string): string {
    const filePath = path.join(this.dagsDir, `${dagId}.py`);
    return path.relative(process.cwd(), filePath);
  }

  private buildSparkConfigRelativePath(dagId: string): string {
    const filePath = path.join(this.sparkJobsDir, `${dagId}.json`);
    return path.relative(process.cwd(), filePath);
  }

  private getSparkConfigContainerPath(dagId: string): string {
    return `/opt/airflow/spark/jobs/${dagId}.json`;
  }

  private async writeSparkConfigFile(pipeline: PipelineDefinition): Promise<void> {
    const filePath = path.join(this.sparkJobsDir, `${pipeline.dag.dagId}.json`);
    const payload = {
      pipelineId: pipeline.id,
      dagId: pipeline.dag.dagId,
      source: pipeline.source,
      ingestion: pipeline.ingestion,
      destination: pipeline.destination,
      schedule: pipeline.schedule,
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
  }

  private async writeDagFile(pipeline: PipelineDefinition): Promise<void> {
    const filePath = path.join(this.dagsDir, `${pipeline.dag.dagId}.py`);
    const scheduleInterval = pipeline.schedule.cron
      ? `'${pipeline.schedule.cron}'`
      : 'None';
    const sparkConfigPath = this.getSparkConfigContainerPath(pipeline.dag.dagId);

    const pgHost = this.config.get<string>('PGHOST') ?? 'localhost';
    const pgPort = String(this.config.get<number | string>('PGPORT') ?? '5432');
    const pgDatabase = this.config.get<string>('PGDATABASE') ?? 'postgres';
    const pgUser = this.config.get<string>('PGUSER') ?? 'postgres';
    const pgPassword = this.config.get<string>('PGPASSWORD') ?? 'postgres';

    const content = `import os
from datetime import datetime

from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="${pipeline.dag.dagId}",
    schedule_interval=${scheduleInterval},
    start_date=datetime(2024, 1, 1),
    catchup=False,
    is_paused_upon_creation=${pipeline.schedule.cron ? 'False' : 'True'},
    tags=["ingestion"],
) as dag:
    start = EmptyOperator(task_id="start")

    env = os.environ.copy()
    env.update({
        "SOURCE_PGHOST": "${pgHost}",
        "SOURCE_PGPORT": "${pgPort}",
        "SOURCE_PGDATABASE": "${pgDatabase}",
        "SOURCE_PGUSER": "${pgUser}",
        "SOURCE_PGPASSWORD": "${pgPassword}",
    })

    ingest = BashOperator(
        task_id="ingest",
        bash_command="python /opt/airflow/dags/spark_ingest.py --config '${sparkConfigPath}'",
        env=env,
    )

    finish = EmptyOperator(task_id="finish")

    start >> ingest >> finish
`;

    this.assertGeneratedDagContent(content);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  private assertGeneratedDagContent(content: string): void {
    if (!content.includes('from airflow import DAG')) {
      throw new BadRequestException('Generated DAG content is invalid: missing DAG import');
    }

    if (!content.includes('with DAG(')) {
      throw new BadRequestException('Generated DAG content is invalid: missing DAG definition');
    }

    if (/\n\s{2,}import\s/.test(content)) {
      throw new BadRequestException('Generated DAG content is invalid: malformed import indentation');
    }
  }

  private async removeDagFile(pipeline: PipelineDefinition): Promise<void> {
    const filePath = path.join(this.dagsDir, `${pipeline.dag.dagId}.py`);
    try {
      await fs.unlink(filePath);
    } catch {
      return;
    }
  }

  private async removeSparkConfigFile(pipeline: PipelineDefinition): Promise<void> {
    const filePath = path.join(this.sparkJobsDir, `${pipeline.dag.dagId}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      return;
    }
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return slug.length > 0 ? slug : 'pipeline';
  }
}
