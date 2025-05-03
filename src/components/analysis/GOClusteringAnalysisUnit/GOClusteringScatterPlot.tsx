// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringScatterPlot.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Datum } from 'plotly.js';
import { Alert } from 'antd';
import { SummaryRow } from '../../../utils/clusteringUtils';
// --- Import Font & Plot Styling Constants ---
import {
    FONT_SIZE_MULTIPLIER,
    BASE_PLOT_TITLE_FONT_SIZE_PX,
    BASE_PLOT_AXIS_TITLE_FONT_SIZE_PX,
    BASE_PLOT_AXIS_TICK_FONT_SIZE_PX,
    BASE_PLOT_HOVER_FONT_SIZE_PX,
    BASE_PLOT_AXIS_TITLE_STANDOFF_PX,
    // Clustering specific constants
    CLUSTERING_PLOT_BASE_ALPHA,
    CLUSTERING_PLOT_HIGHLIGHT_ALPHA,
    CLUSTERING_PLOT_BASE_SIZE,
    CLUSTERING_PLOT_HIGHLIGHT_SIZE,
    CLUSTERING_PLOT_BASE_MARKER_SHAPE,     // <<< IMPORTED
    CLUSTERING_PLOT_HIGHLIGHT_MARKER_SHAPE, // <<< IMPORTED
    CLUSTERING_PLOT_GRID_COLOR,
    CLUSTERING_PLOT_MARKER_LINE_COLOR,
    CLUSTERING_PLOT_MARKER_LINE_WIDTH,
    CLUSTERING_PLOT_HOVER_BG_COLOR,
    CLUSTERING_PLOT_HIGHLIGHT_HOVER_BORDER_COLOR,
    CLUSTERING_PLOT_X_AXIS_TITLE,
    CLUSTERING_PLOT_Y_AXIS_TITLE
} from '../../../config/analysisConstants'; // Adjust path if needed
// ------------------------------------------

export interface ClusteringScatterPoint {
    goId: string;
    goTerm: string;
    pyodideCluster: string | number;
    referenceClusterId: string | number | null;
    rank: number | null; // Global category rank
    bmdValue: number;
    jitteredRank: number | null; // Y-axis value (based on cluster rank + jitter)
    color: string;
}

export interface GOClusteringScatterPlotProps {
    plotData: ClusteringScatterPoint[] | null;
    summaryTableData: SummaryRow[] | null;
    highlightedRefClusterIds: Set<string>;
}

type ScatterCustomDataItem = [
    string, // goTerm (index 0)
    string, // goId (index 1)
    string | number, // pyodideCluster (index 2)
    string | number | null, // referenceClusterId (index 3)
    number, // bmd (index 4)
    number | null // rank (index 5) - Global category rank
];

