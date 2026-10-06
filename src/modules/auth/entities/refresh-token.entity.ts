import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 255, unique: true })
  tokenHash: string;

  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ precision: 3 })
  createdAt: Date;
}
