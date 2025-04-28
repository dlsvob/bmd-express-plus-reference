// src/hooks/usePyodideClustering.ts
import { useState, useEffect } from 'react';
// Import the context hook correctly
import { usePyodide } from '../contexts/PyodideProvider';
import { ApiClusteringInputItem } from '../utils/clusteringUtils'; // Adjust path if needed

// Define the expected structure of the successful result from Python
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
    // Get initialization status from the context
    const {
        isLoading: isPyodideInitializing, // Status: Is Pyodide loading?
        error: pyodideInitError,          // Status: Did Pyodide init fail?
        // We don't need pyodideInstance here
    } = usePyodide();

    // Local state for the clustering execution itself
    const [isClusteringRunning, setIsClusteringRunning] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null); // Local error for clustering step
    const [result, setResult] = useState<PyodideClusteringResult | null>(null);

    useEffect(() => {
        const logPrefix = '[usePyodideClustering Auto (v3 - Corrected)]'; // Version Bump

        // --- Directly check window.pyContext for the function ---
        // This assumes pyodideContextInitializer successfully attached it to window
        const pyContextFromWindow = window.pyContext;
        const clusteringFunc = pyContextFromWindow?.hierarchical_clustering_from_rows;
        // ---------------------------------------------------------

        console.log(`${logPrefix} useEffect triggered. Status check:`, {
            rowDataLength: rowData?.length,
            isPyodideInitializing, // From context
            pyodideInitError: pyodideInitError ? pyodideInitError.message : null, // From context
            clusteringFuncExistsOnWindow: !!clusteringFunc, // Check window
            typeofClusteringFunc: typeof clusteringFunc,
        });

        // 1. Reset local state on dependency change before execution attempt
        setResult(null);
        setError(null);
        setIsClusteringRunning(false);

        // 2. Exit conditions (Check status from context first)
        if (!rowData || rowData.length === 0) {
            console.log(`${logPrefix} Exiting: No rowData.`);
            return;
        }
        if (isPyodideInitializing) {
            console.log(`${logPrefix} Exiting: Pyodide still initializing (from context).`);
            return; // Wait for initialization to finish
        }
        if (pyodideInitError) {
            console.log(`${logPrefix} Exiting: Pyodide initialization failed (from context).`);
            setError(`Pyodide initialization failed: ${pyodideInitError.message}`);
            return; // Don't proceed if Pyodide itself failed
        }
        // 3. NOW check if the function exists on the window context
        if (!clusteringFunc) {
            console.log(`${logPrefix} Exiting: Clustering function not found on window.pyContext.`);
            // Set local error only if Pyodide init didn't already fail
            if (!pyodideInitError) {
                setError("Clustering function not available on window.pyContext after Pyodide init.");
            }
            return; // Function isn't ready
        }

        // --- Conditions met, proceed to execute ---
        let isMounted = true;
        console.log(`${logPrefix} Conditions met. Preparing to execute clustering.`);

        const execute = async () => {
            console.log(`${logPrefix} EXECUTE START. Method: ${method}, Clusters: ${numClusters}`);
            setIsClusteringRunning(true); // Start local loading
            setError(null);
            setResult(null);

            try {
                // clusteringFunc is guaranteed to be a function here
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

            } catch (err: any) {
                console.error(`${logPrefix} !!! EXECUTION FAILED !!!`, err);
                if (isMounted) {
                    setError(err.message || 'Clustering execution failed.');
                    setResult(null);
                }
            } finally {
                console.log(`${logPrefix} EXECUTE FINALLY.`);
                if (isMounted) {
                    setIsClusteringRunning(false); // Stop local loading
                }
            }
        };

        execute();

        return () => {
            isMounted = false;
            console.log(`${logPrefix} Cleanup effect.`);
        };
        // Depend on context status indicators + input data/params
    }, [rowData, method, numClusters, isPyodideInitializing, pyodideInitError]);

    // Combine loading states
    const combinedIsLoading = isPyodideInitializing || isClusteringRunning;
    // Prioritize Pyodide init error, then local clustering error
    const combinedError = pyodideInitError ? `Pyodide initialization failed: ${pyodideInitError.message}` : error;

    return {
        result,
        isLoading: combinedIsLoading,
        error: combinedError,
    };
}
