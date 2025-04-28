// src/store/slices/analysisUISlice.ts
// Manages UI state for analysis view, including filters, styling, and interactions.

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Adjust path if needed

// Define HighlightMode enum
export enum HighlightMode {
  NONE = 'none',
  SELECTED = 'selected', // For GO ID Filter "Exact Match"
  CLUSTER = 'cluster',   // For GO ID Filter "Cluster Match"
}

// Define the state interface
export interface AnalysisUIState {
  colorBy: string;
  shapeBy: string;
  sizeBy: string;
  hiddenColorLabels: string[];
  hiddenShapeLabels: string[];
  hiddenSizeLabels: string[];
  goIdInputString: string;
  goIdFilterList: string[]; // Derived from goIdInputString
  highlightMode: HighlightMode; // For GO ID Filter/Highlight component
  accumulationPlotSelectedGoIds: string[]; // GO IDs selected via Accumulation plots
  committedRankSliderValue: [number, number]; // Current [minRank, maxRank] from SlidingWindowFilter
  tableSelectedGoId: string | null; // GO ID selected by clicking a table row
}

// Define initial state
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
  committedRankSliderValue: [1, 5000], // Default wide range
  tableSelectedGoId: null, // Initially nothing selected in table
};

// --- Helper Functions ---
const toggleItemInArray = (arr: string[], item: string): string[] => {
  const currentArr = arr || [];
  const index = currentArr.indexOf(item);
  if (index > -1) {
    return [
      ...currentArr.slice(0, index),
      ...currentArr.slice(index + 1)
    ];
  } else {
    return [...currentArr, item];
  }
};

const parseGoIdInput = (input: string): string[] => {
  if (!input) return [];
  // Split by newline, comma, semicolon, or one or more spaces
  // Trim whitespace, filter empty strings, convert to uppercase
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
    // Styling Reducers
    setColorBy(state, action: PayloadAction<string>) {
      state.colorBy = action.payload;
      state.hiddenColorLabels = []; // Reset hidden labels when changing category
    },
    setShapeBy(state, action: PayloadAction<string>) {
      state.shapeBy = action.payload;
      state.hiddenShapeLabels = []; // Reset hidden labels
    },
    setSizeBy(state, action: PayloadAction<string>) {
      state.sizeBy = action.payload;
      state.hiddenSizeLabels = []; // Reset hidden labels
    },
    resetStyling(state) {
      // Reset to initial state, preserving potentially entered GO IDs?
      // Or fully reset: Object.assign(state, initialState);
      state.colorBy = initialState.colorBy;
      state.shapeBy = initialState.shapeBy;
      state.sizeBy = initialState.sizeBy;
      state.hiddenColorLabels = [];
      state.hiddenShapeLabels = [];
      state.hiddenSizeLabels = [];
      // Keep highlightMode, goIdInputString, goIdFilterList, selections?
      // Decide if reset should clear everything or just visual styling.
      // For now, let's keep selections/filters:
      // state.highlightMode = initialState.highlightMode;
      // state.accumulationPlotSelectedGoIds = [];
      // state.tableSelectedGoId = null;
    },

    // Legend Visibility Reducers
    toggleColorLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenColorLabels = toggleItemInArray(state.hiddenColorLabels, action.payload);
    },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenShapeLabels = toggleItemInArray(state.hiddenShapeLabels, action.payload);
    },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenSizeLabels = toggleItemInArray(state.hiddenSizeLabels, action.payload);
    },

    // GO ID Filter/Highlight Reducers
    setGoIdInputString(state, action: PayloadAction<string>) {
      state.goIdInputString = action.payload;
      state.goIdFilterList = parseGoIdInput(action.payload); // Update derived list
    },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) {
      state.highlightMode = action.payload;
    },

    // Cross-component Interaction Reducers
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) {
      state.accumulationPlotSelectedGoIds = action.payload || [];
    },
    setTableSelectedGoId(state, action: PayloadAction<string | null>) {
      state.tableSelectedGoId = action.payload;
    },

    // Rank Filter Reducer
    setCommittedRankSliderValue(state, action: PayloadAction<[number, number]>) {
      if (Array.isArray(action.payload) && action.payload.length === 2 &&
        typeof action.payload[0] === 'number' && typeof action.payload[1] === 'number') {
        if (state.committedRankSliderValue[0] !== action.payload[0] || state.committedRankSliderValue[1] !== action.payload[1]) {
          state.committedRankSliderValue = action.payload;
        }
      } else {
        console.warn('[analysisUISlice] Invalid payload for setCommittedRankSliderValue:', action.payload);
      }
    },
  },
});

// Export the action creators
export const {
  setColorBy, setShapeBy, setSizeBy, resetStyling,
  toggleColorLabelVisibility, toggleShapeLabelVisibility, toggleSizeLabelVisibility,
  setGoIdInputString, setHighlightMode, setAccumulationPlotSelection,
  setTableSelectedGoId, // Export new action
  setCommittedRankSliderValue,
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
export const selectCommittedSlidingWindowValue = (state: RootState): [number, number] => state.analysisUI.committedRankSliderValue;
export const selectTableSelectedGoId = (state: RootState): string | null => state.analysisUI.tableSelectedGoId;

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
