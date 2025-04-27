// src/store/slices/analysisUISlice.ts
// Setting default rank range in initialState

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
  committedRankSliderValue: [number, number]; // [start_rank, end_rank]
}

// --- Define initial state with a default rank range ---
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
  // --- SET DEFAULT RANK RANGE ---
  committedRankSliderValue: [1, 5000], // Default to a wide range
  // ----------------------------
};
// ----------------------------------------------------

// --- Helper Functions ---
const toggleItemInArray = (arr: string[], item: string): string[] => {
  const currentArr = arr || [];
  const index = currentArr.indexOf(item);
  if (index > -1) {
    // console.log(`[toggleItemInArray] Removing item: ${item}`); // Keep logs minimal
    return [
      ...currentArr.slice(0, index),
      ...currentArr.slice(index + 1)
    ];
  } else {
    // console.log(`[toggleItemInArray] Adding item: ${item}`); // Keep logs minimal
    return [...currentArr, item];
  }
};

const parseGoIdInput = (input: string): string[] => {
  if (!input) return [];
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
    resetStyling(state) { Object.assign(state, initialState); }, // Reset will now include the default range

    toggleColorLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenColorLabels = toggleItemInArray(state.hiddenColorLabels, action.payload);
    },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenShapeLabels = toggleItemInArray(state.hiddenShapeLabels, action.payload);
    },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenSizeLabels = toggleItemInArray(state.hiddenSizeLabels, action.payload);
    },

    setGoIdInputString(state, action: PayloadAction<string>) { state.goIdInputString = action.payload; state.goIdFilterList = parseGoIdInput(action.payload); },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) { state.highlightMode = action.payload; },
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) { state.accumulationPlotSelectedGoIds = action.payload || []; },

    // --- Reducer for Rank ---
    setCommittedRankSliderValue(state, action: PayloadAction<[number, number]>) {
      // Basic validation
      if (Array.isArray(action.payload) && action.payload.length === 2 &&
        typeof action.payload[0] === 'number' && typeof action.payload[1] === 'number') {
        // Only update if the value actually changed to prevent unnecessary re-renders
        if (state.committedRankSliderValue[0] !== action.payload[0] || state.committedRankSliderValue[1] !== action.payload[1]) {
          // console.log(`[analysisUISlice] Reducer: setCommittedRankSliderValue - Payload: [${action.payload.join(', ')}]`); // Keep logs minimal
          state.committedRankSliderValue = action.payload;
        }
      } else {
        console.warn('[analysisUISlice] Invalid payload for setCommittedRankSliderValue:', action.payload);
      }
    },
    // --------------------------
  },
});

// Export the action creators
export const {
  setColorBy, setShapeBy, setSizeBy, resetStyling,
  toggleColorLabelVisibility, toggleShapeLabelVisibility, toggleSizeLabelVisibility,
  setGoIdInputString, setHighlightMode, setAccumulationPlotSelection,
  // --- Export new action ---
  setCommittedRankSliderValue,
  // -------------------------
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

// --- RENAME Rank Selector ---
// Renamed to reflect the UI component more accurately
export const selectCommittedSlidingWindowValue = (state: RootState): [number, number] => state.analysisUI.committedRankSliderValue;
// ----------------------------

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
