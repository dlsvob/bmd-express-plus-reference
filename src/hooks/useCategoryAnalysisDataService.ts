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
  selectedBmdResultRefs: string[]
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

        // Transform selected refs to numbers for SQL query
        const selectedBmdResultRefsNumbers = selectedBmdResultRefs.map(ref => parseInt(ref, 10));

        // Execute direct query filtered by selected BMD result refs
        console.log('[useCategoryAnalysisDataService] Executing query for selected BMD results:', selectedBmdResultRefsNumbers);
        const mainQuery = `
          SELECT
            cars.id as set_id,
            cars.name as set_name,
            cars.bmdResultId,
            cars.sex,
            cars.organ,
            cars.species,
            cars.dataType,
            cars.platform,
            car.id as result_id,
            car.categoryIdentifierId,
            car.modelType,
            car.geneAllCount,
            car.percentage,
            car.genesThatPassedAllFilters,
            car.bmdFifthPercentileTotalGenes,
            ci.id as category_id,
            ci.title as category_title,
            ci.modelType as category_model_type,
            br.name as bmd_result_name,
            br.organ as bmd_organ,
            br.species as bmd_species,
            br.dataType as bmd_dataType,
            br.platform as bmd_platform,
            br.bmdMethod,
            br.wAUC,
            br.logwAUC,
            dre.id as experiment_id,
            dre.name as experiment_name,
            dre.chipId,
            dre.logTransformation,
            dre.columnHeader2,
            dre.chipCreationDate
          FROM categoryAnalysisResultsSets cars
          JOIN categoryAnalysisResults car ON cars.id = car.categoryAnalysisResultsId
          JOIN categoryIdentifiers ci ON car.categoryIdentifierId = ci.id
          JOIN bmdResults br ON cars.bmdResultId = br.id
          JOIN doseResponseExperiments dre ON br.doseResponseExperimentId = dre.id
          WHERE ci.modelType = 'go'
            AND cars.bmdResultId IN (${selectedBmdResultRefsNumbers.join(',')})
            AND car.percentage >= 5
            AND car.geneAllCount BETWEEN 40 AND 500
            AND car.genesThatPassedAllFilters >= 3
          ORDER BY cars.name, car.percentage DESC
          LIMIT 1000;
        `;

        const mainResult = await rpc.exec(mainQuery);
        console.log('[useCategoryAnalysisDataService] Main query results:', {
          rowCount: mainResult.rows?.length || 0,
          schema: mainResult.schema
        });

        if (cancelled) return;

        const filteredMainResults = mainResult.rows || [];

        // Extract unique BMD results for the rawBmdResults array
        const uniqueBmdResults = filteredMainResults.reduce((acc, result) => {
          const key = result.bmdResultId;
          if (!acc.has(key) && selectedBmdResultRefsNumbers.includes(result.bmdResultId)) {
            acc.set(key, {
              '@ref': result.bmdResultId,
              name: result.bmd_result_name,
              doseResponseExperiment: result.experiment_id
            });
          }
          return acc;
        }, new Map());

        // Transform category analysis results to legacy format
        const rawCategoryAnalysisItems = filteredMainResults.map(result => ({
          bmdResultRef: result.bmdResultId,
          item: {
            '@ref': result.result_id,
            '@type': 'CategoryAnalysisResult',
            categoryIdentifier: {
              id: result.categoryIdentifierId,
              title: result.category_title
            },
            geneAllCount: result.geneAllCount,
            percentage: result.percentage,
            genesThatPassedAllFilters: result.genesThatPassedAllFilters,
            bmdFifthPercentileTotalGenes: result.bmdFifthPercentileTotalGenes,
            categoryId: result.category_id,
            categoryTitle: result.category_title,
            experimentName: result.experiment_name,
            bmdResultName: result.bmd_result_name
          }
        }));

        // Transform reference UMAP data for the categories we have
        const categoryIds = new Set(filteredMainResults.map(r => r.category_id));
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
          selectedBmdResultRefs: selectedBmdResultRefsNumbers,
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
  }, [selectedBmdResultRefs.join(','), isDuckDbInitializing, isDuckDbReady, duckDbInitializationError]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    isSuccess
  };
}