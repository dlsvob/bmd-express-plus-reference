// src/store/selectors/navigationSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Assuming 'navigation' is the key for your navigation slice
const selectNavigationSlice = (state: RootState) => state.navigation;

// Define your AppDomain types if needed
export type AppDomain = 'projects' | 'experiments' | 'analysis' | 'settings' | null;

export const selectActiveAnalysisDomain = createSelector(
    [selectNavigationSlice],
    // Adjust 'activeDomain' to match the actual state property
    (navigationState): AppDomain => navigationState.activeDomain ?? null
);

export const selectActiveExperimentId = createSelector(
    [selectNavigationSlice],
    // Adjust 'activeExperimentId' to match the actual state property
    (navigationState): string | null => navigationState.activeExperimentId ?? null
);
// Add/modify selectors based on the actual state shape in your navigationSlice