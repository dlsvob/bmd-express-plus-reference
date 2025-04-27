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
  hiddenColorLabels: [],
  hiddenShapeLabels: [],
  hiddenSizeLabels: [],
  goIdInputString: '',
  goIdFilterList: [],
  highlightMode: HighlightMode.NONE,
  accumulationPlotSelectedGoIds: [],
};

// --- IMPLEMENTED HELPER FUNCTIONS ---
const toggleItemInArray = (arr: string[], item: string): string[] => {
  const currentArr = arr || []; // Ensure array exists
  const index = currentArr.indexOf(item);
  if (index > -1) {
    // Item exists: return a *new* array without the item
    console.log(`[toggleItemInArray] Removing item: ${item}`);
    return [
      ...currentArr.slice(0, index),
      ...currentArr.slice(index + 1)
    ];
  } else {
    // Item doesn't exist: return a *new* array with the item added
    console.log(`[toggleItemInArray] Adding item: ${item}`);
    return [...currentArr, item];
  }
};

const parseGoIdInput = (input: string): string[] => {
  if (!input) return [];
  // Split by common delimiters (newline, comma, semicolon, space), trim, filter empty, uppercase
  return input
    .split(/[\n,;\s]+/)
    .map(id => id.trim())
    .filter(id => id.length > 0)
    .map(id => id.toUpperCase());
};
// --- END HELPER FUNCTIONS ---


const analysisUISlice = createSlice({
  name: 'analysisUI',
  initialState,
  reducers: {
    setColorBy(state, action: PayloadAction<string>) { state.colorBy = action.payload; state.hiddenColorLabels = []; },
    setShapeBy(state, action: PayloadAction<string>) { state.shapeBy = action.payload; state.hiddenShapeLabels = []; },
    setSizeBy(state, action: PayloadAction<string>) { state.sizeBy = action.payload; state.hiddenSizeLabels = []; },
    resetStyling(state) { Object.assign(state, initialState); },

    // --- Reducers using the implemented helper ---
    toggleColorLabelVisibility(state, action: PayloadAction<string>) {
      console.log(`[analysisUISlice] Reducer: toggleColorLabelVisibility - Payload: ${action.payload}`);
      console.log('[analysisUISlice] State *before* toggle:', JSON.stringify(state.hiddenColorLabels));
      state.hiddenColorLabels = toggleItemInArray(state.hiddenColorLabels, action.payload);
      console.log('[analysisUISlice] State *after* toggle:', JSON.stringify(state.hiddenColorLabels));
    },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) {
      console.log(`[analysisUISlice] Reducer: toggleShapeLabelVisibility - Payload: ${action.payload}`);
      console.log('[analysisUISlice] State *before* toggle:', JSON.stringify(state.hiddenShapeLabels));
      state.hiddenShapeLabels = toggleItemInArray(state.hiddenShapeLabels, action.payload);
      console.log('[analysisUISlice] State *after* toggle:', JSON.stringify(state.hiddenShapeLabels));
    },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) {
      console.log(`[analysisUISlice] Reducer: toggleSizeLabelVisibility - Payload: ${action.payload}`);
      console.log('[analysisUISlice] State *before* toggle:', JSON.stringify(state.hiddenSizeLabels));
      state.hiddenSizeLabels = toggleItemInArray(state.hiddenSizeLabels, action.payload);
      console.log('[analysisUISlice] State *after* toggle:', JSON.stringify(state.hiddenSizeLabels));
    },
    // ---------------------------------------------

    setGoIdInputString(state, action: PayloadAction<string>) { state.goIdInputString = action.payload; state.goIdFilterList = parseGoIdInput(action.payload); },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) { state.highlightMode = action.payload; },
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) { state.accumulationPlotSelectedGoIds = action.payload || []; },
  },
});

// Export the action creators
export const {
  setColorBy, setShapeBy, setSizeBy, resetStyling,
  toggleColorLabelVisibility, toggleShapeLabelVisibility, toggleSizeLabelVisibility,
  setGoIdInputString, setHighlightMode, setAccumulationPlotSelection,
} = analysisUISlice.actions;

// Export the reducer function
export default analysisUISlice.reducer;

// --- Selectors ---
export const selectAnalysisUIState = (state: RootState): AnalysisUIState => state.analysisUI;
export const selectColorBy = (state: RootState): string => state.analysisUI.colorBy;
export const selectShapeBy = (state: RootState): string => state.analysisUI.shapeBy;
export const selectSizeBy = (state: RootState): string => state.analysisUI.sizeBy;
export const selectHiddenColorLabels = (state: RootState): string[] => state.analysisUI.hiddenColorLabels || [];
export const selectHiddenShapeLabels = (state: RootState): string[] => state.analysisUI.hiddenShapeLabels || [];
export const selectHiddenSizeLabels = (state: RootState): string[] => state.analysisUI.hiddenSizeLabels || [];
export const selectGoIdInputString = (state: RootState): string => state.analysisUI.goIdInputString;
export const selectGoIdFilterList = (state: RootState): string[] => state.analysisUI.goIdFilterList || [];
export const selectHighlightMode = (state: RootState): HighlightMode => state.analysisUI.highlightMode;
export const selectAccumulationPlotSelectedGoIds = (state: RootState): string[] => state.analysisUI.accumulationPlotSelectedGoIds || [];

// --- Memoized selectors returning Sets ---
export const selectHiddenColorLabelsSet = createSelector(
  [selectHiddenColorLabels],
  (labelsArray): Set<string> => new Set(labelsArray || [])
);
export const selectHiddenShapeLabelsSet = createSelector(
  [selectHiddenShapeLabels],
  (labelsArray): Set<string> => new Set(labelsArray || [])
);
export const selectHiddenSizeLabelsSet = createSelector(
  [selectHiddenSizeLabels],
  (labelsArray): Set<string> => new Set(labelsArray || [])
);
export const selectAccumulationPlotSelectedGoIdsSet = createSelector(
  [selectAccumulationPlotSelectedGoIds],
  (goIdArray): Set<string> => new Set(goIdArray || [])
);
