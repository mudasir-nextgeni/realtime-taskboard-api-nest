import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DirectConversation } from './entities/direct-conversation.entity.js';
import { DirectMessage } from './entities/direct-message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(DirectConversation)
    private readonly convs: Repository<DirectConversation>,
    @InjectRepository(DirectMessage)
    private readonly msgs: Repository<DirectMessage>,
    private readonly users: UsersService,
  ) {}

  // ---- start / list -------------------------------------------------------

  /** Create or fetch the DM thread between `me` and `otherUserId`. */
  async start(me: User, otherUserId: number): Promise<DirectConversation> {
    if (otherUserId === me.id) {
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );
    }

    const other = await this.users.findOne(otherUserId).catch(() => null);
    if (!other) throw new NotFoundException(`User ${otherUserId} not found`);

    // canonical ordering so the unique key works
    const [a, b] =
      me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];

    const existing = await this.convs.findOne({
      where: { userAId: a, userBId: b },
      relations: { userA: true, userB: true },
    });
    if (existing) return existing;

    const created = await this.convs.save(
      this.convs.create({ userAId: a, userBId: b }),
    );
    return this.convs.findOneOrFail({
      where: { id: created.id },
      relations: { userA: true, userB: true },
    });
  }

  listMine(me: User): Promise<DirectConversation[]> {
    return this.convs
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.userA', 'userA')
      .leftJoinAndSelect('c.userB', 'userB')
      .where('c.user_a_id = :id OR c.user_b_id = :id', { id: me.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
  }

  // ---- messages -----------------------------------------------------------

  async listMessages(
    me: User,
    conversationId: number,
  ): Promise<DirectMessage[]> {
    const conv = await this.assertParticipant(me, conversationId);
    return this.msgs.find({
      where: { conversationId: conv.id },
      relations: { sender: true },
      order: { id: 'ASC' },
    });
  }

  async send(
    me: User,
    conversationId: number,
    content: string,
  ): Promise<DirectMessage> {
    const conv = await this.assertParticipant(me, conversationId);

    const saved = await this.msgs.save(
      this.msgs.create({ conversationId: conv.id, senderId: me.id, content }),
    );

    // bump conversation.updated_at so listMine sorts by latest activity
    conv.updatedAt = new Date();
    await this.convs.save(conv);

    return this.msgs.findOneOrFail({
      where: { id: saved.id },
      relations: { sender: true },
    });
  }

  /** Mark all messages in this conversation that I did NOT send as read. */
  async markRead(
    me: User,
    conversationId: number,
  ): Promise<{ marked: number }> {
    await this.assertParticipant(me, conversationId);

    const res = await this.msgs
      .createQueryBuilder()
      .update(DirectMessage)
      .set({ readAt: new Date() })
      .where('conversation_id = :cid', { cid: conversationId })
      .andWhere('sender_id != :uid', { uid: me.id })
      .andWhere('read_at IS NULL')
      .execute();

    return { marked: res.affected ?? 0 };
  }

  // ---- policy -------------------------------------------------------------

  private async assertParticipant(
    me: User,
    conversationId: number,
  ): Promise<DirectConversation> {
    const conv = await this.convs.findOne({ where: { id: conversationId } });
    if (!conv)
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    if (conv.userAId !== me.id && conv.userBId !== me.id) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
    return conv;
  }
}
