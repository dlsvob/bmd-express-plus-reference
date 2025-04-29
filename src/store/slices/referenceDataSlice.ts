// src/store/slices/referenceDataSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { hardcodedReferenceData } from '../../data/referenceUmapData';
import { ReferenceUmapItem } from '../../data/referenceUmapData';
// import { RootState } from '../store'; // Keep commented if RootState isn't used directly here

// --- FIX: Export the interface ---
export interface ReferenceDataState { // Add export
    // ---------------------------------
    referenceUmapData: ReferenceUmapItem[] | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: ReferenceDataState = {
    referenceUmapData: hardcodedReferenceData,
    isLoading: false,
    error: null,
};

const referenceDataSlice = createSlice({
    name: 'referenceData',
    initialState,
    reducers: {
        setReferenceDataLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        setReferenceDataSuccess(state, action: PayloadAction<ReferenceUmapItem[]>) {
            state.referenceUmapData = action.payload;
            state.isLoading = false;
            state.error = null;
        },
        setReferenceDataError(state, action: PayloadAction<string>) {
            state.isLoading = false;
            state.error = action.payload;
        },
    },
});

export const {
    setReferenceDataLoading,
    setReferenceDataSuccess,
    setReferenceDataError,
} = referenceDataSlice.actions;

export default referenceDataSlice.reducer;

// --- REMOVE Selector from here, keep it in referenceDataSelector.ts ---
// export const selectReferenceDataState = (state: RootState): ReferenceDataState => state.referenceData;
// ---------------------------------------------------------------------
