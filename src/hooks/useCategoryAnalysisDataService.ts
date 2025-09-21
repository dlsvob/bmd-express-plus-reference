// src/hooks/useCategoryAnalysisDataService.ts
import { useState, useEffect } from 'react';
import {
  CategoryAnalysisQueryService,
  type CategoryAnalysisResult,
  type UmapClusterData,
  getDuckDbRpc,
  isDuckDbEnabled,
  initNewDatabase,
  connectToOpfsDuckDb
} from 'bmd-express-data-service';

import { useAppSelector } from '../store/hooks';
import {
  selectIsDuckDbInitializing,
  selectIsDuckDbReady,
  selectDuckDbInitializationError,
} from '../store/slices/projectSlice';
import { selectReferenceData } from '../store/selectors/referenceDataSelector';

// Hook return type matching what the UMAP component expects
export interface CategoryAnalysisData {
  rawBmdResults: Array<{
    '@ref': number;
    name: string;
    doseResponseExperiment: number;
  }>;
  rawCategoryAnalysisItems: Array<{
    bmdResultRef: number | string;
    item: {
      '@ref': number;
      '@type': string;
      categoryIdentifier: string;
      geneAllCount: number;
      percentage: number;
      genesThatPassedAllFilters: number;
      bmdFifthPercentileTotalGenes: number;
      categoryId: string;
      categoryTitle: string;
      experimentName: string;
      bmdResultName: string;
    };
  }>;
  selectedBmdResultRefs?: number[];
  umapClusters?: UmapClusterData[];
}

export interface UseCategoryAnalysisDataServiceResult {
  data: CategoryAnalysisData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isSuccess: boolean;
}

