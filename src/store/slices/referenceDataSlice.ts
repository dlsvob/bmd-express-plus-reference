// src/store/slices/referenceDataSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// --- Use the CORRECT named import ---
import { hardcodedReferenceData } from '../../data/referenceUmapData'; // Adjust path if needed
// -----------------------------------
import { ReferenceUmapItem } from '../../data/referenceUmapData'; // Adjust path if needed
import { RootState } from '../store'; // Adjust path if needed for RootState type

interface ReferenceDataState {
    referenceUmapData: ReferenceUmapItem[] | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: ReferenceDataState = {
    // --- Use the correctly imported variable name ---
    referenceUmapData: hardcodedReferenceData,
    // ---------------------------------------------
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

/**
 * Selects the entire state object for the referenceData slice.
 * @param state - The root state of the Redux store.
 * @returns The ReferenceDataState object.
 */
export const selectReferenceDataState = (state: RootState): ReferenceDataState => state.referenceData;