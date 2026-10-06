import { IsEnum } from 'class-validator';
import { ProjectMemberRole } from '../entities/project-member.entity.js';

export class UpdateMemberRoleDto {
  @IsEnum(ProjectMemberRole)
  role: ProjectMemberRole;
}
