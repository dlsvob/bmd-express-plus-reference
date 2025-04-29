// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringScatterPlot.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react'; // <--- CORRECTED IMPORT
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { Alert } from 'antd';
import {
    DEFAULT_MARKER_COLOR,
    UNCLUSTERED_COLOR,
} from '../../../utils/legendUtils'; // Adjusted path
import { SummaryRow } from '../../../utils/clusteringUtils'; // Adjusted path
import type { ClusteringScatterPoint } from './GOClusteringAnalysisUnit'; // Adjusted path

// --- Define Styling Constants ---
const BASE_ALPHA = 0.2;
const HIGHLIGHT_ALPHA = 1.0;
const BASE_SIZE = 6;
const HIGHLIGHT_SIZE = 10;
const GRID_COLOR = '#cccccc';

export interface GOClusteringScatterPlotProps {
    plotData: ClusteringScatterPoint[] | null;
    summaryTableData: SummaryRow[] | null;
    highlightedRefClusterIds: Set<string>;
}

const GOClusteringScatterPlot: React.FC<GOClusteringScatterPlotProps> = ({
    plotData,
    summaryTableData,
    highlightedRefClusterIds,
}) => {
    const logPrefix = '[GOClusteringScatterPlot v10 - Error Handling]';

    // --- State for internal rendering errors ---
    const [renderError, setRenderError] = useState<string | null>(null);

    useEffect(() => {
        // Reset error state if props change
        setRenderError(null);
    }, [plotData, summaryTableData, highlightedRefClusterIds]);

    // --- Plotly Error Handler ---
    const handlePlotError = useCallback((err: any) => {
        console.error('[GOClusteringScatterPlot] Plotly rendering error:', err);
        setRenderError(
            'Failed to render Clustering plot. This might be due to data issues or browser limitations (e.g., too many WebGL contexts).'
        );
    }, []);

    // --- Plot Data Calculation (useMemo) ---
    const plotlyData = useMemo((): Data[] => {
        if (!plotData || plotData.length === 0) {
            return [];
        }
        console.log(
            `${logPrefix} plotlyData useMemo running. Highlighted IDs count: ${highlightedRefClusterIds.size}`
        );

        const hovertemplate =
            `<b>%{customdata.goTerm}</b><br>` +
            `GO ID: %{customdata.goId}<br>` +
            `Pyodide Cluster: %{customdata.pyodideCluster}<br>` +
            `Ref Cluster: %{customdata.referenceClusterId}<br>` +
            `BMD (X): %{customdata.bmd:.2e}<br>` +
            `Rank (Y): %{customdata.rank}<extra></extra>`;

        const basePoints: { x: number[]; y: (number | null)[]; color: string[]; customdata: any[] } = { x: [], y: [], color: [], customdata: [] };
        const highlightPoints: { x: number[]; y: (number | null)[]; color: string[]; customdata: any[] } = { x: [], y: [], color: [], customdata: [] };


        plotData.forEach((p) => {
            const refClusterIdStr =
                p.referenceClusterId != null ? String(p.referenceClusterId) : null;
            const isHighlighted =
                refClusterIdStr !== null && highlightedRefClusterIds.has(refClusterIdStr);

            const customPtData = {
                goId: p.goId,
                goTerm: p.goTerm,
                pyodideCluster: p.pyodideCluster,
                referenceClusterId: p.referenceClusterId,
                rank: p.rank,
                bmd: p.bmdValue,
            };

            // Ensure jitteredRank is number or null before pushing
            const yValue = typeof p.jitteredRank === 'number' && isFinite(p.jitteredRank) ? p.jitteredRank : null;

            if (isHighlighted) {
                highlightPoints.x.push(p.bmdValue);
                highlightPoints.y.push(yValue);
                highlightPoints.color.push(p.color);
                highlightPoints.customdata.push(customPtData);
            } else {
                basePoints.x.push(p.bmdValue);
                basePoints.y.push(yValue);
                basePoints.color.push(p.color);
                basePoints.customdata.push(customPtData);
            }
        });

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

        const traces = [];
        if (basePoints.x.length > 0) traces.push(baseTrace);
        if (highlightPoints.x.length > 0) traces.push(highlightTrace);

        return traces;
    }, [plotData, highlightedRefClusterIds]);

    // --- Plot Layout Calculation (useMemo) ---
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
            showlegend: false,
            autosize: true,
        };
    }, [summaryTableData]);

    // --- Render Logic ---

    // --- Display Alert if an internal rendering error occurred ---
    if (renderError) {
        return (
            <div style={{ padding: '20px', height: '500px' }}> {/* Ensure container has height */}
                <Alert
                    message="Plot Rendering Error"
                    description={renderError}
                    type="error"
                    showIcon
                />
            </div>
        );
    }
    // -------------------------------------------------------------

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
            // --- Add the onError handler ---
            onError={handlePlotError}
        // -----------------------------
        />
    );
};

export default GOClusteringScatterPlot;
