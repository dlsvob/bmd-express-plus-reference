// src/store/slices/initialState.ts

// Import types used within the state definitions
import { HighlightMode } from './analysisUISlice'; // Or define HighlightMode here
import { SelectedAnalysisDetailItem } from '../models/reduxTypes';
import { ReferenceUmapItem, hardcodedReferenceData } from '../../data/referenceUmapData';
// --- Import models needed for ProjectData ---
import {
  DoseResponseExperiment,
  CategoryAnalysisResult,
  BMDResult,
  WilliamsTrendResult
  // Import other result types if needed (ANOVA, CurveFit, Oriogen) - using 'any' for now
} from '../../models/BMDxExported'; // Adjust path as needed


// --- Base Type Definitions ---
export type Status = 'idle' | 'loading' | 'succeeded' | 'failed';
export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'failed';

// --- Interfaces Matching Current Slices ---

// Matches state managed by analysisUISlice.ts
export interface AnalysisUIState {
  colorBy: string;
  shapeBy: string;
  sizeBy: string;
  hiddenColorLabels: string[];
  hiddenShapeLabels: string[];
  hiddenSizeLabels: string[];
  goIdInputString: string;
  goIdFilterList: string[];
  highlightMode: HighlightMode;
  accumulationPlotSelectedGoIds: string[];
}

// Matches state managed by selectedAnalysisSlice.ts
export interface SelectedAnalysisState {
  selectedDetails: SelectedAnalysisDetailItem[] | null;
}

// Matches state managed by referenceDataSlice.ts
export interface ReferenceDataState {
  referenceData: ReferenceUmapItem[] | null;
}

// --- Keep Other Potential State Definitions (for future slices) ---
export interface ProjectMeta { id: string; name: string; timestamp: number; }
export interface ProjectsState { status: Status; error: string | null; available: ProjectMeta[]; }

// --- Define ProjectData based on BMDxExported structure ---
export interface ProjectData {
  name: string; // Project name from the loaded file/DB
  doseResponseExperiments: DoseResponseExperiment[];
  oneWayANOVAResults: any[]; // Replace 'any' with specific type if defined
  williamsTrendResults: WilliamsTrendResult[];
  curveFitPrefilterResults: any[]; // Replace 'any' with specific type if defined
  oriogenResults: any[]; // Replace 'any' with specific type if defined
  bMDResult: BMDResult[]; // Note: Case matches original model
  categoryAnalysisResults: CategoryAnalysisResult[];
  // Add other top-level properties from the JSON if necessary
}
// --- End ProjectData definition ---

export interface CurrentProjectState { status: Status; error: string | null; projectId: string | null; data: ProjectData | null; }
export interface PyodideState { status: PyodideStatus; error: string | null; }


// --- Initial State Constants Matching Current Slices ---

export const initialAnalysisUIState: AnalysisUIState = {
  colorBy: 'cluster_id',
  shapeBy: 'bmdResultName',
  sizeBy: 'percentage',
  hiddenColorLabels: [],
  hiddenShapeLabels: [],
  hiddenSizeLabels: [],
  goIdInputString: '',
  goIdFilterList: [],
  highlightMode: 'none',
  accumulationPlotSelectedGoIds: [],
};

export const initialSelectedAnalysisState: SelectedAnalysisState = {
  selectedDetails: null,
};

export const initialReferenceDataState: ReferenceDataState = {
  // Use the imported hardcoded data directly
  referenceData: hardcodedReferenceData || [],
};

// --- Keep Other Initial States (for future slices) ---
export const initialProjectsState: ProjectsState = { status: 'idle', error: null, available: [], };
export const initialCurrentProjectState: CurrentProjectState = { status: 'idle', error: null, projectId: null, data: null, };
export const initialPyodideState: PyodideState = { status: 'idle', error: null, };

// --- Optional: Define Root State Shape ---
// This helps type the entire store state if needed elsewhere
// Note: Add RTK Query paths if you want AppState to be exhaustive
export interface AppState {
  // Use keys matching the reducer keys in store.ts
  analysisUI: AnalysisUIState;
  selectedAnalysis: SelectedAnalysisState;
  referenceData: ReferenceDataState;
  // Add other state slices here if/when created
  // currentProject?: CurrentProjectState; // Example if a slice is added
}

