import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(token: string) {
    const hash = this.hash(token);
    const record = await this.refreshRepo.findOne({
      where: { tokenHash: hash, revokedAt: IsNull() },
      relations: { user: true },
    });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // rotate: revoke the old one, issue a new pair
    record.revokedAt = new Date();
    await this.refreshRepo.save(record);

    return this.issueTokens(record.user);
  }

  async logout(token: string) {
    const hash = this.hash(token);
    const record = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
    });
    if (record && !record.revokedAt) {
      record.revokedAt = new Date();
      await this.refreshRepo.save(record);
    }
    return { loggedOut: true };
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const days = this.config.get<number>('jwt.refreshDays') ?? 7;

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      }),
    );

    return { accessToken, refreshToken, user };
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
