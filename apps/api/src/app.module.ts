import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { MembershipsController } from './memberships/memberships.controller.js';
import { UseCasesController } from './use-cases/use-cases.controller.js';
import { UseCasesService } from './use-cases/use-cases.service.js';

@Module({
  controllers: [HealthController, AuthController, MembershipsController, UseCasesController],
  providers: [AuthService, UseCasesService],
})
export class AppModule {}
