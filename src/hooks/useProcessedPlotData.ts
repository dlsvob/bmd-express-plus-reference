// src/hooks/useProcessedPlotData.ts
import { useMemo } from 'react';
import { CategoryAnalysisItem } from '../models/BMDxExported';
// --- FIX: Remove unused import ---
// import { filterPlotItems } from '../utils/plotUtils';
// ---------------------------------
import { ReferenceUmapItem } from '../data/referenceUmapData';

// Define the structure for each point returned by the hook
export interface ProcessedPlotPoint {
    bmd: number;
    go_id: string; // Standardized name
    direction: string | null | undefined;
    percentage: number | null | undefined;
    cluster_id: string | number;
}

export interface ProcessedPlotData {
    points: ProcessedPlotPoint[];
    cumulativeCounts: number[];
    minXValue: number;
    maxXValue: number;
    minYValue: number;
    maxYValue: number;
    totalPoints: number;
}

export function useProcessedPlotData(
    categoryAnalysisItems: CategoryAnalysisItem[] | undefined | null | object, // Allow object type temporarily for check
    analysisName: string,
    referenceMap: Map<string, ReferenceUmapItem> | null
): ProcessedPlotData | null {
    return useMemo(() => {
        console.log(
            `[useProcessedPlotData ${analysisName}] Hook executing. Received categoryAnalysisItems type: ${typeof categoryAnalysisItems}, isArray: ${Array.isArray(categoryAnalysisItems)}`,
            categoryAnalysisItems ? (Array.isArray(categoryAnalysisItems) ? `Array(${categoryAnalysisItems.length})` : categoryAnalysisItems) : categoryAnalysisItems
        );

        if (!Array.isArray(categoryAnalysisItems) || categoryAnalysisItems.length === 0 || !referenceMap) {
            console.log(`[useProcessedPlotData ${analysisName}] Skipping: categoryAnalysisItems is not a non-empty array or referenceMap is missing.`);
            return null;
        }

        try {
            // --- FIX: Remove incorrect filter call if it existed ---
            // const filteredItems = categoryAnalysisItems.filter(filterPlotItems); // Incorrect usage
            // Process all items initially, filtering happens inside the map/filter below
            const allItems = categoryAnalysisItems;
            // ------------------------------------------------------

            if (allItems.length === 0) { // Check allItems instead of filteredItems
                console.log(`[useProcessedPlotData ${analysisName}] No items to process.`);
                return null;
            }

            const detailedPoints = allItems
                // --- FIX: Remove unused 'idx' parameter ---
                .map((item /*, idx */) => {
                    // ---------------------------------------
                    const bmd = item.bmdFifthPercentileTotalGenes;
                    const current_go_id = item.categoryIdentifier?.id;
                    // --- FIX: Ensure key exists before lookup ---
                    const refPoint = (current_go_id && typeof current_go_id === 'string')
                        ? referenceMap.get(current_go_id.toUpperCase()) // Normalize key for lookup
                        : null;
                    // ------------------------------------------

                    // --- FIX: Apply filtering criteria here ---
                    if (bmd != null && !isNaN(bmd) && isFinite(bmd) && bmd > 0 &&
                        typeof current_go_id === 'string' && current_go_id.startsWith('GO:') &&
                        refPoint // Ensure refPoint exists
                    ) {
                        return {
                            bmd: bmd,
                            go_id: current_go_id,
                            direction: item.overallDirection,
                            percentage: item.percentage,
                            cluster_id: refPoint.cluster_id, // Use cluster_id from refPoint
                        };
                    }
                    // -----------------------------------------
                    if (current_go_id && !refPoint) {
                        console.warn(`[useProcessedPlotData ${analysisName}] No reference data found for GO ID: ${current_go_id}`);
                    }
                    return null;
                })
                .filter((point): point is ProcessedPlotPoint => point !== null);

            const currentTotalPoints = detailedPoints.length;
            if (currentTotalPoints === 0) {
                console.log(`[useProcessedPlotData ${analysisName}] No valid points after mapping and filtering.`);
                return null;
            }

            detailedPoints.sort((a, b) => a.bmd - b.bmd);

            const cumulativeCounts = detailedPoints.map((_, index) => index + 1);
            const calculatedMinX = detailedPoints[0].bmd;
            const calculatedMaxX = detailedPoints[currentTotalPoints - 1].bmd;
            const calculatedMinY = 0;
            const calculatedMaxY = cumulativeCounts[currentTotalPoints - 1];

            const result: ProcessedPlotData = {
                points: detailedPoints,
                cumulativeCounts,
                minXValue: calculatedMinX,
                maxXValue: calculatedMaxX,
                minYValue: calculatedMinY,
                maxYValue: calculatedMaxY,
                totalPoints: currentTotalPoints,
            };
            console.log(
                `[useProcessedPlotData ${analysisName}] Data processed. TotalPoints: ${currentTotalPoints}`,
            );
            return result;

        } catch (error) {
            console.error(
                `Error processing plot data (${analysisName}):`,
                error,
            );
            return null;
        }
    }, [categoryAnalysisItems, analysisName, referenceMap]);
}
