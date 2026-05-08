import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListRunsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