const GOClusteringScatterPlot: React.FC<GOClusteringScatterPlotProps> = ({
    plotData,
    summaryTableData,
    highlightedRefClusterIds,
}) => {
    const logPrefix = '[GOClusteringScatterPlot v13 - Shape Constants]'; // Version Bump

    const [renderError, setRenderError] = useState<string | null>(null);

    useEffect(() => {
        setRenderError(null);
    }, [plotData, summaryTableData, highlightedRefClusterIds]);

    const handlePlotError = useCallback((err: Error) => {
        console.error(`${logPrefix} Plotly rendering error:`, err);
        setRenderError(
            'Failed to render Clustering plot. Check console for details.'
        );
    }, [logPrefix]);

    // --- Plotly Data Calculation ---
    const plotlyData = useMemo((): Data[] => {
        if (!plotData || plotData.length === 0) {
            return [];
        }
        console.log(
            `${logPrefix} plotlyData useMemo running. Highlighted IDs count: ${highlightedRefClusterIds.size}`
        );

        const hovertemplate =
            `<b>%{customdata[0]}</b><br>` +
            `GO ID: %{customdata[1]}<br>` +
            `Pyodide Cluster: %{customdata[2]}<br>` +
            `Ref Cluster: %{customdata[3]}<br>` +
            `BMD (X): %{customdata[4]:.2e}<br>` +
            `Category Rank: %{customdata[5]}<extra></extra>`;

        const basePoints: { x: number[]; y: (number | null)[]; color: string[]; customdata: Datum[][] } = { x: [], y: [], color: [], customdata: [] };
        const highlightPoints: { x: number[]; y: (number | null)[]; color: string[]; customdata: Datum[][] } = { x: [], y: [], color: [], customdata: [] };

        plotData.forEach((p) => {
            const refClusterIdStr =
                p.referenceClusterId != null ? String(p.referenceClusterId) : null;
            const isHighlighted =
                refClusterIdStr !== null && highlightedRefClusterIds.has(refClusterIdStr);

            const customPtDataArray: ScatterCustomDataItem = [
                p.goTerm, p.goId, p.pyodideCluster, p.referenceClusterId, p.bmdValue, p.rank,
            ];
            const yValue = typeof p.jitteredRank === 'number' && isFinite(p.jitteredRank) ? p.jitteredRank : null;

            if (isHighlighted) {
                highlightPoints.x.push(p.bmdValue);
                highlightPoints.y.push(yValue);
                highlightPoints.color.push(p.color);
                highlightPoints.customdata.push(customPtDataArray);
            } else {
                basePoints.x.push(p.bmdValue);
                basePoints.y.push(yValue);
                basePoints.color.push(p.color);
                basePoints.customdata.push(customPtDataArray);
            }
        });

        const baseTrace: Data = {
            x: basePoints.x,
            y: basePoints.y,
            mode: 'markers',
            type: 'scattergl',
            marker: {
                size: CLUSTERING_PLOT_BASE_SIZE,
                color: basePoints.color,
                opacity: CLUSTERING_PLOT_BASE_ALPHA,
                symbol: CLUSTERING_PLOT_BASE_MARKER_SHAPE, // <<< USE CONSTANT
            },
            customdata: basePoints.customdata as Datum[][],
            hovertemplate: hovertemplate,
            hoverlabel: { bgcolor: CLUSTERING_PLOT_HOVER_BG_COLOR },
            name: 'Other Clusters',
        };

        const highlightTrace: Data = {
            x: highlightPoints.x,
            y: highlightPoints.y,
            mode: 'markers',
            type: 'scattergl',
            marker: {
                size: CLUSTERING_PLOT_HIGHLIGHT_SIZE,
                color: highlightPoints.color,
                opacity: CLUSTERING_PLOT_HIGHLIGHT_ALPHA,
                symbol: CLUSTERING_PLOT_HIGHLIGHT_MARKER_SHAPE, // <<< USE CONSTANT
                line: {
                    color: CLUSTERING_PLOT_MARKER_LINE_COLOR,
                    width: CLUSTERING_PLOT_MARKER_LINE_WIDTH
                }
            },
            customdata: highlightPoints.customdata as Datum[][],
            hovertemplate: hovertemplate,
            hoverlabel: {
                bgcolor: CLUSTERING_PLOT_HOVER_BG_COLOR,
                bordercolor: CLUSTERING_PLOT_HIGHLIGHT_HOVER_BORDER_COLOR
            },
            name: 'Highlighted Clusters',
        };

        const traces = [];
        if (basePoints.x.length > 0) traces.push(baseTrace);
        if (highlightPoints.x.length > 0) traces.push(highlightTrace);

        return traces;
    }, [plotData, highlightedRefClusterIds]);

    // --- Plotly Layout Calculation ---
    const plotlyLayout = useMemo((): Partial<Layout> => {
        // ... (tick calculations as before) ...
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

        // Calculate font sizes using the multiplier
        const titleFontSize = BASE_PLOT_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
        const axisTitleFontSize = BASE_PLOT_AXIS_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
        const axisTickFontSize = BASE_PLOT_AXIS_TICK_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
        const hoverLabelFontSize = BASE_PLOT_HOVER_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
        const axisTitleStandoff = BASE_PLOT_AXIS_TITLE_STANDOFF_PX * FONT_SIZE_MULTIPLIER;

        return {
            title: {
                //text: CLUSTERING_PLOT_TITLE,
                font: { size: titleFontSize }
            },
            xaxis: {
                title: {
                    text: CLUSTERING_PLOT_X_AXIS_TITLE,
                    font: { size: axisTitleFontSize },
                    standoff: axisTitleStandoff
                },
                tickfont: { size: axisTickFontSize },
                type: 'log',
                showgrid: false,
                side: 'bottom',
            },
            yaxis: {
                title: {
                    text: CLUSTERING_PLOT_Y_AXIS_TITLE,
                    font: { size: axisTitleFontSize },
                    standoff: axisTitleStandoff
                },
                tickfont: { size: axisTickFontSize },
                autorange: 'reversed',
                type: 'linear',
                tickmode: 'array',
                tickvals: yTickVals.length > 0 ? yTickVals : undefined,
                ticktext: yTickText.length > 0 ? yTickText : undefined,
                showgrid: true,
                gridcolor: CLUSTERING_PLOT_GRID_COLOR,
                gridwidth: 1,
                zeroline: false
            },
            height: 500,
            margin: { l: 80, r: 30, t: 50, b: 50 },
            hovermode: 'closest',
            hoverlabel: {
                font: { size: hoverLabelFontSize }
            },
            showlegend: false,
            autosize: true,
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
        };
    }, [summaryTableData]);

    // --- Render Logic ---
    if (renderError) {
        return (
            <div style={{ padding: '20px', height: '500px' }}>
                <Alert
                    message="Plot Rendering Error"
                    description={renderError}
                    type="error"
                    showIcon
                />
            </div>
        );
    }

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
            onError={handlePlotError}
        />
    );
};

export default GOClusteringScatterPlot;