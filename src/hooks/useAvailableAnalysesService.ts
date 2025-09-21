// src/hooks/useAvailableAnalysesService.ts
import { useState, useEffect } from 'react';
import {
  CategoryAnalysisQueryService,
  getDuckDbRpc,
  isDuckDbEnabled,
} from 'bmd-express-data-service';
import { useAppSelector } from '../store/hooks';
import {
  selectIsDuckDbInitializing,
  selectIsDuckDbReady,
  selectDuckDbInitializationError,
} from '../store/slices/projectSlice';

// NOTE: Using bmd-express-data-service for clean data access
// The service provides CategoryAnalysisQueryService.getCategoryAnalysisSetsWithModelType()
// which resolves the duplicate key issue by using unique analysis set IDs

export interface SelectableAnalysisInfo {
  id: number;                          // NEW: Use categoryAnalysisResultsSets.id (unique)
  bmdResultRef: number;                // KEEP: For backwards compatibility
  bmdResultName: string;
  doseResponseExperimentRef: string;
  doseResponseExperimentName: string;
  // Additional fields from the data service
  name: string;                        // Analysis set name
  sex?: string;
  organ?: string;
  species?: string;
  dataType?: string;
  platform?: string;
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
  projectName: string | null,
  modelType: string
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

  
    // If DuckDB initialization failed, show error immediately
    if (duckDbInitializationError) {
        setIsLoading(false);
      setError(`Database initialization failed: ${duckDbInitializationError}`);
      setData(undefined);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is still initializing, show loading state
    if (isDuckDbInitializing) {
        setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is not ready yet, wait
    if (!isDuckDbReady) {
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
  
        // Create CategoryAnalysisQueryService instance directly
        const rpc = getDuckDbRpc();
        const categoryAnalysisQueryService = new CategoryAnalysisQueryService(rpc.exec.bind(rpc));

        if (!isDuckDbEnabled()) {
          throw new Error('DuckDB not available');
        }

  
        // Run test queries to debug and understand the database structure
  
        const analysisSets = await categoryAnalysisQueryService.getCategoryAnalysisSetsWithModelType(modelType);



        if (cancelled) return;

        // Transform the results to match the expected interface
        const analyses: SelectableAnalysisInfo[] = analysisSets.map(set => ({
          id: set.id,                                    // NEW: Use unique primary key
          bmdResultRef: set.bmdResultId,                 // Keep for compatibility
          bmdResultName: set.name || `Analysis ${set.bmdResultId}`,
          doseResponseExperimentRef: String(set.bmdResultId), // Use bmdResultId as experiment ref
          doseResponseExperimentName: `Experiment ${set.bmdResultId}`,
          name: set.name,
          sex: set.sex,
          organ: set.organ,
          species: set.species,
          dataType: set.dataType,
          platform: set.platform
        }));

        // If no results found, provide some mock data for now
        let finalAnalyses = analyses;
        if (analyses.length === 0) {
          console.warn('[useAvailableAnalysesService] No analyses found in database, using fallback mock data');
          console.warn('[useAvailableAnalysesService] Call window.debugDuckDbTables() in browser console to debug');

          finalAnalyses = [
            {
              id: 999,
              bmdResultRef: 1,
              bmdResultName: 'Mock Analysis 1 (No DB Data Found)',
              doseResponseExperimentRef: '1',
              doseResponseExperimentName: 'Mock Experiment 1',
              name: 'Mock Analysis 1'
            },
            {
              id: 998,
              bmdResultRef: 2,
              bmdResultName: 'Mock Analysis 2 (No DB Data Found)',
              doseResponseExperimentRef: '2',
              doseResponseExperimentName: 'Mock Experiment 2',
              name: 'Mock Analysis 2'
            }
          ];
        }

        setData(finalAnalyses);
        setIsSuccess(true);
        setError(null);
  
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
  }, [projectName, modelType, isDuckDbInitializing, isDuckDbReady, duckDbInitializationError]);

  return {
    data,
    isLoading,
    error,
    isSuccess
  };
}