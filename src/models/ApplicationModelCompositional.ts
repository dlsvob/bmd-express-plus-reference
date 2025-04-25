* src / models / ApplicationModelCompositional.ts
    *
 * Defines application - specific data structures, interfaces, and type aliases.
 * This layer provides idiomatic views of the master data model(`BMDxExported.ts`)
    * tailored for use in application logic(components, hooks, UI state).
 * It uses a compositional approach with TypeScript types and interfaces.
 */

// --- Master Model Imports ---
import type {
    DoseResponseExperiment,
    BMDResult,
    CategoryAnalysisResult,
    CategoryAnalysisItem,
    CategoryIdentifier // Assuming CategoryAnalysisItem uses this for go_id/go_term
    // Import other necessary types from BMDxExported...
} from './BMDxExported'; // Adjust path if needed

// --- Reference Data Imports ---
// Assuming ReferenceUmapItem is defined like: { UMAP_1: number; UMAP_2: number; cluster_id: string | number; go_id: string; go_term: string; }
import type { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path if needed

// --- Base Types Derived from Master Model ---

// Fields typically needed from CategoryAnalysisItem for visualization points
// (Ensure property names match those available in the CategoryAnalysisItem interface)
type AnalysisPoint_FromCategory = {
    go_id: string; // Assumed from CategoryAnalysisItem['categoryIdentifier']['id']
    go_term: string; // Assumed from CategoryAnalysisItem['categoryIdentifier']['title']
    direction?: string | null; // From CategoryAnalysisItem['overallDirection']
    percentage?: number | null; // From CategoryAnalysisItem['percentage']
    bmdFifthPercentileTotalGenes?: number | null; // From CategoryAnalysisItem['bmdFifthPercentileTotalGenes'] (used for ranking)
    // Add other relevant fields if needed by multiple analysis types, e.g.:
    geneAllCount?: number | null; // Example from CategoryAnalysisItem
    genesThatPassedAllFilters?: number | null; // Example from CategoryAnalysisItem
};

// Fields typically needed from BMDResult (or its context)
type AnalysisPoint_FromBmdResult = {
    bmdResultRef: number; // Derived from BMDResult['@ref']
    bmdResultName: string; // Derived from BMDResult['name']
    // doseResponseExperimentRef?: number; // Consider adding BMDResult['doseResponseExperiment']
    // doseResponseExperimentName?: string; // Consider adding looked-up name
};

// --- Calculated properties common across point-based analyses ---
type AnalysisPoint_CalculatedProperties = {
    finalColor: string;
    finalShape: string;
    finalSize: number;
    finalOpacity: number;
    // Optional: Include base calculated values if useful as intermediates
    // baseColor?: string;
    // baseShape?: string;
    // baseSize?: number;
};

// --- Base type for many Category Analysis points ---
// Combines common source fields and calculated properties. Useful for map points, graph nodes etc.
export type BaseCategoryAnalysisDataPoint =
    AnalysisPoint_FromCategory &
    AnalysisPoint_FromBmdResult &
    AnalysisPoint_CalculatedProperties;


// --- Coordinate System Types ---
// Defines the shape for specific coordinate systems used in map-based visualizations

type Coordinates_UMAP = Pick<ReferenceUmapItem, 'UMAP_1' | 'UMAP_2' | 'cluster_id'>;

// Example placeholder for t-SNE coordinates
type Coordinates_TSNE = {
    tsne_1: number;
    tsne_2: number;
    // May have its own cluster ID source or reuse ReferenceUmapItem['cluster_id']
    cluster_id?: string | number;
};

// Example placeholder for PCA coordinates
type Coordinates_PCA = {
    pc_1: number;
    pc_2: number;
    // May have its own cluster ID source
    cluster_id?: string | number;
};


// --- Specific Map Analysis Point Types ---
// Combine the base category point data with specific coordinates

export type UmapAnalysisDataPoint = BaseCategoryAnalysisDataPoint & Coordinates_UMAP;
export type TSneAnalysisDataPoint = BaseCategoryAnalysisDataPoint & Coordinates_TSNE;
export type PcaAnalysisDataPoint = BaseCategoryAnalysisDataPoint & Coordinates_PCA;

// --- Union type for any map-based category analysis point ---
// Useful for components that can handle different map types generically
export type MapCategoryAnalysisDataPoint = UmapAnalysisDataPoint | TSneAnalysisDataPoint | PcaAnalysisDataPoint;


// --- Non-Map Category Analysis Types ---

// --- Graph Analysis Types ---
// For network graph visualizations

// Nodes might represent similar entities (GO terms) as map points
export interface GraphNode extends BaseCategoryAnalysisDataPoint {
    id: string; // Ensure unique node ID (can reuse go_id)
    // Add any graph-specific node properties (e.g., degree, centrality?)
    // Example: calculated centrality
    // centrality?: number;
}

// Edges represent relationships between nodes
export interface GraphEdge {
    source: string; // ID of source GraphNode
    target: string; // ID of target GraphNode
    weight?: number; // Optional edge weight or other metrics
    // Add any other edge properties (e.g., type of relationship)
    // relationshipType?: string;
}

// Overall result structure for a graph analysis
export interface GraphAnalysisResultData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    layoutAlgorithm?: string; // Optional: Info about layout used (e.g., 'force-directed')
}


