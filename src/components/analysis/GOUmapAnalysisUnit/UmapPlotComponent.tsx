/**
 * src/components/analysis/UmapPlotComponent.tsx
 *
 * Renders a Plotly scatter plot showing overlay data points
 * on top of the reference UMAP data. Uses Partial<ScatterData> internally
 * for clarity and casts only when passing data to the Plot component.
 */
import React, { useMemo, useEffect } from 'react';
import Plot from 'react-plotly.js';
// --- Import Plotly types ---
import type { Layout, ScatterData } from 'plotly.js';
// --- Import the Plotly namespace for the general Data type needed for the final cast ---
import type * as Plotly from 'plotly.js';

// --- Import application model types ---
import type { UmapAnalysisDataPoint } from '../../../models/applicationModel';
import type { ReferenceUmapItem } from '../../../data/referenceUmapData';

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

    useEffect(() => {
        // console.log('[UmapPlotComponent] Received referenceData prop:', referenceData ? `Array(${referenceData.length})` : referenceData);
        // console.log('[UmapPlotComponent] Received overlay data prop:', data ? `Array(${data.length})` : data);
    }, [referenceData, data]);

    // --- Transform data for Plotly Traces ---
    // useMemo returns an array of objects that are *intended* as Scatter plots,
    // potentially missing some optional ScatterData properties.
    const plotData = useMemo((): Partial<ScatterData>[] => {
        // Type the internal array explicitly as holding Partial<ScatterData>
        const traces: Partial<ScatterData>[] = [];

        // 1. Create Reference Trace
        if (referenceData && referenceData.length > 0) {
            // Explicitly type the trace object as Partial<ScatterData>
            const referenceTrace: Partial<ScatterData> = {
                x: referenceData.map(p => p.UMAP_1),
                y: referenceData.map(p => p.UMAP_2),
                mode: 'markers', // 'as const' optional here, but good practice
                type: 'scattergl', // 'as const' optional here
                name: 'Reference Data',
                marker: { color: '#b0b0b0', size: 4, opacity: 0.5, symbol: 'circle' },
                hoverinfo: 'text', // 'as const' optional here
                text: referenceData.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`),
                customdata: referenceData.map(p => [p.go_id]) as string[][],
            };
            traces.push(referenceTrace); // Push the correctly typed object
        } else {
            console.log('[UmapPlotComponent useMemo] No reference data to create trace.');
        }

        // 2. Create Overlay Trace
        if (data && data.length > 0) {
            // Explicitly type the trace object as Partial<ScatterData>
            const overlayTrace: Partial<ScatterData> = {
                x: data.map(p => p.UMAP_1), y: data.map(p => p.UMAP_2),
                mode: 'markers',
                type: 'scattergl',
                name: 'Selected Analysis',
                marker: {
                    color: data.map(p => p.finalColor),
                    size: data.map(p => p.finalSize ?? 8),
                    symbol: data.map(p => p.finalShape),
                    opacity: data.map(p => p.finalOpacity),
                    line: { color: 'rgba(50, 50, 50, 0.6)', width: 0.5 }
                },
                hoverinfo: 'text',
                text: data.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Experiment: ${p.bmdResultName}<br>UMAP: (${p.UMAP_1?.toFixed(2)}, ${p.UMAP_2?.toFixed(2)})<br>Cluster: ${p.cluster_id}`),
                customdata: data.map(p => [p.go_id, p.bmdResultRef]) as (string | number)[][],
            };
            traces.push(overlayTrace); // Push the correctly typed object
        } else {
            console.log('[UmapPlotComponent useMemo] No overlay data to create trace.');
        }

        // Return the array typed as Partial<ScatterData>[]
        return traces;

    }, [data, referenceData]);

    // --- Define Plotly Layout (remains the same) ---
    const layout: Partial<Layout> = useMemo(() => ({
        xaxis: { visible: false, /* ... */ },
        yaxis: { visible: false, scaleanchor: 'x', scaleratio: 1, /* ... */ },
        hovermode: 'closest',
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(248, 248, 248, 1)',
        margin: { l: 5, r: 5, t: 5, b: 5 },
        autosize: true,
    }), []);

    // --- Render the Plot ---
    if (plotData.length === 0) {
        return <div className={styles.plotContainer}><p>No data available for UMAP plot.</p></div>;
    }

    return (
        <div className={styles.plotContainer}>
            <Plot
                // --- Cast the Partial<ScatterData>[] to Plotly.Data[] HERE ---
                // This is the single point where we tell TS "trust me"
                data={plotData as Plotly.Data[]}
                // -------------------------------------------------------------
                layout={layout}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{ responsive: true, displaylogo: false }}
            />
        </div>
    );
};

export default UmapPlotComponent;