export function useCategoryAnalysisDataService(
  projectName: string | null,
  selectedBmdResultRefs: string[],
  fieldSelections?: string[]
): UseCategoryAnalysisDataServiceResult {
  const [data, setData] = useState<CategoryAnalysisData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Redux state for DuckDB initialization
  const isDuckDbInitializing = useAppSelector(selectIsDuckDbInitializing);
  const isDuckDbReady = useAppSelector(selectIsDuckDbReady);
  const duckDbInitializationError = useAppSelector(selectDuckDbInitializationError);

  // Redux state for reference UMAP data
  const referenceUmapData = useAppSelector(selectReferenceData);

  useEffect(() => {
    // Skip if no selected refs
    if (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0) {
      setData(undefined);
      setIsLoading(false);
      setIsFetching(false);
      setError(null);
      setIsSuccess(false);
      return;
    }

    console.log('[useCategoryAnalysisDataService] Effect triggered for:', {
      selectedBmdResultRefs,
      isDuckDbInitializing,
      isDuckDbReady,
      duckDbInitializationError,
      isDuckDbEnabled: isDuckDbEnabled(),
      rpcAvailable: !!getDuckDbRpc()
    });

    // If DuckDB initialization failed, show error immediately
    if (duckDbInitializationError) {
      console.log('[useCategoryAnalysisDataService] DuckDB initialization failed:', duckDbInitializationError);
      setIsLoading(false);
      setIsFetching(false);
      setError(`Database initialization failed: ${duckDbInitializationError}`);
      setData(undefined);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is still initializing, show loading state
    if (isDuckDbInitializing) {
      console.log('[useCategoryAnalysisDataService] DuckDB is still initializing, waiting...');
      setIsLoading(true);
      setIsFetching(true);
      setError(null);
      setIsSuccess(false);
      return;
    }

    // If DuckDB is not ready yet, wait
    if (!isDuckDbReady) {
      console.log('[useCategoryAnalysisDataService] DuckDB not ready yet, waiting for initialization...');
      setIsLoading(false);
      setIsFetching(false);
      setError(null);
      setIsSuccess(false);
      return;
    }

    // Additional check: even if Redux says ready, verify actual DuckDB state
    if (!isDuckDbEnabled() || !getDuckDbRpc()) {
      console.log('[useCategoryAnalysisDataService] Redux says ready but DuckDB not actually available, waiting...');
      setIsLoading(false);
      setIsFetching(false);
      setError(null);
      setIsSuccess(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setIsFetching(true);
      setError(null);
      setIsSuccess(false);

      try {
        console.log('[useCategoryAnalysisDataService] Fetching data for:', { selectedBmdResultRefs });

        // DuckDB should be ready now, get the RPC client
        const rpc = getDuckDbRpc();
        if (!isDuckDbEnabled() || !rpc?.exec) {
          throw new Error('DuckDB RPC not available despite ready state. This is a timing issue.');
        }

        console.log('[useCategoryAnalysisDataService] ✅ DuckDB connection established');

        // Test DuckDB connectivity
        console.log('[useCategoryAnalysisDataService] Testing DuckDB connectivity...');
        const testResult = await rpc.exec('SELECT COUNT(*) as table_count FROM information_schema.tables');
        console.log('[useCategoryAnalysisDataService] DuckDB test query result:', testResult);

        // Transform selected refs to numbers - these are analysis set IDs
        const selectedAnalysisSetIds = selectedBmdResultRefs.map(ref => parseInt(ref, 10));

        // Create CategoryAnalysisQueryService instance with existing RPC
        const categoryAnalysisQueryService = new CategoryAnalysisQueryService(rpc.exec.bind(rpc));

        // Use service method with only the fields we need
        console.log('[useCategoryAnalysisDataService] Getting category analysis results for analysis sets:', selectedAnalysisSetIds);

        const mainResult = await categoryAnalysisQueryService.getSelectedCategoryAnalysisResults({
          select: fieldSelections,
          filters: {
            categoryAnalysisResultsId: selectedAnalysisSetIds
          }
        });

        console.log('[useCategoryAnalysisDataService] Service method results:', {
          rowCount: mainResult.rowCount,
          sample: mainResult.rows?.slice(0, 3)
        });

        // DEBUG: Let's see the actual structure of mainResult
        console.log('[useCategoryAnalysisDataService] Full mainResult structure:', mainResult);
        console.log('[useCategoryAnalysisDataService] mainResult.rows sample:', mainResult.rows?.slice(0, 2));

        if (cancelled) return;

        const filteredMainResults = mainResult.rows || [];

        // Extract unique BMD results for the rawBmdResults array
        // Use the actual field: categoryAnalysisResultsId (which is the analysis set ID)
        const uniqueBmdResults = filteredMainResults.reduce((acc, result) => {
          const key = result.categoryAnalysisResultsId;
          if (!acc.has(key) && selectedAnalysisSetIds.includes(result.categoryAnalysisResultsId)) {
            acc.set(key, {
              '@ref': result.categoryAnalysisResultsId,
              name: `Analysis Set ${result.categoryAnalysisResultsId}`, // We don't have the actual name in this data
              doseResponseExperiment: result.categoryAnalysisResultsId
            });
          }
          return acc;
        }, new Map());

        // Transform category analysis results to legacy format
        const rawCategoryAnalysisItems = filteredMainResults.map(result => ({
          bmdResultRef: result.categoryAnalysisResultsId, // Use actual field name
          item: {
            '@ref': result.id, // Use actual field name
            '@type': 'CategoryAnalysisResult',
            categoryIdentifier: {
              id: result.categoryIdentifierId,
              title: result.categoryIdentifierId // Use categoryIdentifierId as title since no separate title field
            },
            geneAllCount: result.geneAllCount,
            percentage: result.percentage,
            genesThatPassedAllFilters: result.genesThatPassedAllFilters,
            bmdFifthPercentileTotalGenes: result.bmdFifthPercentileTotalGenes,
            categoryId: result.categoryIdentifierId, // Use categoryIdentifierId as categoryId
            categoryTitle: result.categoryIdentifierId, // Use categoryIdentifierId as title
            experimentName: `Analysis Set ${result.categoryAnalysisResultsId}`, // Generate experiment name
            bmdResultName: `Analysis Set ${result.categoryAnalysisResultsId}` // Generate BMD result name
          }
        }));

        // Transform reference UMAP data for the categories we have
        const categoryIds = new Set(filteredMainResults.map(r => r.categoryIdentifierId));
        const filteredUmapClusters = referenceUmapData?.filter(refData =>
          categoryIds.has(refData.go_id)
        ).map(refData => ({
          category_id: refData.go_id,
          x: refData.UMAP_1,
          y: refData.UMAP_2,
          cluster: refData.cluster_id
        })) || [];

        const transformedData: CategoryAnalysisData = {
          rawBmdResults: Array.from(uniqueBmdResults.values()),
          rawCategoryAnalysisItems,
          selectedBmdResultRefs: selectedAnalysisSetIds,
          umapClusters: filteredUmapClusters
        };

        if (!cancelled) {
          setData(transformedData);
          setIsSuccess(true);
          setError(null);
          console.log('[useCategoryAnalysisDataService] Data fetched successfully:', transformedData);
        }

      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('[useCategoryAnalysisDataService] Error fetching data:', err);
          setError(errorMessage);
          setData(undefined);
          setIsSuccess(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedBmdResultRefs.join(','), isDuckDbInitializing, isDuckDbReady, duckDbInitializationError, fieldSelections?.join(',') || '']);

  return {
    data,
    isLoading,
    isFetching,
    error,
    isSuccess
  };
}