import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Project } from './entities/project.entity.js';
import {
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
} from './entities/project-member.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { User, UserRole } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { ProjectAccessService } from './project-access.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly members: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly access: ProjectAccessService, // ← was private helpers
  ) {}

  // ---- creation ----------------------------------------------------------

  async create(owner: User, dto: CreateProjectDto): Promise<Project> {
    return this.dataSource.transaction(async (tx) => {
      const project = tx.getRepository(Project).create({
        name: dto.name,
        description: dto.description ?? null,
        ownerId: owner.id,
      });
      await tx.getRepository(Project).save(project);

      await tx.getRepository(ProjectMember).save(
        tx.getRepository(ProjectMember).create({
          projectId: project.id,
          userId: owner.id,
          role: ProjectMemberRole.OWNER,
          status: ProjectMemberStatus.ACCEPTED,
        }),
      );

      return tx.getRepository(Project).findOneOrFail({
        where: { id: project.id },
        relations: { owner: true },
      });
    });
  }

  // ---- reads --------------------------------------------------------------

  async findAll(user: User): Promise<Project[]> {
    if (user.role === UserRole.ADMIN) {
      return this.projects.find({
        relations: { owner: true },
        order: { id: 'DESC' },
      });
    }

    return this.projects
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.owner', 'owner')
      .innerJoin('project_members', 'pm', 'pm.project_id = p.id')
      .where('pm.user_id = :uid', { uid: user.id })
      .andWhere('pm.status = :st', { st: ProjectMemberStatus.ACCEPTED })
      .orderBy('p.id', 'DESC')
      .getMany();
  }

  async findOne(user: User, id: number): Promise<Project> {
    const project = await this.projects.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);

    await this.access.assertCanView(user, id);
    return project;
  }

  // ---- mutations ----------------------------------------------------------

  async update(
    user: User,
    id: number,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(user, id);
    this.access.assertCanManage(user, project.ownerId);

    Object.assign(project, dto);
    return this.projects.save(project);
  }

  async remove(user: User, id: number): Promise<{ deleted: true }> {
    const project = await this.findOne(user, id);
    this.access.assertCanManage(user, project.ownerId);
    await this.projects.remove(project);
    return { deleted: true };
  }

  // ---- helpers still used elsewhere ---------------------------------------

  getMembership(userId: number, projectId: number) {
    return this.access.getMembership(userId, projectId);
  }

  async listMembers(projectId: number): Promise<ProjectMember[]> {
    return this.members.find({
      where: { projectId },
      relations: { user: true },
      order: { id: 'ASC' },
    });
  }

  // ---- invitations (unchanged behavior, delegating manage checks) ---------

  async invite(
    actor: User,
    projectId: number,
    dto: InviteMemberDto,
  ): Promise<ProjectMember> {
    const project = await this.findOne(actor, projectId);
    this.access.assertCanManage(actor, project.ownerId);

    const invitee = await this.users.findByEmail(dto.email);
    if (!invitee)
      throw new NotFoundException(`No user with email ${dto.email}`);
    if (invitee.id === project.ownerId) {
      throw new BadRequestException('Owner is already a member');
    }

    const existing = await this.members.findOne({
      where: { projectId, userId: invitee.id },
    });

    if (existing?.status === ProjectMemberStatus.ACCEPTED) {
      throw new ConflictException('User is already a member');
    }
    if (existing?.status === ProjectMemberStatus.PENDING) {
      throw new ConflictException('Invitation already pending');
    }

    const role =
      dto.role && dto.role !== ProjectMemberRole.OWNER
        ? dto.role
        : ProjectMemberRole.VIEWER;

    if (existing) {
      existing.status = ProjectMemberStatus.PENDING;
      existing.role = role;
      return this.members.save(existing);
    }

    return this.members.save(
      this.members.create({
        projectId,
        userId: invitee.id,
        role,
        status: ProjectMemberStatus.PENDING,
      }),
    );
  }

  async listMyInvitations(user: User): Promise<ProjectMember[]> {
    return this.members.find({
      where: { userId: user.id, status: ProjectMemberStatus.PENDING },
      relations: { project: { owner: true } },
      order: { id: 'DESC' },
    });
  }

  async acceptInvitation(user: User, memberId: number): Promise<ProjectMember> {
    const row = await this.members.findOne({
      where: { id: memberId, userId: user.id },
    });
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.status !== ProjectMemberStatus.PENDING) {
      throw new BadRequestException(
        `Invitation already ${row.status.toLowerCase()}`,
      );
    }
    row.status = ProjectMemberStatus.ACCEPTED;
    return this.members.save(row);
  }

  async rejectInvitation(user: User, memberId: number): Promise<ProjectMember> {
    const row = await this.members.findOne({
      where: { id: memberId, userId: user.id },
    });
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.status !== ProjectMemberStatus.PENDING) {
      throw new BadRequestException(
        `Invitation already ${row.status.toLowerCase()}`,
      );
    }
    row.status = ProjectMemberStatus.REJECTED;
    return this.members.save(row);
  }

  async updateMemberRole(
    actor: User,
    projectId: number,
    memberId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<ProjectMember> {
    const project = await this.findOne(actor, projectId);
    this.access.assertCanManage(actor, project.ownerId);

    const row = await this.members.findOne({
      where: { id: memberId, projectId },
    });
    if (!row) throw new NotFoundException('Member not found');

    if (row.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot change the owner role');
    }
    if (dto.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot promote to OWNER');
    }

    row.role = dto.role;
    return this.members.save(row);
  }

  async removeMember(actor: User, projectId: number, memberId: number) {
    const project = await this.findOne(actor, projectId);
    this.access.assertCanManage(actor, project.ownerId);

    const row = await this.members.findOne({
      where: { id: memberId, projectId },
    });
    if (!row) throw new NotFoundException('Member not found');
    if (row.role === ProjectMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove the project owner');
    }

    await this.members.remove(row);
    return { deleted: true };
  }
}
