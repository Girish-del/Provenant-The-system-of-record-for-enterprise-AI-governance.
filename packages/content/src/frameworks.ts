export interface ControlSeed {
  code: string;
  title: string;
  description?: string;
  category?: string;
}

export interface FrameworkSeed {
  key: string;
  name: string;
  version: string;
  description?: string;
  controls: ControlSeed[];
}

export const euAiAct: FrameworkSeed = {
  key: 'EU_AI_ACT',
  name: 'EU AI Act',
  version: '2024',
  description:
    'Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence.',
  controls: [
    {
      code: 'Art9',
      title: 'Risk management system',
      category: 'High-risk obligations',
      description:
        'Establish, implement, document and maintain a risk management system across the lifecycle.',
    },
    {
      code: 'Art10',
      title: 'Data and data governance',
      category: 'High-risk obligations',
      description:
        'Training, validation and testing data sets meet quality criteria and are examined for bias.',
    },
    {
      code: 'Art11',
      title: 'Technical documentation',
      category: 'High-risk obligations',
      description: 'Draw up technical documentation demonstrating conformity (Annex IV).',
    },
    {
      code: 'Art12',
      title: 'Record-keeping (logging)',
      category: 'High-risk obligations',
      description: 'Automatically record events over the system lifetime for traceability.',
    },
    {
      code: 'Art13',
      title: 'Transparency and information to deployers',
      category: 'High-risk obligations',
      description: 'Design for sufficient transparency; provide instructions for use.',
    },
    {
      code: 'Art14',
      title: 'Human oversight',
      category: 'High-risk obligations',
      description: 'Enable effective oversight by natural persons during the period in use.',
    },
    {
      code: 'Art15',
      title: 'Accuracy, robustness and cybersecurity',
      category: 'High-risk obligations',
      description: 'Achieve an appropriate level of accuracy, robustness and cybersecurity.',
    },
    {
      code: 'Art50',
      title: 'Transparency obligations for certain AI systems',
      category: 'Limited risk',
      description:
        'Inform people they are interacting with an AI system and disclose synthetic content.',
    },
  ],
};

export const nistAiRmf: FrameworkSeed = {
  key: 'NIST_AI_RMF',
  name: 'NIST AI Risk Management Framework',
  version: '1.0',
  description: 'NIST AI RMF 1.0 — voluntary framework to manage AI risks (GOVERN/MAP/MEASURE/MANAGE).',
  controls: [
    {
      code: 'GOVERN',
      title: 'Govern',
      category: 'Function',
      description: 'A culture of risk management is cultivated and present.',
    },
    {
      code: 'MAP',
      title: 'Map',
      category: 'Function',
      description: 'Context is recognized and risks related to context are identified.',
    },
    {
      code: 'MEASURE',
      title: 'Measure',
      category: 'Function',
      description: 'Identified risks are assessed, analyzed, or tracked.',
    },
    {
      code: 'MANAGE',
      title: 'Manage',
      category: 'Function',
      description: 'Risks are prioritized and acted upon based on a projected impact.',
    },
  ],
};

export const frameworks: FrameworkSeed[] = [euAiAct, nistAiRmf];
