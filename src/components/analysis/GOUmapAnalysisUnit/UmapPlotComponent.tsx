/**
 * Renders a Plotly scatter plot showing overlay data points
 * on top of the reference UMAP data. Uses Partial<ScatterData> internally
 * for clarity and casts only when passing data to the Plot component.
 * Includes internal error handling for Plotly rendering issues.
 */
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
// --- Import Plotly types ---
import type { Layout, ScatterData } from 'plotly.js';
// --- Import the Plotly namespace for the general Data type needed for the final cast ---
import type * as Plotly from 'plotly.js';

// --- Import application model types ---
import type { UmapAnalysisDataPoint } from '../../../models/applicationModel'; // Adjusted path
import type { ReferenceUmapItem } from '../../../data/referenceUmapData'; // Adjusted path

// --- Import AntD component ---
import { Alert } from 'antd'; // Import Alert

// --- Import CSS Module ---
import styles from './UmapPlotComponent.module.css';

interface UmapPlotComponentProps {
    data: UmapAnalysisDataPoint[] | null;
    referenceData: ReferenceUmapItem[] | null;
}

const UmapPlotComponent: React.FC<UmapPlotComponentProps> = ({
    data = null,
    referenceData = null,
}) => {
    // --- State for internal rendering errors ---
    const [renderError, setRenderError] = useState<string | null>(null);

    useEffect(() => {
        // Reset error state if props change, allowing retry on data update
        setRenderError(null);
    }, [data, referenceData]);

    // --- Plotly Error Handler ---
    // --- FIX: Replace 'any' with 'Error' ---
    const handlePlotError = useCallback((err: Error) => {
        console.error('[UmapPlotComponent] Plotly rendering error:', err);
        // Set a user-friendly error message
        setRenderError(
            'Failed to render UMAP plot. This might be due to data issues or browser limitations (e.g., too many WebGL contexts).'
        );
    }, []);
    // --------------------------------------

    // --- Transform data for Plotly Traces ---
    const plotData = useMemo((): Partial<ScatterData>[] => {
        const traces: Partial<ScatterData>[] = [];

        // 1. Create Reference Trace
        if (referenceData && referenceData.length > 0) {
            const referenceTrace: Partial<ScatterData> = {
                x: referenceData.map((p) => p.UMAP_1),
                y: referenceData.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Keep using scattergl for potentially large reference set
                name: 'Reference Data',
                marker: {
                    color: '#b0b0b0',
                    size: 4,
                    opacity: 0.5,
                    symbol: 'circle',
                },
                hoverinfo: 'text',
                text: referenceData.map(
                    (p) =>
                        `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`
                ),
                customdata: referenceData.map((p) => [p.go_id]), // Removed unnecessary assertion
            };
            traces.push(referenceTrace);
        }

        // 2. Create Overlay Trace
        if (data && data.length > 0) {
            const overlayTrace: Partial<ScatterData> = {
                x: data.map((p) => p.UMAP_1),
                y: data.map((p) => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl', // Keep using scattergl for overlay
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
                        }<br>UMAP: (${p.UMAP_1?.toFixed(2)}, ${p.UMAP_2?.toFixed(
                            2
                        )})<br>Cluster: ${p.cluster_id}`
                ),
                customdata: data.map((p) => [
                    p.go_id,
                    p.bmdResultRef,
                ]), // Removed unnecessary assertion
            };
            traces.push(overlayTrace);
        }
        return traces;
    }, [data, referenceData]);

    // --- Define Plotly Layout ---
    const layout: Partial<Layout> = useMemo(
        () => ({
            xaxis: { visible: false, range: [-10, 15], autorange: false }, // Example fixed range, adjust as needed
            yaxis: {
                visible: false,
                scaleanchor: 'x',
                scaleratio: 1,
                range: [-10, 15], // Example fixed range, adjust as needed
                autorange: false,
            },
            hovermode: 'closest',
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(248, 248, 248, 1)',
            margin: { l: 5, r: 5, t: 5, b: 5 },
            autosize: true,
        }),
        []
    );

    // --- Render Logic ---

    // --- Display Alert if an internal rendering error occurred ---
    if (renderError) {
        return (
            <div className={styles.plotContainer} style={{ padding: '20px' }}>
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

    if (plotData.length === 0) {
        return (
            <div className={styles.plotContainer}>
                <p>No data available for UMAP plot.</p>
            </div>
        );
    }

    return (
        <div className={styles.plotContainer}>
            <Plot
                data={plotData as Plotly.Data[]}
                layout={layout}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{ responsive: true, displaylogo: false }}
                // --- Add the onError handler ---
                onError={handlePlotError}
            // -----------------------------
            />
        </div>
    );
};

export default UmapPlotComponent;
