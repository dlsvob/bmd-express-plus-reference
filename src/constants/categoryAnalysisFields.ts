// src/constants/categoryAnalysisFields.ts
/**
 * CategoryAnalysisResults table field constants
 */
export const CATEGORY_ANALYSIS_FIELDS = {
  ID: 'id',
  CATEGORY_ANALYSIS_RESULTS_ID: 'categoryAnalysisResultsId',
  CATEGORY_IDENTIFIER_ID: 'categoryIdentifierId',
  MODEL_TYPE: 'modelType',
  GENE_ALL_COUNT: 'geneAllCount',
  GENE_ALL_COUNT_FROM_EXPERIMENT: 'geneAllCountFromExperiment',
  GENE_COUNT_SIGNIFICANT_ANOVA: 'geneCountSignificantANOVA',
  PERCENTAGE: 'percentage',
  GENES_THAT_PASSED_ALL_FILTERS: 'genesThatPassedAllFilters',
  GENES_WITH_BMD_LESS_EQUAL_HIGH_DOSE: 'genesWithBMDLessEqualHighDose',
  GENES_WITH_BMD_P_VALUE_GREATER_EQUAL_VALUE: 'genesWithBMDpValueGreaterEqualValue',
  GENES_WITH_BMD_RSQUARED_VALUE_GREATER_EQUAL_VALUE: 'genesWithBMDRsquaredValueGreaterEqualValue',
  GENES_WITH_BMD_BMDL_RATIO_BELOW_VALUE: 'genesWithBMDBMDLRatioBelowValue',
  GENES_WITH_BMD_UBMDL_RATIO_BELOW_VALUE: 'genesWithBMDUBMDLRatioBelowValue',
  GENES_WITH_BMD_UBMD_RATIO_BELOW_VALUE: 'genesWithBMDUBMDRatioBelowValue',
  GENES_WITH_N_FOLD_BELOW_LOW_POSITIVE_DOSE_VALUE: 'genesWithNFoldBelowLowPostiveDoseValue',
  GENES_WITH_FOLD_CHANGE_ABOVE_VALUE: 'genesWithFoldChangeAboveValue',
  GENES_WITH_PREFILTER_P_VALUE_ABOVE_VALUE: 'genesWithPrefilterPValueAboveValue',
  GENES_WITH_PREFILTER_ADJUSTED_P_VALUE_ABOVE_VALUE: 'genesWithPrefilterAdjustedPValueAboveValue',
  GENES_NOT_STEP_FUNCTION: 'genesNotStepFunction',
  GENES_NOT_STEP_FUNCTION_WITH_BMD_LOWER: 'genesNotStepFunctionWithBMDLower',
  GENES_NOT_ADVERSE_DIRECTION: 'genesNotAdverseDirection',
  GENES_WITH_CONFLICTING_PROBE_SETS: 'genesWithConflictingProbeSets',
  FISHERS_A: 'fishersA',
  FISHERS_B: 'fishersB',
  FISHERS_C: 'fishersC',
  FISHERS_D: 'fishersD',
  FISHERS_EXACT_LEFT_P_VALUE: 'fishersExactLeftPValue',
  FISHERS_EXACT_RIGHT_P_VALUE: 'fishersExactRightPValue',
  FISHERS_EXACT_TWO_TAIL_P_VALUE: 'fishersExactTwoTailPValue',
  BMD_MEAN: 'bmdMean',
  BMD_MEDIAN: 'bmdMedian',
  BMD_MINIMUM: 'bmdMinimum',
  BMD_SD: 'bmdSD',
  BMD_W_MEAN: 'bmdWMean',
  BMD_W_SD: 'bmdWSD',
  BMDL_MEAN: 'bmdlMean',
  BMDL_MEDIAN: 'bmdlMedian',
  BMDL_MINIMUM: 'bmdlMinimum',
  BMDL_SD: 'bmdlSD',
  BMDL_W_MEAN: 'bmdlWMean',
  BMDL_W_SD: 'bmdlWSD',
  BMDU_MEAN: 'bmduMean',
  BMDU_MEDIAN: 'bmduMedian',
  BMDU_MINIMUM: 'bmduMinimum',
  BMDU_SD: 'bmduSD',
  BMDU_W_MEAN: 'bmduWMean',
  BMDU_W_SD: 'bmduWSD',
  BMD_FIFTH_PERCENTILE: 'bmdFifthPercentile',
  BMDL_FIFTH_PERCENTILE: 'bmdlFifthPercentile',
  BMDU_FIFTH_PERCENTILE: 'bmduFifthPercentile',
  BMD_TENTH_PERCENTILE: 'bmdTenthPercentile',
  BMDL_TENTH_PERCENTILE: 'bmdlTenthPercentile',
  BMDU_TENTH_PERCENTILE: 'bmduTenthPercentile',
  FIFTH_PERCENTILE_INDEX: 'fifthPercentileIndex',
  BMD_FIFTH_PERCENTILE_TOTAL_GENES: 'bmdFifthPercentileTotalGenes',
  TENTH_PERCENTILE_INDEX: 'tenthPercentileIndex',
  BMD_TENTH_PERCENTILE_TOTAL_GENES: 'bmdTenthPercentileTotalGenes',
  BMDL_FIFTH_PERCENTILE_TOTAL_GENES: 'bmdlFifthPercentileTotalGenes',
  BMDL_TENTH_PERCENTILE_TOTAL_GENES: 'bmdlTenthPercentileTotalGenes',
  BMDU_FIFTH_PERCENTILE_TOTAL_GENES: 'bmduFifthPercentileTotalGenes',
  BMDU_TENTH_PERCENTILE_TOTAL_GENES: 'bmduTenthPercentileTotalGenes',
  GENES_UP_BMD_MEAN: 'genesUpBMDMean',
  GENES_UP_BMD_MEDIAN: 'genesUpBMDMedian',
  GENES_UP_BMD_SD: 'genesUpBMDSD',
  GENES_UP_BMDL_MEAN: 'genesUpBMDLMean',
  GENES_UP_BMDL_MEDIAN: 'genesUpBMDLMedian',
  GENES_UP_BMDL_SD: 'genesUpBMDLSD',
  GENES_UP_BMDU_MEAN: 'genesUpBMDUMean',
  GENES_UP_BMDU_MEDIAN: 'genesUpBMDUMedian',
  GENES_UP_BMDU_SD: 'genesUpBMDUSD',
  GENES_DOWN_BMD_MEAN: 'genesDownBMDMean',
  GENES_DOWN_BMD_MEDIAN: 'genesDownBMDMedian',
  GENES_DOWN_BMD_SD: 'genesDownBMDSD',
  GENES_DOWN_BMDL_MEAN: 'genesDownBMDLMean',
  GENES_DOWN_BMDL_MEDIAN: 'genesDownBMDLMedian',
  GENES_DOWN_BMDL_SD: 'genesDownBMDLSD',
  GENES_DOWN_BMDU_MEAN: 'genesDownBMDUMean',
  GENES_DOWN_BMDU_MEDIAN: 'genesDownBMDUMedian',
  GENES_DOWN_BMDU_SD: 'genesDownBMDUSD',
  OVERALL_DIRECTION: 'overallDirection',
  TOTAL_FOLD_CHANGE: 'totalFoldChange',
  MEAN_FOLD_CHANGE: 'meanFoldChange',
  MEDIAN_FOLD_CHANGE: 'medianFoldChange',
  MAX_FOLD_CHANGE: 'maxFoldChange',
  MIN_FOLD_CHANGE: 'minFoldChange',
  STD_DEV_FOLD_CHANGE: 'stdDevFoldChange',
  BMD_LOWER_95: 'bmdLower95',
  BMD_UPPER_95: 'bmdUpper95',
  BMDL_LOWER_95: 'bmdlLower95',
  BMDL_UPPER_95: 'bmdlUpper95',
  BMDU_LOWER_95: 'bmduLower95',
  BMDU_UPPER_95: 'bmduUpper95'
} as const;

