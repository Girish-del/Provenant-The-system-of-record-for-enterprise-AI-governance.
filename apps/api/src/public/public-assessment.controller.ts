import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  publicClassifySchema,
  publicConvertSchema,
  type PublicClassifyInput,
  type PublicClassifyResult,
  type PublicConvertInput,
  type PublicConvertResult,
  type QuestionnaireDto,
} from '@aegis/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AssessmentsService } from '../assessments/assessments.service.js';
import { PublicAssessmentService } from './public-assessment.service.js';
import { SESSION_COOKIE } from '../auth/cookie.js';
import { env } from '../env.js';

/**
 * Unauthenticated PLG surface — deliberately tiny and hard-throttled.
 * `classify` performs no writes; `convert` is the only write path and carries
 * the strictest limit on the API.
 */
@Controller('public/assessment')
export class PublicAssessmentController {
  constructor(
    private readonly service: PublicAssessmentService,
    private readonly assessments: AssessmentsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  questionnaire(): Promise<QuestionnaireDto> {
    return this.assessments.getQuestionnaire('EU_AI_ACT_RISK_V1');
  }

  @Post('classify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  classify(
    @Body(new ZodValidationPipe(publicClassifySchema)) body: PublicClassifyInput,
  ): Promise<PublicClassifyResult> {
    return this.service.classify(body.answers);
  }

  @Post('convert')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async convert(
    @Body(new ZodValidationPipe(publicConvertSchema)) body: PublicConvertInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicConvertResult> {
    const { session, result } = await this.service.convert(
      body.email,
      body.systemName,
      body.answers,
    );
    res.cookie(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return result;
  }
}
