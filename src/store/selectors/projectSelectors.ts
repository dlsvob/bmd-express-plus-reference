// src/store/selectors/projectSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { projectsApi, Project } from '../apis/projectsApi';

// Selector for the base project slice state
const selectProjectSlice = (state: RootState) => state.project;

// Selector for the Active Project ID/Name (Reads from projectSlice)
export const selectActiveProjectId = createSelector(
  [selectProjectSlice],
  (projectState): string | null => projectState.activeProjectId ?? null
);

// Selector for Available Projects Data (Reads from projectsApi cache)
const selectGetProjectsResult = projectsApi.endpoints.getProjects.select();

export const selectAvailableProjectsData = createSelector(
  selectGetProjectsResult,
  (getProjectsResult): Project[] => getProjectsResult?.data ?? [] // Use imported Project type
);

export const selectActiveProject = createSelector(
  [selectAvailableProjectsData, selectActiveProjectId],
  (projects: Project[], activeId: string | null): Project | null => { // Use imported Project type
    if (!activeId) {
      return null;
    }
    // projects is guaranteed to be an array by selectAvailableProjectsData
    const foundProject = projects.find(p => p.name === activeId);
    return foundProject || null;
  }
);

export const selectSelectedProjectName = createSelector(
  [selectActiveProject],
  (activeProject): string | null => {
    return activeProject ? activeProject.name : null;
  }
);
