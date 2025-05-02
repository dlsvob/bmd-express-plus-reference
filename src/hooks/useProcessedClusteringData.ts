// src/hooks/useProcessedClusteringData.ts
import { useMemo } from 'react';
import {
    parseLabelToObject,
    prepareClusteringDetails,
    calculateSummaries,
    CategoryRow as InputCategoryRow, // Rename original import
    SummaryRow,
} from '../utils/clusteringUtils';
import { PyodideClusteringResult } from './usePyodideClustering';

// Add rank property to the CategoryRow type for this hook's output
export type RankedCategoryRow = InputCategoryRow & {
    rank: number | null; // Global rank based on Cluster BMD
};

// Define the structure returned by this hook including ranks
export interface UseProcessedClusteringDataResult {
    categoryTableData: RankedCategoryRow[]; // Use ranked type
    summaryTableData: SummaryRow[];
    processingError: Error | null;
    minRank: number; // Add min rank
    maxRank: number; // Add max rank
}

/**
 * Custom hook that takes the direct, parsed result from the Pyodide clustering
 * execution, processes it into structured data, calculates ranks based on
 * Cluster BMD (ascending), and returns data suitable for display.
 */
export function useProcessedClusteringData(
    clusters: PyodideClusteringResult[] | null,
    pyodideHookError: string | null
): UseProcessedClusteringDataResult {
    const result = useMemo<UseProcessedClusteringDataResult>(() => {
        const hookLogPrefix = '[useProcessedClusteringData v2 - Ranked]';
        // Default return includes rank fields
        const defaultReturn: UseProcessedClusteringDataResult = {
            categoryTableData: [], summaryTableData: [], processingError: null, minRank: 0, maxRank: 0
        };

        if (pyodideHookError) {
            console.error(`${hookLogPrefix} Received error from Pyodide hook:`, pyodideHookError);
            return { ...defaultReturn, processingError: new Error(pyodideHookError) };
        }
        if (!clusters || clusters.length === 0) {
            console.log(`${hookLogPrefix} No cluster data provided.`);
            return defaultReturn;
        }

        try {
            console.log(`${hookLogPrefix} Processing cluster data:`, clusters);
            // Flatten results, parse labels, prepare details
            const initialCategoryRows: InputCategoryRow[] = clusters.flatMap(
                (clusterResult: PyodideClusteringResult, clusterIndex: number) => {
                    if (!clusterResult || !Array.isArray(clusterResult.orderedLabels) || !Array.isArray(clusterResult.orderedClusters) || clusterResult.orderedLabels.length !== clusterResult.orderedClusters.length) {
                        console.warn(`${hookLogPrefix} Skipping malformed cluster result index ${clusterIndex}:`, clusterResult);
                        return [];
                    }
                    return clusterResult.orderedLabels.map((label: string, i: number) => {
                        const parsedLabelData = parseLabelToObject(label);
                        const clusterString = (clusterResult.orderedClusters?.[i] ?? '').toString().trim();
                        const clusterValue = parseFloat(clusterString);
                        // Create partial row using data parsed from the label string.
                        const partialRow: Omit<InputCategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize' | 'groupSize'> = {
                            key: parsedLabelData['Category ID'] || `missing-key-${i}-${Date.now()}`,
                            categoryId: parsedLabelData['Category ID'] || '',
                            categoryTitle: parsedLabelData['Category Title'] || '',
                            clusterBMD: parsedLabelData['Cluster BMD'] || '', // Keep original string
                            upGenes: parsedLabelData['Genes Up'] || '',
                            downGenes: parsedLabelData['Genes Down'] || '',
                            allGenes: parsedLabelData['All Genes'] || '',
                            cluster: clusterString,
                            clusterValue: isNaN(clusterValue) ? -1 : clusterValue,
                        };
                        // Calculate gene sizes and return the complete CategoryRow
                        return prepareClusteringDetails(partialRow);
                    });
                }
            );

            if (initialCategoryRows.length === 0) {
                console.log(`${hookLogPrefix} No category rows generated after initial processing.`);
                return defaultReturn;
            }

            // Calculate Global Rank based on Cluster BMD (ascending)
            // Handle potential non-numeric or missing BMD values
            const rowsWithBMD = initialCategoryRows
                .map(row => ({
                    ...row,
                    numericBMD: parseFloat(row.clusterBMD), // Attempt to parse
                }))
                .map(row => ({
                    ...row,
                    // Treat non-numbers (NaN) as Infinity for sorting (put them last)
                    numericBMD: isNaN(row.numericBMD) ? Infinity : row.numericBMD
                }));

            // Sort by the numeric BMD value
            rowsWithBMD.sort((a, b) => a.numericBMD - b.numericBMD);

            // Assign 1-based rank after sorting
            const rankedCategoryRows: RankedCategoryRow[] = rowsWithBMD.map((row, index) => ({
                ...row, // Spread properties from rowWithBMD
                rank: index + 1, // Assign rank
            }));

            // Group by cluster (using ranked rows)
            const groupedByCluster = rankedCategoryRows.reduce(
                (acc: { [key: string]: RankedCategoryRow[] }, curr) => {
                    const clusterKey = curr.cluster;
                    // Skip rows with invalid cluster keys
                    if (clusterKey === null || clusterKey === undefined || clusterKey === '') {
                        console.warn(`${hookLogPrefix} Skipping row with invalid cluster key during grouping:`, curr);
                        return acc;
                    }
                    if (!acc[clusterKey]) { acc[clusterKey] = []; }
                    acc[clusterKey].push(curr);
                    return acc;
                }, {}
            );

            // Add groupSize back to ranked rows
            const finalCategoryTableData: RankedCategoryRow[] = rankedCategoryRows.map(row => ({
                ...row,
                groupSize: groupedByCluster[row.cluster]?.length || 0,
            }));

            // Calculate summaries using the grouped data
            const finalSummaryRows = calculateSummaries(groupedByCluster);

            // Determine min/max ranks
            const calculatedMaxRank = finalCategoryTableData.length;
            const calculatedMinRank = calculatedMaxRank > 0 ? 1 : 0;

            console.log(`${hookLogPrefix} Final Category Rows (Ranked): ${finalCategoryTableData.length}, MinRank: ${calculatedMinRank}, MaxRank: ${calculatedMaxRank}`);
            console.log(`${hookLogPrefix} Final Summary Rows: ${finalSummaryRows.length}`);

            return {
                categoryTableData: finalCategoryTableData,
                summaryTableData: finalSummaryRows,
                processingError: null,
                minRank: calculatedMinRank,
                maxRank: calculatedMaxRank,
            };
        } catch (e) {
            console.error(`${hookLogPrefix} Error processing clustering data:`, e);
            return { ...defaultReturn, processingError: e instanceof Error ? e : new Error(String(e)), };
        }
    }, [clusters, pyodideHookError]);

    return result;
}