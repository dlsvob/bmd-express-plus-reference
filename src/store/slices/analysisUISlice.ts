// src/store/slices/analysisUISlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// --- Define HighlightMode enum ---
export enum HighlightMode {
  NONE = 'none',
  SELECTED = 'selected',
  CLUSTER = 'cluster',
}

// --- Define the state interface ---
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
  committedRankSliderValue: [number, number]; // For UMAP view

  // --- Clustering View Specific State ---
  highlightedClusteringRefClusterIds: string[];
  activeClusteringRef: string | null;
  // **** ADDED ****
  clusteringRankFilterValue: [number, number]; // Rank filter for clustering view
  // ***************

  // --- Cross-component Interaction State ---
  accumulationPlotSelectedGoIds: string[];
  tableSelectedGoId: string | null;
}

// --- Define initial state ---
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
  committedRankSliderValue: [1, 5000], // UMAP default

  // --- Clustering Defaults ---
  highlightedClusteringRefClusterIds: [],
  activeClusteringRef: null,
  // **** ADDED ****
  clusteringRankFilterValue: [1, 1000], // Default range for clustering filter
  // ***************

  // --- Interaction Defaults ---
  accumulationPlotSelectedGoIds: [],
  tableSelectedGoId: null,
};

// --- Helper Functions ---
const toggleItemInArray = <T>(arr: T[], item: T): T[] => {
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
  if (!input) return [];
  return input
    .split(/[\n,;\s]+/)
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => id.toUpperCase());
};

// --- Create the Slice ---
const analysisUISlice = createSlice({
  name: 'analysisUI',
  initialState,
  reducers: {
    // --- UMAP Styling Reducers ---
    setColorBy(state, action: PayloadAction<string>) {
      state.colorBy = action.payload;
      state.hiddenColorLabels = []; // Reset visibility when changing category
    },
    setShapeBy(state, action: PayloadAction<string>) {
      state.shapeBy = action.payload;
      state.hiddenShapeLabels = []; // Reset visibility
    },
    setSizeBy(state, action: PayloadAction<string>) {
      state.sizeBy = action.payload;
      state.hiddenSizeLabels = []; // Reset visibility
    },
    resetStyling(state) {
      state.colorBy = initialState.colorBy;
      state.shapeBy = initialState.shapeBy;
      state.sizeBy = initialState.sizeBy;
      state.hiddenColorLabels = [];
      state.hiddenShapeLabels = [];
      state.hiddenSizeLabels = [];
    },

    // --- UMAP Legend Visibility Reducers ---
    toggleColorLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenColorLabels = toggleItemInArray(state.hiddenColorLabels, action.payload);
    },
    toggleShapeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenShapeLabels = toggleItemInArray(state.hiddenShapeLabels, action.payload);
    },
    toggleSizeLabelVisibility(state, action: PayloadAction<string>) {
      state.hiddenSizeLabels = toggleItemInArray(state.hiddenSizeLabels, action.payload);
    },

    // --- Clustering Legend Highlight Reducer ---
    toggleClusteringRefClusterHighlight(state, action: PayloadAction<string>) {
      state.highlightedClusteringRefClusterIds = toggleItemInArray(state.highlightedClusteringRefClusterIds, action.payload);
    },

    // --- GO ID Filter/Highlight Reducers ---
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

    // --- Cross-component Interaction Reducers ---
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) {
      state.accumulationPlotSelectedGoIds = action.payload || [];
    },
    setTableSelectedGoId(state, action: PayloadAction<string | null>) {
      state.tableSelectedGoId = action.payload;
    },

    // --- Rank Filter Reducer (UMAP) ---
    setCommittedRankSliderValue(state, action: PayloadAction<[number, number]>) {
      if (
        Array.isArray(action.payload) &&
        action.payload.length === 2 &&
        typeof action.payload[0] === 'number' &&
        typeof action.payload[1] === 'number'
      ) {
        // Only update if the value actually changed
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

    // --- Reducer for Active Clustering Ref ---
    setActiveClusteringRef(state, action: PayloadAction<string | null>) {
      console.log(`[analysisUISlice] Setting activeClusteringRef: ${action.payload}`);
      state.activeClusteringRef = action.payload;
      // Reset clustering-specific filters when ref changes
      state.clusteringRankFilterValue = initialState.clusteringRankFilterValue;
      state.highlightedClusteringRefClusterIds = [];
    },

    // **** ADD THIS REDUCER ****
    setClusteringRankFilterValue(state, action: PayloadAction<[number, number]>) {
      if (
        Array.isArray(action.payload) &&
        action.payload.length === 2 &&
        typeof action.payload[0] === 'number' &&
        typeof action.payload[1] === 'number'
      ) {
        // Only update if the value actually changed
        if (
          state.clusteringRankFilterValue[0] !== action.payload[0] ||
          state.clusteringRankFilterValue[1] !== action.payload[1]
        ) {
          state.clusteringRankFilterValue = action.payload;
          console.log(`[analysisUISlice] Setting clusteringRankFilterValue: [${action.payload.join(', ')}]`);
        }
      } else {
        console.warn(
          '[analysisUISlice] Invalid payload for setClusteringRankFilterValue:',
          action.payload
        );
      }
    },
    // ***************************
  },
});

