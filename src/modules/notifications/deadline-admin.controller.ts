import { Controller, Post } from '@nestjs/common';

import { DeadlineNotifierService } from './deadline-notifier.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/entities/user.entity.js';

@Controller('admin/deadlines')
export class DeadlineAdminController {
  constructor(private readonly notifier: DeadlineNotifierService) {}

  /** Manually run the scan. Admin-only. Handy for testing before Step 10 adds a cron. */
  @Post('run')
  @Roles(UserRole.ADMIN)
  run() {
    return this.notifier.runOnce();
  }
}
