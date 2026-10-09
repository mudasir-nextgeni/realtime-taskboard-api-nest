import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';

import { Task } from '../tasks/entities/task.entity.js';

export interface NotifierRunResult {
  scanned: number;
  sent: number;
  failed: number;
}

@Injectable()
export class DeadlineNotifierService {
  private readonly log = new Logger(DeadlineNotifierService.name);
  private readonly batchSize = 100;

  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Finds tasks whose deadline has passed and whose deadline_notification_sent_at
   * is still null, emails the assignee (or creator), and stamps the flag.
   */
  async runOnce(): Promise<NotifierRunResult> {
    const now = new Date();

    const due = await this.tasks.find({
      where: {
        deadline: LessThanOrEqual(now),
        deadlineNotificationSentAt: IsNull(),
      },
      relations: { assignedUser: true, createdBy: true, project: true },
      take: this.batchSize,
      order: { deadline: 'ASC' },
    });

    const result: NotifierRunResult = {
      scanned: due.length,
      sent: 0,
      failed: 0,
    };
    if (!due.length) return result;

    for (const task of due) {
      const recipient = task.assignedUser ?? task.createdBy;
      if (!recipient?.email) {
        // Nothing to send to — still stamp so we don't re-scan forever.
        task.deadlineNotificationSentAt = now;
        await this.tasks.save(task);
        continue;
      }

      try {
        await this.sendDeadlineEmail(task, recipient.email, recipient.name);
        task.deadlineNotificationSentAt = now;
        await this.tasks.save(task);
        result.sent++;
      } catch (err) {
        result.failed++;
        this.log.error(
          `Failed to send deadline email for task ${task.id}: ${(err as Error).message}`,
        );
        // do NOT stamp → will retry next run
      }
    }

    this.log.log(
      `Deadline scan: scanned=${result.scanned} sent=${result.sent} failed=${result.failed}`,
    );
    return result;
  }

  private async sendDeadlineEmail(
    task: Task,
    to: string,
    recipientName: string,
  ) {
    const frontendUrl = this.config.get<string>('frontendUrl');
    const taskUrl = frontendUrl ? `${frontendUrl}/tasks/${task.id}` : undefined;

    await this.mailer.sendMail({
      to,
      subject: `⏰ Deadline passed: ${task.title}`,
      template: 'deadline-reminder',
      context: {
        recipientName,
        taskTitle: task.title,
        taskDescription: task.description ?? '',
        taskStatus: task.status.replace('_', ' '),
        deadline: task.deadline?.toUTCString() ?? '',
        projectName: task.project?.name ?? '—',
        taskUrl,
      },
    });
  }
}
