// src/hooks/useProcessedClusteringData.ts
import { useMemo } from 'react';
import {
    parseLabelToObject, // Parses the label string from Python
    prepareClusteringDetails, // Calculates gene counts
    calculateSummaries, // Calculates cluster summaries
    CategoryRow, // Type for the detailed category table rows
    SummaryRow, // Type for the summary table rows
} from '../utils/clusteringUtils'; // Adjust path if needed

// Import the type definition for the result object coming directly from the Pyodide hook
import { PyodideClusteringResult } from './usePyodideClustering'; // Adjust path if needed

/**
 * Defines the structure returned by this hook.
 */
export interface UseProcessedClusteringDataResult {
    /** Processed data ready for the detailed category table. */
    categoryTableData: CategoryRow[];
    /** Processed data ready for the cluster summary table. */
    summaryTableData: SummaryRow[];
    /** Any error encountered during the processing stages within this hook. */
    processingError: Error | null;
}

/**
 * Custom hook that takes the direct, parsed result from the Pyodide clustering
 * execution (and any error from that execution) and processes it into
 * structured data suitable for display in category details and summary tables.
 *
 * @param clusters - An array containing zero or one PyodideClusteringResult objects, or null.
 *                   This comes from the `usePyodideClustering` hook.
 * @param pyodideHookError - Any error string passed from the `usePyodideClustering` hook.
 * @returns An object containing processed table data and any processing errors.
 */
export function useProcessedClusteringData(
    clusters: PyodideClusteringResult[] | null,
    pyodideHookError: string | null // Accept the error string from the Pyodide hook
): UseProcessedClusteringDataResult {
    const result = useMemo<UseProcessedClusteringDataResult>(() => {
        // 1. Handle errors passed from the upstream Pyodide hook first
        if (pyodideHookError) {
            console.error(
                '[useProcessedClusteringData] Received error from Pyodide hook:',
                pyodideHookError
            );
            // Convert the string error to an Error object for consistency
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: new Error(pyodideHookError),
            };
        }

        // 2. Handle null or empty input cluster array
        if (!clusters || clusters.length === 0) {
            console.log(
                '[useProcessedClusteringData] No cluster data provided or processing yielded no results.'
            );
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: null,
            };
        }

        // 3. Process the valid cluster data
        try {
            console.log(
                '[useProcessedClusteringData] Processing cluster data:',
                clusters
            );
            // --- 3a. Flatten results (if multiple), parse labels, prepare details ---
            // flatMap will iterate once if `clusters` has one element.
            const initialCategoryRows: CategoryRow[] = clusters.flatMap(
                (clusterResult: PyodideClusteringResult) => {
                    // Validate the structure of the result object
                    if (
                        !clusterResult || // Check if clusterResult itself is null/undefined
                        !Array.isArray(clusterResult.orderedLabels) ||
                        !Array.isArray(clusterResult.orderedClusters) ||
                        clusterResult.orderedLabels.length !==
                        clusterResult.orderedClusters.length
                    ) {
                        console.warn(
                            '[useProcessedClusteringData] Skipping malformed cluster result:',
                            clusterResult
                        );
                        return []; // Return empty array for this malformed result
                    }

                    // Map over the labels/clusters within the single result object
                    return clusterResult.orderedLabels.map(
                        (label: string, i: number) => {
                            // Parse the structured label string (e.g., "Key1: Val1 | Key2: Val2")
                            const parsedLabelData = parseLabelToObject(label);

                            // Extract cluster info
                            const clusterString = (
                                clusterResult.orderedClusters?.[i] ?? ''
                            )
                                .toString()
                                .trim();
                            const clusterValue = parseFloat(clusterString);

                            // Create a partial row using data parsed from the label string.
                            // Ensure the keys used here match EXACTLY the keys within the label string format.
                            const partialRow: Omit<
                                CategoryRow,
                                'allGenesSize' | 'upGenesSize' | 'downGenesSize' | 'groupSize'
                            > = {
                                key:
                                    parsedLabelData['Category ID'] ||
                                    `missing-key-${i}-${Date.now()}`, // Use Category ID from label as key
                                categoryId: parsedLabelData['Category ID'] || '',
                                categoryTitle: parsedLabelData['Category Title'] || '',
                                clusterBMD: parsedLabelData['Cluster BMD'] || '', // Get BMD from label
                                upGenes: parsedLabelData['Up Genes'] || '', // Get Up Genes from label
                                downGenes: parsedLabelData['Down Genes'] || '', // Get Down Genes from label
                                allGenes: parsedLabelData['All Genes'] || '', // Get All Genes from label
                                cluster: clusterString,
                                clusterValue: isNaN(clusterValue) ? -1 : clusterValue, // Use -1 for non-numeric clusters
                            };

                            // Calculate gene sizes and return the complete CategoryRow
                            return prepareClusteringDetails(partialRow);
                        }
                    ); // End of inner .map
                }
            ); // End of .flatMap

            console.log(
                '[useProcessedClusteringData] Initial Category Rows created:',
                initialCategoryRows
            );

            // --- 3b. Group rows by cluster ID ---
            const groupedByCluster = initialCategoryRows.reduce(
                (acc: { [key: string]: CategoryRow[] }, curr: CategoryRow) => {
                    const clusterKey = curr.cluster;
                    // Ensure clusterKey is valid before grouping
                    if (
                        clusterKey === null ||
                        clusterKey === undefined ||
                        clusterKey === ''
                    ) {
                        console.warn(
                            '[useProcessedClusteringData] Skipping row with invalid cluster key:',
                            curr
                        );
                        return acc;
                    }
                    if (!acc[clusterKey]) {
                        acc[clusterKey] = [];
                    }
                    acc[clusterKey].push(curr);
                    return acc;
                },
                {} // Initial value for reduce
            );

            console.log(
                '[useProcessedClusteringData] Rows grouped by cluster:',
                groupedByCluster
            );

            // --- 3c. Add groupSize to each CategoryRow ---
            // (groupSize is the number of categories in that row's cluster)
            const categoryTableDataWithGroupSize: CategoryRow[] =
                initialCategoryRows.map((row: CategoryRow) => ({
                    ...row,
                    groupSize: groupedByCluster[row.cluster]?.length || 0,
                }));

            console.log(
                '[useProcessedClusteringData] Category Rows with groupSize:',
                categoryTableDataWithGroupSize
            );

            // --- 3d. Calculate Summaries ---
            const finalSummaryRows = calculateSummaries(groupedByCluster);

            console.log(
                '[useProcessedClusteringData] Final Summary Rows:',
                finalSummaryRows
            );

            // 4. Return the processed data
            return {
                categoryTableData: categoryTableDataWithGroupSize,
                summaryTableData: finalSummaryRows,
                processingError: null, // No processing error occurred
            };
        } catch (e) {
            // 5. Handle errors during processing within this hook
            console.error(
                '[useProcessedClusteringData] Error processing clustering data:',
                e
            );
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: e instanceof Error ? e : new Error(String(e)), // Return the processing error
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clusters, pyodideHookError]); // Dependencies: Re-run if cluster data or upstream error changes

    return result;
}
