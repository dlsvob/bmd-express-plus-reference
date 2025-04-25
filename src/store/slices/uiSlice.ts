// src/store/slices/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UIState } from '../../models/reduxTypes'; // Adjust path
import { RootState } from '../store'; // Adjust path

const initialState: UIState = {
    isAddProjectModalOpen: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setIsAddProjectModalOpen(state, action: PayloadAction<boolean>) {
            console.log(`[uiSlice] Reducer: setIsAddProjectModalOpen - Payload: ${action.payload}`);
            state.isAddProjectModalOpen = action.payload;
        },
    },
});

export const { setIsAddProjectModalOpen } = uiSlice.actions;

export default uiSlice.reducer;

// Selectors (can be in uiSelectors.ts)
export const selectUIState = (state: RootState) => state.ui;
export const selectIsAddProjectModalOpen = (state: RootState) => state.ui.isAddProjectModalOpen;