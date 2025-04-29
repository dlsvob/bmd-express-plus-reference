/**
 * src/models/applicationModel.ts
 *
 * Defines application-specific data structures, interfaces, and type aliases.
 * This layer provides idiomatic views of the master data model (`BMDxExported.ts`)
 * tailored for use in application logic (components, hooks, UI state).
 * It uses a compositional approach with TypeScript types and interfaces.
 * CONSOLIDATED: Merged and reconciled content from previous model files.
 */

// --- Master Model Imports ---
import type {
  DoseResponseExperiment,
  BMDResult,
  CategoryAnalysisResult,
  // Import other necessary types from BMDxExported...
} from './BMDxExported'; // Adjust path if needed

// --- Reference Data Imports ---
import type { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path if needed

// --- Base Types Derived from Master Model ---

/**
 * Fields typically needed from CategoryAnalysisItem for visualization points.
 * These represent the core data attributes associated with an enriched category.
 */
type AnalysisPoint_FromCategory = {
  go_id: string;
  go_term: string;
  direction?: string | null;
  percentage?: number | null;
  bmdFifthPercentileTotalGenes?: number | null;
  geneAllCount?: number | null;
  genesThatPassedAllFilters?: number | null;
  rankValue?: number | null; // The value used for sorting/ranking
  // --- ADD rank ---
  rank?: number | null; // The calculated rank (1 to N)
  // --------------
};

/**
 * Fields typically needed from the context of a BMDResult.
 * These link a category point back to its source analysis.
 */
type AnalysisPoint_FromBmdResult = {
  bmdResultRef: number; // Derived from BMDResult['@ref'] (using number for internal consistency)
  bmdResultName: string; // Derived from BMDResult['name']
};

/**
 * Calculated properties added during data processing for styling and interaction.
 * These are determined based on UI state and reference data.
 */
type AnalysisPoint_CalculatedProperties = {
  finalColor: string; // The actual color hex code to render
  finalShape: string; // The shape name (e.g., 'circle', 'triangle-up') to render
  finalSize: number;  // The pixel size to render
  finalOpacity: number; // The opacity (0 to 1) to render
  // Labels used for matching points to legend items and visibility toggling
  colorLabel: string; // The text label shown in the color legend (e.g., "Cluster 3", "Experiment A")
  shapeLabel: string; // The text label shown in the shape legend (e.g., "Up", "Experiment B")
  sizeLabel: string;  // The text label shown in the size legend (e.g., "10 < % <= 20", "Fixed Size")
  // Optional: Include base calculated values if useful as intermediates downstream
  // baseColor?: string;
  // baseShape?: string;
  // baseSize?: number;
};

/**
 * Base type for category analysis data points BEFORE coordinate mapping and final styling.
 * Combines source fields. Calculated properties are Partial as they aren't guaranteed yet.
 */
export type BaseCategoryAnalysisDataPoint = AnalysisPoint_FromCategory &
  AnalysisPoint_FromBmdResult &
  Partial<AnalysisPoint_CalculatedProperties>; // Calculated props are optional at this stage

// --- Coordinate System Types ---

/** UMAP coordinates and cluster ID derived from reference data. */
type Coordinates_UMAP = Pick<
  ReferenceUmapItem,
  'UMAP_1' | 'UMAP_2' | 'cluster_id'
>;

// --- Specific Map Analysis Point Type ---

/**
 * The definitive type for a fully processed data point ready for UMAP visualization.
 * Combines base data, UMAP coordinates, and requires all calculated styling properties.
 * This is the primary type used by plotting components and for deriving legends.
 */
export type UmapAnalysisDataPoint = BaseCategoryAnalysisDataPoint &
  Coordinates_UMAP &
  AnalysisPoint_CalculatedProperties; // Calculated props are REQUIRED here

// --- Type Aliases for Clarity (Standardizing on UmapAnalysisDataPoint) ---
// Use these aliases in components/hooks for better readability.
export type AnalysisPoint = UmapAnalysisDataPoint;
export type AnalysisTableRow = UmapAnalysisDataPoint;
export type UmapPlotPoint = UmapAnalysisDataPoint;
export type AccumulationPlotPoint = UmapAnalysisDataPoint;
export type LegendDataItem = UmapAnalysisDataPoint; // This is the data *used to derive* legend items

// --- Interfaces for Combined Data Structures ---

/**
 * Represents the full raw data needed for a single selected analysis,
 * identified by its numeric bmdResultRef. Used by hooks like useBMDAnalysisData.
 */
export interface DetailedAnalysisData {
  bmdResult: BMDResult;
  categoryAnalysis: CategoryAnalysisResult | null; // Category analysis might not exist for a BMD result
  doseResponseExperiment: DoseResponseExperiment;
}

/**
 * Shape of data used for selection lists (e.g., in ExperimentListView).
 * Provides the minimum info needed to display and identify an analysis.
 */
export interface SelectableAnalysisInfo {
  bmdResultRef: number; // Use number internally, convert to string for UI keys if needed
  bmdResultName: string;
  doseResponseExperimentRef: string;
  doseResponseExperimentName: string;
}

// --- Interfaces for Hook Return Types ---

/** Return type for a hook that provides access to detailed analysis data. */
export interface BMDAnalysisHookData {
  selectableAnalyses: SelectableAnalysisInfo[] | null;
  getAnalysisDetails: (bmdResultRef: number) => DetailedAnalysisData | null; // Keep number param
  isLoading: boolean;
  error: Error | null;
}

/** Return type for the usePreparedPlotData hook. */
export interface PreparedPlotHookData {
  styledGroupedData: Map<string, UmapAnalysisDataPoint[]> | null;
  analysisPoints: UmapAnalysisDataPoint[] | null; // Points filtered by opacity
  allStyledPoints: UmapAnalysisDataPoint[] | null; // All points after styling, before opacity filter
  colorItems: [string, string][];
  shapeItems: [string, string][];
  sizeItems: [string, number][];
  minRank: number; // Will be 1
  maxRank: number; // Will be N (total ranked points)
}

// --- (Optional) Discriminated Union for Different Analysis Result Types ---
// (Keep if planning multiple analysis views beyond UMAP category analysis)
// export type AnalysisResult =
//   | { type: 'CategoryMapAnalysis'; mapKind: 'UMAP'; points: UmapAnalysisDataPoint[]; }
//   | ... other types ...
