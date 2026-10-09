import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from '../tasks/entities/task.entity.js';
import { DeadlineNotifierService } from './deadline-notifier.service.js';
import { DeadlineAdminController } from './deadline-admin.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [DeadlineAdminController],
  providers: [DeadlineNotifierService],
  exports: [DeadlineNotifierService],
})
export class NotificationsModule {}
