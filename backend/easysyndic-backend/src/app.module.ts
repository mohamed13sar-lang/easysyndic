import { Module } from '@nestjs/common';
import { AnnouncementsModule } from './announcements/announcements.module';
import { CashierModule } from './cashier/cashier.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { ConfigModule } from '@nestjs/config';
import { ApartmentsModule } from './apartments/apartments.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MeModule } from './me/me.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OtpModule } from './otp/otp.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResidentsModule } from './residents/residents.module';
import { ResidencesModule } from './residences/residences.module';
import { StatementsModule } from './statements/statements.module';
import { TeamModule } from './team/team.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    OtpModule,
    ResidencesModule,
    ApartmentsModule,
    ResidentsModule,
    MeModule,
    PaymentsModule,
    InvoicesModule,
    StatementsModule,
    CashierModule,
    ComplaintsModule,
    NotificationsModule,
    AnnouncementsModule,
    DashboardModule,
    TeamModule,
    DocumentsModule,
  ],
})
export class AppModule {}
