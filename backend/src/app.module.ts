import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ParkingSpacesModule } from './parking-spaces/parking-spaces.module';
import { ParkingSessionsModule } from './parking-sessions/parking-sessions.module';
import { QrAccessModule } from './qr-access/qr-access.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BarriersModule } from './barriers/barriers.module';
import { CamerasModule } from './cameras/cameras.module';
import { SecurityModule } from './security/security.module';
import { ReportsModule } from './reports/reports.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MapModule } from './map/map.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    ParkingSpacesModule,
    ParkingSessionsModule,
    QrAccessModule,
    PaymentsModule,
    ReservationsModule,
    NotificationsModule,
    BarriersModule,
    CamerasModule,
    SecurityModule,
    ReportsModule,
    RealtimeModule,
    MapModule,
    DashboardModule,
  ],
})
export class AppModule {}
