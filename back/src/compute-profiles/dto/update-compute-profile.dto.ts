import { IsString, IsOptional, IsObject, IsUrl } from 'class-validator';

export class UpdateComputeProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  kernel_gateway_url?: string;

  @IsOptional()
  @IsString()
  auth_token?: string;

  @IsOptional()
  @IsString()
  delta_base_path?: string;

  @IsOptional()
  @IsObject()
  spark_config?: Record<string, string>;
}
