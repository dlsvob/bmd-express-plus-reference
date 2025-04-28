// src/store/slices/analysisUISlice.ts
// Manages UI state for analysis views, including filters, styling, and interactions.

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store'; // Adjust path if needed

// Define HighlightMode enum
export enum HighlightMode {
  NONE = 'none',
  SELECTED = 'selected', // For GO ID Filter "Exact Match"
  CLUSTER = 'cluster', // For GO ID Filter "Cluster Match"
}

// Define the state interface - Replace hidden with highlighted for clustering
export interface AnalysisUIState {
  // UMAP View Styling & Filtering
  colorBy: string;
  shapeBy: string;
  sizeBy: string;
  hiddenColorLabels: string[]; // Labels hidden in the UMAP color legend
  hiddenShapeLabels: string[]; // Labels hidden in the UMAP shape legend
  hiddenSizeLabels: string[]; // Labels hidden in the UMAP size legend
  goIdInputString: string; // Raw text input for GO IDs
  goIdFilterList: string[]; // Parsed list of GO IDs from input string
  highlightMode: HighlightMode; // How to highlight based on goIdFilterList
  committedRankSliderValue: [number, number]; // Current [minRank, maxRank] from SlidingWindowFilter

  // --- Clustering View Specific State ---
  // hiddenClusteringRefClusters: string[]; // <<< REMOVED (Highlighting Change)
  highlightedClusteringRefClusterId: string | null; // <<< ADDED (Highlighting Change): Stores STRING ID or null

  // Cross-component Interaction State
  accumulationPlotSelectedGoIds: string[]; // GO IDs selected via Accumulation plots
  tableSelectedGoId: string | null; // GO ID selected by clicking a table row (UMAP view)
}

// Define initial state
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
  committedRankSliderValue: [1, 5000], // Default wide range

  // --- Clustering Defaults ---
  // hiddenClusteringRefClusters: [], // <<< REMOVED (Highlighting Change)
  highlightedClusteringRefClusterId: null, // <<< ADDED (Highlighting Change): Initially nothing highlighted

  // Interaction Defaults
  accumulationPlotSelectedGoIds: [],
  tableSelectedGoId: null,
};

// --- Helper Functions ---
// Generic helper to toggle an item's presence in an array
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

// Helper to parse GO IDs from the input text area
const parseGoIdInput = (input: string): string[] => {
  if (!input) return [];
  // Split by newline, comma, semicolon, or one or more spaces
  // Trim whitespace, filter empty strings, convert to uppercase
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
    // --- UMAP Styling Reducers ---
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
      // Reset only visual styling, keep filters/selections
      state.colorBy = initialState.colorBy;
      state.shapeBy = initialState.shapeBy;
      state.sizeBy = initialState.sizeBy;
      state.hiddenColorLabels = [];
      state.hiddenShapeLabels = [];
      state.hiddenSizeLabels = [];
    },

    // --- UMAP Legend Visibility Reducers ---
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

    // --- Clustering Legend Highlight Reducer ---
    // toggleClusteringRefClusterVisibility(...) // <<< REMOVED (Highlighting Change)
    setHighlightedClusteringRefCluster( // <<< ADDED (Highlighting Change)
      state,
      action: PayloadAction<string | null> // Expects string cluster ID or null
    ) {
      const clickedId = action.payload;
      // If clicking the currently highlighted one, unhighlight (set to null)
      // Otherwise, set the new ID as highlighted
      state.highlightedClusteringRefClusterId =
        state.highlightedClusteringRefClusterId === clickedId ? null : clickedId;
    },

    // --- GO ID Filter/Highlight Reducers ---
    setGoIdInputString(state, action: PayloadAction<string>) {
      state.goIdInputString = action.payload;
      state.goIdFilterList = parseGoIdInput(action.payload); // Update derived list
    },
    setHighlightMode(state, action: PayloadAction<HighlightMode>) {
      // Ensure only valid enum values are set
      if (Object.values(HighlightMode).includes(action.payload)) {
        state.highlightMode = action.payload;
      } else {
        console.warn('Invalid HighlightMode payload:', action.payload);
        state.highlightMode = HighlightMode.NONE; // Default to NONE if invalid
      }
    },

    // --- Cross-component Interaction Reducers ---
    setAccumulationPlotSelection(state, action: PayloadAction<string[]>) {
      // Ensure payload is always an array, even if empty
      state.accumulationPlotSelectedGoIds = action.payload || [];
    },
    setTableSelectedGoId(state, action: PayloadAction<string | null>) {
      state.tableSelectedGoId = action.payload;
    },

    // --- Rank Filter Reducer ---
    setCommittedRankSliderValue(
      state,
      action: PayloadAction<[number, number]>
    ) {
      // Add validation for the payload
      if (
        Array.isArray(action.payload) &&
        action.payload.length === 2 &&
        typeof action.payload[0] === 'number' &&
        typeof action.payload[1] === 'number'
      ) {
        // Only update if the value has actually changed to prevent unnecessary re-renders
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
  },
});

