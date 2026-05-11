import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateNotebookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  compute_profile_id?: string;
}
