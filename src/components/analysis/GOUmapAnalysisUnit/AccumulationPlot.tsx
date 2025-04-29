// src/components/analysis/AccumulationPlot.tsx
import React, { useMemo, useCallback } from 'react';
import type {
    Data,
    Layout,
    PlotMouseEvent,
    PlotSelectionEvent,
} from 'plotly.js';
import { Spin } from 'antd';
// --- Import the CORRECT data type ---
import { UmapAnalysisDataPoint } from '../../../models/applicationModel'; // Adjusted path & type name
// --- Component for Plotly ---
import Plot from 'react-plotly.js'; // Assuming direct use or a thin wrapper
// --- Redux imports ---
import { useAppDispatch } from '../../../store/hooks'; // Adjust path
import { setAccumulationPlotSelection } from '../../../store/slices/analysisUISlice'; // Adjust path

// Props interface - Cleaned up
export interface AccumulationPlotProps {
    analysisName: string;
    // Expects pre-styled, rank-filtered points for this specific analysis
    styledPointsForPlot: UmapAnalysisDataPoint[] | null; // Use correct type
    bmdResultRef: number; // Identifier for this specific plot
    // Removed unused props based on previous cleanup
}

// Constants
const PLOT_HEIGHT = 400;
const LINE_COLOR = '#1f77b4'; // Color for the cumulative line itself

