// src/store/slices/analysisUISlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Define HighlightMode enum (keep as is)
export enum HighlightMode {
  NONE = 'none',
  SELECTED = 'selected',
  CLUSTER = 'cluster',
}

// Define the state interface - Add activeClusteringRef
export interface AnalysisUIState {
  // UMAP View Styling & Filtering
  colorBy: string;
  shapeBy: string;
  sizeBy: string;
  hiddenColorLabels: string[];
  hiddenShapeLabels: string[];
  hiddenSizeLabels: string[];
  goIdInputString: string;
  goIdFilterList: string[];
  highlightMode: HighlightMode;
  committedRankSliderValue: [number, number];

  // Clustering View Specific State
  highlightedClusteringRefClusterIds: string[];
  activeClusteringRef: string | null; // <<< NEW STATE: ID of the single analysis to show

  // Cross-component Interaction State
  accumulationPlotSelectedGoIds: string[];
  tableSelectedGoId: string | null;
}

// Define initial state - Initialize new state
const initialState: AnalysisUIState = {
  // UMAP Defaults
  colorBy: 'cluster_id',
  shapeBy: 'bmdResultName',
  sizeBy: 'percentage',
  hiddenColorLabels: [],
  hiddenShapeLabels: [],
  hiddenSizeLabels: [],
  goIdInputString: '',
  goIdFilterList: [],
  highlightMode: HighlightMode.NONE,
  committedRankSliderValue: [1, 5000],

  // Clustering Defaults
  highlightedClusteringRefClusterIds: [],
  activeClusteringRef: null, // <<< Initialize as null

  // Interaction Defaults
  accumulationPlotSelectedGoIds: [],
  tableSelectedGoId: null,
};

// --- Helper Functions (Keep as is) ---
const toggleItemInArray = <T>(arr: T[], item: T): T[] => {
  // ... (implementation remains the same)
  const currentArr = arr || []; // Ensure it's an array
  const index = currentArr.indexOf(item);
  if (index > -1) {
    // Item exists, remove it
    return [
      ...currentArr.slice(0, index),
      ...currentArr.slice(index + 1),
    ];
  } else {
    // Item doesn't exist, add it
    return [...currentArr, item];
  }
};
const parseGoIdInput = (input: string): string[] => {
  // ... (implementation remains the same)
  if (!input) return [];
  return input
    .split(/[\n,;\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => id.toUpperCase());
};
// --- END HELPER FUNCTIONS ---

// --- Create the Slice ---
const analysisUISlice = createSlice({
  name: 'analysisUI',
  initialState,
  reducers: {
    // --- UMAP Styling Reducers (Keep as is) ---
    setColorBy(state, action: PayloadAction<string>) {
      state.colorBy = action.payload;
      state.hiddenColorLabels = [];
    },
    setShapeBy(state, action: PayloadAction<string>) {
      state.shapeBy = action.payload;
      state.hiddenShapeLabels = [];
    },
    setSizeBy(state, action: PayloadAction<string>) {
      state.sizeBy = action.payload;
      state.hiddenSizeLabels = [];
    },
    resetStyling(state) {
      state.colorBy = initialState.colorBy;
      state.shapeBy = initialState.shapeBy;
      state.sizeBy = initialState.sizeBy;
      state.hiddenColorLabels = [];
      state.hiddenShapeLabels = [];
      state.hiddenSizeLabels = [];
    },

    // --- UMAP Legend Visibility Reducers (Keep as is) ---
    toggleColorLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenColorLabels = toggleItemInArray(
        state.hiddenColorLabels,
        action.payload
      );
    },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenShapeLabels = toggleItemInArray(
        state.hiddenShapeLabels,
        action.payload
      );
    },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenSizeLabels = toggleItemInArray(
        state.hiddenSizeLabels,
        action.payload
      );
    },

    // --- Clustering Legend Highlight Reducer (Keep as is) ---
    toggleClusteringRefClusterHighlight(
      state,
      action: PayloadAction<string>
    ) {
      state.highlightedClusteringRefClusterIds = toggleItemInArray(
        state.highlightedClusteringRefClusterIds,
        action.payload
      );
    },

    // --- GO ID Filter/Highlight Reducers (Keep as is) ---
    setGoIdInputString(state, action: PayloadAction<string>) {
      state.goIdInputString = action.payload;
      state.goIdFilterList = parseGoIdInput(action.payload);
    },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) {
      if (Object.values(HighlightMode).includes(action.payload)) {
        state.highlightMode = action.payload;
      } else {
        console.warn('Invalid HighlightMode payload:', action.payload);
        state.highlightMode = HighlightMode.NONE;
      }
    },

    // --- Cross-component Interaction Reducers (Keep as is) ---
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) {
      state.accumulationPlotSelectedGoIds = action.payload || [];
    },
    setTableSelectedGoId(state, action: PayloadAction<string | null>) {
      state.tableSelectedGoId = action.payload;
    },

    // --- Rank Filter Reducer (Keep as is) ---
    setCommittedRankSliderValue(
      state,
      action: PayloadAction<[number, number]>
    ) {
      // ... (validation logic remains the same) ...
      if (
        Array.isArray(action.payload) &&
        action.payload.length === 2 &&
        typeof action.payload[0] === 'number' &&
        typeof action.payload[1] === 'number'
      ) {
        if (
          state.committedRankSliderValue[0] !== action.payload[0] ||
          state.committedRankSliderValue[1] !== action.payload[1]
        ) {
          state.committedRankSliderValue = action.payload;
        }
      } else {
        console.warn(
          '[analysisUISlice] Invalid payload for setCommittedRankSliderValue:',
          action.payload
        );
      }
    },

    // --- NEW Reducer for Active Clustering Ref ---
    setActiveClusteringRef(state, action: PayloadAction<string | null>) {
      console.log(
        `[analysisUISlice] Setting activeClusteringRef: ${action.payload}`
      );
      state.activeClusteringRef = action.payload;
    },
    // ---------------------------------------------
  },
});

