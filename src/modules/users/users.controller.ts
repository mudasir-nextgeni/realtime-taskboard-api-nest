import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { User, UserRole } from './entities/user.entity.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Self } from '../auth/decorators/self.decorator.js';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @Self('id')
  @UseGuards(SelfOrAdminGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @Self('id')
  @UseGuards(SelfOrAdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id);
  }
}
