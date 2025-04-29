// src/hooks/useAvailableProjectsList.tsx
import { useState, useEffect } from 'react';
import { ProjectInfo } from './useProjectData'; // Keep this type import
// Import the new utility function
import { listProjectDatabaseNames } from '../utils/myIDB'; // Adjust path if needed

/**
 * Hook to fetch the list of available projects by calling the utility function
 * that uses indexedDB.databases().
 */
export const useAvailableProjectList = (): {
    projects: ProjectInfo[] | null;
    isLoading: boolean;
    error: Error | null;
} => {
    const [projects, setProjects] = useState<ProjectInfo[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;
        console.log("[useAvailableProjectList] Hook effect running (using listProjectDatabaseNames)...");
        setIsLoading(true);
        setError(null);
        setProjects(null);

        // Call the utility function
        listProjectDatabaseNames()
            .then(projectNames => {
                console.log("[useAvailableProjectList] Received project names:", projectNames);
                if (isMounted) {
                    // Map names to ProjectInfo structure
                    const projectList: ProjectInfo[] = projectNames
                        .map((name: string) => ({ // Add type for name
                            name: name,
                            source: 'indexeddb' as 'indexeddb',
                        }))
                        .sort((a: ProjectInfo, b: ProjectInfo) => a.name.localeCompare(b.name)); // Add types for a, b

                    console.log("[useAvailableProjectList] Mapped project list:", projectList);
                    setProjects(projectList);
                    setError(null);
                }
            })
            .catch(err => {
                // Handle errors from listProjectDatabaseNames (e.g., browser not supported)
                console.error("[useAvailableProjectList] Error getting project names:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Failed to list available projects'));
                    setProjects(null);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
            console.log("[useAvailableProjectList] Hook cleanup (using listProjectDatabaseNames).");
        };
    }, []); // Run only once on mount

    return { projects, isLoading, error };
};
