import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './entities/task.entity.js';
import { TasksService } from './tasks.service.js';
import { ProjectTasksController } from './tasks.controller.js';
import { TaskItemController } from './task-item.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), ProjectsModule],
  controllers: [ProjectTasksController, TaskItemController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