// --- Export the action creators ---
export const {
  // UMAP Styling
  setColorBy,
  setShapeBy,
  setSizeBy,
  resetStyling,
  // UMAP Legends
  toggleColorLabelVisibility,
  toggleShapeLabelVisibility,
  toggleSizeLabelVisibility,
  // --- Clustering Legends ---
  // toggleClusteringRefClusterVisibility, // <<< REMOVED (Highlighting Change)
  setHighlightedClusteringRefCluster, // <<< ADDED (Highlighting Change)
  // GO ID Filter/Highlight
  setGoIdInputString,
  setHighlightMode,
  // Interactions
  setAccumulationPlotSelection,
  setTableSelectedGoId,
  // Rank Filter
  setCommittedRankSliderValue,
} = analysisUISlice.actions;

// --- Export the reducer function ---
export default analysisUISlice.reducer;

// --- Selectors ---
// Select the whole slice state
export const selectAnalysisUIState = (state: RootState): AnalysisUIState =>
  state.analysisUI;

// Selectors for UMAP styling options
export const selectColorBy = (state: RootState): string =>
  state.analysisUI.colorBy;
export const selectShapeBy = (state: RootState): string =>
  state.analysisUI.shapeBy;
export const selectSizeBy = (state: RootState): string =>
  state.analysisUI.sizeBy;

// Selectors for UMAP hidden legend items (arrays)
export const selectHiddenColorLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenColorLabels || [];
export const selectHiddenShapeLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenShapeLabels || [];
export const selectHiddenSizeLabels = (state: RootState): string[] =>
  state.analysisUI.hiddenSizeLabels || [];

// Selectors for GO ID filter/highlight
export const selectGoIdInputString = (state: RootState): string =>
  state.analysisUI.goIdInputString;
export const selectGoIdFilterList = (state: RootState): string[] =>
  state.analysisUI.goIdFilterList || [];
export const selectHighlightMode = (state: RootState): HighlightMode =>
  state.analysisUI.highlightMode;

// Selector for UMAP rank filter
export const selectCommittedSlidingWindowValue = (
  state: RootState
): [number, number] => state.analysisUI.committedRankSliderValue;

// Selectors for cross-component interactions
export const selectAccumulationPlotSelectedGoIds = (state: RootState): string[] =>
  state.analysisUI.accumulationPlotSelectedGoIds || [];
export const selectTableSelectedGoId = (state: RootState): string | null =>
  state.analysisUI.tableSelectedGoId;

// --- Selector for Clustering highlighted legend item ---
// selectHiddenClusteringRefClusters, // <<< REMOVED (Highlighting Change)
// selectHiddenClusteringRefClustersSet, // <<< REMOVED (Highlighting Change)
export const selectHighlightedClusteringRefClusterId = ( // <<< ADDED (Highlighting Change)
  state: RootState
): string | null => state.analysisUI.highlightedClusteringRefClusterId;

// --- Memoized selectors returning Sets (more efficient for lookups) ---
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
// No Set needed for single highlighted ID
