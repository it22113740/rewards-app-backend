import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VenuesModule } from './venues/venues.module.js';
import { PerksModule } from './perks/perks.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';
import { UploadModule } from './upload/upload.module.js';
import { SubmissionsModule } from './submissions/submissions.module.js';
import { RedemptionsModule } from './redemptions/redemptions.module.js';
import { MailModule } from './mail/mail.module.js';
import { KeepAliveService } from './keep-alive.service.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    VenuesModule,
    PerksModule,
    PromotionsModule,
    UploadModule,
    SubmissionsModule,
    RedemptionsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, KeepAliveService],
})
export class AppModule {}
