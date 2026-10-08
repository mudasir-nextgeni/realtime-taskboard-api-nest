import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ListTasksDto } from './dto/list-tasks.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user, projectId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: User,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() filters: ListTasksDto,
  ) {
    return this.tasks.list(user, projectId, filters);
  }
}
