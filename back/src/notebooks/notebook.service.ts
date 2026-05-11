import { Injectable, NotFoundException } from '@nestjs/common';
import { NotebookDatabaseService } from '../notebook-database/notebook-database.service';
import { CreateNotebookDto } from './dto/create-notebook.dto';
import { UpdateNotebookDto } from './dto/update-notebook.dto';

export interface Notebook {
  [key: string]: unknown;
  id: string;
  title: string;
  cells: unknown[];
  compute_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookListItem {
  [key: string]: unknown;
  id: string;
  title: string;
  cell_count: number;
  compute_profile_id: string | null;
  compute_profile_name: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NotebookService {
  constructor(private readonly db: NotebookDatabaseService) {}

  async findAll(): Promise<NotebookListItem[]> {
    const result = await this.db.query<
      NotebookListItem & { cells: unknown[] }
    >(
      `SELECT n.id, n.title, n.cells, n.compute_profile_id,
              cp.name AS compute_profile_name,
              n.created_at, n.updated_at
       FROM notebooks n
       LEFT JOIN compute_profiles cp ON n.compute_profile_id = cp.id
       ORDER BY n.updated_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      cell_count: Array.isArray(row.cells) ? row.cells.length : 0,
      compute_profile_id: row.compute_profile_id,
      compute_profile_name: row.compute_profile_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async findOne(id: string): Promise<Notebook> {
    const result = await this.db.query<Notebook>(
      `SELECT id, title, cells, compute_profile_id, created_at, updated_at
       FROM notebooks
       WHERE id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Notebook ${id} not found`);
    }

    return result.rows[0];
  }

  async create(dto: CreateNotebookDto): Promise<Notebook> {
    const result = await this.db.query<Notebook>(
      `INSERT INTO notebooks (title, compute_profile_id)
       VALUES ($1, $2)
       RETURNING *`,
      [dto.title ?? 'Untitled Notebook', dto.compute_profile_id ?? null],
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateNotebookDto): Promise<Notebook> {
    await this.findOne(id);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }
    if (dto.cells !== undefined) {
      fields.push(`cells = $${paramIndex++}`);
      values.push(JSON.stringify(dto.cells));
    }
    if (dto.compute_profile_id !== undefined) {
      fields.push(`compute_profile_id = $${paramIndex++}`);
      values.push(dto.compute_profile_id);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<Notebook>(
      `UPDATE notebooks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.db.query(`DELETE FROM notebooks WHERE id = $1`, [id]);
  }
}
