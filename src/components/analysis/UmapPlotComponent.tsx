/**
 * src/components/analysis/UmapPlotComponent.tsx
 *
 * Renders a Plotly scatter plot showing overlay data points
 * on top of the reference UMAP data.
 */
import React, { useMemo, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout } from 'plotly.js';

// --- Import data point types ---
import type { UmapAnalysisDataPoint } from '../../models/ApplicationModelCompositional'; // Adjust path
import type { ReferenceUmapItem } from '../../data/referenceUmapData'; // Adjust path

// --- Import CSS Module ---
import styles from './UmapPlotComponent.module.css'; // Adjust path if needed

interface UmapPlotComponentProps {
    data: UmapAnalysisDataPoint[] | null;
    referenceData: ReferenceUmapItem[] | null;
    title?: string;
}

const UmapPlotComponent: React.FC<UmapPlotComponentProps> = ({
    data = null,
    referenceData = null,
    title = '',
}) => {

    useEffect(() => {
        // console.log('[UmapPlotComponent] Received referenceData prop:', referenceData ? `Array(${referenceData.length})` : referenceData);
        // console.log('[UmapPlotComponent] Received overlay data prop:', data ? `Array(${data.length})` : data);
    }, [referenceData, data]);

    // --- Transform data for Plotly Traces ---
    const plotData: Data[] = useMemo(() => {
        const traces: Data[] = [];

        // 1. Create Reference Trace
        if (referenceData && referenceData.length > 0) {
            // console.log(`[UmapPlotComponent useMemo] Creating reference trace with ${referenceData.length} points.`); // Less verbose log
            const referenceTrace: Plotly.ScatterglData = {
                x: referenceData.map(p => p.UMAP_1),
                y: referenceData.map(p => p.UMAP_2),
                mode: 'markers', type: 'scattergl', name: 'Reference Data',
                marker: { color: '#b0b0b0', size: 4, opacity: 0.5, symbol: 'circle' },
                hoverinfo: 'text',
                text: referenceData.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Cluster: ${p.cluster_id}`),
                customdata: referenceData.map(p => ({ goId: p.go_id })),
            };
            // *** UNCOMMENT THIS LINE TO ADD THE TRACE ***
            traces.push(referenceTrace);
            // ******************************************
        } else {
            console.log('[UmapPlotComponent useMemo] No reference data to create trace.');
        }

        // 2. Create Overlay Trace
        if (data && data.length > 0) {
            // console.log(`[UmapPlotComponent useMemo] Creating overlay trace with ${data.length} points (DYNAMIC STYLES).`); // Less verbose log
            const overlayTrace: Plotly.ScatterglData = {
                x: data.map(p => p.UMAP_1), y: data.map(p => p.UMAP_2),
                mode: 'markers', type: 'scattergl', name: 'Selected Analysis',
                marker: {
                    color: data.map(p => p.finalColor),
                    size: data.map(p => p.finalSize ?? 8),
                    symbol: data.map(p => p.finalShape),
                    opacity: data.map(p => p.finalOpacity),
                    line: { color: 'rgba(50, 50, 50, 0.6)', width: 0.5 }
                },
                hoverinfo: 'text',
                text: data.map(p => `<b>${p.go_term}</b><br>GO ID: ${p.go_id}<br>Experiment: ${p.bmdResultName}<br>UMAP: (${p.UMAP_1?.toFixed(2)}, ${p.UMAP_2?.toFixed(2)})<br>Cluster: ${p.cluster_id}`),
                customdata: data.map(p => ({ goId: p.go_id, bmdRef: p.bmdResultRef })),
            };
            traces.push(overlayTrace);
        } else {
            console.log('[UmapPlotComponent useMemo] No overlay data to create trace.');
        }

        // console.log(`[UmapPlotComponent useMemo] Final plotData contains ${traces.length} traces.`); // Less verbose log
        return traces;

    }, [data, referenceData]);

    // --- Define Plotly Layout ---
    const layout: Partial<Layout> = useMemo(() => ({
        // title: title, // Title handled by Card
        xaxis: {
            title: 'UMAP 1', zeroline: false, range: [0, 10],
        },
        yaxis: {
            title: 'UMAP 2', zeroline: false, range: [0, 10],
            scaleanchor: 'x', scaleratio: 1,
        },
        hovermode: 'closest',
        showlegend: true,
        legend: {
            yanchor: "top", y: 0.99, xanchor: "left", x: 0.01,
            bgcolor: 'rgba(255,255,255,0.7)'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(248, 248, 248, 1)',
        margin: { l: 50, r: 20, t: 10, b: 40 },
        // autosize: true, // Keep default or set explicitly

    }), [/* No changing dependencies */]);

    // --- Render the Plot ---
    if (plotData.length === 0) {
        return <div className={styles.plotContainer}><p>No data available for UMAP plot.</p></div>;
    }

    return (
        <div className={styles.plotContainer}>
            <Plot
                data={plotData}
                layout={layout}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{ responsive: true, displaylogo: false }}
            />
        </div>
    );
};

export default UmapPlotComponent;