// --- Cluster Analysis Specific Types ---
// For analyses like hierarchical clustering

// Represents a single item's cluster assignment
export interface ClusterMembership {
    itemId: string; // e.g., GO ID or potentially BMDResult Ref depending on what's clustered
    itemLabel: string; // e.g., GO Term or BMDResult Name
    assignedClusterId: string | number;
    // Include other relevant data associated with the item?
    // bmdValue?: number;
}

// Represents summary statistics for a cluster
export interface ClusterSummary {
    clusterId: string | number;
    memberCount: number;
    // Add other relevant summary stats
    // minBmd?: number;
    // representativeItems?: string[];
}

// Overall result structure for a cluster analysis
export interface ClusterAnalysisResultData {
    // Could include config used, dendrogram data (if applicable), etc.
    // dendrogram?: any; // Define structure if needed
    memberships: ClusterMembership[];
    summaries?: ClusterSummary[]; // Summaries might be optional or calculated later
    algorithmFlavor?: string; // e.g., 'hierarchical', 'kmeans'
}


// --- Non-Category Analysis Types ---

// --- BMD Result Analysis Specific Types ---
// For analyses operating directly on BMDResult data (e.g., dose-response)

// Data needed for a single dose-response plot line/curve
export interface DoseResponsePlotData {
    doses: number[];
    responses: number[];
    modelName?: string; // e.g., 'Hill', 'Linear'
    modelParameters?: Record<string, any>; // Store fitted parameters (BMD, BMDU, BMDL, etc.)
    experimentName: string; // Name of the source experiment
}

// Overall result structure for this analysis type
export interface BmdResultAnalysisData {
    bmdResultRef: number; // Which BMD Result this pertains to
    // May contain multiple plots if result has multiple datasets/endpoints
    plotData: DoseResponsePlotData[];
    // Table view of key parameters might be useful
    parameterTable?: Record<string, any>; // e.g., { BMD: 1.23, BMDL: 0.98, BMDU: 1.55 }
}


// --- Interfaces for Combined Data Structures (from previous discussions) ---

/** Represents the full raw data needed for a single selected analysis (identified by bmdResultRef) */
export interface DetailedAnalysisData {
    bmdResult: BMDResult;
    categoryAnalysis: CategoryAnalysisResult; // Assuming one primary category analysis per BMD result for now
    doseResponseExperiment: DoseResponseExperiment;
}

/** Shape of data used for selection dropdowns, linking BMDResult and DoseResponseExperiment */
export interface SelectableAnalysisInfo {
    bmdResultRef: number;
    bmdResultName: string;
    doseResponseExperimentRef: number; // Reference to the parent experiment
    doseResponseExperimentName: string;
}


// --- Interfaces for Hook Return Types ---

/** Return type for the useBMDAnalysisData hook */
export interface BMDAnalysisHookData {
    selectableAnalyses: SelectableAnalysisInfo[] | null;
    getAnalysisDetails: ((bmdResultRef: number) => DetailedAnalysisData | null) | null; // Allow null if hook isn't ready
    isLoading: boolean;
    error: Error | null;
}

// Add interface for usePreparedPlotData return type if desired for clarity
// export interface PreparedPlotHookData {
//   styledGroupedData: Map<number, UmapAnalysisDataPoint[]> | null; // Or MapCategoryAnalysisDataPoint?
//   analysisPoints: UmapAnalysisDataPoint[]; // Or MapCategoryAnalysisDataPoint?
// }


// --- (Optional but Recommended) Discriminated Union for Analysis Results ---
// Helps manage different result structures in UI components or processing logic

export type AnalysisResult =
    | { type: 'CategoryMapAnalysis'; mapKind: 'UMAP'; points: UmapAnalysisDataPoint[]; }
    | { type: 'CategoryMapAnalysis'; mapKind: 'TSNE'; points: TSneAnalysisDataPoint[]; }
    | { type: 'CategoryMapAnalysis'; mapKind: 'PCA'; points: PcaAnalysisDataPoint[]; }
    | { type: 'CategoryGraphAnalysis'; flavor: string; results: GraphAnalysisResultData; }
    | { type: 'CategoryClusterAnalysis'; flavor: string; results: ClusterAnalysisResultData; }
    | { type: 'BmdDirectAnalysis'; results: BmdResultAnalysisData; }
    | { type: 'CompositeAnalysis'; /* define structure for combined results */ };
// Add other analysis types as they are defined


// --- Simple Type Aliases for Clarity ---
// Can be useful for component props or variable declarations

export type AnalysisPoint = MapCategoryAnalysisDataPoint; // Default "point" to map points for now
export type AnalysisTableRow = UmapAnalysisDataPoint; // Example: If table focuses on UMAP data// src/types/IUmapBokehPlot.ts
/