// src/store/slices/navigationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { NavigationState } from '../models/reduxTypes';
import type { RootState } from '../store';

// Extend the state interface
export interface AppNavigationState extends NavigationState {
    analysisDomain: string | null;
}

const initialState: AppNavigationState = {
    analysisDomain: null, // Default view key can be set here if desired
};

const navigationSlice = createSlice({
    name: 'navigation',
    initialState,
    reducers: {
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
export const selectCurrentView = (state: RootState) => state.navigation.analysisDomain;
