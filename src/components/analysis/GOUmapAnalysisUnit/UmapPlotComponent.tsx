// src/components/analysis/GOUmapAnalysisUnit/UmapPlotComponent.tsx

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import type {
    Layout,
    ScatterData,
    Config,
    Datum, // Import Datum type
} from 'plotly.js';
import type * as Plotly from 'plotly.js';
import type { UmapAnalysisDataPoint } from '../../../models/applicationModel';
import type { ReferenceUmapItem } from '../../../data/referenceUmapData';
import { Alert } from 'antd';
// --- Import SPECIFIC styles for UMAP ---
import styles from './UmapPlotComponent.module.css'; // Use specific CSS module
// --- Import Font Constants ---
import {
    FONT_SIZE_MULTIPLIER,
    BASE_PLOT_HOVER_FONT_SIZE_PX
} from '../../../config/analysisConstants';
// -----------------------------


// Props interface for the component
interface UmapPlotComponentProps {
    // Expects ALL styled points, including those potentially hidden by opacity
    data: UmapAnalysisDataPoint[] | null;
    referenceData: ReferenceUmapItem[] | null;
}

// Consistent margins
const PLOT_MARGINS = { l: 20, r: 20, t: 20, b: 20 }; // Minimal margins for UMAP

// ==========================================================================
// UmapPlotComponent Component
// ==========================================================================
const UmapPlotComponent: React.FC<UmapPlotComponentProps> = ({
    data = null, // Default to null if not provided
    referenceData = null,
}) => {
    const [renderError, setRenderError] = useState<string | null>(null);

    // Reset error if data changes
    useEffect(() => {
        setRenderError(null);
    }, [data, referenceData]);

    // Plotly error handler
    const handlePlotError = useCallback((err: Error) => {
        console.error('[UmapPlotComponent] Plotly rendering error:', err);
        setRenderError(
            'Failed to render UMAP plot. This might be due to data issues or browser limitations.'
        );
    }, []);

    // --- Memoized Plotly Data (Traces) ---
    const plotData = useMemo((): Partial<ScatterData>[] => {
        const traces: Partial<ScatterData>[] = [];

        // 1. Reference Trace (Background grey points)
        if (referenceData && referenceData.length > 0) {
            const referenceTrace: Partial<ScatterData> = {
                x: referenceData.map((p) => p.UMAP_1),
                y: referenceData.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Use WebGL for performance
                name: 'Reference Data',
                marker: {
                    color: '#d3d3d3', // Lighter grey
                    size: 4,
                    opacity: 0.6,
                    symbol: 'circle',
                },
                hoverinfo: 'text',
                text: referenceData.map(
                    (p) => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`
                ),
                // Use Datum[] for customdata if needed, ensure it's an array of arrays or objects
                customdata: referenceData.map((p) => [p.go_id]) as Datum[],
                showlegend: false,
            };
            traces.push(referenceTrace);
        }

        // 2. Overlay Trace (Main analysis data)
        // Render all points received in `data` prop (should be allStyledPoints)
        // Rely on finalOpacity for visibility.
        if (data && data.length > 0) {
            const overlayTrace: Partial<ScatterData> = {
                x: data.map((p) => p.UMAP_1),
                y: data.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Use WebGL
                name: 'Selected Analysis',
                marker: {
                    color: data.map((p) => p.finalColor),
                    size: data.map((p) => p.finalSize ?? 8), // Use calculated size or default
                    symbol: data.map((p) => p.finalShape),
                    opacity: data.map((p) => p.finalOpacity), // Use calculated opacity
                    line: { color: 'rgba(50, 50, 50, 0.6)', width: 0.5 }, // Slight border
                },
                hoverinfo: 'text',
                text: data.map(
                    (p) =>
                        `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Experiment: ${p.bmdResultName
                        }<br>UMAP: (${p.UMAP_1?.toFixed(2)}, ${p.UMAP_2?.toFixed(2)
                        })<br>Cluster: ${p.cluster_id}`
                ),
                // Use Datum[] for customdata if needed
                customdata: data.map((p) => [p.go_id, p.bmdResultRef]) as Datum[],
                showlegend: false,
            };
            traces.push(overlayTrace);
        }
        return traces;
    }, [data, referenceData]);

    // --- Memoized Plotly Layout ---
    const layout: Partial<Layout> = useMemo(
        () => ({
            xaxis: {
                visible: false, // Hide axis lines and labels
                autorange: true,
                zeroline: false,
                showgrid: false,
            },
            yaxis: {
                visible: false, // Hide axis lines and labels
                autorange: true,
                zeroline: false,
                showgrid: false,
                // No scaleanchor/scaleratio needed here - handled by CSS aspect-ratio
            },
            plot_bgcolor: 'rgba(0,0,0,0)', // Transparent background
            paper_bgcolor: 'rgba(0,0,0,0)',
            hovermode: 'closest',
            hoverlabel: { // Apply multiplier
                font: {
                    size: BASE_PLOT_HOVER_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER,
                }
            },
            showlegend: false,
            margin: PLOT_MARGINS, // Apply minimal margins
            autosize: true, // Let Plotly resize to container
        }),
        [] // FONT_SIZE_MULTIPLIER is constant, no need to add to deps
    );

    // --- Memoized Plotly Config ---
    const plotConfig: Partial<Config> = useMemo(() => ({
        responsive: true, // Allow resizing
        displaylogo: false, // Hide Plotly logo
        modeBarButtonsToRemove: [ // Remove unnecessary buttons
            'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
            'autoScale2d', 'resetScale2d', 'hoverClosestCartesian',
            'hoverCompareCartesian', 'toggleSpikelines',
        ],
        modeBarButtonsToAdd: [ // Add useful interactions
            {
                name: 'Reset View',
                icon: Plotly.Icons.home,
                click: (gd) => Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true }),
            },
            // Add lasso/box select if UMAP interaction is desired later
            // {
            //     name: 'Lasso Select',
            //     icon: Plotly.Icons.lasso,
            //     click: (gd) => Plotly.relayout(gd, { dragmode: 'lasso' }),
            // },
            // {
            //     name: 'Box Select',
            //     icon: Plotly.Icons.select,
            //     click: (gd) => Plotly.relayout(gd, { dragmode: 'select' }),
            // },
        ],
    }), []);

    // --- Render Logic ---
    if (renderError) {
        return (
            // Use specific CSS class for container
            <div className={styles.plotContainer} style={{ padding: '20px', border: '1px dashed #d9d9d9' }}>
                <Alert message="UMAP Plot Error" description={renderError} type="error" showIcon />
            </div>
        );
    }

    // Show message if no overlay data is available to plot (reference might still exist)
    if ((!data || data.length === 0) && (!referenceData || referenceData.length === 0)) {
        // If no reference data either, show empty message
        return (
            <div className={styles.plotContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', border: '1px dashed #d9d9d9' }}>
                <p>No UMAP data to display.</p>
            </div>
        );
    }
    // If only reference data, plotData will contain only reference trace, which is fine

    // Render the plot using the specific CSS class for the container
    return (
        <div className={styles.plotContainer}>
            <Plot
                data={plotData as Plotly.Data[]} // Cast data type for Plotly
                layout={layout}
                config={plotConfig}
                style={{ width: '100%', height: '100%' }} // Plotly fills the container
                useResizeHandler={true} // Handles container resize
                onError={handlePlotError}
            // Add selection/click handlers here if needed later
            // onClick={...}
            // onSelected={...}
            // onDoubleClick={...}
            />
        </div>
    );
};

export default UmapPlotComponent;