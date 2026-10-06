import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { UsersModule } from '../users/users.module.js';
import { InvitationsController } from './invitations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember]), UsersModule],
  controllers: [ProjectsController, InvitationsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule], // later modules need the entities + service
})
export class ProjectsModule {}
