import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task, TaskStatus } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListTasksDto } from './dto/list-tasks.dto.js';
import { User } from '../users/entities/user.entity.js';
import { ProjectAccessService } from '../projects/project-access.service.js';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly access: ProjectAccessService,
  ) {}

  async create(
    user: User,
    projectId: number,
    dto: CreateTaskDto,
  ): Promise<Task> {
    await this.access.assertCanEdit(user, projectId);

    if (dto.assignedUserId != null) {
      await this.access.assertAssigneeIsMember(projectId, dto.assignedUserId);
    }

    const task = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? TaskStatus.TODO,
      attachment: dto.attachment ?? null,
      deadline: dto.deadline ?? null,
      projectId,
      assignedUserId: dto.assignedUserId ?? null,
      createdById: user.id,
    });

    const saved = await this.tasks.save(task);
    return this.loadOne(saved.id);
  }

  async list(
    user: User,
    projectId: number,
    filters: ListTasksDto,
  ): Promise<Task[]> {
    await this.access.assertCanView(user, projectId);

    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignedUser', 'assignedUser')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where('t.project_id = :pid', { pid: projectId })
      .orderBy('t.id', 'DESC');

    if (filters.status) qb.andWhere('t.status = :st', { st: filters.status });

    return qb.getMany();
  }

  async findOne(user: User, id: number): Promise<Task> {
    const task = await this.tasks.findOne({
      where: { id },
      relations: { assignedUser: true, createdBy: true, project: true },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    await this.access.assertCanView(user, task.projectId);
    return task;
  }

  async update(user: User, id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    await this.access.assertCanModifyTask(
      user,
      task.projectId,
      task.createdById,
      'edit',
    );

    if (dto.assignedUserId != null) {
      await this.access.assertAssigneeIsMember(
        task.projectId,
        dto.assignedUserId,
      );
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined)
      task.description = dto.description ?? null;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.attachment !== undefined) task.attachment = dto.attachment ?? null;
    if (dto.deadline !== undefined) task.deadline = dto.deadline ?? null;
    if (dto.assignedUserId !== undefined) {
      task.assignedUserId = dto.assignedUserId ?? null;
      task.deadlineNotificationSentAt = null;
    }
    if (dto.deadline !== undefined) task.deadlineNotificationSentAt = null;

    await this.tasks.save(task);
    return this.loadOne(id);
  }

  async remove(user: User, id: number): Promise<{ deleted: true }> {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);

    await this.access.assertCanModifyTask(
      user,
      task.projectId,
      task.createdById,
      'delete',
    );

    await this.tasks.remove(task);
    return { deleted: true };
  }

  private loadOne(id: number): Promise<Task> {
    return this.tasks.findOneOrFail({
      where: { id },
      relations: { assignedUser: true, createdBy: true },
    });
  }
}
