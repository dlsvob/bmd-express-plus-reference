// src/models/ApplicationModels.ts
import {
  DoseResponseExperiment,
  BMDResult,
  CategoryAnalysisResult,
} from './BMDxExported'; // Adjust path if needed

// --- Core Interfaces ---

export interface SelectableAnalysisInfo {
  bmdResultRef: number;
  bmdResultName: string;
  doseResponseExperimentRef: number;
  doseResponseExperimentName: string;
}

export interface DetailedAnalysisData {
  bmdResult: BMDResult;
  categoryAnalysis: CategoryAnalysisResult;
  doseResponseExperiment: DoseResponseExperiment;
}

export interface BMDAnalysisHookData {
  selectableAnalyses: SelectableAnalysisInfo[] | null;
  getAnalysisDetails: (bmdResultRef: number) => DetailedAnalysisData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Defines the structure for combined & styled data points used across visualizations.
 * Renamed from OverlayPlotPoint. Includes data from CategoryAnalysisItem, BMDResult, ReferenceUmapItem.
 */
export interface UmapAnalysisDataValue {
  // --- Core Identifiers ---
  go_id: string;
  go_term: string;
  cluster_id: string | number; // From reference data

  // --- Source Analysis Info ---
  bmdResultRef: number;
  bmdResultName: string;

  // --- UMAP Coordinates ---
  UMAP_1: number;
  UMAP_2: number;

  // --- Data for Styling / Table / Accumulation Plot ---
  direction?: string | null; // From CategoryAnalysisItem.overallDirection
  percentage?: number | null; // From CategoryAnalysisItem.percentage
  /** The specific BMD value used for ranking and the Accumulation plot X-axis */
  bmdFifthPercentileTotalGenes?: number | null; // From CategoryAnalysisItem

  // --- Add other specific atomic properties needed by ANY child ---
  // Ensure these names match fields available in CategoryAnalysisItem or derived during processing
  geneAllCount?: number | null; // Example from CategoryAnalysisItem
  genesThatPassedAllFilters?: number | null; // Example from CategoryAnalysisItem
  // Add others as needed by your table or plots...

  // --- Final Calculated Style Properties (Populated by usePreparedPlotData/styleUtils) ---
  finalColor: string;
  finalShape: string;
  finalSize: number;
  finalOpacity: number;
}

// --- Type Aliases for Clarity ---
export type AnalysisPoint = UmapAnalysisDataValue;
export type AnalysisTableRow = UmapAnalysisDataValue;
export type UmapPlotPoint = UmapAnalysisDataValue;
export type AccumulationPlotPoint = UmapAnalysisDataValue;
export type LegendDataItem = UmapAnalysisDataValue;
