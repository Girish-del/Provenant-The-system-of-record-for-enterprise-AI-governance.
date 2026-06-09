import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { MembershipsController } from './memberships/memberships.controller.js';

@Module({
  controllers: [HealthController, AuthController, MembershipsController],
  providers: [AuthService],
})
export class AppModule {}
