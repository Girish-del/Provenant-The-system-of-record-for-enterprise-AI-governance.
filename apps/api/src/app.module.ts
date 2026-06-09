import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { MembershipsController } from './memberships/memberships.controller.js';
import { UseCasesController } from './use-cases/use-cases.controller.js';
import { UseCasesService } from './use-cases/use-cases.service.js';
import { FrameworksController } from './frameworks/frameworks.controller.js';
import { FrameworksService } from './frameworks/frameworks.service.js';
import { AssessmentsController } from './assessments/assessments.controller.js';
import { QuestionnairesController } from './assessments/questionnaires.controller.js';
import { AssessmentsService } from './assessments/assessments.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    MembershipsController,
    UseCasesController,
    FrameworksController,
    AssessmentsController,
    QuestionnairesController,
  ],
  providers: [AuthService, UseCasesService, FrameworksService, AssessmentsService],
})
export class AppModule {}
