import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@aegis/db';
import {
  classifyRisk,
  requiredControlCategories,
  type RiskRule,
  type RiskTier,
} from '@aegis/core';
import type { PublicClassifyResult, PublicConvertResult } from '@aegis/contracts';
import { AuthService, type LoginResult } from '../auth/auth.service.js';
import { UseCasesService } from '../use-cases/use-cases.service.js';
import { AssessmentsService } from '../assessments/assessments.service.js';
import { OpsService } from '../ops/ops.service.js';

const QUESTIONNAIRE_KEY = 'EU_AI_ACT_RISK_V1';

const NEXT_STEPS = [
  'Map each obligation to concrete controls and track implementation status',
  'Attach verified evidence so every control is audit-provable',
  'Run reviews and approvals with a tamper-evident audit trail',
  'Export a regulator-ready readiness report',
];

/**
 * The PLG funnel: a free EU AI Act readiness check. `classify` is read-only
 * (no DB writes — safe for an unauthenticated, throttled endpoint); `convert`
 * turns the assessment into a real workspace + governed use case.
 */
@Injectable()
export class PublicAssessmentService {
  constructor(
    private readonly auth: AuthService,
    private readonly useCases: UseCasesService,
    private readonly assessments: AssessmentsService,
    private readonly ops: OpsService,
  ) {}

  private async rules(): Promise<RiskRule[]> {
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { key: QUESTIONNAIRE_KEY },
      include: { questions: true },
    });
    if (!questionnaire) {
      throw new BadRequestException('assessment content not available');
    }
    return questionnaire.questions.map((q) => ({
      key: q.key,
      impliesTierWhenTrue: (q.logic as { impliesTierWhenTrue?: RiskTier } | null)
        ?.impliesTierWhenTrue,
    }));
  }

  async classify(answers: Record<string, boolean>): Promise<PublicClassifyResult> {
    const result = classifyRisk(answers, await this.rules());
    const categories = requiredControlCategories(result.tier);
    const controls =
      categories.length > 0
        ? await prisma.control.findMany({
            where: { framework: { key: 'EU_AI_ACT' }, category: { in: categories } },
            select: { code: true, title: true },
            orderBy: { code: 'asc' },
          })
        : [];
    this.ops.track('public', 'assessment_classified', { tier: result.tier });
    return {
      tier: result.tier,
      rationale: result.rationale,
      obligations: controls,
      nextSteps: NEXT_STEPS,
    };
  }

  async convert(
    email: string,
    systemName: string,
    answers: Record<string, boolean>,
  ): Promise<{ session: LoginResult; result: PublicConvertResult }> {
    const session = await this.auth.devLogin(email);
    const useCase = await this.useCases.create(session.orgId, session.userId, {
      name: systemName,
      description: 'Created from the public EU AI Act readiness assessment.',
    });
    const assessment = await this.assessments.submit(session.orgId, session.userId, useCase.id, {
      questionnaireKey: QUESTIONNAIRE_KEY,
      answers,
    });
    this.ops.track(session.orgId, 'assessment_converted', { tier: assessment.tier });
    return {
      session,
      result: { orgName: session.orgName, useCaseId: useCase.id, tier: assessment.tier },
    };
  }
}
