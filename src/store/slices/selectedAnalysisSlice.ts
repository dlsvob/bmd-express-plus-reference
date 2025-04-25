// src/store/slices/selectedAnalysisSlice.ts
// (Verify this structure exists)

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { DetailedAnalysisData } from '../../models/ApplicationModel'; // Ensure this type is defined/imported

export interface SelectedAnalysisState {
  selectedRefs: string[]; // Use React.Key[] for consistency with Antd Table? string[] is likely fine.
  selectedDetails: DetailedAnalysisData[] | null;
}

const initialState: SelectedAnalysisState = {
  selectedRefs: [],
  selectedDetails: null,
};

const selectedAnalysisSlice = createSlice({
  name: 'selectedAnalysis',
  initialState,
  reducers: {
    setSelectedAnalysisDetails(state, action: PayloadAction<DetailedAnalysisData[]>) {
      state.selectedDetails = action.payload;
    },
    clearSelectedAnalyses(state) {
      state.selectedRefs = [];
      state.selectedDetails = null;
    },
    // Action we will use to update selection from the table
    setSelectedAnalysisRefs(state, action: PayloadAction<React.Key[]>) {
      // Convert React.Key[] to string[] if necessary, assuming refs are strings
      state.selectedRefs = (action.payload as string[]) || [];
      // Optionally clear details when selection changes, as currently implemented
      state.selectedDetails = null;
    },
  },
});

export const {
  setSelectedAnalysisDetails,
  clearSelectedAnalyses,
  setSelectedAnalysisRefs, // Make sure this is exported
} = selectedAnalysisSlice.actions;
export default selectedAnalysisSlice.reducer;

// --- Selectors ---
export const selectSelectedAnalysisState = (state: RootState) => state.selectedAnalysis;
export const selectSelectedAnalysisRefs = (state: RootState): string[] => state.selectedAnalysis.selectedRefs;
export const selectSelectedAnalysisDetails = (state: RootState) => state.selectedAnalysis.selectedDetails;