import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class PipelineSourceDto {
  @IsOptional()
  @IsString()
  schema?: string;

  @IsString()
  table!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];
}

class PipelineIngestionDto {
  @Transform(({ value }: { value: string }) =>
    value === 'full_refresh' ? 'full' : value,
  )
  @IsIn(['full', 'incremental'])
  mode!: 'full' | 'incremental';

  @IsOptional()
  @IsString()
  watermarkColumn?: string;
}

class PipelineDestinationDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsIn(['overwrite', 'append'])
  mode?: 'overwrite' | 'append';
}

class PipelineScheduleDto {
  @IsOptional()
  @IsString()
  cron?: string | null;
}

export class CreatePipelineDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => PipelineSourceDto)
  source!: PipelineSourceDto;

  @ValidateNested()
  @Type(() => PipelineIngestionDto)
  ingestion!: PipelineIngestionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PipelineDestinationDto)
  destination?: PipelineDestinationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PipelineScheduleDto)
  schedule?: PipelineScheduleDto;
}
