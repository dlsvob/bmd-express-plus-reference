// src/store/slices/navigationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { NavigationState } from '../models/reduxTypes'; // Correct path
import type { RootState } from '../store'; // Adjust path if needed

// Extend the state interface
export interface AppNavigationState extends NavigationState {
    analysisDomain: string | null; // Keep existing property
}

const initialState: AppNavigationState = {
    analysisDomain: null, // Default view key can be set here if desired
};

const navigationSlice = createSlice({
    name: 'navigation',
    initialState,
    reducers: {
        // Renamed from setActiveAnalysisDomain for clarity if needed, or keep it
        setActiveView(state, action: PayloadAction<string | null>) {
            console.log(`[navigationSlice] Reducer: setActiveView - Payload: ${action.payload}`);
            state.analysisDomain = action.payload;
        },
    },
});

export const { setActiveView } = navigationSlice.actions;

export default navigationSlice.reducer;

// Selectors (can be in navigationSelectors.ts)
export const selectNavigationState = (state: RootState): AppNavigationState => state.navigation;
// Renamed selector to match renamed action/state field if you changed it
export const selectCurrentView = (state: RootState) => state.navigation.analysisDomain;
