import React, { useMemo, useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import type { Layout, ScatterData } from 'plotly.js';
import type * as Plotly from 'plotly.js';
import type { UmapAnalysisDataPoint } from '../../../models/applicationModel';
import type { ReferenceUmapItem } from '../../../data/referenceUmapData';
import { Alert } from 'antd';
import styles from './UmapPlotComponent.module.css';

// const PLOT_HEIGHT = 400; // No longer needed here

interface UmapPlotComponentProps {
    data: UmapAnalysisDataPoint[] | null;
    referenceData: ReferenceUmapItem[] | null;
}

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

    // Transform data for Plotly Traces (Unchanged)
    const plotData = useMemo((): Partial<ScatterData>[] => {
        const traces: Partial<ScatterData>[] = [];
        // ... trace generation logic ...
        // 1. Reference Trace
        if (referenceData && referenceData.length > 0) {
            const referenceTrace: Partial<ScatterData> = {
                x: referenceData.map((p) => p.UMAP_1),
                y: referenceData.map((p) => p.UMAP_2),
                mode: 'markers', type: 'scattergl', name: 'Reference Data',
                marker: { color: '#b0b0b0', size: 4, opacity: 0.5, symbol: 'circle' },
                hoverinfo: 'text',
                text: referenceData.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`),
                customdata: referenceData.map((p) => [p.go_id]),
            };
            traces.push(referenceTrace);
        }
        // 2. Overlay Trace
        if (data && data.length > 0) {
            const overlayTrace: Partial<ScatterData> = {
                x: data.map((p) => p.UMAP_1), y: data.map((p) => p.UMAP_2),
                mode: 'markers', type: 'scattergl', name: 'Selected Analysis',
                marker: {
                    color: data.map((p) => p.finalColor), size: data.map((p) => p.finalSize ?? 8),
                    symbol: data.map((p) => p.finalShape), opacity: data.map((p) => p.finalOpacity),
                    line: { color: 'rgba(50, 50, 50, 0.6)', width: 0.5 },
                },
                hoverinfo: 'text',
                text: data.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Experiment: ${p.bmdResultName}<br>UMAP: (${p.UMAP_1?.toFixed(2)}, ${p.UMAP_2?.toFixed(2)})<br>Cluster: ${p.cluster_id}`),
                customdata: data.map((p) => [p.go_id, p.bmdResultRef]),
            };
            traces.push(overlayTrace);
        }
        return traces;
    }, [data, referenceData]);

    // Define Plotly Layout (Updated for Aspect Ratio and Margins)
    const layout: Partial<Layout> = useMemo(
        () => ({
            xaxis: {
                visible: false,
                autorange: true // Keep autoscaling
            },
            yaxis: {
                visible: false,
                autorange: true, // Keep autoscaling
                scaleanchor: 'x', // <<< RE-ADDED for 1:1 aspect ratio
                scaleratio: 1    // <<< RE-ADDED for 1:1 aspect ratio
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            // height: PLOT_HEIGHT, // <<< REMOVED: Height controlled by CSS aspect-ratio
            hovermode: 'closest',
            showlegend: false,
            // Keep increased margins to visually shrink plotting area
            margin: {
                l: 60, // Simulate left axis space
                r: 20, // Standard right margin
                t: 20, // Standard top margin
                b: 50  // Simulate bottom axis space
            },
            autosize: true, // Let Plotly fill the square container
        }),
        []
    );

    // Render Logic
    if (renderError) {
        return (
            // Use the CSS module class for the container
            <div className={styles.plotContainer} style={{ padding: '20px' }}>
                <Alert message="Plot Rendering Error" description={renderError} type="error" showIcon />
            </div>
        );
    }

    if (plotData.length === 0) {
        return (
            // Use the CSS module class for the container
            <div className={styles.plotContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', border: '1px dashed #d9d9d9' }}>
                <p>No data to display.</p>
            </div>
        );
    }

    return (
        // Use the CSS module class for the container
        <div className={styles.plotContainer}>
            <Plot
                data={plotData as Plotly.Data[]}
                layout={layout}
                style={{ width: '100%', height: '100%' }} // Plot fills container
                useResizeHandler={true}
                config={{ responsive: true, displaylogo: false }}
                onError={handlePlotError}
            />
        </div>
    );
};

export default UmapPlotComponent;
