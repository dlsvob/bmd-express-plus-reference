// src/utils/plotUtils.ts
import { BaseCategoryAnalysisDataPoint } from '../models/applicationModel'; // Adjust path as needed

/**
 * Filters an array of plot items based on GO ID list and rank range.
 *
 * @param items - The array of BaseCategoryAnalysisDataPoint items to filter.
 * @param goIdFilterList - An array of GO IDs (strings) to filter by. If empty, no GO ID filtering is applied.
 * @param rankRange - A tuple representing the min and max rank [minRank, maxRank]. If null or invalid, no rank filtering applied.
 * @returns A filtered array of items.
 */
export const filterPlotItems = (
    items: BaseCategoryAnalysisDataPoint[],
    goIdFilterList: string[] | null | undefined,
    rankRange: [number, number] | null | undefined,
): BaseCategoryAnalysisDataPoint[] => {

    const hasGoIdFilter = goIdFilterList && goIdFilterList.length > 0;
    const goIdSet = hasGoIdFilter ? new Set(goIdFilterList.map(id => id?.toUpperCase())) : null;

    // --- ADD CHECK for rankRange validity ---
    const hasRankFilter =
        rankRange &&
        Array.isArray(rankRange) &&
        rankRange.length === 2 &&
        typeof rankRange[0] === 'number' &&
        typeof rankRange[1] === 'number';
    // -----------------------------------------

    // If no filters are active, return original items
    if (!hasGoIdFilter && !hasRankFilter) {
        return items;
    }

    // --- Safely access rankRange elements only if hasRankFilter is true ---
    const minRank = hasRankFilter ? rankRange[0] : -Infinity;
    const maxRank = hasRankFilter ? rankRange[1] : Infinity;
    // ----------------------------------------------------------------------

    console.log(`[filterPlotItems] Filtering. GO IDs: ${goIdSet?.size ?? 0}, Rank Filter Active: ${hasRankFilter}, Range: [${minRank}, ${maxRank}]`);


    return items.filter((item) => {
        // Check GO ID filter
        const goIdMatch = !hasGoIdFilter || (item.go_id && goIdSet!.has(item.go_id.toUpperCase()));

        // Check Rank filter
        // Ensure rankValue exists and is a number before comparing
        const rankValue = item.rankValue; // rankValue is now directly on BaseCategoryAnalysisDataPoint
        const rankMatch = !hasRankFilter || (
            rankValue != null &&
            typeof rankValue === 'number' &&
            rankValue >= minRank &&
            rankValue <= maxRank
        );

        return goIdMatch && rankMatch;
    });
};