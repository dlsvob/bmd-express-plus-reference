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
        const hookLogPrefix = '[useProcessedClusteringData v2 - Debug Parse]'; // Version Bump

        // 1. Handle errors passed from the upstream Pyodide hook first
        if (pyodideHookError) {
            console.error(
                `${hookLogPrefix} Received error from Pyodide hook:`,
                pyodideHookError
            );
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: new Error(pyodideHookError),
            };
        }

        // 2. Handle null or empty input cluster array
        if (!clusters || clusters.length === 0) {
            console.log(
                `${hookLogPrefix} No cluster data provided or processing yielded no results.`
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
                `${hookLogPrefix} Processing cluster data:`,
                clusters // Log the raw cluster result object
            );
            // --- 3a. Flatten results, parse labels, prepare details ---
            const initialCategoryRows: CategoryRow[] = clusters.flatMap(
                (clusterResult: PyodideClusteringResult, clusterIndex: number) => { // Added clusterIndex for logging
                    if (
                        !clusterResult ||
                        !Array.isArray(clusterResult.orderedLabels) ||
                        !Array.isArray(clusterResult.orderedClusters) ||
                        clusterResult.orderedLabels.length !==
                        clusterResult.orderedClusters.length
                    ) {
                        console.warn(
                            `${hookLogPrefix} Skipping malformed cluster result index ${clusterIndex}:`,
                            clusterResult
                        );
                        return [];
                    }

                    // Map over the labels/clusters within the single result object
                    return clusterResult.orderedLabels.map(
                        (label: string, i: number) => {
                            // --- <<< ADD LOGGING HERE >>> ---
                            if (i < 5) { // Log only first 5 labels per cluster result
                                console.log(`${hookLogPrefix} Processing label ${i}: "${label}"`);
                            }
                            // --- <<< END LOGGING >>> ---

                            const parsedLabelData = parseLabelToObject(label);

                            // --- <<< ADD LOGGING HERE >>> ---
                            if (i < 5) {
                                console.log(`${hookLogPrefix} Parsed label data ${i}:`, parsedLabelData);
                                console.log(`${hookLogPrefix}   - Genes Up string:`, parsedLabelData['Genes Up']);
                                console.log(`${hookLogPrefix}   - Genes Down string:`, parsedLabelData['Genes Down']);
                            }
                            // --- <<< END LOGGING >>> ---

                            const clusterString = (
                                clusterResult.orderedClusters?.[i] ?? ''
                            )
                                .toString()
                                .trim();
                            const clusterValue = parseFloat(clusterString);

                            // Create partial row using data parsed from the label string.
                            const partialRow: Omit<
                                CategoryRow,
                                'allGenesSize' | 'upGenesSize' | 'downGenesSize' | 'groupSize'
                            > = {
                                key:
                                    parsedLabelData['Category ID'] ||
                                    `missing-key-${i}-${Date.now()}`,
                                categoryId: parsedLabelData['Category ID'] || '',
                                categoryTitle: parsedLabelData['Category Title'] || '',
                                clusterBMD: parsedLabelData['Cluster BMD'] || '',
                                // --- Use the potentially extracted gene strings ---
                                upGenes: parsedLabelData['Genes Up'] || '', // Default to empty string if not found
                                downGenes: parsedLabelData['Genes Down'] || '', // Default to empty string if not found
                                allGenes: parsedLabelData['All Genes'] || '', // Default to empty string if not found
                                // -------------------------------------------------
                                cluster: clusterString,
                                clusterValue: isNaN(clusterValue) ? -1 : clusterValue,
                            };

                            // Calculate gene sizes and return the complete CategoryRow
                            return prepareClusteringDetails(partialRow);
                        }
                    ); // End of inner .map
                }
            ); // End of .flatMap

            console.log(
                `${hookLogPrefix} Initial Category Rows created (sample):`,
                initialCategoryRows.slice(0, 5) // Log sample rows
            );

            // --- 3b. Group rows by cluster ID ---
            const groupedByCluster = initialCategoryRows.reduce(
                (acc: { [key: string]: CategoryRow[] }, curr: CategoryRow) => {
                    const clusterKey = curr.cluster;
                    if (
                        clusterKey === null ||
                        clusterKey === undefined ||
                        clusterKey === ''
                    ) {
                        console.warn(
                            `${hookLogPrefix} Skipping row with invalid cluster key:`,
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
                {}
            );

            console.log(
                `${hookLogPrefix} Rows grouped by cluster (keys):`,
                Object.keys(groupedByCluster)
            );

            // --- 3c. Add groupSize to each CategoryRow ---
            const categoryTableDataWithGroupSize: CategoryRow[] =
                initialCategoryRows.map((row: CategoryRow) => ({
                    ...row,
                    groupSize: groupedByCluster[row.cluster]?.length || 0,
                }));

            console.log(
                `${hookLogPrefix} Category Rows with groupSize (sample):`,
                categoryTableDataWithGroupSize.slice(0, 5)
            );

            // --- 3d. Calculate Summaries ---
            const finalSummaryRows = calculateSummaries(groupedByCluster);

            console.log(
                `${hookLogPrefix} Final Summary Rows (count):`,
                finalSummaryRows.length
            );

            // 4. Return the processed data
            return {
                categoryTableData: categoryTableDataWithGroupSize,
                summaryTableData: finalSummaryRows,
                processingError: null,
            };
        } catch (e) {
            // 5. Handle errors during processing within this hook
            console.error(
                `${hookLogPrefix} Error processing clustering data:`,
                e
            );
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: e instanceof Error ? e : new Error(String(e)),
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clusters, pyodideHookError]); // Dependencies remain the same

    return result;
}
