// src/store/selectors/referenceDataSelector.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { createReferenceDataMap } from '../../utils/referenceDataUtils';
import type { ReferenceDataState } from '../slices/referenceDataSlice';

const selectReferenceDataState = (state: RootState): ReferenceDataState => state.referenceData;

// --- Selector for the raw reference data array ---
// --- Uses the locally defined base selector ---
export const selectReferenceData = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.referenceUmapData
);

// --- Selector for the loading state ---
// --- Uses the locally defined base selector ---
export const selectIsReferenceDataLoading = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.isLoading
);

// --- Selector for any loading error ---
// --- Uses the locally defined base selector ---
export const selectReferenceDataError = createSelector(
    [selectReferenceDataState],
    (referenceDataState) => referenceDataState.error
);

// --- Memoized selector to create the reference data Map (GO_ID -> Item) ---
// --- Depends on selectReferenceData, which depends on the local base selector ---
export const selectReferenceDataMap = createSelector(
    [selectReferenceData],
    (referenceData) => {
        if (!referenceData || referenceData.length === 0) {
            return null;
        }
        return createReferenceDataMap(referenceData);
    }
);
