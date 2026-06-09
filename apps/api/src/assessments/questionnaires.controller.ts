import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { QuestionnaireDto } from '@aegis/contracts';
import { AuthGuard } from '../auth/auth.guard.js';
import { AssessmentsService } from './assessments.service.js';

/** Read a questionnaire (global content) so a client can render the form. */
@Controller('questionnaires')
@UseGuards(AuthGuard)
export class QuestionnairesController {
  constructor(private readonly service: AssessmentsService) {}

  @Get(':key')
  get(@Param('key') key: string): Promise<QuestionnaireDto> {
    return this.service.getQuestionnaire(key);
  }
}
