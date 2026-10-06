import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { ProjectsService } from './projects.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.projects.listMyInvitations(user);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.projects.acceptInvitation(user, id);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.projects.rejectInvitation(user, id);
  }
}
