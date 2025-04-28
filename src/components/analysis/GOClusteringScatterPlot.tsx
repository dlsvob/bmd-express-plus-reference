// src/components/analysis/GOClusteringScatterPlot.tsx
import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';
import { DEFAULT_MARKER_COLOR, UNCLUSTERED_COLOR } from '../../utils/legendUtils';
import { SummaryRow } from '../../utils/clusteringUtils';

export interface ClusteringScatterPoint {
    goId: string;
    goTerm: string;
    pyodideCluster: string;
    referenceClusterId: number | string | null;
    rank: number | null; // Y-axis value (numerical rank) - base position
    bmdValue: number | null; // X-axis value (BMD)
}

interface GOClusteringScatterPlotProps {
    plotData: ClusteringScatterPoint[] | null;
    clusterColorMap: Map<string | number, string> | null;
    summaryTableData: SummaryRow[] | null;
}

const BASE_MARKER_SIZE = 6;
const JITTER_AMOUNT = 0.3;
// --- Updated Grid Color ---
const GRID_COLOR = '#cccccc'; // Darker solid grey for grid lines
// --------------------------

const GOClusteringScatterPlot: React.FC<GOClusteringScatterPlotProps> = ({
    plotData,
    clusterColorMap,
    summaryTableData,
}) => {
    const logPrefix = '[GOClusteringScatterPlot v5]'; // Version Bump

    const plotlyData = useMemo((): Data[] => {
        if (!plotData || plotData.length === 0) {
            return [];
        }

        const jitteredY = plotData.map(p => {
            if (p.rank === null) return null;
            const jitter = (Math.random() - 0.5) * 2 * JITTER_AMOUNT;
            return p.rank + jitter;
        });

        const pointColors = plotData.map(p => {
            if (p.referenceClusterId === -1 || p.referenceClusterId === '-1') {
                return UNCLUSTERED_COLOR;
            }
            if (p.referenceClusterId != null && clusterColorMap) {
                return clusterColorMap.get(String(p.referenceClusterId)) || DEFAULT_MARKER_COLOR;
            }
            return DEFAULT_MARKER_COLOR;
        });

        const trace: Data = {
            x: plotData.map((p) => p.bmdValue),
            y: jitteredY,
            mode: 'markers',
            type: 'scattergl',
            marker: {
                size: BASE_MARKER_SIZE * 1.5,
                color: pointColors,
                // --- Set Opacity to 1 ---
                opacity: 1.0,
                // ------------------------
            },
            customdata: plotData.map((p) => ({
                goId: p.goId,
                goTerm: p.goTerm,
                pyodideCluster: p.pyodideCluster,
                referenceClusterId: p.referenceClusterId,
                rank: p.rank,
                bmd: p.bmdValue,
            })),
            hovertemplate:
                `<b>%{customdata.goTerm}</b><br>` +
                `GO ID: %{customdata.goId}<br>` +
                `Pyodide Cluster: %{customdata.pyodideCluster}<br>` +
                `Ref Cluster: %{customdata.referenceClusterId}<br>` +
                `BMD (X): %{customdata.bmd:.2e}<br>` +
                `Rank (Y): %{customdata.rank}<extra></extra>`,
            hoverlabel: { bgcolor: '#FFF' },
            name: 'Categories',
        };

        return [trace];
    }, [plotData, clusterColorMap]);

    const plotlyLayout = useMemo((): Partial<Layout> => {
        let yTickVals: number[] = [];
        let yTickText: string[] = [];
        if (summaryTableData && summaryTableData.length > 0) {
            const sortedSummary = [...summaryTableData].sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity));
            yTickVals = sortedSummary.map(item => item.sort).filter(rank => rank != null) as number[];
            yTickText = sortedSummary.map(item => String(item.cluster));
            console.log(`${logPrefix} Generated Y Ticks: Vals (Ranks)=`, yTickVals);
            console.log(`${logPrefix} Generated Y Ticks: Text (Cluster IDs)=`, yTickText);
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
                gridcolor: GRID_COLOR, // Uses the updated constant
                gridwidth: 1,
            },
            height: 500,
            margin: { l: 80, r: 30, t: 50, b: 50 },
            hovermode: 'closest',
            showlegend: false,
            autosize: true,
        };
    }, [summaryTableData]);

    // ... (rest of the component remains the same) ...

    if (!plotData) {
        return <div>Preparing plot data...</div>;
    }
    if (plotlyData.length === 0) {
        return <div>No valid data points to plot.</div>;
    }
    console.log(`${logPrefix} Rendering plot with ${plotData.length} points.`);

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
