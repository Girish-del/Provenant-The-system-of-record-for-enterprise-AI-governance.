import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, forOrg, type RiskAssessment } from '@aegis/db';
import { classifyRisk, type RiskRule, type RiskTier } from '@aegis/core';
import type { SubmitAssessmentInput, QuestionnaireDto, AssessmentResultDto } from '@aegis/contracts';
import { audit } from '../common/audit.js';

@Injectable()
export class AssessmentsService {
  async getQuestionnaire(key: string): Promise<QuestionnaireDto> {
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { key },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!questionnaire) {
      throw new NotFoundException('questionnaire not found');
    }
    return {
      key: questionnaire.key,
      name: questionnaire.name,
      version: questionnaire.version,
      questions: questionnaire.questions.map((q) => ({
        key: q.key,
        order: q.order,
        text: q.text,
        type: q.type,
      })),
    };
  }

  submit(
    orgId: string,
    actorId: string,
    useCaseId: string,
    input: SubmitAssessmentInput,
  ): Promise<AssessmentResultDto> {
    return forOrg(orgId, async (tx) => {
      const useCase = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!useCase) {
        throw new NotFoundException('use case not found');
      }
      const questionnaire = await tx.questionnaire.findUnique({
        where: { key: input.questionnaireKey },
        include: { questions: true },
      });
      if (!questionnaire) {
        throw new BadRequestException('unknown questionnaire');
      }
      const rules: RiskRule[] = questionnaire.questions.map((q) => ({
        key: q.key,
        impliesTierWhenTrue: (q.logic as { impliesTierWhenTrue?: RiskTier } | null)?.impliesTierWhenTrue,
      }));
      const result = classifyRisk(input.answers, rules);

      const assessment = await tx.riskAssessment.create({
        data: {
          orgId,
          useCaseId,
          questionnaireId: questionnaire.id,
          responses: input.answers,
          computedTier: result.tier,
          rationale: result.rationale,
          status: 'COMPLETED',
          assessedById: actorId,
        },
      });
      await tx.useCase.update({ where: { id: useCaseId }, data: { riskTier: result.tier } });
      await audit(tx, {
        orgId,
        actorId,
        action: 'assessment.submit',
        targetType: 'RiskAssessment',
        targetId: assessment.id,
        after: { tier: result.tier, rationale: result.rationale },
      });

      return {
        id: assessment.id,
        useCaseId,
        tier: result.tier,
        rationale: result.rationale,
        status: assessment.status,
        createdAt: assessment.createdAt.toISOString(),
      };
    });
  }

  list(orgId: string, useCaseId: string): Promise<RiskAssessment[]> {
    return forOrg(orgId, (tx) =>
      tx.riskAssessment.findMany({ where: { useCaseId }, orderBy: { createdAt: 'desc' } }),
    );
  }
}
