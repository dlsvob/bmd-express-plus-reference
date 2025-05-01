import React, { useMemo, useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import type { Layout, ScatterData, Config } from 'plotly.js';
import type * as Plotly from 'plotly.js';
import type { UmapAnalysisDataPoint } from '../../../models/applicationModel';
import type { ReferenceUmapItem } from '../../../data/referenceUmapData';
import { Alert } from 'antd';
// Import shared styles
import sharedStyles from '../shared/sharedPlotStyles.module.css';

interface UmapPlotComponentProps {
    data: UmapAnalysisDataPoint[] | null;
    referenceData: ReferenceUmapItem[] | null;
}

// Define consistent margins (MATCH ACCUMULATION PLOT)
const PLOT_MARGINS = { l: 60, r: 20, t: 20, b: 50 };

const UmapPlotComponent: React.FC<UmapPlotComponentProps> = ({
    data = null,
    referenceData = null,
}) => {
    const [renderError, setRenderError] = useState<string | null>(null);

    useEffect(() => {
        setRenderError(null);
    }, [data, referenceData]);

    const handlePlotError = useCallback((err: Error) => {
        console.error('[UmapPlotComponent] Plotly rendering error:', err);
        setRenderError(
            'Failed to render UMAP plot. This might be due to data issues or browser limitations.'
        );
    }, []);

    // Transform data for Plotly Traces
    const plotData = useMemo((): Partial<ScatterData>[] => {
        const traces: Partial<ScatterData>[] = [];
        // 1. Reference Trace
        if (referenceData && referenceData.length > 0) {
            const referenceTrace: Partial<ScatterData> = {
                x: referenceData.map((p) => p.UMAP_1),
                y: referenceData.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Use scattergl for performance
                name: 'Reference Data',
                marker: {
                    color: '#d3d3d3', // Lighter grey
                    size: 4,
                    opacity: 0.6,
                    symbol: 'circle',
                },
                hoverinfo: 'text',
                text: referenceData.map(
                    (p) =>
                        `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`
                ),
                customdata: referenceData.map((p) => [p.go_id]),
                showlegend: false,
            };
            traces.push(referenceTrace);
        }
        // 2. Overlay Trace
        if (data && data.length > 0) {
            const overlayTrace: Partial<ScatterData> = {
                x: data.map((p) => p.UMAP_1),
                y: data.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Use scattergl for performance
                name: 'Selected Analysis',
                marker: {
                    color: data.map((p) => p.finalColor),
                    size: data.map((p) => p.finalSize ?? 8),
                    symbol: data.map((p) => p.finalShape),
                    opacity: data.map((p) => p.finalOpacity),
                    line: { color: 'rgba(50, 50, 50, 0.6)', width: 0.5 },
                },
                hoverinfo: 'text',
                text: data.map(
                    (p) =>
                        `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Experiment: ${p.bmdResultName
                        }<br>UMAP: (${p.UMAP_1?.toFixed(
                            2
                        )}, ${p.UMAP_2?.toFixed(2)})<br>Cluster: ${p.cluster_id}`
                ),
                customdata: data.map((p) => [p.go_id, p.bmdResultRef]),
                showlegend: false,
            };
            traces.push(overlayTrace);
        }
        return traces;
    }, [data, referenceData]);

    // Define Plotly Layout (Updated Margins, No Height)
    const layout: Partial<Layout> = useMemo(
        () => ({
            xaxis: {
                visible: false, // Keep axes invisible
                autorange: true,
                zeroline: false,
                showgrid: false,
            },
            yaxis: {
                visible: false, // Keep axes invisible
                autorange: true,
                zeroline: false,
                showgrid: false,
                // No scaleanchor or scaleratio needed here
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            // height: undefined, // Ensure no height is set here
            hovermode: 'closest',
            showlegend: false,
            margin: PLOT_MARGINS, // Use consistent margins
            autosize: true, // Let Plotly resize to container
        }),
        []
    );

    // Plotly config
    const plotConfig: Partial<Config> = useMemo(() => ({
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: [
            'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
            'autoScale2d', 'resetScale2d', 'hoverClosestCartesian',
            'hoverCompareCartesian', 'toggleSpikelines',
        ],
        modeBarButtonsToAdd: [
            {
                name: 'Reset View',
                icon: Plotly.Icons.home,
                click: (gd) => Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true }),
            },
            {
                name: 'Lasso Select',
                icon: Plotly.Icons.lasso,
                click: (gd) => Plotly.relayout(gd, { dragmode: 'lasso' }),
            },
            {
                name: 'Box Select',
                icon: Plotly.Icons.select,
                click: (gd) => Plotly.relayout(gd, { dragmode: 'select' }),
            },
        ],
    }), []);


    // Render Logic
    if (renderError) {
        return (
            // Use shared style, remove inline height
            <div className={sharedStyles.plotContainer} style={{ padding: '20px', border: '1px dashed #d9d9d9' }}>
                <Alert message="Plot Rendering Error" description={renderError} type="error" showIcon />
            </div>
        );
    }

    if (plotData.length === 0) {
        return (
            // Use shared style, remove inline height
            <div className={sharedStyles.plotContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', border: '1px dashed #d9d9d9' }}>
                <p>No data to display.</p>
            </div>
        );
    }

    return (
        // Use shared style, remove inline height
        <div className={sharedStyles.plotContainer}>
            <Plot
                data={plotData as Plotly.Data[]}
                layout={layout}
                config={plotConfig}
                style={{ width: '100%', height: '100%' }} // Plotly div fills container
                useResizeHandler={true}
                onError={handlePlotError}
            // Add selection/click handlers if needed for UMAP interactivity
            // onClick={...}
            // onSelected={...}
            // onDoubleClick={...}
            />
        </div>
    );
};

export default UmapPlotComponent;
