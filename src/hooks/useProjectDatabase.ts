// src/hooks/useProjectDatabase.ts
import { useState, useEffect } from 'react';
import { IDBPDatabase } from 'idb';
import { openProjectDB, ProjectDB } from '../utils/myIDB'; // Adjust path as needed

/**
 * Custom hook to manage the IndexedDB connection for a specific project.
 * Opens the database when the projectName changes and provides the DB instance,
 * loading state, and any connection errors.
 *
 * @param projectName - The name of the project database to open, or null.
 * @returns An object containing the db instance, loading state, and error state.
 */
export function useProjectDatabase(projectName: string | null): {
  db: IDBPDatabase<ProjectDB> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [db, setDb] = useState<IDBPDatabase<ProjectDB> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    // Close previous connection if exists? IDB handles this reasonably well,
    // but explicit closing might be needed if resource leaks become an issue.
    // db?.close(); // Example if closing were needed

    if (projectName) {
      setIsLoading(true);
      setError(null);
      setDb(null); // Clear previous instance immediately
      console.log(`[useProjectDatabase] Opening DB for project: ${projectName}`);

      openProjectDB(projectName)
        .then((database) => {
          if (isMounted) {
            console.log(`[useProjectDatabase] DB opened: ${projectName}`, database);
            setDb(database);
            setError(null); // Clear any previous error on success
          }
        })
        .catch((err) => {
          console.error(`[useProjectDatabase] Error opening DB: ${projectName}`, err);
          if (isMounted) {
            setError(err instanceof Error ? err : new Error('Failed to open project database'));
            setDb(null); // Ensure db is null on error
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      // If projectName is null/cleared, reset state
      setDb(null);
      setIsLoading(false);
      setError(null);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      // Optional: Close DB connection if necessary when component unmounts
      // or projectName changes. IDB often manages connections implicitly.
      // db?.close();
      // console.log(`[useProjectDatabase] Cleanup effect for project: ${projectName}`);
    };
  }, [projectName]); // Re-run only when projectName changes

  return { db, isLoading, error };
}
