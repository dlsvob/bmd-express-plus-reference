// src/hooks/useProjectData.ts
import { ProjectData } from '../models/BMDxExported';
import { useIndexedDbProjectData } from './useIndexedDbProjectData';
// import { useRemoteApiProjectData } from './useRemoteApiProjectData'; // For future

export interface ProjectInfo {
    name: string;
    source: 'indexeddb' | 'remote' | string;
}

export interface UseProjectDataResult {
    projectData: ProjectData | null;
    isLoading: boolean;
    error: Error | null;
}

export function useProjectData(selectedProject: ProjectInfo | null): UseProjectDataResult {
    const projectName = selectedProject?.name ?? null;
    const projectSource = selectedProject?.source ?? null;

    // --- Call ALL potential source hooks unconditionally ---
    // Call the specific hook for IndexedDB data
    const indexedDbResult = useIndexedDbProjectData(
        projectSource === 'indexeddb' ? projectName : null // Pass name only if source matches
    );

    // Call the specific hook for Remote API data (when implemented)
    // const remoteApiResult = useRemoteApiProjectData(
    //     projectSource === 'remote' ? projectName : null // Pass name only if source matches
    // );

    // --- Select the result based on the source ---
    if (projectSource === 'indexeddb') {
        return indexedDbResult; // Return the result from the IDB hook
    } else if (projectSource === 'remote') {
        // return remoteApiResult; // Return result from remote hook when implemented
        // Placeholder for now:
        return {
            projectData: null,
            isLoading: false,
            error: new Error(`Data source type "${projectSource}" not yet implemented.`),
        };
    } else {
        // Handle null project or unknown source
        const errorMessage = selectedProject
            ? `Unknown project data source: ${projectSource}`
            : null;
        return {
            projectData: null,
            isLoading: false, // Not loading if no valid source/project
            error: errorMessage ? new Error(errorMessage) : null,
        };
    }
}
