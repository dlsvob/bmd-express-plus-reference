// src/hooks/useClusteringVisualizationData.ts
import { useMemo } from 'react';
// Import the ranked type
import { RankedCategoryRow, SummaryRow } from '../utils/clusteringUtils';
import { ReferenceUmapItem } from '../data/referenceUmapData';
import type { ClusteringScatterPoint } from '../components/analysis/GOClusteringAnalysisUnit/GOClusteringScatterPlot';
import { generateHaltonColors } from '../utils/colorUtils';
import { UNCLUSTERED_COLOR, DEFAULT_MARKER_COLOR } from '../utils/legendUtils';

const JITTER_AMOUNT = 0.3;

interface UseClusteringVisualizationDataProps {
    categoryTableData: RankedCategoryRow[] | null; // Expect ranked data
    summaryTableData: SummaryRow[] | null;
    referenceDataMap: Map<string, ReferenceUmapItem> | null;
    referenceData: ReferenceUmapItem[] | null;
}

export interface ClusteringVisualizationData {
    clusterColorMap: Map<string | number, string> | null;
    jitterMap: Map<string, number>;
    scatterPlotData: ClusteringScatterPoint[] | null;
    legendColorItems: [string, string][];
    presentClusterIds: Set<string>;
}

export function useClusteringVisualizationData({
    categoryTableData, // Contains global category rank as row.rank
    summaryTableData, // Contains cluster rank as summary.sort
    referenceDataMap,
    referenceData,
}: UseClusteringVisualizationDataProps): ClusteringVisualizationData {
    const hookLogPrefix = '[useClusteringVisualizationData v4 - Cluster Rank Y]'; // Version Bump

    const clusterColorMap = useMemo(() => { /* ... as before ... */
        const mapLogPrefix = `${hookLogPrefix} [clusterColorMap]`; console.log(`${mapLogPrefix} Generating...`); if (!referenceData) { return null; } const uniqueClusterIds = Array.from(new Set(referenceData.map((item) => item.cluster_id).filter((id) => id != null && id !== -1 && id !== '-1'))); uniqueClusterIds.sort((a, b) => { const numA = Number(a); const numB = Number(b); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; return String(a).localeCompare(String(b)); }); if (uniqueClusterIds.length === 0) { return new Map<string | number, string>(); } const colors = generateHaltonColors(uniqueClusterIds.length); const map = new Map<string | number, string>(); uniqueClusterIds.forEach((id, index) => { map.set(String(id), colors[index % colors.length]); }); map.set('-1', UNCLUSTERED_COLOR); console.log(`${mapLogPrefix} Generated map for ${map.size} clusters (incl. -1).`); return map;
    }, [referenceData]);

    const jitterMap = useMemo((): Map<string, number> => { /* ... as before ... */
        const mapLogPrefix = `${hookLogPrefix} [JitterMap]`; console.log(`${mapLogPrefix} Generating jitter map...`); const map = new Map<string, number>(); if (!categoryTableData || categoryTableData.length === 0) { console.log(`${mapLogPrefix} No category data available.`); return map; } categoryTableData.forEach((row) => { if (row.categoryId && !map.has(row.categoryId)) { const jitterOffset = (Math.random() - 0.5) * 2 * JITTER_AMOUNT; map.set(row.categoryId, jitterOffset); } }); console.log(`${mapLogPrefix} Generated jitter map for ${map.size} unique GO IDs.`); return map;
    }, [categoryTableData]);

    const { scatterPlotData, presentClusterIds } = useMemo(() => {
        const plotLogPrefix = `${hookLogPrefix} [ScatterData & PresentIDs]`;
        const presentIds = new Set<string>();
        if (!categoryTableData || categoryTableData.length === 0 || !summaryTableData || summaryTableData.length === 0 || !referenceDataMap || !clusterColorMap || !jitterMap) {
            console.log(`${plotLogPrefix} Prerequisites not met.`);
            return { scatterPlotData: null, presentClusterIds: presentIds };
        }

        console.log(`${plotLogPrefix} Preparing data...`);
        // Create map from Cluster ID -> Cluster Rank (from summary sort)
        const clusterSummaryRankMap = new Map<string, number>();
        summaryTableData.forEach((summary) => {
            if (summary.cluster && summary.sort != null && !isNaN(summary.sort)) {
                clusterSummaryRankMap.set(String(summary.cluster), summary.sort);
            }
        });
        if (clusterSummaryRankMap.size === 0) {
            console.warn(`${plotLogPrefix} Could not generate clusterSummaryRankMap from summaryTableData.`);
            return { scatterPlotData: null, presentClusterIds: presentIds };
        }

        const points: ClusteringScatterPoint[] = [];
        categoryTableData.forEach((catRow) => {
            // Get the rank for the plot Y-axis from the CLUSTER'S summary rank
            const clusterRankForPlot = clusterSummaryRankMap.get(String(catRow.cluster));
            // Get the global category rank (for filtering, potentially tooltips)
            const globalCategoryRank = catRow.rank;

            const bmdValue = parseFloat(catRow.clusterBMD);
            const goId = catRow.categoryId;

            const goIdUpper = goId?.toUpperCase();
            const refItem = goIdUpper ? referenceDataMap.get(goIdUpper) : null;
            const referenceClusterId = refItem?.cluster_id ?? null;

            // Calculate jittered rank using the CLUSTER'S rank
            let calculatedJitteredRank: number | null = null;
            if (clusterRankForPlot != null) { // Use cluster rank for Y jitter base
                const jitterOffset = jitterMap.get(goId) ?? 0;
                calculatedJitteredRank = clusterRankForPlot + jitterOffset;
            }

            // Determine color (as before)
            let pointColor = DEFAULT_MARKER_COLOR;
            const refClusterIdStr = String(referenceClusterId);
            if (referenceClusterId === -1 || refClusterIdStr === '-1') { pointColor = UNCLUSTERED_COLOR; }
            else if (referenceClusterId != null) { pointColor = clusterColorMap.get(refClusterIdStr) || DEFAULT_MARKER_COLOR; }

            // Add point if valid - use clusterRankForPlot for Y calculation base
            if (clusterRankForPlot != null && !isNaN(bmdValue) && isFinite(bmdValue)) {
                points.push({
                    goId: goId,
                    goTerm: catRow.categoryTitle,
                    pyodideCluster: String(catRow.cluster),
                    referenceClusterId: referenceClusterId,
                    rank: globalCategoryRank, // Store the global category rank on the point data
                    bmdValue: bmdValue,
                    jitteredRank: calculatedJitteredRank, // Y-value is jittered CLUSTER rank
                    color: pointColor,
                });
                if (referenceClusterId !== null && referenceClusterId !== undefined) {
                    presentIds.add(String(referenceClusterId));
                }
            } else {
                console.warn(`${plotLogPrefix} Skipping point due to missing cluster rank or invalid BMD:`, catRow);
            }
        });
        console.log(`${plotLogPrefix} Prepared ${points.length} points. Found ${presentIds.size} present cluster IDs.`);
        return { scatterPlotData: points, presentClusterIds: presentIds };
    }, [categoryTableData, summaryTableData, referenceDataMap, clusterColorMap, jitterMap]); // Added summaryTableData dependency back

    // legendColorItems useMemo (as before)
    const legendColorItems = useMemo((): [string, string][] => {
        const legendLogPrefix = `${hookLogPrefix} [LegendItems]`;

        // Guard clause: Exit early if no color map exists or it's empty.
        if (!clusterColorMap || clusterColorMap.size === 0) {
            console.log(`${legendLogPrefix} No clusterColorMap available.`);
            return []; // Return empty array
        }

        console.log(`${legendLogPrefix} Generating legend items from color map...`);
        const items: [string, string][] = [];

        // Get cluster IDs, filter out '-1', and sort them.
        const sortedClusterIds = Array.from(clusterColorMap.keys())
            .filter((id) => String(id) !== '-1') // Exclude '-1' for now
            .sort((a, b) => {
                const numA = Number(a); // Attempt numeric conversion
                const numB = Number(b);
                // If both are valid numbers, sort numerically
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                // Otherwise, fall back to string locale comparison
                return String(a).localeCompare(String(b));
            });

        // Add items for sorted numeric/string cluster IDs
        sortedClusterIds.forEach((clusterId) => {
            const color = clusterColorMap.get(clusterId);
            if (color) {
                // Use the raw clusterId as the label for now
                // Change this to `Cluster ${clusterId}` if needed later
                items.push([String(clusterId), color]);
            }
        });

        // Specifically handle the '-1' cluster if it exists
        if (clusterColorMap.has('-1')) {
            // Use '-1' as the label for now
            // Change this to 'Unclustered' if needed later
            items.push(['-1', UNCLUSTERED_COLOR]);
        }

        console.log(`${legendLogPrefix} Generated ${items.length} legend items.`);
        return items; // Return the final array of [label, color] tuples

    }, [clusterColorMap]); // Dependency array for useMemo

    return {
        clusterColorMap,
        jitterMap,
        scatterPlotData, // Point Y value based on cluster rank, point.rank holds category rank
        legendColorItems,
        presentClusterIds,
    };
}