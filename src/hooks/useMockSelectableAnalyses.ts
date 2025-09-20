// src/hooks/useMockSelectableAnalyses.ts
import { useState, useEffect } from 'react';

export interface SelectableAnalysisInfo {
  bmdResultRef: number;
  bmdResultName: string;
  doseResponseExperimentRef: string;
  doseResponseExperimentName: string;
}

export interface UseMockSelectableAnalysesResult {
  data: SelectableAnalysisInfo[] | undefined;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Mock hook to provide selectable analyses for DuckDB project.
 * This replaces the IndexedDB-based useGetSelectableAnalysesQuery
 * with hard-coded analysis options that match the DuckDB data.
 */
export function useMockSelectableAnalyses(
  args: { projectName: string },
  options: { skip: boolean }
): UseMockSelectableAnalysesResult {
  const [data, setData] = useState<SelectableAnalysisInfo[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (options.skip || !args.projectName) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate loading and provide mock selectable analyses
    const loadMockData = async () => {
      try {
        console.log('[useMockSelectableAnalyses] Loading mock selectable analyses for:', args.projectName);

        // Hard-coded analyses that should exist in the DuckDB data
        // These IDs should match what's available in test_v4_with_metadata.duckdb
        const mockAnalyses: SelectableAnalysisInfo[] = [
          {
            bmdResultRef: 1,
            bmdResultName: 'Liver Analysis (Male)',
            doseResponseExperimentRef: '1',
            doseResponseExperimentName: 'Dose Response Experiment 1'
          },
          {
            bmdResultRef: 2,
            bmdResultName: 'Liver Analysis (Female)',
            doseResponseExperimentRef: '2',
            doseResponseExperimentName: 'Dose Response Experiment 2'
          },
          {
            bmdResultRef: 3,
            bmdResultName: 'Kidney Analysis (Male)',
            doseResponseExperimentRef: '3',
            doseResponseExperimentName: 'Dose Response Experiment 3'
          },
          {
            bmdResultRef: 4,
            bmdResultName: 'Kidney Analysis (Female)',
            doseResponseExperimentRef: '4',
            doseResponseExperimentName: 'Dose Response Experiment 4'
          }
        ];

        // Add delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 200));

        setData(mockAnalyses);
        setIsSuccess(true);
        setError(null);

        console.log('[useMockSelectableAnalyses] Mock analyses loaded:', mockAnalyses);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[useMockSelectableAnalyses] Error loading mock data:', err);
        setError(errorMessage);
        setData(undefined);
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadMockData();
  }, [args.projectName, options.skip]);

  return {
    data,
    isLoading,
    error,
    isSuccess
  };
}