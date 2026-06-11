import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { forOrg } from '@aegis/db';
import { audit } from '../common/audit.js';
import { env } from '../env.js';

export interface AiProvenance {
  provider: string;
  model: string;
  generated_at: string;
  advisory: boolean;
  label: string;
  sources: string[];
}

export interface AiDraftResult {
  content: string;
  provenance: AiProvenance;
}

export interface AiSuggestion {
  code: string;
  title: string;
  rationale: string;
}

/**
 * Proxy to the internal Python AI service. The browser never talks to it
 * directly: this layer enforces auth/RBAC/tenancy, forwards the org id for
 * per-tenant budgeting, signs requests with the internal token, and audit-logs
 * every AI interaction. AI output is advisory and never auto-applied.
 */
@Injectable()
export class AiService {
  private async call<T>(path: string, orgId: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-org-id': orgId,
    };
    if (env.INTERNAL_API_TOKEN) {
      headers['x-internal-token'] = env.INTERNAL_API_TOKEN;
    }
    let res: globalThis.Response;
    try {
      res = await fetch(`${env.AI_SERVICE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ServiceUnavailableException('AI service unreachable');
    }
    if (res.status === 429 || res.status === 503) {
      throw new ServiceUnavailableException(await res.text());
    }
    if (!res.ok) {
      throw new BadGatewayException(`AI service error (${res.status})`);
    }
    return (await res.json()) as T;
  }

  async draft(orgId: string, actorId: string, useCaseId: string, kind: string): Promise<AiDraftResult> {
    const useCase = await forOrg(orgId, async (tx) => {
      const found = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!found) {
        throw new NotFoundException('use case not found');
      }
      return found;
    });
    const result = await this.call<AiDraftResult>('/draft', orgId, {
      kind,
      use_case: {
        name: useCase.name,
        purpose: useCase.purpose,
        description: useCase.description,
        risk_tier: useCase.riskTier,
      },
    });
    await forOrg(orgId, (tx) =>
      audit(tx, {
        orgId,
        actorId,
        action: 'ai.draft',
        targetType: 'UseCase',
        targetId: useCaseId,
        after: { kind, provider: result.provenance.provider, model: result.provenance.model },
      }),
    );
    return result;
  }

  async suggestControls(
    orgId: string,
    actorId: string,
    useCaseId: string,
  ): Promise<{ suggestions: AiSuggestion[]; provenance: AiProvenance }> {
    const useCase = await forOrg(orgId, async (tx) => {
      const found = await tx.useCase.findUnique({ where: { id: useCaseId } });
      if (!found) {
        throw new NotFoundException('use case not found');
      }
      return found;
    });
    const result = await this.call<{ suggestions: AiSuggestion[]; provenance: AiProvenance }>(
      '/suggest-controls',
      orgId,
      {
        use_case: { name: useCase.name, risk_tier: useCase.riskTier },
        framework: 'EU_AI_ACT',
      },
    );
    await forOrg(orgId, (tx) =>
      audit(tx, {
        orgId,
        actorId,
        action: 'ai.suggest_controls',
        targetType: 'UseCase',
        targetId: useCaseId,
        after: { count: result.suggestions.length },
      }),
    );
    return result;
  }
}
