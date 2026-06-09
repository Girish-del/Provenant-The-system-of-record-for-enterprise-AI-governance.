export type CrosswalkRelationship = 'EQUIVALENT' | 'RELATED' | 'PARTIAL';

export interface CrosswalkSeed {
  fromFramework: string;
  fromCode: string;
  toFramework: string;
  toCode: string;
  relationship: CrosswalkRelationship;
}

/**
 * The moat: one control/evidence can satisfy multiple frameworks. These map EU AI
 * Act articles to the NIST AI RMF functions they most relate to.
 */
export const crosswalks: CrosswalkSeed[] = [
  { fromFramework: 'EU_AI_ACT', fromCode: 'Art9', toFramework: 'NIST_AI_RMF', toCode: 'MANAGE', relationship: 'RELATED' },
  { fromFramework: 'EU_AI_ACT', fromCode: 'Art10', toFramework: 'NIST_AI_RMF', toCode: 'MAP', relationship: 'RELATED' },
  { fromFramework: 'EU_AI_ACT', fromCode: 'Art15', toFramework: 'NIST_AI_RMF', toCode: 'MEASURE', relationship: 'RELATED' },
  { fromFramework: 'EU_AI_ACT', fromCode: 'Art14', toFramework: 'NIST_AI_RMF', toCode: 'GOVERN', relationship: 'PARTIAL' },
];
