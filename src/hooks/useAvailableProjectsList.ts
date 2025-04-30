// src/hooks/useAvailableProjectsList.ts
import { useState, useEffect } from 'react';
import { ProjectInfo } from './useProjectData';
import { listProjectDatabaseNames } from '../utils/myIDB';

/**
 * Fetches the list of available projects by calling the utility function
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

        listProjectDatabaseNames()
            .then(projectNames => {
                console.log("[useAvailableProjectList] Received project names:", projectNames);
                if (isMounted) {
                    const projectList: ProjectInfo[] = projectNames
                        .map((name: string) => ({
                            name: name,
                            // --- FIX: Use 'as const' ---
                            source: 'indexeddb' as const,
                            // --------------------------
                        }))
                        .sort((a: ProjectInfo, b: ProjectInfo) => a.name.localeCompare(b.name));

                    console.log("[useAvailableProjectList] Mapped project list:", projectList);
                    setProjects(projectList);
                    setError(null);
                }
            })
            .catch(err => {
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
