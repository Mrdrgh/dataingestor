import { IsOptional, IsString } from 'class-validator';

export class ColumnsQueryDto {
  @IsOptional()
  @IsString()
  schema?: string;
}
