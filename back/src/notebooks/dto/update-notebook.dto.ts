import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class UpdateNotebookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  cells?: unknown[];

  @IsOptional()
  @IsUUID()
  compute_profile_id?: string;
}
