// src/constants/modelTypes.ts
/**
 * Model type constants for database queries
 */
export const MODEL_TYPE = 'GOAnalysisResult';

export const MODEL_TYPES = {
  GO_ANALYSIS: 'GOAnalysisResult',
  GENE_LEVEL_ANALYSIS: 'GeneLevelAnalysisResult'
} as const;

export type ModelType = typeof MODEL_TYPES[keyof typeof MODEL_TYPES];