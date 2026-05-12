import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateNotebookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsUUID()
  @IsNotEmpty({ message: 'A compute profile is required to create a notebook' })
  compute_profile_id!: string;
}
