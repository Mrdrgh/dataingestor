import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class LogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tryNumber?: number;
}
