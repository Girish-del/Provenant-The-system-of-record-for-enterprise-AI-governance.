export type RiskTierName = 'PROHIBITED' | 'HIGH' | 'LIMITED' | 'MINIMAL';
export type QuestionTypeName = 'BOOLEAN' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT';

export interface QuestionSeed {
  key: string;
  order: number;
  text: string;
  type: QuestionTypeName;
  /** Classification hint consumed by the risk engine (M6): if answered true, implies this tier. */
  impliesTierWhenTrue?: RiskTierName;
}

export interface QuestionnaireSeed {
  key: string;
  name: string;
  version: string;
  framework: string;
  questions: QuestionSeed[];
}

/**
 * EU AI Act risk classification. Highest implied tier wins; if no rule fires the
 * system is MINIMAL. Ordering reflects precedence (prohibited first).
 */
export const euAiActQuestionnaire: QuestionnaireSeed = {
  key: 'EU_AI_ACT_RISK_V1',
  name: 'EU AI Act Risk Classification',
  version: '1.0',
  framework: 'EU_AI_ACT',
  questions: [
    {
      key: 'prohibited_practice',
      order: 1,
      type: 'BOOLEAN',
      impliesTierWhenTrue: 'PROHIBITED',
      text: 'Does the system use any prohibited practice under Article 5 (e.g. social scoring, manipulative techniques, untargeted facial-image scraping, emotion recognition in the workplace)?',
    },
    {
      key: 'annex_iii',
      order: 2,
      type: 'BOOLEAN',
      impliesTierWhenTrue: 'HIGH',
      text: 'Is the system intended to be used in an Annex III high-risk area (biometrics, critical infrastructure, education, employment, essential public/private services, law enforcement, migration, administration of justice)?',
    },
    {
      key: 'safety_component',
      order: 3,
      type: 'BOOLEAN',
      impliesTierWhenTrue: 'HIGH',
      text: 'Is the AI a safety component of a product covered by EU harmonisation legislation that requires third-party conformity assessment?',
    },
    {
      key: 'interacts_or_synthetic',
      order: 4,
      type: 'BOOLEAN',
      impliesTierWhenTrue: 'LIMITED',
      text: 'Does the system interact directly with people, recognise emotions, or generate/manipulate synthetic content (chatbot, deepfake)?',
    },
  ],
};
