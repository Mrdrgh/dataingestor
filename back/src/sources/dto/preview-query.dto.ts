import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class PreviewQueryDto {
  @IsOptional()
  @IsString()
  schema?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  columns?: string;
}
