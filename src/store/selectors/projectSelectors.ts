// src/store/selectors/projectSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { projectsApi } from '../apis/projectsApi'; // *** Import the projectsApi ***

// Interface for project data returned by the API
interface ProjectListItem {
  name: string;
  experiments?: any[];
  // Add other potential fields returned by projectsApi base query if needed
}

// Selector for the base project slice state (if needed for other things)
const selectProjectSlice = (state: RootState) => state.project;

// --- Selector for the Active Project ID/Name (Reads from projectSlice - KEEP AS IS) ---
// This assumes setActiveProject reducer correctly updates state.project.activeProjectId
export const selectActiveProjectId = createSelector(
  [selectProjectSlice],
  (projectState): string | null => projectState.activeProjectId ?? null
);

// --- ** NEW ** Selector for Available Projects Data (Reads from projectsApi cache) ---
// Get the result object from the 'getProjects' endpoint query
const selectGetProjectsResult = projectsApi.endpoints.getProjects.select();

// Create a selector that extracts just the 'data' from the query result
// Defaults to an empty array if data is not yet available
// *REPLACE* your old selectAvailableProjects with this logic (or use this new name)
export const selectAvailableProjectsData = createSelector(
  selectGetProjectsResult,
  (getProjectsResult): ProjectListItem[] => getProjectsResult?.data ?? []
);
// --- End New Selector ---


// --- Update selectActiveProject to use the *NEW* data selector ---
export const selectActiveProject = createSelector(
  // *** Use selectAvailableProjectsData (from API cache) as input ***
  [selectAvailableProjectsData, selectActiveProjectId],
  (projects, activeId) => { // activeId is the NAME
    if (!activeId) {
      return null;
    }
    if (!Array.isArray(projects)) {
      console.warn('selectActiveProject: Input project list is not an array', projects);
      return null;
    }
    // Find project by name (logic is already correct)
    const foundProject = projects.find(p => p.name === activeId);
    return foundProject || null;
  }
);
// --- End Update ---


// --- selectSelectedProjectName depends on the above, no changes needed here ---
export const selectSelectedProjectName = createSelector(
  [selectActiveProject],
  (activeProject): string | null => {
    return activeProject ? activeProject.name : null;
  }
);


// --- REMOVE OR UPDATE Old Selectors (Optional Cleanup) ---
// These probably read from projectSlice state related to the old thunk
// You might want to remove them or update them to read from selectGetProjectsResult statuses
/*
export const selectAvailableProjects = createSelector( ... ); // REMOVE or rename if replaced by selectAvailableProjectsData
export const selectIsLoadingAvailableProjects = createSelector( ... ); // UPDATE to use selectGetProjectsResult.isLoading
export const selectAvailableProjectsError = createSelector( ... ); // UPDATE to use selectGetProjectsResult.error
*/