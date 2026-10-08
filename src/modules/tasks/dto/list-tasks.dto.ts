import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../entities/task.entity.js';

export class ListTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
