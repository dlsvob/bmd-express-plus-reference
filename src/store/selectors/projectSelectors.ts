// src/store/selectors/projectSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
// --- FIX: Import Project type from API ---
import { projectsApi, Project } from '../apis/projectsApi'; // Import Project type
// ---------------------------------------

// --- REMOVE local ProjectListItem interface ---
// interface ProjectListItem {
//   name: string;
//   experiments?: any[]; // <-- Source of no-explicit-any
// }
// ------------------------------------------

// Selector for the base project slice state
const selectProjectSlice = (state: RootState) => state.project;

// Selector for the Active Project ID/Name (Reads from projectSlice)
export const selectActiveProjectId = createSelector(
  [selectProjectSlice],
  (projectState): string | null => projectState.activeProjectId ?? null
);

// Selector for Available Projects Data (Reads from projectsApi cache)
const selectGetProjectsResult = projectsApi.endpoints.getProjects.select();

// --- FIX: Update return type annotation to use imported Project ---
export const selectAvailableProjectsData = createSelector(
  selectGetProjectsResult,
  (getProjectsResult): Project[] => getProjectsResult?.data ?? [] // Use imported Project type
);
// ----------------------------------------------------------------

// --- FIX: Update type annotation to use imported Project ---
export const selectActiveProject = createSelector(
  [selectAvailableProjectsData, selectActiveProjectId],
  (projects: Project[], activeId: string | null): Project | null => { // Use imported Project type
    if (!activeId) {
      return null;
    }
    // projects is already guaranteed to be an array by selectAvailableProjectsData
    const foundProject = projects.find(p => p.name === activeId);
    return foundProject || null;
  }
);
// ---------------------------------------------------------

// This selector should now work correctly as it depends on selectActiveProject
export const selectSelectedProjectName = createSelector(
  [selectActiveProject],
  (activeProject): string | null => {
    return activeProject ? activeProject.name : null;
  }
);
