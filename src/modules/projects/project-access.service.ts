import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../users/entities/user.entity.js';
import {
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
} from './entities/project-member.entity.js';

export type TaskModifyLevel = 'edit' | 'delete';

@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly members: Repository<ProjectMember>,
  ) {}

  getMembership(
    userId: number,
    projectId: number,
  ): Promise<ProjectMember | null> {
    return this.members.findOne({ where: { userId, projectId } });
  }

  /** ADMIN bypasses; otherwise must be an ACCEPTED member. */
  async assertCanView(
    user: User,
    projectId: number,
  ): Promise<ProjectMember | null> {
    if (user.role === UserRole.ADMIN) return null;
    const m = await this.getMembership(user.id, projectId);
    if (!m || m.status !== ProjectMemberStatus.ACCEPTED) {
      throw new ForbiddenException('You are not a member of this project');
    }
    return m;
  }

  /** ADMIN, OWNER, or EDITOR of the project. */
  async assertCanEdit(
    user: User,
    projectId: number,
  ): Promise<ProjectMember | null> {
    if (user.role === UserRole.ADMIN) return null;
    const m = await this.getMembership(user.id, projectId);
    if (!m || m.status !== ProjectMemberStatus.ACCEPTED) {
      throw new ForbiddenException('You are not a member of this project');
    }
    if (
      m.role !== ProjectMemberRole.OWNER &&
      m.role !== ProjectMemberRole.EDITOR
    ) {
      throw new ForbiddenException(
        'Only owners and editors can modify this project',
      );
    }
    return m;
  }

  /** ADMIN or the project owner. */
  assertCanManage(user: User, ownerId: number): void {
    if (user.role === UserRole.ADMIN) return;
    if (ownerId === user.id) return;
    throw new ForbiddenException('Only the project owner can do this');
  }

  /** An assignee must be an ACCEPTED member of the project. */
  async assertAssigneeIsMember(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const m = await this.getMembership(userId, projectId);
    if (!m || m.status !== ProjectMemberStatus.ACCEPTED) {
      throw new BadRequestException(
        'Assigned user must be an accepted member of the project',
      );
    }
  }

  /** Task-level checks: creator, project OWNER/EDITOR (edit) or OWNER (delete), or ADMIN. */
  async assertCanModifyTask(
    user: User,
    projectId: number,
    createdById: number,
    level: TaskModifyLevel,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) return;
    if (createdById === user.id) return;

    const m = await this.getMembership(user.id, projectId);
    if (!m || m.status !== ProjectMemberStatus.ACCEPTED) {
      throw new ForbiddenException('You cannot modify this task');
    }
    if (
      level === 'edit' &&
      (m.role === ProjectMemberRole.OWNER ||
        m.role === ProjectMemberRole.EDITOR)
    ) {
      return;
    }
    if (level === 'delete' && m.role === ProjectMemberRole.OWNER) return;

    throw new ForbiddenException('You cannot modify this task');
  }
}
