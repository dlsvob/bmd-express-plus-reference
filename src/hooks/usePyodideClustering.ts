// src/hooks/usePyodideClustering.ts
import { useState, useEffect, useMemo } from 'react';
import { usePyodide } from '../contexts/PyodideProvider';
import { ApiClusteringInputItem } from '../utils/clusteringUtils';

// Expected structure of the successful result from Python
export interface PyodideClusteringResult {
    clusterAssignments: number[];
    leavesOrder: number[];
    orderedLabels: string[];
    orderedClusters: (string | number)[];
    linkageMatrix: number[][];
}

interface UsePyodideClusteringReturn {
    result: PyodideClusteringResult | null;
    isLoading: boolean;
    error: string | null;
}

export function usePyodideClustering(
    rowData: ApiClusteringInputItem[] | null,
    method: string,
    numClusters: number
): UsePyodideClusteringReturn {
    const {
        isLoading: isPyodideInitializing,
        error: pyodideInitError,
    } = usePyodide();

    const [isClusteringRunning, setIsClusteringRunning] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PyodideClusteringResult | null>(null);

    useEffect(() => {
        const logPrefix = '[usePyodideClustering Auto (v5 - Catch Fix)]'; // Version Bump
        const pyContextFromWindow = window.pyContext;
        const clusteringFunc = pyContextFromWindow?.hierarchical_clustering_from_rows;

        console.log(`${logPrefix} useEffect triggered. Status check:`, {
            rowDataLength: rowData?.length,
            isPyodideInitializing,
            pyodideInitError: pyodideInitError ? pyodideInitError.message : null,
            clusteringFuncExistsOnWindow: !!clusteringFunc,
        });

        setResult(null);
        setError(null);
        setIsClusteringRunning(false);

        if (!rowData || rowData.length === 0) {
            console.log(`${logPrefix} Exiting: No rowData.`);
            return;
        }
        if (isPyodideInitializing) {
            console.log(`${logPrefix} Exiting: Pyodide still initializing.`);
            return;
        }
        if (pyodideInitError) {
            console.log(`${logPrefix} Exiting: Pyodide initialization failed.`);
            setError(`Pyodide initialization failed: ${pyodideInitError.message}`);
            return;
        }
        if (!clusteringFunc) {
            console.log(`${logPrefix} Exiting: Clustering function not found.`);
            if (!pyodideInitError) {
                setError("Clustering function not available on window.pyContext.");
            }
            return;
        }

        let isMounted = true;
        console.log(`${logPrefix} Conditions met. Preparing to execute clustering.`);

        const execute = async () => {
            console.log(`${logPrefix} EXECUTE START. Method: ${method}, Clusters: ${numClusters}`);
            setIsClusteringRunning(true);
            setError(null);
            setResult(null);

            try {
                console.log(`${logPrefix} Calling Python function...`);
                const resultJsonString = await clusteringFunc(rowData, method, numClusters);
                if (!isMounted) return;

                if (typeof resultJsonString !== 'string') {
                    throw new Error(`Python function did not return a string. Got: ${typeof resultJsonString}`);
                }

                console.log(`${logPrefix} Received result string (truncated):`, resultJsonString.substring(0, 200) + "...");
                const parsedResult = JSON.parse(resultJsonString);

                if (parsedResult?.error) {
                    throw new Error(`Python script error: ${parsedResult.error}`);
                }
                if (!parsedResult?.orderedLabels || !parsedResult?.orderedClusters) {
                    throw new Error("Parsed Python result missing expected fields.");
                }

                console.log(`${logPrefix} Successfully parsed result.`);
                setResult(parsedResult as PyodideClusteringResult);
                setError(null);

            } catch (err: unknown) { // Keep type as unknown
                console.error(`${logPrefix} !!! EXECUTION FAILED !!!`, err);
                if (isMounted) {
                    // --- Check if err is an Error before accessing .message ---
                    const errorMessage = err instanceof Error
                        ? err.message
                        : 'Clustering execution failed.';
                    setError(errorMessage);
                    setResult(null);
                }
            } finally {
                console.log(`${logPrefix} EXECUTE FINALLY.`);
                if (isMounted) {
                    setIsClusteringRunning(false);
                }
            }
        };

        void execute(); // Use void to handle promise

        return () => {
            isMounted = false;
            console.log(`${logPrefix} Cleanup effect.`);
        };
    }, [rowData, method, numClusters, isPyodideInitializing, pyodideInitError]);

    // Combine loading states
    const combinedIsLoading = isPyodideInitializing || isClusteringRunning;
    // Prioritize Pyodide init error, then local clustering error
    const combinedError = pyodideInitError ? `Pyodide initialization failed: ${pyodideInitError.message}` : error;

    // Memoize the returned object
    const memoizedReturnValue = useMemo(() => {
        console.log('[usePyodideClustering] Memoizing return value.');
        return {
            result,
            isLoading: combinedIsLoading,
            error: combinedError,
        };
    }, [result, combinedIsLoading, combinedError]);

    return memoizedReturnValue;
}
