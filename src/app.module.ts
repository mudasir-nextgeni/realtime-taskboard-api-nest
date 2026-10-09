import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { MailerModule } from '@nestjs-modules/mailer';

import configuration from './config/configuration.js';
import { typeOrmConfig } from './config/typeorm.config.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const devLogOnly = config.get<boolean>('mail.devLogOnly');

        return {
          // In dev we don't need a real SMTP server:
          // jsonTransport causes Nodemailer to log the message instead of sending it.
          transport: devLogOnly
            ? { jsonTransport: true }
            : {
                host: config.get<string>('mail.host'),
                port: config.get<number>('mail.port'),
                secure: config.get<boolean>('mail.secure'),
                auth: {
                  user: config.get<string>('mail.user'),
                  pass: config.get<string>('mail.pass'),
                },
              },
          defaults: {
            from: config.get<string>('mail.from'),
          },
          template: {
            dir: join(process.cwd(), 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    ConversationsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
