import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ProjectMemberRole } from '../entities/project-member.entity.js';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole; // EDITOR or VIEWER (OWNER reserved)
}
