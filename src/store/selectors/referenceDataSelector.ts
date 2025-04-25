// src/store/selectors/referenceDataSelector.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store'; // Adjust path as needed
// --- Correct the import path for createReferenceDataMap ---
import { createReferenceDataMap } from '../../utils/referenceDataUtils'; // Adjust path as needed
// ------------------------------------------------------
import { selectReferenceDataState } from '../slices/referenceDataSlice'; // Adjust path as needed


// Selector for the raw reference data array
export const selectReferenceData = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.referenceUmapData
);

// Selector for the loading state
export const selectIsReferenceDataLoading = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.isLoading
);

// Selector for any loading error
export const selectReferenceDataError = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.error
);


// Memoized selector to create the reference data Map (GO_ID -> Item)
export const selectReferenceDataMap = createSelector(
    [selectReferenceData], // Input selector: the raw data array
    (referenceData) => {
        // Only create the map if the data is available
        if (!referenceData || referenceData.length === 0) {
            // console.log("[selectReferenceDataMap] No reference data array, returning null map.");
            return null; // Or return new Map() if preferred for consistency
        }
        // console.log(`[selectReferenceDataMap] Creating map from ${referenceData.length} reference items.`);
        // Use the imported utility function
        return createReferenceDataMap(referenceData);
    }
);