// src/components/analysis/GOClusteringScatterPlot.tsx
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import {
    DEFAULT_MARKER_COLOR,
    UNCLUSTERED_COLOR,
} from '../../utils/legendUtils';
import { SummaryRow } from '../../utils/clusteringUtils';
import type { ClusteringScatterPoint } from './GOClusteringAnalysisUnit'; // Adjust path if needed

// --- Define Styling Constants ---
const BASE_ALPHA = 0.2;
const HIGHLIGHT_ALPHA = 1.0;
const BASE_SIZE = 6;
const HIGHLIGHT_SIZE = 10;
const GRID_COLOR = '#cccccc';
// -----------------------------

// --- Props Interface (No change needed) ---
export interface GOClusteringScatterPlotProps {
    plotData: ClusteringScatterPoint[] | null;
    summaryTableData: SummaryRow[] | null;
    highlightedRefClusterId: string | null;
}
// --------------------------

const GOClusteringScatterPlot: React.FC<GOClusteringScatterPlotProps> = ({
    plotData,
    summaryTableData,
    highlightedRefClusterId,
}) => {
    const logPrefix = '[GOClusteringScatterPlot v8 - Highlight Top]'; // Version Bump

    const plotlyData = useMemo((): Data[] => {
        if (!plotData || plotData.length === 0) {
            return [];
        }
        console.log(
            `${logPrefix} plotlyData useMemo running. Highlighted ID: ${highlightedRefClusterId}`
        );

        // Define hovertemplate once
        const hovertemplate =
            `<b>%{customdata.goTerm}</b><br>` +
            `GO ID: %{customdata.goId}<br>` +
            `Pyodide Cluster: %{customdata.pyodideCluster}<br>` +
            `Ref Cluster: %{customdata.referenceClusterId}<br>` +
            `BMD (X): %{customdata.bmd:.2e}<br>` +
            `Rank (Y): %{customdata.rank}<extra></extra>`;

        // --- Logic to create one or two traces ---
        if (highlightedRefClusterId === null) {
            // --- CASE 1: No highlight - Single trace ---
            console.log(`${logPrefix} No highlight. Creating single base trace.`);
            const trace: Data = {
                x: plotData.map((p) => p.bmdValue),
                y: plotData.map((p) => p.jitteredRank),
                mode: 'markers',
                type: 'scattergl',
                marker: {
                    size: BASE_SIZE, // Use base size
                    color: plotData.map((p) => p.color),
                    opacity: BASE_ALPHA, // Use base alpha
                },
                customdata: plotData.map((p) => ({
                    goId: p.goId,
                    goTerm: p.goTerm,
                    pyodideCluster: p.pyodideCluster,
                    referenceClusterId: p.referenceClusterId,
                    rank: p.rank,
                    bmd: p.bmdValue,
                })),
                hovertemplate: hovertemplate,
                hoverlabel: { bgcolor: '#FFF' },
                name: 'Categories', // Name for single trace
            };
            return [trace];
        } else {
            // --- CASE 2: Highlight active - Two traces ---
            console.log(`${logPrefix} Highlight active (${highlightedRefClusterId}). Creating two traces.`);
            // Prepare arrays for base and highlighted points
            const basePoints = { x: [], y: [], color: [], customdata: [] };
            const highlightPoints = { x: [], y: [], color: [], customdata: [] };

            plotData.forEach((p) => {
                const refClusterIdStr =
                    p.referenceClusterId != null ? String(p.referenceClusterId) : null;
                const isHighlighted = refClusterIdStr === highlightedRefClusterId;

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
                name: 'Other Clusters', // Name for base trace
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
                    // Optional: Add border to highlighted points
                    // line: {
                    //   color: 'black',
                    //   width: 1
                    // }
                },
                customdata: highlightPoints.customdata,
                hovertemplate: hovertemplate,
                hoverlabel: { bgcolor: '#FFF' },
                name: `Cluster ${highlightedRefClusterId}`, // Name for highlight trace
            };

            // Return array with base trace first, highlight trace second
            return [baseTrace, highlightTrace];
        }
        // -----------------------------------------

    }, [plotData, highlightedRefClusterId]); // Dependencies remain the same

    const plotlyLayout = useMemo((): Partial<Layout> => {
        // ... (layout logic remains the same as v7) ...
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

    // --- Render Logic (No change needed) ---
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
