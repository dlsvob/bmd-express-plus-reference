// src/hooks/useProcessedPlotData.ts
import { useMemo } from 'react';
import { CategoryAnalysisItem } from '../models/BMDxExported';
import { filterPlotItems } from '../utils/plotUtils';
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
            `[useProcessedPlotData ${analysisName}] Hook executing. Received categoryAnalysisItems type: ${typeof categoryAnalysisItems}, isArray: ${Array.isArray(categoryAnalysisItems)}`, // Log type and array status
            categoryAnalysisItems ? (Array.isArray(categoryAnalysisItems) ? `Array(${categoryAnalysisItems.length})` : categoryAnalysisItems) : categoryAnalysisItems
        );

        // --- MORE ROBUST CHECK ---
        // Check if it's NOT an array OR if it IS an array but empty, OR if referenceMap is missing
        if (!Array.isArray(categoryAnalysisItems) || categoryAnalysisItems.length === 0 || !referenceMap) {
            console.log(`[useProcessedPlotData ${analysisName}] Skipping: categoryAnalysisItems is not a non-empty array or referenceMap is missing.`);
            return null;
        }
        // -------------------------

        // Now we know categoryAnalysisItems is a non-empty array
        try {
            // This line should now be safe
            const filteredItems = categoryAnalysisItems.filter(filterPlotItems);
            // ... (rest of the try block remains the same) ...

            if (filteredItems.length === 0) {
                console.log(`[useProcessedPlotData ${analysisName}] No items passed filter.`);
                return null;
            }

            const detailedPoints = filteredItems
                .map((item, idx) => {
                    const bmd = item.bmdFifthPercentileTotalGenes;
                    const current_go_id = item.categoryIdentifier?.id;
                    const refPoint = current_go_id ? referenceMap.get(current_go_id) : null;

                    if (bmd != null && !isNaN(bmd) && isFinite(bmd) && bmd > 0 &&
                        typeof current_go_id === 'string' && current_go_id.startsWith('GO:') &&
                        refPoint
                    ) {
                        return {
                            bmd: bmd,
                            go_id: current_go_id,
                            direction: item.overallDirection,
                            percentage: item.percentage,
                            cluster_id: refPoint.cluster_id,
                        };
                    }
                    if (current_go_id && !refPoint) {
                        console.warn(`[useProcessedPlotData ${analysisName}] No reference data found for GO ID: ${current_go_id}`);
                    }
                    return null;
                })
                .filter((point): point is ProcessedPlotPoint => point !== null);

            const currentTotalPoints = detailedPoints.length;
            if (currentTotalPoints === 0) {
                console.log(`[useProcessedPlotData ${analysisName}] No valid points after mapping.`);
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
