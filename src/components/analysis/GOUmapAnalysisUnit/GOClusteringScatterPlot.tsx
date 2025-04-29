// src/components/analysis/GOClusteringScatterPlot.tsx
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import {
    DEFAULT_MARKER_COLOR,
    UNCLUSTERED_COLOR,
} from '../../../utils/legendUtils';
import { SummaryRow } from '../../../utils/clusteringUtils';
import type { ClusteringScatterPoint } from './GOClusteringAnalysisUnit'; // Adjust path if needed

// --- Define Styling Constants ---
const BASE_ALPHA = 0.2;
const HIGHLIGHT_ALPHA = 1.0;
const BASE_SIZE = 6;
const HIGHLIGHT_SIZE = 10;
const GRID_COLOR = '#cccccc';
// -----------------------------

// --- UPDATE Props Interface ---
export interface GOClusteringScatterPlotProps {
    plotData: ClusteringScatterPoint[] | null;
    summaryTableData: SummaryRow[] | null;
    highlightedRefClusterIds: Set<string>; // <<< Expects Set
}
// --------------------------

const GOClusteringScatterPlot: React.FC<GOClusteringScatterPlotProps> = ({
    plotData,
    summaryTableData,
    highlightedRefClusterIds, // <<< Use Set prop
}) => {
    const logPrefix = '[GOClusteringScatterPlot v9 - Multi-Highlight Top]';

    const plotlyData = useMemo((): Data[] => {
        if (!plotData || plotData.length === 0) {
            return [];
        }
        console.log(
            `${logPrefix} plotlyData useMemo running. Highlighted IDs count: ${highlightedRefClusterIds.size}`
        );

        // Define hovertemplate once
        const hovertemplate =
            `<b>%{customdata.goTerm}</b><br>` +
            `GO ID: %{customdata.goId}<br>` +
            `Pyodide Cluster: %{customdata.pyodideCluster}<br>` +
            `Ref Cluster: %{customdata.referenceClusterId}<br>` +
            `BMD (X): %{customdata.bmd:.2e}<br>` +
            `Rank (Y): %{customdata.rank}<extra></extra>`;

        // --- Always use two traces for multi-highlight layering ---
        console.log(`${logPrefix} Creating two traces for base and highlights.`);
        const basePoints = { x: [], y: [], color: [], customdata: [] };
        const highlightPoints = { x: [], y: [], color: [], customdata: [] };

        plotData.forEach((p) => {
            const refClusterIdStr =
                p.referenceClusterId != null ? String(p.referenceClusterId) : null;
            // Check if the ID is in the Set of highlighted IDs
            const isHighlighted =
                refClusterIdStr !== null && highlightedRefClusterIds.has(refClusterIdStr);

            // Prepare custom data object once
            const customPtData = {
                goId: p.goId,
                goTerm: p.goTerm,
                pyodideCluster: p.pyodideCluster,
                referenceClusterId: p.referenceClusterId,
                rank: p.rank,
                bmd: p.bmdValue,
            };

            if (isHighlighted) {
                highlightPoints.x.push(p.bmdValue);
                highlightPoints.y.push(p.jitteredRank);
                highlightPoints.color.push(p.color);
                highlightPoints.customdata.push(customPtData);
            } else {
                basePoints.x.push(p.bmdValue);
                basePoints.y.push(p.jitteredRank);
                basePoints.color.push(p.color);
                basePoints.customdata.push(customPtData);
            }
        });

        // Define the base trace (drawn first)
        const baseTrace: Data = {
            x: basePoints.x,
            y: basePoints.y,
            mode: 'markers',
            type: 'scattergl',
            marker: {
                size: BASE_SIZE,
                color: basePoints.color,
                opacity: BASE_ALPHA,
            },
            customdata: basePoints.customdata,
            hovertemplate: hovertemplate,
            hoverlabel: { bgcolor: '#FFF' },
            name: 'Other Clusters',
        };

        // Define the highlight trace (drawn second, on top)
        const highlightTrace: Data = {
            x: highlightPoints.x,
            y: highlightPoints.y,
            mode: 'markers',
            type: 'scattergl',
            marker: {
                size: HIGHLIGHT_SIZE,
                color: highlightPoints.color,
                opacity: HIGHLIGHT_ALPHA,
            },
            customdata: highlightPoints.customdata,
            hovertemplate: hovertemplate,
            hoverlabel: { bgcolor: '#FFF' },
            name: 'Highlighted Clusters',
        };

        // Return array with base trace first, highlight trace second
        // Only include traces if they have data
        const traces = [];
        if (basePoints.x.length > 0) traces.push(baseTrace);
        if (highlightPoints.x.length > 0) traces.push(highlightTrace);

        return traces;
        // -------------------------------------------------------

    }, [plotData, highlightedRefClusterIds]); // Use Set dependency

    const plotlyLayout = useMemo((): Partial<Layout> => {
        let yTickVals: number[] = [];
        let yTickText: string[] = [];
        if (summaryTableData && summaryTableData.length > 0) {
            const sortedSummary = [...summaryTableData].sort(
                (a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity)
            );
            yTickVals = sortedSummary
                .map((item) => item.sort)
                .filter((rank): rank is number => rank != null && !isNaN(rank));
            yTickText = sortedSummary.map((item) => String(item.cluster));
            console.log(
                `${logPrefix} Generated Y Ticks: Vals (Ranks)=`,
                yTickVals
            );
            console.log(
                `${logPrefix} Generated Y Ticks: Text (Cluster IDs)=`,
                yTickText
            );
        } else {
            console.log(`${logPrefix} No summary data for Y ticks.`);
        }

        return {
            title: '5th Percentile BMD vs. Cluster Rank',
            xaxis: {
                title: '5th Percentile BMD',
                type: 'log',
                showgrid: false,
                side: 'bottom',
            },
            yaxis: {
                title: 'Pyodide Cluster ID (Ordered by Rank)',
                autorange: 'reversed',
                type: 'linear',
                tickmode: 'array',
                tickvals: yTickVals.length > 0 ? yTickVals : undefined,
                ticktext: yTickText.length > 0 ? yTickText : undefined,
                showgrid: true,
                gridcolor: GRID_COLOR,
                gridwidth: 1,
            },
            height: 500,
            margin: { l: 80, r: 30, t: 50, b: 50 },
            hovermode: 'closest',
            showlegend: false, // Keep Plotly legend off
            autosize: true,
        };
    }, [summaryTableData]);

    // --- Render Logic ---
    if (!plotData) {
        return <div>Preparing plot data...</div>;
    }
    if (plotlyData.length === 0) {
        return <div>No valid data points to plot.</div>;
    }
    console.log(`${logPrefix} Rendering plot with ${plotlyData.length} trace(s).`);

    return (
        <Plot
            data={plotlyData}
            layout={plotlyLayout}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ responsive: true, displaylogo: false }}
        />
    );
};

export default GOClusteringScatterPlot;
