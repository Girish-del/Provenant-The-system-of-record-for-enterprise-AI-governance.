import type { RiskTier } from './lifecycle';

export interface RiskRule {
  key: string;
  /** If the answer for `key` is true, the use case is at least this tier. */
  impliesTierWhenTrue?: RiskTier;
}

export interface RiskClassification {
  tier: RiskTier;
  rationale: string;
  fired: { key: string; tier: RiskTier }[];
}

// Severity order: a higher rank wins when multiple rules fire.
const TIER_RANK: Record<RiskTier, number> = {
  UNASSIGNED: 0,
  MINIMAL: 1,
  LIMITED: 2,
  HIGH: 3,
  PROHIBITED: 4,
};

/**
 * EU AI Act risk classification: evaluate boolean answers against the
 * questionnaire's per-question tier implications. The most severe fired rule
 * wins; if nothing fires the system is MINIMAL. Pure and deterministic.
 */
export function classifyRisk(
  answers: Record<string, boolean>,
  rules: RiskRule[],
): RiskClassification {
  const fired: { key: string; tier: RiskTier }[] = [];
  for (const rule of rules) {
    if (rule.impliesTierWhenTrue && answers[rule.key] === true) {
      fired.push({ key: rule.key, tier: rule.impliesTierWhenTrue });
    }
  }

  let tier: RiskTier = 'MINIMAL';
  for (const entry of fired) {
    if (TIER_RANK[entry.tier] > TIER_RANK[tier]) {
      tier = entry.tier;
    }
  }

  const rationale =
    fired.length === 0
      ? 'No prohibited, high-risk, or limited-risk criteria were met; classified as MINIMAL.'
      : `Classified as ${tier}. Triggered by: ${fired
          .map((f) => `${f.key} → ${f.tier}`)
          .join('; ')}.`;

  return { tier, rationale, fired };
}
