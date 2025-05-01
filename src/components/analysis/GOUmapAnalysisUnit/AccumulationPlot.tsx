import React, { useMemo, useCallback } from 'react';
import type { Data, Layout, PlotMouseEvent, PlotSelectionEvent, Config } from 'plotly.js';
import type * as Plotly from 'plotly.js';
import { Spin } from 'antd';
import { UmapAnalysisDataPoint } from '../../../models/applicationModel';
import Plot from 'react-plotly.js';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
    setAccumulationPlotSelection,
    selectHighlightMode,
    selectGoIdFilterList,
    selectAccumulationPlotSelectedGoIdsSet,
    selectTableSelectedGoId,
} from '../../../store/slices/analysisUISlice';
import sharedStyles from '../shared/sharedPlotStyles.module.css';

// Define simple default colors or import from a utility
const defaultPlotColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

export interface AccumulationPlotProps {
    analysisName: string;
    styledPointsForPlot: UmapAnalysisDataPoint[] | null;
    bmdResultRef: number; // Identifier for this specific plot (0 for combined overlay)
    // Add map for combined plot line names
    experimentNameMap?: Map<number, string>;
}

// Define structure for processed group data in combined overlay mode
interface ProcessedGroupData {
    ref: number;
    name: string;
    sortedPoints: UmapAnalysisDataPoint[];
    cumulativeCounts: number[];
    goIdToRankMap: Map<string, number>;
    minX: number;
    maxX: number;
    maxY: number;
    color: string; // Assigned color for the line
}

// Define structure for single plot data mode
interface SinglePlotProcessedData {
    sortedPoints: UmapAnalysisDataPoint[];
    cumulativeCounts: number[];
    goIdToRankMap: Map<string, number>;
    minXValue: number;
    maxXValue: number;
    minYValue: number;
    maxYValue: number;
    totalPoints: number;
}

// Consistent margins, increased top margin for potential legend
const PLOT_MARGINS = { l: 60, r: 20, t: 40, b: 50 };

