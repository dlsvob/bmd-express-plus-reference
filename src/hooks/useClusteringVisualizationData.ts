// src/hooks/useClusteringVisualizationData.ts
import { useMemo } from 'react';
import { CategoryRow, SummaryRow } from '../utils/clusteringUtils'; // Adjust path
import { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path
import { ClusteringScatterPoint } from '../components/analysis/GOUmapAnalysisUnit/GOClusteringScatterPlot'; // Adjust path
import { generateHaltonColors } from '../utils/colorUtils'; // Adjust path
import {
    UNCLUSTERED_COLOR,
    DEFAULT_MARKER_COLOR,
} from '../utils/legendUtils'; // Adjust path

const JITTER_AMOUNT = 0.3;

interface UseClusteringVisualizationDataProps {
    categoryTableData: CategoryRow[] | null;
    summaryTableData: SummaryRow[] | null;
    referenceDataMap: Map<string, ReferenceUmapItem> | null;
    referenceData: ReferenceUmapItem[] | null;
}

// --- Update Return Type ---
export interface ClusteringVisualizationData {
    clusterColorMap: Map<string | number, string> | null;
    jitterMap: Map<string, number>;
    scatterPlotData: ClusteringScatterPoint[] | null;
    legendColorItems: [string, string][];
    presentClusterIds: Set<string>; // <<< ADDED: Set of cluster IDs present in scatterPlotData
}
// ------------------------

export function useClusteringVisualizationData({
    categoryTableData,
    summaryTableData,
    referenceDataMap,
    referenceData,
}: UseClusteringVisualizationDataProps): ClusteringVisualizationData {
    const hookLogPrefix = '[useClusteringVisualizationData v2]'; // Version Bump

    // --- Generate Cluster Color Map (Keep as is) ---
    const clusterColorMap = useMemo(() => {
        // ... (logic remains the same) ...
        const colorMapLogPrefix = `${hookLogPrefix} [clusterColorMap]`;
        console.log(`${colorMapLogPrefix} Generating...`);
        if (!referenceData) {
            console.log(`${colorMapLogPrefix} No reference data available.`);
            return null;
        }
        const uniqueClusterIds = Array.from(
            new Set(
                referenceData
                    .map((item) => item.cluster_id)
                    .filter((id) => id != null && id !== -1 && id !== '-1')
            )
        );
        uniqueClusterIds.sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });

        if (uniqueClusterIds.length === 0) {
            console.log(
                `${colorMapLogPrefix} No valid cluster IDs found in reference data.`
            );
            return new Map<string | number, string>();
        }

        const colors = generateHaltonColors(uniqueClusterIds.length);
        const map = new Map<string | number, string>();
        uniqueClusterIds.forEach((id, index) => {
            map.set(String(id), colors[index % colors.length]);
        });
        map.set('-1', UNCLUSTERED_COLOR);
        console.log(
            `${colorMapLogPrefix} Generated map for ${map.size} clusters (incl. -1).`
        );
        return map;
    }, [referenceData]);

    // --- Generate Stable Jitter Map (Keep as is) ---
    const jitterMap = useMemo((): Map<string, number> => {
        // ... (logic remains the same) ...
        const mapLogPrefix = `${hookLogPrefix} [JitterMap]`;
        console.log(`${mapLogPrefix} Generating jitter map...`);
        const map = new Map<string, number>();
        if (!categoryTableData || categoryTableData.length === 0) {
            console.log(`${mapLogPrefix} No category data available.`);
            return map;
        }
        categoryTableData.forEach((row) => {
            if (row.categoryId && !map.has(row.categoryId)) {
                const jitterOffset = (Math.random() - 0.5) * 2 * JITTER_AMOUNT;
                map.set(row.categoryId, jitterOffset);
            }
        });
        console.log(
            `${mapLogPrefix} Generated jitter map for ${map.size} unique GO IDs.`
        );
        return map;
    }, [categoryTableData]);

    // --- Prepare Data for Scatter Plot AND Collect Present IDs ---
    const { scatterPlotData, presentClusterIds } = useMemo(() => {
        const plotLogPrefix = `${hookLogPrefix} [ScatterData & PresentIDs]`;
        const presentIds = new Set<string>(); // <<< Initialize Set here
        if (
            !categoryTableData ||
            categoryTableData.length === 0 ||
            !summaryTableData ||
            summaryTableData.length === 0 ||
            !referenceDataMap ||
            !clusterColorMap ||
            !jitterMap
        ) {
            console.log(`${plotLogPrefix} Prerequisites not met.`);
            return { scatterPlotData: null, presentClusterIds: presentIds }; // Return empty set
        }

        console.log(`${plotLogPrefix} Preparing data...`);
        const clusterRankMap = new Map<string, number>();
        summaryTableData.forEach((summary) => {
            if (summary.cluster && summary.sort != null && !isNaN(summary.sort)) {
                clusterRankMap.set(String(summary.cluster), summary.sort);
            }
        });

        const points: ClusteringScatterPoint[] = [];
        categoryTableData.forEach((catRow) => {
            const rank = clusterRankMap.get(String(catRow.cluster));
            const bmdValue = parseFloat(catRow.clusterBMD);
            const goId = catRow.categoryId;
            const goIdUpper = goId?.toUpperCase();

            const refItem = goIdUpper ? referenceDataMap.get(goIdUpper) : null;
            const referenceClusterId = refItem?.cluster_id ?? null;

            let calculatedJitteredRank: number | null = null;
            if (rank != null) {
                const jitterOffset = jitterMap.get(goId) ?? 0;
                calculatedJitteredRank = rank + jitterOffset;
            }

            let pointColor = DEFAULT_MARKER_COLOR;
            const refClusterIdStr = String(referenceClusterId);
            if (referenceClusterId === -1 || refClusterIdStr === '-1') {
                pointColor = UNCLUSTERED_COLOR;
            } else if (referenceClusterId != null) {
                pointColor =
                    clusterColorMap.get(refClusterIdStr) || DEFAULT_MARKER_COLOR;
            }

            if (rank != null && !isNaN(bmdValue) && isFinite(bmdValue)) {
                points.push({
                    goId: goId,
                    goTerm: catRow.categoryTitle,
                    pyodideCluster: String(catRow.cluster),
                    referenceClusterId: referenceClusterId,
                    rank: rank,
                    bmdValue: bmdValue,
                    jitteredRank: calculatedJitteredRank,
                    color: pointColor,
                });
                // --- Add the present cluster ID to the set ---
                if (referenceClusterId !== null && referenceClusterId !== undefined) {
                    presentIds.add(String(referenceClusterId)); // Ensure it's a string
                }
                // ---------------------------------------------
            }
        });

        console.log(
            `${plotLogPrefix} Prepared ${points.length} points. Found ${presentIds.size} present cluster IDs.`
        );
        return { scatterPlotData: points, presentClusterIds: presentIds }; // Return both
    }, [
        categoryTableData,
        summaryTableData,
        referenceDataMap,
        clusterColorMap,
        jitterMap,
    ]);
    // ---------------------------------------------------------

    // --- Generate Legend Items (Keep as is) ---
    const legendColorItems = useMemo((): [string, string][] => {
        // ... (logic remains the same) ...
        const legendLogPrefix = `${hookLogPrefix} [LegendItems]`;
        if (!clusterColorMap || clusterColorMap.size === 0) {
            console.log(`${legendLogPrefix} No clusterColorMap available.`);
            return [];
        }
        console.log(
            `${legendLogPrefix} Generating legend items from color map...`
        );
        const items: [string, string][] = [];
        const sortedClusterIds = Array.from(clusterColorMap.keys())
            .filter((id) => String(id) !== '-1')
            .sort((a, b) => {
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });
        sortedClusterIds.forEach((clusterId) => {
            const color = clusterColorMap.get(clusterId);
            if (color) {
                items.push([String(clusterId), color]);
            }
        });
        if (clusterColorMap.has('-1')) {
            items.push(['-1', UNCLUSTERED_COLOR]);
        }
        console.log(`${legendLogPrefix} Generated ${items.length} legend items.`);
        return items;
    }, [clusterColorMap]);

    // --- Return all calculated visualization data ---
    return {
        clusterColorMap,
        jitterMap,
        scatterPlotData,
        legendColorItems,
        presentClusterIds, // <<< Include the set in the return value
    };
}
