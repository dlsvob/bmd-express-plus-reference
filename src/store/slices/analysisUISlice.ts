// src/store/slices/analysisUISlice.ts

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Adjust path if needed

// Define HighlightMode enum
export enum HighlightMode {
  NONE = 'none',
  SELECTED = 'selected',
  CLUSTER = 'cluster',
}

// Define the state interface directly
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

// Define initial state directly with defaults
const initialState: AnalysisUIState = {
  colorBy: 'cluster_id',
  shapeBy: 'bmdResultName',
  sizeBy: 'percentage',
  hiddenColorLabels: [], // Default to empty array
  hiddenShapeLabels: [], // Default to empty array
  hiddenSizeLabels: [], // Default to empty array
  goIdInputString: '',
  goIdFilterList: [],
  highlightMode: HighlightMode.NONE,
  accumulationPlotSelectedGoIds: [], // Default to empty array
};

// Helper functions (keep as is)
const toggleItemInArray = (arr: string[], item: string): string[] => { /* ... */ };
const parseGoIdInput = (input: string): string[] => { /* ... */ };

const analysisUISlice = createSlice({
  name: 'analysisUI',
  initialState,
  reducers: {
    // --- Keep all reducers as they were in the correctly functioning version ---
    setColorBy(state, action: PayloadAction<string>) { state.colorBy = action.payload; state.hiddenColorLabels = []; },
    setShapeBy(state, action: PayloadAction<string>) { state.shapeBy = action.payload; state.hiddenShapeLabels = []; },
    setSizeBy(state, action: PayloadAction<string>) { state.sizeBy = action.payload; state.hiddenSizeLabels = []; },
    resetStyling(state) { Object.assign(state, initialState); },
    toggleColorLabelVisibility(state, action: PayloadAction<string>) { state.hiddenColorLabels = toggleItemInArray(state.hiddenColorLabels, action.payload); },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) { state.hiddenShapeLabels = toggleItemInArray(state.hiddenShapeLabels, action.payload); },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) { state.hiddenSizeLabels = toggleItemInArray(state.hiddenSizeLabels, action.payload); },
    setGoIdInputString(state, action: PayloadAction<string>) { state.goIdInputString = action.payload; state.goIdFilterList = parseGoIdInput(action.payload); },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) { state.highlightMode = action.payload; },
    // Use original action name, update internal state property
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) { state.accumulationPlotSelectedGoIds = action.payload || []; },
  },
});

// Export the action creators (using original names)
export const {
  setColorBy, setShapeBy, setSizeBy, resetStyling,
  toggleColorLabelVisibility, toggleShapeLabelVisibility, toggleSizeLabelVisibility,
  setGoIdInputString, setHighlightMode, setAccumulationPlotSelection,
} = analysisUISlice.actions;

// Export the reducer function
export default analysisUISlice.reducer;

// --- Selectors ---
// Basic state selector
export const selectAnalysisUIState = (state: RootState): AnalysisUIState => state.analysisUI;

// Individual property selectors (ensure these return arrays, even if empty)
export const selectColorBy = (state: RootState): string => state.analysisUI.colorBy;
export const selectShapeBy = (state: RootState): string => state.analysisUI.shapeBy;
export const selectSizeBy = (state: RootState): string => state.analysisUI.sizeBy;
export const selectHiddenColorLabels = (state: RootState): string[] => state.analysisUI.hiddenColorLabels || []; // Safeguard just in case
export const selectHiddenShapeLabels = (state: RootState): string[] => state.analysisUI.hiddenShapeLabels || []; // Safeguard just in case
export const selectHiddenSizeLabels = (state: RootState): string[] => state.analysisUI.hiddenSizeLabels || []; // Safeguard just in case
export const selectGoIdInputString = (state: RootState): string => state.analysisUI.goIdInputString;
export const selectGoIdFilterList = (state: RootState): string[] => state.analysisUI.goIdFilterList || []; // Safeguard just in case
export const selectHighlightMode = (state: RootState): HighlightMode => state.analysisUI.highlightMode;
export const selectAccumulationPlotSelectedGoIds = (state: RootState): string[] => state.analysisUI.accumulationPlotSelectedGoIds || []; // Safeguard just in case

// --- Memoized selectors returning Sets (with added safety) ---
export const selectHiddenColorLabelsSet = createSelector(
  [selectHiddenColorLabels],
  // Add fallback to empty array before creating Set
  (labelsArray): Set<string> => new Set(labelsArray || [])
);
export const selectHiddenShapeLabelsSet = createSelector(
  [selectHiddenShapeLabels],
  // Add fallback to empty array before creating Set
  (labelsArray): Set<string> => new Set(labelsArray || [])
);
// --- This is the area around Line 136 ---
export const selectHiddenSizeLabelsSet = createSelector(
  [selectHiddenSizeLabels],
  // Add fallback to empty array before creating Set
  (labelsArray): Set<string> => new Set(labelsArray || []) // <<< Safeguard Added
);
// -----------------------------------------
export const selectAccumulationPlotSelectedGoIdsSet = createSelector(
  [selectAccumulationPlotSelectedGoIds],
  // Add fallback to empty array before creating Set
  (goIdArray): Set<string> => new Set(goIdArray || [])
);