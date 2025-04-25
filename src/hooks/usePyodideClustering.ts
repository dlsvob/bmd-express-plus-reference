// src/hooks/usePyodideClustering.ts
import { useState, useEffect } from 'react';
import { usePyodide } from '../contexts/PyodideProvider';
import { ApiClusteringInputItem } from '../utils/clusteringUtils';

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
    const {
        pyContext,
        loading: pyodideLoading,
        error: pyodideError,
    } = usePyodide();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PyodideClusteringResult | null>(null);

    useEffect(() => {
        const logPrefix = '[usePyodideClustering Auto (v2)]';
        console.log(`${logPrefix} useEffect triggered. Dependencies:`, { rowDataLength: rowData?.length, method, numClusters, pyContextExists: !!pyContext, pyodideLoading });

        if (!rowData || rowData.length === 0 || pyodideLoading || !pyContext || !pyContext.hierarchical_clustering_from_rows) {
            console.log(`${logPrefix} useEffect hook exiting early. Conditions:`, {
                hasRowData: !!rowData && rowData.length > 0,
                pyodideLoading,
                pyContextExists: !!pyContext,
                clusteringFuncExists: !!pyContext?.hierarchical_clustering_from_rows,
            });
            if (result) setResult(null);
            if (error) setError(null);
            if (isLoading) setIsLoading(false);
            return;
        }

        let isMounted = true;
        console.log(`${logPrefix} Conditions met. Preparing to execute.`);

        const execute = async () => {
            console.log(`${logPrefix} EXECUTE START. Method: ${method}, Clusters: ${numClusters}`);
            setResult(null);
            setError(null);
            setIsLoading(true);

            try {
                const clusteringFunc = pyContext.hierarchical_clustering_from_rows;
                if (typeof clusteringFunc !== 'function') {
                    throw new Error("Python clustering function 'hierarchical_clustering_from_rows' not found or not callable.");
                }

                // *** REMOVE DOUBLE STRINGIFICATION ***
                // const rowDataStr = JSON.stringify(rowData);
                // const doubleString = JSON.stringify(rowDataStr);
                // *************************************

                console.log(`${logPrefix} Calling Python function with direct rowData object...`);
                // *** PASS rowData DIRECTLY ***
                // Pyodide will handle converting the JS array of objects
                const resultJsonString = await clusteringFunc(rowData, method, numClusters);
                // *****************************

                if (!isMounted) {
                    console.log(`${logPrefix} Component unmounted during async execution.`);
                    return;
                }

                if (typeof resultJsonString !== 'string') {
                    throw new Error(`Python function did not return a string. Got: ${typeof resultJsonString}`);
                }

                console.log(`${logPrefix} Received result string from Python (truncated):`, resultJsonString.substring(0, 200) + "...");
                const parsedResult = JSON.parse(resultJsonString);

                // Check if the parsed result itself indicates an error from Python
                if (parsedResult && typeof parsedResult === 'object' && 'error' in parsedResult) {
                    throw new Error(`Python script returned an error: ${parsedResult.error}`);
                }

                // Validate the structure of the successful result (optional but recommended)
                if (!parsedResult || !Array.isArray(parsedResult.orderedLabels) || !Array.isArray(parsedResult.orderedClusters)) {
                    throw new Error("Parsed result from Python is missing expected fields (orderedLabels, orderedClusters).");
                }

                console.log(`${logPrefix} Successfully parsed result from Python.`);
                setResult(parsedResult as PyodideClusteringResult); // Cast after validation

            } catch (err: any) {
                console.error(`${logPrefix} !!! EXECUTION FAILED !!! Error caught:`, err);
                if (isMounted) {
                    setError(err.message || 'An error occurred during clustering.');
                    setResult(null);
                }
            } finally {
                console.log(`${logPrefix} EXECUTE FINALLY block.`);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        execute();

        return () => {
            isMounted = false;
            console.log(`${logPrefix} Cleanup effect.`);
        };
        // Ensure numClusters is in dependency array if used in execute
    }, [rowData, method, numClusters, pyContext, pyodideLoading]); // Keep dependencies

    // Handle Pyodide initialization errors
    useEffect(() => {
        if (pyodideError) {
            const pyodideErrorMessage = `Pyodide failed to initialize: ${pyodideError.message || 'Unknown error'}`;
            if (!error) { // Only set if no specific clustering error exists
                setError(pyodideErrorMessage);
            }
            console.error('[usePyodideClustering Auto (v2)] Pyodide initialization error:', pyodideError);
        }
    }, [pyodideError, error]);

    return {
        result,
        isLoading: isLoading || pyodideLoading, // Combine loading states
        error
    };
}
