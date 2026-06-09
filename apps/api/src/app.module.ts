import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { MembershipsController } from './memberships/memberships.controller.js';
import { UseCasesController } from './use-cases/use-cases.controller.js';
import { UseCasesService } from './use-cases/use-cases.service.js';
import { FrameworksController } from './frameworks/frameworks.controller.js';
import { FrameworksService } from './frameworks/frameworks.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    MembershipsController,
    UseCasesController,
    FrameworksController,
  ],
  providers: [AuthService, UseCasesService, FrameworksService],
})
export class AppModule {}