const AccumulationPlot: React.FC<AccumulationPlotProps> = React.memo(
    function AccumulationPlot({
        analysisName,
        styledPointsForPlot,
        bmdResultRef,
        experimentNameMap, // Receive the map
    }) {
        const dispatch = useAppDispatch();
        const logPrefix = `[AccumulationPlot ${analysisName}]`;

        // --- Get highlighting/selection state ---
        const highlightMode = useAppSelector(selectHighlightMode);
        const highlightGoIdsList = useAppSelector(selectGoIdFilterList);
        const selectedAccumGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
        const tableSelectedGoId = useAppSelector(selectTableSelectedGoId);

        // Determine if this is the combined plot overlay mode
        const isCombinedOverlayPlot = bmdResultRef === 0 && analysisName === "Combined";

        console.log(
            `${logPrefix} Rendering. CombinedOverlay: ${isCombinedOverlayPlot}. Received ${styledPointsForPlot?.length ?? 0} points.`
        );

        // --- Calculate Data for Combined Overlay Plot ---
        const combinedOverlayData = useMemo(() => {
            // Only run if in combined mode and data/map are available
            if (!isCombinedOverlayPlot || !styledPointsForPlot || !experimentNameMap) {
                return null;
            }
            console.log(`${logPrefix} Calculating combined overlay data...`);

            // Group points by bmdResultRef
            const groups = new Map<number, UmapAnalysisDataPoint[]>();
            styledPointsForPlot.forEach(p => {
                if (p.bmdResultRef != null) {
                    if (!groups.has(p.bmdResultRef)) {
                        groups.set(p.bmdResultRef, []);
                    }
                    groups.get(p.bmdResultRef)!.push(p);
                }
            });

            if (groups.size === 0) {
                console.log(`${logPrefix} No valid groups found for combined overlay.`);
                return null;
            }

            const processedGroups = new Map<number, ProcessedGroupData>();
            let overallMinX = Infinity;
            let overallMaxX = -Infinity;
            let overallMaxY = 0;
            let colorIndex = 0;

            // Process each group independently
            for (const [ref, points] of groups.entries()) {
                try {
                    // Filter for valid points within the group
                    const validPoints = points.filter(
                        (p) =>
                            p.bmdFifthPercentileTotalGenes != null &&
                            !isNaN(p.bmdFifthPercentileTotalGenes) &&
                            isFinite(p.bmdFifthPercentileTotalGenes) &&
                            p.bmdFifthPercentileTotalGenes > 0 &&
                            p.go_id // Ensure go_id exists for mapping
                    );

                    if (validPoints.length === 0) continue; // Skip groups with no valid points

                    // Sort points within the group by BMD
                    const sortedPoints = [...validPoints].sort(
                        (a, b) =>
                            (a.bmdFifthPercentileTotalGenes ?? Infinity) -
                            (b.bmdFifthPercentileTotalGenes ?? Infinity)
                    );

                    // Calculate cumulative counts and rank map for this group
                    const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
                    const goIdToRankMap = new Map<string, number>();
                    sortedPoints.forEach((p, index) => {
                        goIdToRankMap.set(p.go_id!, index + 1);
                    });

                    // Get min/max for this group
                    const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!;
                    const maxX = sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!;
                    const maxY = cumulativeCounts[cumulativeCounts.length - 1];

                    // Update overall ranges
                    overallMinX = Math.min(overallMinX, minX);
                    overallMaxX = Math.max(overallMaxX, maxX);
                    overallMaxY = Math.max(overallMaxY, maxY);

                    // Store processed data for this group
                    processedGroups.set(ref, {
                        ref: ref,
                        name: experimentNameMap.get(ref) || `Analysis ${ref}`,
                        sortedPoints: sortedPoints,
                        cumulativeCounts: cumulativeCounts,
                        goIdToRankMap: goIdToRankMap,
                        minX: minX,
                        maxX: maxX,
                        maxY: maxY,
                        color: defaultPlotColors[colorIndex % defaultPlotColors.length], // Assign color cyclically
                    });
                    colorIndex++;

                } catch (error) {
                    console.error(`${logPrefix} Error processing group ${ref}:`, error);
                }
            }

            if (processedGroups.size === 0) {
                console.log(`${logPrefix} No groups processed successfully for combined overlay.`);
                return null;
            }

            console.log(`${logPrefix} Combined overlay data calculated. Groups: ${processedGroups.size}, MinX: ${overallMinX}, MaxX: ${overallMaxX}, MaxY: ${overallMaxY}`);
            // Return processed groups and overall axis ranges
            return { processedGroups, overallMinX, overallMaxX, overallMaxY };

        }, [isCombinedOverlayPlot, styledPointsForPlot, experimentNameMap, logPrefix]);


        // --- Calculate Data for Single Plot (Original Logic) ---
        const singlePlotData = useMemo((): SinglePlotProcessedData | null => {
            // Only run if NOT in combined mode and data is available
            if (isCombinedOverlayPlot || !styledPointsForPlot) {
                return null;
            }
            console.log(`${logPrefix} Calculating single plot data...`);
            try {
                // Filter valid points (same criteria as combined groups)
                const validPoints = styledPointsForPlot.filter(
                    (p) =>
                        p.bmdFifthPercentileTotalGenes != null &&
                        !isNaN(p.bmdFifthPercentileTotalGenes) &&
                        isFinite(p.bmdFifthPercentileTotalGenes) &&
                        p.bmdFifthPercentileTotalGenes > 0 &&
                        p.go_id
                );
                if (validPoints.length === 0) {
                    console.log(`${logPrefix} No valid points for single plot.`);
                    return null;
                }
                // Sort all valid points together
                const sortedPoints = [...validPoints].sort(
                    (a, b) =>
                        (a.bmdFifthPercentileTotalGenes ?? Infinity) -
                        (b.bmdFifthPercentileTotalGenes ?? Infinity)
                );
                // Calculate cumulative counts and rank map for the single list
                const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
                const goIdToRankMap = new Map<string, number>();
                sortedPoints.forEach((p, index) => {
                    goIdToRankMap.set(p.go_id!, index + 1);
                });
                // Get min/max for the single list
                const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!;
                const maxX = sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!;
                const maxY = cumulativeCounts[cumulativeCounts.length - 1];

                console.log(`${logPrefix} Single plot data calculated. Points: ${sortedPoints.length}, MinX: ${minX}, MaxX: ${maxX}, MaxY: ${maxY}`);
                return {
                    sortedPoints, cumulativeCounts, goIdToRankMap,
                    minXValue: minX, maxXValue: maxX, minYValue: 0, maxYValue: maxY,
                    totalPoints: sortedPoints.length,
                };
            } catch (error) {
                console.error(`${logPrefix} Error processing single plot data:`, error);
                return null;
            }
        }, [isCombinedOverlayPlot, styledPointsForPlot, logPrefix]);


        // --- Generate Plotly Traces ---
        const plotData = useMemo((): Data[] | null => {
            console.log(`${logPrefix} plotData Memo] Recalculating traces...`);

            // Determine which GO IDs should have markers based on global state
            const goIdsToShowMarkers = new Set<string>([
                ...(highlightMode !== 'NONE' ? highlightGoIdsList : []),
                ...selectedAccumGoIdsSet,
                ...(tableSelectedGoId ? [tableSelectedGoId] : [])
            ]);

            let traces: Data[] = [];
            // Structure to hold data for the single marker trace
            let markerPointsData: { x: number | null, y: number | null, go_id: string, text: string, color: string, shape: string, size: number, opacity: number }[] = [];

            if (isCombinedOverlayPlot) {
                // === Combined Overlay Plot Traces ===
                if (!combinedOverlayData) {
                    console.log(`${logPrefix} plotData Memo] No combinedOverlayData available.`);
                    return null;
                }

                // Create Line Traces (one per experiment group)
                for (const [ref, groupData] of combinedOverlayData.processedGroups.entries()) {
                    traces.push({
                        x: groupData.sortedPoints.map(p => p.bmdFifthPercentileTotalGenes ?? null),
                        y: groupData.cumulativeCounts,
                        type: 'scatter', mode: 'lines',
                        name: groupData.name, // Use experiment name for legend
                        line: { color: groupData.color, width: 2 }, // Use assigned color
                        customdata: groupData.sortedPoints.map(p => p.go_id), // GO IDs for interaction
                        hoverinfo: 'name+x+y', // Show name, x, y on line hover
                        legendgroup: groupData.name, // Group line and potential markers in legend
                    });
                }

                // Prepare Marker Data (only for points that are selected/highlighted)
                const pointsForMarkers = (styledPointsForPlot || []).filter(p =>
                    p.go_id && goIdsToShowMarkers.has(p.go_id) && // Is it selected/highlighted?
                    p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 && // Valid BMD?
                    p.bmdResultRef != null // Has a ref to find its group?
                );

                pointsForMarkers.forEach(p => {
                    // Find the processed data for the group this point belongs to
                    const groupData = combinedOverlayData.processedGroups.get(p.bmdResultRef!);
                    if (!groupData) return; // Skip if group data not found

                    // Find the rank of this point *within its own group*
                    const rank = groupData.goIdToRankMap.get(p.go_id!);
                    if (rank == null) return; // Skip if point not found in its group's rank map

                    // Get the y-value (cumulative count) from its own group's data
                    const yValue = groupData.cumulativeCounts[rank - 1] ?? null;
                    if (yValue === null) return; // Skip if y-value is invalid

                    // Add data for this marker
                    markerPointsData.push({
                        x: p.bmdFifthPercentileTotalGenes,
                        y: yValue, // Y-value relative to its own group's line
                        go_id: p.go_id!,
                        text: `Exp: ${groupData.name}<br>Rank: ${rank}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}`,
                        color: p.finalColor, // Use styling from hook
                        shape: p.finalShape,
                        size: p.finalSize,
                        opacity: p.finalOpacity,
                    });
                });

            } else {
                // === Single Plot Traces ===
                if (!singlePlotData) {
                    console.log(`${logPrefix} plotData Memo] No singlePlotData available.`);
                    return null;
                }

                // Create the single Line Trace
                traces.push({
                    x: singlePlotData.sortedPoints.map(p => p.bmdFifthPercentileTotalGenes ?? null),
                    y: singlePlotData.cumulativeCounts,
                    type: 'scatter', mode: 'lines', name: 'Cumulative Count',
                    line: { color: defaultPlotColors[0], width: 2 }, // Use default color
                    customdata: singlePlotData.sortedPoints.map(p => p.go_id),
                    text: singlePlotData.sortedPoints.map((p, i) => `Rank: ${i + 1}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Count: ${singlePlotData.cumulativeCounts[i]}`),
                    hoverinfo: 'text',
                    hoverlabel: { bgcolor: '#FFF', bordercolor: defaultPlotColors[0] },
                    showlegend: false, // No legend needed for single line plot
                });

                // Prepare Marker Data (show all points with opacity > 0)
                const pointsForMarkers = (styledPointsForPlot || []).filter(p =>
                    p.finalOpacity > 0 && // Original condition: visible
                    p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 &&
                    p.go_id
                );

                pointsForMarkers.forEach(p => {
                    // Find rank in the single sorted list
                    const rank = singlePlotData.goIdToRankMap.get(p.go_id!);
                    if (rank == null) return;
                    // Get y-value from the single cumulative count list
                    const yValue = singlePlotData.cumulativeCounts[rank - 1] ?? null;
                    if (yValue === null) return;

                    // Add data for this marker
                    markerPointsData.push({
                        x: p.bmdFifthPercentileTotalGenes,
                        y: yValue,
                        go_id: p.go_id!,
                        text: `Rank: ${rank}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Source: ${p.bmdResultName}`,
                        color: p.finalColor,
                        shape: p.finalShape,
                        size: p.finalSize,
                        opacity: p.finalOpacity,
                    });
                });
            }

            // Create a single Marker Trace if any marker data was collected
            if (markerPointsData.length > 0) {
                traces.push({
                    x: markerPointsData.map(d => d.x),
                    y: markerPointsData.map(d => d.y),
                    customdata: markerPointsData.map(d => d.go_id),
                    text: markerPointsData.map(d => d.text),
                    type: 'scatter', mode: 'markers',
                    name: 'Selected/Highlighted', // Generic name for markers trace
                    marker: {
                        color: markerPointsData.map(d => d.color),
                        symbol: markerPointsData.map(d => d.shape),
                        size: markerPointsData.map(d => d.size),
                        opacity: markerPointsData.map(d => d.opacity),
                        line: { color: 'black', width: 0.5 },
                    },
                    hoverinfo: 'text',
                    hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' },
                    // Show marker legend only if combined and markers exist to be shown
                    showlegend: isCombinedOverlayPlot && goIdsToShowMarkers.size > 0 && markerPointsData.length > 0,
                    legendgroup: 'markers', // Group all markers under one legend item if shown
                });
            }

            console.log(`${logPrefix} plotData Memo] Generated ${traces.length} traces.`);
            return traces.length > 0 ? traces : null; // Return null if no traces generated

        }, [
            isCombinedOverlayPlot, combinedOverlayData, singlePlotData,
            styledPointsForPlot, logPrefix, highlightMode, highlightGoIdsList,
            selectedAccumGoIdsSet, tableSelectedGoId
        ]);


        // --- Layout Calculation ---
        const plotLayout = useMemo((): Partial<Layout> | null => {
            let minXVal: number | undefined;
            let maxXVal: number | undefined;
            let maxYVal: number | undefined;

            // Determine axis ranges based on the mode
            if (isCombinedOverlayPlot) {
                if (!combinedOverlayData) return null; // Need data to calculate range
                minXVal = combinedOverlayData.overallMinX;
                maxXVal = combinedOverlayData.overallMaxX;
                maxYVal = combinedOverlayData.overallMaxY;
            } else {
                if (!singlePlotData) return null; // Need data to calculate range
                minXVal = singlePlotData.minXValue;
                maxXVal = singlePlotData.maxXValue;
                maxYVal = singlePlotData.maxYValue;
            }

            // Validate calculated ranges
            if (minXVal === undefined || maxXVal === undefined || maxYVal === undefined || !isFinite(minXVal) || !isFinite(maxXVal) || !isFinite(maxYVal)) {
                console.warn(`${logPrefix} Invalid axis range calculated: minX=${minXVal}, maxX=${maxXVal}, maxY=${maxYVal}`);
                return null; // Cannot create layout with invalid range
            }

            // Calculate log scale ranges safely
            const epsilon = 1e-10; // Prevent log(0)
            const logMinX = Math.log10(Math.max(minXVal, epsilon));
            const logMaxX = Math.log10(Math.max(maxXVal, epsilon)); // Ensure maxX is also positive
            const minYValue = 0;
            const maxYValueWithPadding = maxYVal * 1.05; // Add padding to Y axis

            return {
                xaxis: {
                    title: '5th Percentile BMD (Log Scale)', type: 'log',
                    autorange: false, range: [logMinX, logMaxX],
                    showline: true, showticklabels: true, ticks: 'outside',
                },
                yaxis: {
                    title: 'Cumulative Count', autorange: false,
                    range: [minYValue, maxYValueWithPadding],
                    showline: true, showticklabels: true, ticks: 'outside',
                },
                margin: PLOT_MARGINS, // Use margins with space for legend
                hovermode: 'closest',
                showlegend: isCombinedOverlayPlot, // Show legend only for combined overlay
                legend: {
                    traceorder: 'normal', // Keep legend order same as trace order
                    // Optional: Adjust legend position if needed
                    // x: 1.02, y: 1, xanchor: 'left', yanchor: 'top',
                    bgcolor: 'rgba(255,255,255,0.7)', // Semi-transparent background
                    bordercolor: '#CCCCCC',
                    borderwidth: 1
                },
                autosize: true, paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)', dragmode: 'lasso',
                clickmode: 'event+select',
            };
        }, [isCombinedOverlayPlot, combinedOverlayData, singlePlotData, logPrefix]);

        // --- Event Handlers ---
        const handleSelection = useCallback(
            (event: Readonly<PlotSelectionEvent> | undefined) => {
                const selectedGoIds =
                    event?.points
                        ?.map((p) => p.customdata as string)
                        .filter(Boolean) || [];
                console.log(`${logPrefix} Lasso/Box Selection:`, selectedGoIds);
                dispatch(setAccumulationPlotSelection(selectedGoIds));
            },
            [dispatch, logPrefix]
        );

        const handleClick = useCallback(
            (event: Readonly<PlotMouseEvent>) => {
                const clickedGoId = event.points[0]?.customdata as string;
                console.log(`${logPrefix} Clicked GO ID:`, clickedGoId);
                dispatch(setAccumulationPlotSelection(clickedGoId ? [clickedGoId] : []));
            },
            [dispatch, logPrefix]
        );

        const handleDoubleClick = useCallback(() => {
            console.log(`${logPrefix} Double Click - Clearing selection`);
            dispatch(setAccumulationPlotSelection([]));
        }, [dispatch, logPrefix]);

        // --- Plotly Config ---
        const plotConfig: Partial<Config> = useMemo(() => ({
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: [
                'zoom2d', 'pan2d', 'select2d', 'zoomIn2d', 'zoomOut2d',
                'autoScale2d', 'resetScale2d', 'hoverClosestCartesian',
                'hoverCompareCartesian', 'toggleSpikelines',
            ],
            modeBarButtonsToAdd: [
                {
                    name: 'Reset View', icon: Plotly.Icons.home,
                    click: (gd) => {
                        Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true });
                        dispatch(setAccumulationPlotSelection([])); // Also clear selection
                    }
                },
                { name: 'Lasso Select', icon: Plotly.Icons.lasso, click: (gd) => Plotly.relayout(gd, { dragmode: 'lasso' }) },
                { name: 'Box Select', icon: Plotly.Icons.select, click: (gd) => Plotly.relayout(gd, { dragmode: 'select' }) },
                { name: 'Pan', icon: Plotly.Icons.pan, click: (gd) => Plotly.relayout(gd, { dragmode: 'pan' }) },
                { name: 'Zoom', icon: Plotly.Icons.zoom, click: (gd) => Plotly.relayout(gd, { dragmode: 'zoom' }) },
            ],
        }), [dispatch]);


        // --- Render Logic ---
        const spinTip = styledPointsForPlot === null ? <>Processing plot data...</> : undefined;

        // Show spinner if initial data hasn't arrived
        if (styledPointsForPlot === null) {
            return (<div className={sharedStyles.plotContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}> <Spin tip={spinTip} /> </div>);
        }

        // Show message if data processing failed or resulted in no plottable data/layout
        // Check plotData and plotLayout specifically, as data processing might yield null
        if (!plotData || !plotLayout) {
            console.warn(`${logPrefix} Render condition failed: plotData=${!!plotData}, plotLayout=${!!plotLayout}`);
            return (<div className={sharedStyles.plotContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed lightgrey', fontSize: '0.9em', color: '#888', padding: '10px', textAlign: 'center' }}> <span>No valid data points found or processed for accumulation plot.</span> </div>);
        }

        // Render the plot
        return (
            <div className={sharedStyles.plotContainer}>
                <Plot
                    divId={`${analysisName}-accumulation-${bmdResultRef}`}
                    data={plotData}
                    layout={plotLayout}
                    config={plotConfig}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    onClick={handleClick}
                    onSelected={handleSelection}
                    onDoubleClick={handleDoubleClick}
                />
            </div>
        );
    }
);

export default AccumulationPlot;