const AccumulationPlot: React.FC<AccumulationPlotProps> = React.memo(
    function AccumulationPlot({
        analysisName,
        styledPointsForPlot,
        bmdResultRef,
        // Removed unused props from destructuring
    }) {
        const dispatch = useAppDispatch();
        const logPrefix = `[AccumulationPlot ${analysisName}]`;

        console.log(
            `${logPrefix} Rendering. Received ${styledPointsForPlot?.length ?? 0
            } styled points.`
        );

        // --- Calculate Cumulative Line Data ---
        const linePlotData = useMemo(() => {
            console.log(`${logPrefix} Calculating line data...`);
            if (!styledPointsForPlot || styledPointsForPlot.length === 0) {
                console.log(`${logPrefix} No styled points to process for line.`);
                return null;
            }

            try {
                const validPoints = styledPointsForPlot.filter(
                    (p) =>
                        p.bmdFifthPercentileTotalGenes != null &&
                        !isNaN(p.bmdFifthPercentileTotalGenes) &&
                        isFinite(p.bmdFifthPercentileTotalGenes) &&
                        p.bmdFifthPercentileTotalGenes > 0
                );

                if (validPoints.length === 0) {
                    console.log(`${logPrefix} No points with valid BMD values found.`);
                    return null;
                }

                const sortedPoints = [...validPoints].sort(
                    (a, b) =>
                        (a.bmdFifthPercentileTotalGenes ?? Infinity) -
                        (b.bmdFifthPercentileTotalGenes ?? Infinity)
                );

                const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
                const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!;
                const maxX =
                    sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!;
                const maxY = cumulativeCounts[cumulativeCounts.length - 1];

                console.log(
                    `${logPrefix} Line data calculated. Points: ${sortedPoints.length}, MinX: ${minX}, MaxX: ${maxX}, MaxY: ${maxY}`
                );

                return {
                    points: sortedPoints,
                    cumulativeCounts,
                    minXValue: minX,
                    maxXValue: maxX,
                    minYValue: 0,
                    maxYValue: maxY,
                    totalPoints: sortedPoints.length,
                };
            } catch (error) {
                console.error(`${logPrefix} Error processing line data:`, error);
                return null;
            }
        }, [styledPointsForPlot, logPrefix]);

        // --- Generate Plotly Traces ---
        const plotData = useMemo((): Data[] | null => {
            console.log(`${logPrefix} plotData Memo] Recalculating traces...`);

            if (!linePlotData) {
                console.log(
                    `${logPrefix} plotData Memo] Exiting early: no linePlotData.`
                );
                return null;
            }

            // --- Line Trace ---
            const lineTrace: Data = {
                // FIX: Ensure x values are number or null, not undefined
                x: linePlotData.points.map((p) => p.bmdFifthPercentileTotalGenes ?? null),
                y: linePlotData.cumulativeCounts,
                type: 'scattergl',
                mode: 'lines',
                name: 'Cumulative Count',
                line: { color: LINE_COLOR, width: 2 },
                customdata: linePlotData.points.map((p) => p.go_id),
                text: linePlotData.points.map(
                    (p, i) =>
                        `Rank: ${i + 1}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term
                        }<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(
                            2
                        )}<br>Count: ${linePlotData.cumulativeCounts[i]}`
                ),
                hoverinfo: 'text',
                hoverlabel: { bgcolor: '#FFF', bordercolor: LINE_COLOR },
                showlegend: false,
            };

            // --- Marker Trace ---
            const pointsForMarkers = (styledPointsForPlot || []).filter(
                (p) =>
                    p.finalOpacity > 0 &&
                    p.bmdFifthPercentileTotalGenes != null &&
                    !isNaN(p.bmdFifthPercentileTotalGenes) &&
                    isFinite(p.bmdFifthPercentileTotalGenes) &&
                    p.bmdFifthPercentileTotalGenes > 0
            );

            const goIdToRankMap = new Map<string, number>();
            linePlotData.points.forEach((p, index) => {
                goIdToRankMap.set(p.go_id, index + 1);
            });

            console.log(
                `${logPrefix} plotData Memo] Found ${pointsForMarkers.length} marker points (visible & valid BMD).`
            );

            const markerTrace: Data | null =
                pointsForMarkers.length > 0
                    ? {
                        // FIX: Ensure x values are number or null, not undefined
                        x: pointsForMarkers.map(
                            (p) => p.bmdFifthPercentileTotalGenes ?? null
                        ),
                        // y calculation already handles potential missing rank with ?? null
                        y: pointsForMarkers.map(
                            (p) =>
                                linePlotData.cumulativeCounts[
                                goIdToRankMap.get(p.go_id)! - 1
                                ] ?? null
                        ),
                        customdata: pointsForMarkers.map((p) => p.go_id),
                        text: pointsForMarkers.map(
                            (p) =>
                                `Rank: ${goIdToRankMap.get(p.go_id) ?? 'N/A'}<br>GO ID: ${p.go_id
                                }<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(
                                    2
                                )}<br>Source: ${p.bmdResultName}`
                        ),
                        type: 'scattergl',
                        mode: 'markers',
                        name: 'Points',
                        marker: {
                            color: pointsForMarkers.map((p) => p.finalColor),
                            symbol: pointsForMarkers.map((p) => p.finalShape),
                            size: pointsForMarkers.map((p) => p.finalSize),
                            opacity: pointsForMarkers.map((p) => p.finalOpacity),
                            line: { color: 'black', width: 0.5 },
                        },
                        hoverinfo: 'text',
                        hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' },
                        showlegend: false,
                    }
                    : null;

            console.log(
                `${logPrefix} plotData Memo] markerTrace created?`,
                !!markerTrace
            );
            return markerTrace ? [lineTrace, markerTrace] : [lineTrace];
        }, [linePlotData, styledPointsForPlot, logPrefix]);

        // --- Layout Calculation (remains the same) ---
        const plotLayout = useMemo((): Partial<Layout> | null => {
            if (!linePlotData) return null;
            const epsilon = 1e-10;
            const logMinX = Math.log10(Math.max(linePlotData.minXValue, epsilon));
            const logMaxX = Math.log10(linePlotData.maxXValue);
            const minYValue = 0;
            const maxYValueWithPadding = linePlotData.maxYValue * 1.05;

            return {
                xaxis: {
                    title: '5th Percentile BMD (Log Scale)',
                    type: 'log',
                    autorange: false,
                    range: [logMinX, logMaxX],
                },
                yaxis: {
                    title: 'Cumulative Count',
                    autorange: false,
                    range: [minYValue, maxYValueWithPadding],
                },
                height: PLOT_HEIGHT,
                margin: { l: 60, r: 20, t: 20, b: 50 },
                hovermode: 'closest',
                showlegend: false,
                autosize: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                dragmode: 'lasso',
                clickmode: 'event+select',
            };
        }, [linePlotData]);

        // --- Event Handlers (remain the same) ---
        const handleSelection = useCallback(
            (event: Readonly<PlotSelectionEvent> | undefined) => {
                const selectedGoIds =
                    event?.points?.map((p) => p.customdata as string).filter(Boolean) ||
                    [];
                console.log(
                    `${logPrefix} handleSelection - Dispatching selection:`,
                    selectedGoIds
                );
                dispatch(setAccumulationPlotSelection(selectedGoIds));
            },
            [dispatch, logPrefix]
        );

        const handleClick = useCallback(
            (event: Readonly<PlotMouseEvent>) => {
                const clickedGoId = event.points[0]?.customdata as string;
                if (clickedGoId) {
                    console.log(
                        `${logPrefix} handleClick - Dispatching single selection:`,
                        [clickedGoId]
                    );
                    dispatch(setAccumulationPlotSelection([clickedGoId]));
                } else {
                    console.log(
                        `${logPrefix} handleClick - No GO ID found, dispatching empty selection.`
                    );
                    dispatch(setAccumulationPlotSelection([]));
                }
            },
            [dispatch, logPrefix]
        );

        const handleDoubleClick = useCallback(() => {
            console.log(
                `${logPrefix} handleDoubleClick - Dispatching empty selection.`
            );
            dispatch(setAccumulationPlotSelection([]));
        }, [dispatch, logPrefix]);

        // --- Render Logic (remains the same) ---
        console.log(
            `${logPrefix} FINAL check before Plot. plotData is null?`,
            plotData === null,
            'plotLayout is null?',
            plotLayout === null
        );
        if (plotData) {
            console.log(`${logPrefix} FINAL plotData length:`, plotData.length);
        }

        if (styledPointsForPlot === null) {
            return <Spin tip="Processing plot data..." />;
        }
        if (!plotData || !plotLayout) {
            return (
                <div
                    style={{
                        height: `${PLOT_HEIGHT}px`,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid lightgrey',
                        fontSize: '0.9em',
                        color: '#888',
                    }}
                >
                    <span>No valid data for plot.</span>
                </div>
            );
        }

        return (
            <div style={{ height: `${PLOT_HEIGHT}px`, width: '100%' }}>
                <Plot
                    divId={`${analysisName}-accumulation-${bmdResultRef}`}
                    // No type assertion needed now for data if TS is satisfied
                    data={plotData}
                    layout={plotLayout}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    config={{
                        responsive: true,
                        displaylogo: false,
                        modeBarButtonsToRemove: [
                            'zoom2d',
                            'pan2d',
                            'select2d',
                            'zoomIn2d',
                            'zoomOut2d',
                            'autoScale2d',
                            'resetScale2d',
                            'hoverClosestCartesian',
                            'hoverCompareCartesian',
                            'toggleSpikelines',
                        ],
                    }}
                    onClick={handleClick}
                    onSelected={handleSelection}
                    onDoubleClick={handleDoubleClick}
                />
            </div>
        );
    }
);

export default AccumulationPlot;
