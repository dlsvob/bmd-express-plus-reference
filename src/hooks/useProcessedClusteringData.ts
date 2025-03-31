// src/hooks/useProcessedClusteringData.ts
import { useMemo } from 'react';
import {
    parseLabelToObject, // Now used
    prepareClusteringDetails, // Now used
    calculateSummaries, // Now used
    CategoryRow,
    SummaryRow,
} from '../utils/clusteringUtils'; // Adjust path
// Import ClusteringResult from the component file or define it here/shared location
import { ClusteringResult } from '../components/ClusteringDetails'; // Adjust path

export interface UseProcessedClusteringDataResult {
    categoryTableData: CategoryRow[];
    summaryTableData: SummaryRow[];
    processingError: Error | null;
}

export function useProcessedClusteringData(
    clusters: ClusteringResult[] | null,
    parsingError: Error | null // Correctly typed
): UseProcessedClusteringDataResult {

    const result = useMemo<UseProcessedClusteringDataResult>(() => {
        if (parsingError) {
            return { categoryTableData: [], summaryTableData: [], processingError: parsingError };
        }
        if (!clusters) {
            return { categoryTableData: [], summaryTableData: [], processingError: null };
        }

        try {
            // --- 4a. Flatten API results, parse labels, prepare details ---
            const initialCategoryRows: CategoryRow[] = clusters.flatMap(
                // *** START: flatMap Callback ***
                (clusterResult: ClusteringResult) => {
                    if (
                        !Array.isArray(clusterResult.orderedLabels) ||
                        !Array.isArray(clusterResult.orderedClusters) ||
                        clusterResult.orderedLabels.length !== clusterResult.orderedClusters.length
                    ) {
                        console.warn('Skipping malformed cluster result:', clusterResult);
                        return [];
                    }

                    // Map within flatMap
                    return clusterResult.orderedLabels.map(
                        // *** START: map Callback ***
                        (label: string, i: number) => {
                            const parsedLabelData = parseLabelToObject(label); // <<< USE util
                            const clusterString = (clusterResult.orderedClusters?.[i] ?? '').toString().trim();
                            const clusterValue = parseFloat(clusterString);

                            const partialRow: Omit<CategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize' | 'groupSize'> = {
                                key: parsedLabelData['Category ID'] || `missing-key-${i}-${Date.now()}`,
                                categoryId: parsedLabelData['Category ID'] || '',
                                categoryTitle: parsedLabelData['Category Title'] || '',
                                clusterBMD: parsedLabelData['Cluster BMD'] || '',
                                upGenes: parsedLabelData['Up Genes'] || '',
                                downGenes: parsedLabelData['Down Genes'] || '',
                                allGenes: parsedLabelData['All Genes'] || '',
                                cluster: clusterString,
                                clusterValue: isNaN(clusterValue) ? -1 : clusterValue,
                            };
                            // prepareClusteringDetails adds gene sizes
                            return prepareClusteringDetails(partialRow); // <<< USE util
                        } // *** END: map Callback ***
                    ); // End of inner .map
                } // *** END: flatMap Callback ***
            ); // End of .flatMap

            // --- 4b. Group by cluster ---
            const groupedByCluster = initialCategoryRows.reduce(
                // *** START: reduce Callback ***
                (acc: { [key: string]: CategoryRow[] }, curr: CategoryRow) => {
                    const clusterKey = curr.cluster;
                    if (clusterKey === null || clusterKey === undefined || clusterKey === '') {
                        console.warn('Skipping row with invalid cluster key:', curr);
                        return acc;
                    }
                    if (!acc[clusterKey]) {
                        acc[clusterKey] = [];
                    }
                    acc[clusterKey].push(curr);
                    return acc;
                }, // *** END: reduce Callback ***
                {} // Initial value for reduce
            ); // End of .reduce

            // --- 4c. Add groupSize to each CategoryRow ---
            const categoryTableDataWithGroupSize: CategoryRow[] = initialCategoryRows.map(
                // *** START: map Callback ***
                (row: CategoryRow) => ({
                    ...row,
                    groupSize: groupedByCluster[row.cluster]?.length || 0,
                }) // *** END: map Callback ***
            ); // End of .map

            // --- 4d. Calculate Summaries ---
            const finalSummaryRows = calculateSummaries(groupedByCluster); // <<< USE util (pass grouped data)

            return {
                categoryTableData: categoryTableDataWithGroupSize,
                summaryTableData: finalSummaryRows,
                processingError: null,
            };
        } catch (e) {
            console.error('Error processing clustering data:', e);
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: e instanceof Error ? e : new Error(String(e)),
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clusters, parsingError]); // Depend on clusters and parsingError

    return result;
}
