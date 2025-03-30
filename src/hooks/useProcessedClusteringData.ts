// src/hooks/useProcessedClusteringData.ts
import { useState, useEffect } from 'react';
import { ClusteringResult } from '../components/ClusteringDetails'; // Adjust path
import { parseLabelToObject, calculateSummaries, sortSummaries } from '../utils/clusteringUtils'; // Assume these helpers exist

// Define types for the processed table data
export interface CategoryTableRow {
    key: string;
    categoryId: string;
    categoryTitle: string;
    clusterBMD: string | number;
    upGenes: string;
    downGenes: string;
    allGenes: string;
    cluster: string;
    groupSize: number;
}

export interface SummaryTableRow {
    key: string;
    cluster: string;
    minClusterBMD: number;
    numCategoryIDs: number;
    sort?: number; // Optional sort rank
}

export function useProcessedClusteringData(
    clusteringResults: ClusteringResult[] | null,
    computedNumClusters: number
) {
    const [categoryTableData, setCategoryTableData] = useState<CategoryTableRow[]>([]);
    const [summaryTableData, setSummaryTableData] = useState<SummaryTableRow[]>([]);
    const [processingError, setProcessingError] = useState<Error | null>(null);

    useEffect(() => {
        if (!clusteringResults) {
            setCategoryTableData([]);
            setSummaryTableData([]);
            setProcessingError(null);
            return;
        }

        try {
            setProcessingError(null);
            // --- Perform all the processing logic here ---

            // 1. Add display name if needed (or handle in component)
            // const resultsWithNames = ...

            // 2. Flatten and parse labels
            const allCategoryRows = clusteringResults.flatMap(cluster => {
                // ... (logic using parseLabelToObject) ...
                // Handle potential errors in parseLabelToObject
            });

            // 3. Group by cluster
            const groupedByCluster = allCategoryRows.reduce((acc, curr) => {
                // ... (grouping logic) ...
            }, {});

            // 4. Build category table rows with group size
            const categoryRowsWithSize = Object.values(groupedByCluster).flatMap(group =>
                group.map(row => ({
                    // ... (mapping logic) ...
                    groupSize: group.length,
                }))
            );
            setCategoryTableData(categoryRowsWithSize);

            // 5. Calculate and sort summary rows
            const finalSummaryRows = calculateSummaries(groupedByCluster); // Use helper
            setSummaryTableData(finalSummaryRows);

        } catch (error) {
            console.error("Error processing clustering data:", error);
            setProcessingError(error instanceof Error ? error : new Error('Processing failed'));
            setCategoryTableData([]);
            setSummaryTableData([]);
        }

    }, [clusteringResults, computedNumClusters]); // Re-run if results or numClusters change

    return { categoryTableData, summaryTableData, processingError };
}

// --- You would also move parseLabelToObject, calculateSummaries etc. ---
// --- into src/utils/clusteringUtils.ts ---
