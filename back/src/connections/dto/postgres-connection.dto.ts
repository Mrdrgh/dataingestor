import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class PostgresConnectionDto {
  @IsString()
  host!: string;

  @IsNumber()
  port!: number;

  @IsString()
  database!: string;

  @IsString()
  user!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsBoolean()
  trustServerCertificate?: boolean;
}
