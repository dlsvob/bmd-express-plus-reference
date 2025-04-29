// src/store/slices/initialState.ts

// Import types used within the state definitions
import { HighlightMode } from './analysisUISlice'; // Or define HighlightMode here
import { SelectedAnalysisDetailItem } from '../models/reduxTypes'; // Correct path

import { ReferenceUmapItem, hardcodedReferenceData } from '../../data/referenceUmapData';
import {
  DoseResponseExperiment,
  CategoryAnalysisResult,
  BMDResult,
  WilliamsTrendResult
} from '../../models/BMDxExported';


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
  highlightMode: HighlightMode; // Keep using the Enum type
  committedRankSliderValue: [number, number];
  highlightedClusteringRefClusterIds: string[];
  activeClusteringRef: string | null;
  accumulationPlotSelectedGoIds: string[];
  tableSelectedGoId: string | null;
}

// Matches state managed by selectedAnalysisSlice.ts
export interface SelectedAnalysisState {
  selectedRefs: string[];
  selectedDetails: SelectedAnalysisDetailItem[] | null;
}

// Matches state managed by referenceDataSlice.ts
export interface ReferenceDataState {
  referenceUmapData: ReferenceUmapItem[] | null;
  isLoading: boolean;
  error: string | null;
}

// --- Keep Other Potential State Definitions (for future slices) ---
export interface ProjectMeta { id: string; name: string; timestamp: number; }
export interface ProjectsState { status: Status; error: string | null; available: ProjectMeta[]; }

// --- Define ProjectData based on BMDxExported structure ---
export interface ProjectData {
  name: string;
  doseResponseExperiments: DoseResponseExperiment[];
  // --- FIX: Replace any[] with unknown[] ---
  oneWayANOVAResults: unknown[];
  williamsTrendResults: WilliamsTrendResult[];
  curveFitPrefilterResults: unknown[];
  oriogenResults: unknown[];
  // ---------------------------------------
  bMDResult: BMDResult[];
  categoryAnalysisResults: CategoryAnalysisResult[];
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
  // --- FIX: Use Enum member ---
  highlightMode: HighlightMode.NONE,
  // --------------------------
  committedRankSliderValue: [1, 5000],
  highlightedClusteringRefClusterIds: [],
  activeClusteringRef: null,
  accumulationPlotSelectedGoIds: [],
  tableSelectedGoId: null,
};

export const initialSelectedAnalysisState: SelectedAnalysisState = {
  selectedRefs: [], // Initialize as empty array
  selectedDetails: null,
};

export const initialReferenceDataState: ReferenceDataState = {
  referenceUmapData: hardcodedReferenceData || [],
  isLoading: false,
  error: null,
};

// --- Keep Other Initial States (for future slices) ---
export const initialProjectsState: ProjectsState = { status: 'idle', error: null, available: [], };
export const initialCurrentProjectState: CurrentProjectState = { status: 'idle', error: null, projectId: null, data: null, };
export const initialPyodideState: PyodideState = { status: 'idle', error: null, };

// --- Optional: Define Root State Shape ---
export interface AppState {
  analysisUI: AnalysisUIState;
  selectedAnalysis: SelectedAnalysisState;
  referenceData: ReferenceDataState;
  // Add other state slices here if/when created
  // project?: ProjectState; // Example if project slice uses this name
  // navigation?: NavigationState; // Example
  // ui?: UIState; // Example
}
