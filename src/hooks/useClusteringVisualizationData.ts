// src/hooks/useClusteringVisualizationData.ts
import { useMemo } from 'react';
import { CategoryRow, SummaryRow } from '../utils/clusteringUtils';
import { ReferenceUmapItem } from '../data/referenceUmapData';
import type { ClusteringScatterPoint } from '../components/analysis/GOClusteringAnalysisUnit/GOClusteringScatterPlot';
import { generateHaltonColors } from '../utils/colorUtils';
import { UNCLUSTERED_COLOR, DEFAULT_MARKER_COLOR } from '../utils/legendUtils';

const JITTER_AMOUNT = 0.3;

interface UseClusteringVisualizationDataProps {
    categoryTableData: CategoryRow[] | null;
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
    categoryTableData,
    summaryTableData,
    referenceDataMap,
    referenceData,
}: UseClusteringVisualizationDataProps): ClusteringVisualizationData {
    const hookLogPrefix = '[useClusteringVisualizationData v2]';

    const clusterColorMap = useMemo(() => {
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

    const jitterMap = useMemo((): Map<string, number> => {
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

    const { scatterPlotData, presentClusterIds } = useMemo(() => {
        const plotLogPrefix = `${hookLogPrefix} [ScatterData & PresentIDs]`;
        const presentIds = new Set<string>();
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
            return { scatterPlotData: null, presentClusterIds: presentIds };
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
                if (referenceClusterId !== null && referenceClusterId !== undefined) {
                    presentIds.add(String(referenceClusterId));
                }
            }
        });

        console.log(
            `${plotLogPrefix} Prepared ${points.length} points. Found ${presentIds.size} present cluster IDs.`
        );
        return { scatterPlotData: points, presentClusterIds: presentIds };
    }, [
        categoryTableData,
        summaryTableData,
        referenceDataMap,
        clusterColorMap,
        jitterMap,
    ]);

    const legendColorItems = useMemo((): [string, string][] => {
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

    return {
        clusterColorMap,
        jitterMap,
        scatterPlotData,
        legendColorItems,
        presentClusterIds,
    };
}
