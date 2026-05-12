import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { NotebookDatabaseService } from '../notebook-database/notebook-database.service';
import { CreateComputeProfileDto } from './dto/create-compute-profile.dto';
import { UpdateComputeProfileDto } from './dto/update-compute-profile.dto';
import axios from 'axios';

export interface ComputeProfile {
  [key: string]: unknown;
  id: string;
  name: string;
  kernel_gateway_url: string;
  auth_token: string | null;
  delta_base_path: string;
  spark_config: Record<string, string>;
  custom_pip_packages: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ComputeProfileService {
  private readonly logger = new Logger(ComputeProfileService.name);

  constructor(private readonly db: NotebookDatabaseService) {}

  async findAll(): Promise<ComputeProfile[]> {
    const result = await this.db.query<ComputeProfile>(
      `SELECT id, name, kernel_gateway_url, auth_token, delta_base_path,
              spark_config, custom_pip_packages, status, created_at, updated_at
       FROM compute_profiles
       ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  async findOne(id: string): Promise<ComputeProfile> {
    const result = await this.db.query<ComputeProfile>(
      `SELECT id, name, kernel_gateway_url, auth_token, delta_base_path,
              spark_config, custom_pip_packages, status, created_at, updated_at
       FROM compute_profiles
       WHERE id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Compute profile ${id} not found`);
    }

    return result.rows[0];
  }

  async create(dto: CreateComputeProfileDto): Promise<ComputeProfile> {
    const result = await this.db.query<ComputeProfile>(
      `INSERT INTO compute_profiles (name, kernel_gateway_url, auth_token, delta_base_path, spark_config, custom_pip_packages)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.name,
        dto.kernel_gateway_url,
        dto.auth_token ?? null,
        dto.delta_base_path ?? '/opt/spark/delta',
        JSON.stringify(dto.spark_config ?? {}),
        JSON.stringify(dto.custom_pip_packages ?? []),
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    dto: UpdateComputeProfileDto,
  ): Promise<ComputeProfile> {
    // Ensure the profile exists first
    await this.findOne(id);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.kernel_gateway_url !== undefined) {
      fields.push(`kernel_gateway_url = $${paramIndex++}`);
      values.push(dto.kernel_gateway_url);
    }
    if (dto.auth_token !== undefined) {
      fields.push(`auth_token = $${paramIndex++}`);
      values.push(dto.auth_token);
    }
    if (dto.delta_base_path !== undefined) {
      fields.push(`delta_base_path = $${paramIndex++}`);
      values.push(dto.delta_base_path);
    }
    if (dto.spark_config !== undefined) {
      fields.push(`spark_config = $${paramIndex++}`);
      values.push(JSON.stringify(dto.spark_config));
    }
    if (dto.custom_pip_packages !== undefined) {
      fields.push(`custom_pip_packages = $${paramIndex++}`);
      values.push(JSON.stringify(dto.custom_pip_packages));
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<ComputeProfile>(
      `UPDATE compute_profiles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.db.query(`DELETE FROM compute_profiles WHERE id = $1`, [id]);
  }

  async testConnection(
    id: string,
  ): Promise<{ status: string; kernels_available: string[] }> {
    const profile = await this.findOne(id);

    try {
      const headers: Record<string, string> = {};
      if (profile.auth_token) {
        headers['Authorization'] = `token ${profile.auth_token}`;
      }

      const response = await axios.get(
        `${profile.kernel_gateway_url}/api/kernelspecs`,
        { headers, timeout: 5000 },
      );

      const specs = response.data?.kernelspecs ?? {};
      const kernelNames = Object.keys(specs);

      // Update status to reachable
      await this.db.query(
        `UPDATE compute_profiles SET status = 'reachable', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      return { status: 'ok', kernels_available: kernelNames };
    } catch (error) {
      // Update status to unreachable
      await this.db.query(
        `UPDATE compute_profiles SET status = 'unreachable', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Compute profile ${id} unreachable: ${message}`);
      throw new BadGatewayException(`Connection failed: ${message}`);
    }
  }
}