export type CategoryAnalysisField = typeof CATEGORY_ANALYSIS_FIELDS[keyof typeof CATEGORY_ANALYSIS_FIELDS];

/**
 * Common field selections for specific use cases
 */
export const FIELD_SELECTIONS = {
  BASIC_ANALYSIS: [
    CATEGORY_ANALYSIS_FIELDS.ID,
    CATEGORY_ANALYSIS_FIELDS.GENE_ALL_COUNT,
    CATEGORY_ANALYSIS_FIELDS.PERCENTAGE,
    CATEGORY_ANALYSIS_FIELDS.GENES_THAT_PASSED_ALL_FILTERS,
    CATEGORY_ANALYSIS_FIELDS.BMD_FIFTH_PERCENTILE_TOTAL_GENES
  ],

  BMD_STATS: [
    CATEGORY_ANALYSIS_FIELDS.BMD_MEAN,
    CATEGORY_ANALYSIS_FIELDS.BMD_MEDIAN,
    CATEGORY_ANALYSIS_FIELDS.BMD_MINIMUM,
    CATEGORY_ANALYSIS_FIELDS.BMD_SD,
    CATEGORY_ANALYSIS_FIELDS.BMDL_MEAN,
    CATEGORY_ANALYSIS_FIELDS.BMDU_MEAN
  ],

  PERCENTILE_DATA: [
    CATEGORY_ANALYSIS_FIELDS.BMD_FIFTH_PERCENTILE,
    CATEGORY_ANALYSIS_FIELDS.BMD_TENTH_PERCENTILE,
    CATEGORY_ANALYSIS_FIELDS.BMD_FIFTH_PERCENTILE_TOTAL_GENES,
    CATEGORY_ANALYSIS_FIELDS.BMD_TENTH_PERCENTILE_TOTAL_GENES
  ]
} as const;