// --- Export the action creators ---
export const {
  // ... (existing exports) ...
  setColorBy,
  setShapeBy,
  setSizeBy,
  resetStyling,
  toggleColorLabelVisibility,
  toggleShapeLabelVisibility,
  toggleSizeLabelVisibility,
  toggleClusteringRefClusterHighlight,
  setGoIdInputString,
  setHighlightMode,
  setAccumulationPlotSelection,
  setTableSelectedGoId,
  setCommittedRankSliderValue,
  // --- Export NEW action ---
  setActiveClusteringRef,
} = analysisUISlice.actions;

// --- Export the reducer function ---
export default analysisUISlice.reducer;

// --- Selectors ---
export const selectAnalysisUIState = (state: RootState): AnalysisUIState =>
  state.analysisUI;

// ... (existing selectors for UMAP, GO ID, Rank, Interactions) ...
export const selectColorBy = (state: RootState): string =>
  state.analysisUI.colorBy;
export const selectShapeBy = (state: RootState): string =>
  state.analysisUI.shapeBy;
export const selectSizeBy = (state: RootState): string =>
  state.analysisUI.sizeBy;
export const selectHiddenColorLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenColorLabels || [];
export const selectHiddenShapeLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenShapeLabels || [];
export const selectHiddenSizeLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenSizeLabels || [];
export const selectGoIdInputString = (state: RootState): string =>
  state.analysisUI.goIdInputString;
export const selectGoIdFilterList = (state: RootState): string[] =>
  state.analysisUI.goIdFilterList || [];
export const selectHighlightMode = (state: RootState): HighlightMode =>
  state.analysisUI.highlightMode;
export const selectCommittedSlidingWindowValue = (
  state: RootState
): [number, number] => state.analysisUI.committedRankSliderValue;
export const selectAccumulationPlotSelectedGoIds = (state: RootState): string[] =>
  state.analysisUI.accumulationPlotSelectedGoIds || [];
export const selectTableSelectedGoId = (state: RootState): string | null =>
  state.analysisUI.tableSelectedGoId;

// Selectors for Clustering highlighted legend items (Keep as is)
export const selectHighlightedClusteringRefClusterIds = (
  state: RootState
): string[] => state.analysisUI.highlightedClusteringRefClusterIds || [];
export const selectHighlightedClusteringRefClusterIdsSet = createSelector(
  [selectHighlightedClusteringRefClusterIds],
  (idsArray): Set<string> => new Set(idsArray)
);

// --- NEW Selector for Active Clustering Ref ---
export const selectActiveClusteringRef = (state: RootState): string | null =>
  state.analysisUI.activeClusteringRef;
// --------------------------------------------

// --- Memoized selectors returning Sets (Keep as is) ---
export const selectHiddenColorLabelsSet = createSelector(
  [selectHiddenColorLabels],
  (labelsArray): Set<string> => new Set(labelsArray)
);
export const selectHiddenShapeLabelsSet = createSelector(
  [selectHiddenShapeLabels],
  (labelsArray): Set<string> => new Set(labelsArray)
);
export const selectHiddenSizeLabelsSet = createSelector(
  [selectHiddenSizeLabels],
  (labelsArray): Set<string> => new Set(labelsArray)
);
export const selectAccumulationPlotSelectedGoIdsSet = createSelector(
  [selectAccumulationPlotSelectedGoIds],
  (goIdArray): Set<string> => new Set(goIdArray)
);