// --- Export the action creators ---
export const {
  setColorBy, setShapeBy, setSizeBy, resetStyling,
  toggleColorLabelVisibility, toggleShapeLabelVisibility, toggleSizeLabelVisibility,
  toggleClusteringRefClusterHighlight,
  setGoIdInputString, setHighlightMode,
  setAccumulationPlotSelection, setTableSelectedGoId,
  setCommittedRankSliderValue, // UMAP action
  setActiveClusteringRef,
  // **** EXPORT NEW ACTION ****
  setClusteringRankFilterValue,
  // ***************************
} = analysisUISlice.actions;
export default analysisUISlice.reducer;

// --- Selectors ---
export const selectAnalysisUIState = (state: RootState): AnalysisUIState => state.analysisUI;
// UMAP Selectors
export const selectColorBy = (state: RootState): string => state.analysisUI.colorBy;
export const selectShapeBy = (state: RootState): string => state.analysisUI.shapeBy;
export const selectSizeBy = (state: RootState): string => state.analysisUI.sizeBy;
export const selectHiddenColorLabels = (state: RootState): string[] => state.analysisUI.hiddenColorLabels || [];
export const selectHiddenShapeLabels = (state: RootState): string[] => state.analysisUI.hiddenShapeLabels || [];
export const selectHiddenSizeLabels = (state: RootState): string[] => state.analysisUI.hiddenSizeLabels || [];
export const selectGoIdInputString = (state: RootState): string => state.analysisUI.goIdInputString;
export const selectGoIdFilterList = (state: RootState): string[] => state.analysisUI.goIdFilterList || [];
export const selectHighlightMode = (state: RootState): HighlightMode => state.analysisUI.highlightMode;
export const selectCommittedSlidingWindowValue = (state: RootState): [number, number] => state.analysisUI.committedRankSliderValue;
export const selectAccumulationPlotSelectedGoIds = (state: RootState): string[] => state.analysisUI.accumulationPlotSelectedGoIds || [];
export const selectTableSelectedGoId = (state: RootState): string | null => state.analysisUI.tableSelectedGoId;

// Clustering Selectors
export const selectHighlightedClusteringRefClusterIds = (state: RootState): string[] => state.analysisUI.highlightedClusteringRefClusterIds || [];
export const selectHighlightedClusteringRefClusterIdsSet = createSelector([selectHighlightedClusteringRefClusterIds], (idsArray): Set<string> => new Set(idsArray));
export const selectActiveClusteringRef = (state: RootState): string | null => state.analysisUI.activeClusteringRef;

// **** ADD SELECTOR for Clustering Rank Filter ****
export const selectClusteringRankFilterValue = (state: RootState): [number, number] => state.analysisUI.clusteringRankFilterValue;
// *************************************************

// Memoized selectors returning Sets
export const selectHiddenColorLabelsSet = createSelector([selectHiddenColorLabels], (labelsArray): Set<string> => new Set(labelsArray));
export const selectHiddenShapeLabelsSet = createSelector([selectHiddenShapeLabels], (labelsArray): Set<string> => new Set(labelsArray));
export const selectHiddenSizeLabelsSet = createSelector([selectHiddenSizeLabels], (labelsArray): Set<string> => new Set(labelsArray));
export const selectAccumulationPlotSelectedGoIdsSet = createSelector([selectAccumulationPlotSelectedGoIds], (goIdArray): Set<string> => new Set(goIdArray));