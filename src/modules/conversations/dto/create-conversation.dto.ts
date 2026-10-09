import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConversationDto {
  @Type(() => Number)
  @IsInt()
  userId: number;
}
