import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../entities/task.entity.js';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedUserId?: number;

  @IsOptional()
  @Type(() => Date)
  deadline?: Date;
}
