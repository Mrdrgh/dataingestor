import { IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerRunDto {
  @IsOptional()
  @IsString()
  dagRunId?: string;

  @IsOptional()
  @IsObject()
  conf?: Record<string, unknown>;
}
