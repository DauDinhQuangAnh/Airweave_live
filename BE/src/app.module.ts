import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { LocationsModule } from './modules/locations/locations.module';
import { LiveContextModule } from './modules/live-context/live-context.module';
import { MedicalModule } from './modules/medical/medical.module';
import { SosModule } from './modules/sos/sos.module';
import { CommunityModule } from './modules/community/community.module';
import { AirModule } from './modules/air/air.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ConfigKeysModule } from './modules/config-keys/config-keys.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/api/uploads',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    PreferencesModule,
    LocationsModule,
    LiveContextModule,
    MedicalModule,
    SosModule,
    CommunityModule,
    AirModule,
    AiModule,
    NotificationsModule,
    ConfigKeysModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
