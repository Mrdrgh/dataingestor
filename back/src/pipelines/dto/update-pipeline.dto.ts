import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdatePipelineSourceDto {
  @IsOptional()
  @IsString()
  schema?: string;

  @IsOptional()
  @IsString()
  table?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];
}

class UpdatePipelineIngestionDto {
  @IsOptional()
  @IsIn(['full', 'incremental'])
  mode?: 'full' | 'incremental';

  @IsOptional()
  @IsString()
  watermarkColumn?: string;
}

class UpdatePipelineDestinationDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsIn(['overwrite', 'append'])
  mode?: 'overwrite' | 'append';
}

class UpdatePipelineScheduleDto {
  @IsOptional()
  @IsString()
  cron?: string | null;
}

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePipelineSourceDto)
  source?: UpdatePipelineSourceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePipelineIngestionDto)
  ingestion?: UpdatePipelineIngestionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePipelineDestinationDto)
  destination?: UpdatePipelineDestinationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePipelineScheduleDto)
  schedule?: UpdatePipelineScheduleDto;
}
