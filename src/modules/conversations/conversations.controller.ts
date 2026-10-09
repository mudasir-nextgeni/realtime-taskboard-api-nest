import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ConversationsService } from './conversations.service.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  start(@CurrentUser() me: User, @Body() dto: CreateConversationDto) {
    return this.conversations.start(me, dto.userId);
  }

  @Get()
  listMine(@CurrentUser() me: User) {
    return this.conversations.listMine(me);
  }

  @Get(':id/messages')
  listMessages(@CurrentUser() me: User, @Param('id', ParseIntPipe) id: number) {
    return this.conversations.listMessages(me, id);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() me: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.send(me, id, dto.content);
  }

  @Post(':id/read')
  markRead(@CurrentUser() me: User, @Param('id', ParseIntPipe) id: number) {
    return this.conversations.markRead(me, id);
  }
}