/**
 * UMAP query configuration constants
 */
export const QUERY_SELECTED_COLUMNS_UMAP = [
  'car.' + CATEGORY_ANALYSIS_FIELDS.ID,  // Qualify with table alias to avoid ambiguity
  CATEGORY_ANALYSIS_FIELDS.CATEGORY_ANALYSIS_RESULTS_ID,
  CATEGORY_ANALYSIS_FIELDS.CATEGORY_IDENTIFIER_ID,
  CATEGORY_ANALYSIS_FIELDS.GENE_ALL_COUNT,
  CATEGORY_ANALYSIS_FIELDS.PERCENTAGE,
  CATEGORY_ANALYSIS_FIELDS.GENES_THAT_PASSED_ALL_FILTERS,
  CATEGORY_ANALYSIS_FIELDS.BMD_FIFTH_PERCENTILE_TOTAL_GENES,
  CATEGORY_ANALYSIS_FIELDS.OVERALL_DIRECTION
] as const;

/**
 * UMAP analysis threshold values - configurable in UI
 */
export const MIN_GENE_ALL_COUNT = 40;
export const MAX_GENE_ALL_COUNT = 500;
export const MIN_PERCENTAGE = 5;
export const MIN_GENES_THAT_PASSED_ALL_FILTERS = 3;

/**
 * UMAP query WHERE clause using parameterized values
 */
export const QUERY_WHERE_CLAUSE_UMAP = {
  geneAllCount: { min: MIN_GENE_ALL_COUNT, max: MAX_GENE_ALL_COUNT },
  percentage: { '>=': MIN_PERCENTAGE },
  genesThatPassedAllFilters: { '>=': MIN_GENES_THAT_PASSED_ALL_FILTERS }
} as const;