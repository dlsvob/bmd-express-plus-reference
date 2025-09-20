// src/hooks/useAvailableProjectsList.ts
import { useState, useEffect } from 'react';
import { ProjectInfo } from './useProjectData';

/**
 * Returns the hard-coded DuckDB project from OPFS instead of scanning IndexedDB.
 * This replaces the IndexedDB project detection with a direct reference to the
 * test_v4_with_metadata.duckdb file in OPFS.
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
        console.log("[useAvailableProjectList] Using hard-coded DuckDB project...");
        setIsLoading(true);
        setError(null);
        setProjects(null);

        // Simulate a brief loading time to mimic async behavior
        const loadProjects = async () => {
            try {
                // Hard-coded project list with the DuckDB file
                const projectList: ProjectInfo[] = [
                    {
                        name: 'Test BMD Analysis (DuckDB)',
                        source: 'duckdb' as const,
                    }
                ];

                if (isMounted) {
                    console.log("[useAvailableProjectList] Loaded hard-coded project:", projectList);
                    setProjects(projectList);
                    setError(null);
                }
            } catch (err) {
                console.error("[useAvailableProjectList] Error setting up hard-coded project:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Failed to load DuckDB project'));
                    setProjects(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        // Small delay to simulate loading
        setTimeout(loadProjects, 100);

        return () => {
            isMounted = false;
            console.log("[useAvailableProjectList] Hook cleanup (hard-coded DuckDB).");
        };
    }, []); // Run only once on mount

    return { projects, isLoading, error };
};
