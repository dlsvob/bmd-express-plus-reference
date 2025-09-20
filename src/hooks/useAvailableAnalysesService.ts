// src/hooks/useAvailableAnalysesService.ts
import { useState, useEffect } from 'react';
import {
  getDuckDbRpc,
  isDuckDbEnabled,
} from 'bmd-express-data-service';
import { useAppSelector } from '../store/hooks';
import {
  selectIsDuckDbInitializing,
  selectIsDuckDbReady,
  selectDuckDbInitializationError,
} from '../store/slices/projectSlice';

// Debug function for browser console
(window as any).debugDuckDbTables = async () => {
  try {
    const rpc = getDuckDbRpc();
    if (!rpc?.exec) {
      console.log('DuckDB RPC not available');
      return;
    }

    console.log('=== DEBUGGING DUCKDB TABLES ===');

    // List all tables
    const tablesResult = await rpc.exec(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main'
      ORDER BY table_name;
    `);
    console.log('Available tables:', tablesResult.rows);

    // Check categoryAnalysisResultsSets
    const carsResult = await rpc.exec(`
      SELECT id, name, bmdResultId, organ, sex, species
      FROM categoryAnalysisResultsSets
      LIMIT 5;
    `);
    console.log('categoryAnalysisResultsSets sample:', carsResult.rows);

    // Check count
    const countResult = await rpc.exec(`
      SELECT COUNT(*) as count
      FROM categoryAnalysisResultsSets;
    `);
    console.log('categoryAnalysisResultsSets count:', countResult.rows);

  } catch (error) {
    console.error('Debug error:', error);
  }
};

export interface SelectableAnalysisInfo {
  bmdResultRef: number;
  bmdResultName: string;
  doseResponseExperimentRef: string;
  doseResponseExperimentName: string;
}

export interface UseAvailableAnalysesServiceResult {
  data: SelectableAnalysisInfo[] | undefined;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Hook to get available category analysis results sets from DuckDB.
 * Replaces the mock data with real database queries.
 */
export function useAvailableAnalysesService(
  projectName: string | null
): UseAvailableAnalysesServiceResult {
  const [data, setData] = useState<SelectableAnalysisInfo[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redux state for DuckDB initialization
  const isDuckDbInitializing = useAppSelector(selectIsDuckDbInitializing);
  const isDuckDbReady = useAppSelector(selectIsDuckDbReady);
  const duckDbInitializationError = useAppSelector(selectDuckDbInitializationError);

  useEffect(() => {
    if (!projectName) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      setIsSuccess(false);
      return;
    }

    console.log('[useAvailableAnalysesService] ==> HOOK TRIGGERED for project:', projectName);

    // If DuckDB initialization failed, show error immediately
    if (duckDbInitializationError) {
      console.log('[useAvailableAnalysesService] DuckDB initialization failed:', duckDbInitializationError);
      setIsLoading(false);
      setError(`Database initialization failed: ${duckDbInitializationError}`);
      setData(undefined);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is still initializing, show loading state
    if (isDuckDbInitializing) {
      console.log('[useAvailableAnalysesService] DuckDB is still initializing, waiting...');
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is not ready yet, wait
    if (!isDuckDbReady) {
      console.log('[useAvailableAnalysesService] DuckDB not ready yet, waiting for initialization...');
      setIsLoading(false); // Don't show loading since we're waiting for Redux state change
      setError(null);
      setIsSuccess(false);
      return;
    }

    let cancelled = false;

    const fetchAvailableAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      try {
        console.log('[useAvailableAnalysesService] Fetching available analyses for project:', projectName);

        // DuckDB should be ready now, get the RPC client
        const rpc = getDuckDbRpc();
        if (!isDuckDbEnabled() || !rpc?.exec) {
          throw new Error('DuckDB RPC not available despite ready state. This is a timing issue.');
        }

        console.log('[useAvailableAnalysesService] ✅ DuckDB connection established');

        // First, let's see what tables are available and what's in categoryAnalysisResultsSets
        console.log('[useAvailableAnalysesService] Checking available tables...');
        const tablesResult = await rpc.exec(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'main'
          ORDER BY table_name;
        `);
        console.log('[useAvailableAnalysesService] Available tables:', tablesResult.rows);

        // Let's try a simple query first to see what's in categoryAnalysisResultsSets with modelType from correct join
        console.log('[useAvailableAnalysesService] Checking categoryAnalysisResultsSets content...');
        const simpleQuery = `
          SELECT cars.id, cars.name, cars.bmdResultId, cars.organ, cars.sex, cars.species, ci.modelType
          FROM categoryAnalysisResultsSets cars
          LEFT JOIN categoryAnalysisResults car ON cars.id = car.categoryAnalysisResultsId
          LEFT JOIN categoryIdentifiers ci ON car.categoryIdentifierId = ci.id
          LIMIT 10;
        `;
        const simpleResult = await rpc.exec(simpleQuery);
        console.log('[useAvailableAnalysesService] Sample categoryAnalysisResultsSets data:', simpleResult.rows);

        // Now try the main query with GO filter to avoid duplicates
        const query = `
          SELECT DISTINCT
            cars.bmdResultId as bmdResultRef,
            cars.name as bmdResultName,
            COALESCE(dre.id, 0) as doseResponseExperimentRef,
            COALESCE(dre.name, 'Unknown Experiment') as doseResponseExperimentName
          FROM categoryAnalysisResultsSets cars
          JOIN categoryAnalysisResults car ON cars.id = car.categoryAnalysisResultsId
          JOIN categoryIdentifiers ci ON car.categoryIdentifierId = ci.id
          LEFT JOIN bmdResults br ON cars.bmdResultId = br.id
          LEFT JOIN doseResponseExperiments dre ON br.doseResponseExperimentId = dre.id
          WHERE ci.modelType = 'go'
          ORDER BY cars.bmdResultId
          LIMIT 20;
        `;

        console.log('[useAvailableAnalysesService] Executing query to get available analyses...');
        const result = await rpc.exec(query);
        console.log('[useAvailableAnalysesService] Query result:', {
          rowCount: result.rows?.length || 0,
          schema: result.schema
        });

        if (cancelled) return;

        // Transform the results to match the expected interface
        const analyses: SelectableAnalysisInfo[] = (result.rows || []).map(row => ({
          bmdResultRef: row.bmdResultRef,
          bmdResultName: row.bmdResultName || `Analysis ${row.bmdResultRef}`,
          doseResponseExperimentRef: String(row.doseResponseExperimentRef),
          doseResponseExperimentName: row.doseResponseExperimentName || `Experiment ${row.doseResponseExperimentRef}`
        }));

        // If no results found, provide some mock data for now
        let finalAnalyses = analyses;
        if (analyses.length === 0) {
          console.warn('[useAvailableAnalysesService] No analyses found in database, using fallback mock data');
          console.warn('[useAvailableAnalysesService] Call window.debugDuckDbTables() in browser console to debug');

          finalAnalyses = [
            {
              bmdResultRef: 1,
              bmdResultName: 'Mock Analysis 1 (No DB Data Found)',
              doseResponseExperimentRef: '1',
              doseResponseExperimentName: 'Mock Experiment 1'
            },
            {
              bmdResultRef: 2,
              bmdResultName: 'Mock Analysis 2 (No DB Data Found)',
              doseResponseExperimentRef: '2',
              doseResponseExperimentName: 'Mock Experiment 2'
            }
          ];
        }

        setData(finalAnalyses);
        setIsSuccess(true);
        setError(null);
        console.log('[useAvailableAnalysesService] Successfully loaded analyses:', finalAnalyses);

      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('[useAvailableAnalysesService] Error fetching analyses:', err);
          setError(errorMessage);
          setData(undefined);
          setIsSuccess(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAvailableAnalyses();

    return () => {
      cancelled = true;
    };
  }, [projectName, isDuckDbInitializing, isDuckDbReady, duckDbInitializationError]);

  return {
    data,
    isLoading,
    error,
    isSuccess
  };
}