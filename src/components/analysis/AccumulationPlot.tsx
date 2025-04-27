// src/components/AccumulationPlot.tsx
import React, { useMemo, useCallback } from 'react';
import type { Data, Layout, PlotMouseEvent, PlotSelectionEvent } from 'plotly.js';
import { Spin } from 'antd';
// --- Import the primary data type containing final styles ---
import { UmapAnalysisDataValue } from '../../models/applicationModel'; // Adjust path if needed
import { ReferenceUmapItem } from '../../data/referenceUmapData'; // Adjust path if needed for tooltips
// --- Component for Plotly ---
import { AccumulationPlotAnalysis } from '../AccumulationPlotAnalysis'; // Adjust path
// --- Redux imports ---
import { useAppDispatch } from '../../store/hooks'; // Adjust path
import { setAccumulationPlotSelection } from '../../store/slices/analysisUISlice'; // Adjust path

// Props interface - Updated
export interface AccumulationPlotProps {
    analysisName: string;
    // Instead of raw items, accept pre-styled, rank-filtered points for this analysis
    styledPointsForPlot: UmapAnalysisDataValue[] | null;
    // --- Keep props still needed ---
    goIdFilterList: string[]; // Still needed for highlighting GO ID matches
    referenceDataMap: Map<string, ReferenceUmapItem> | null; // Potentially needed for tooltips/data
    bmdResultRef: number; // Identifier for this specific plot
    // --- We might still pass these for informational purposes (e.g., tooltips) or if needed by child components ---
    // --- but they are NOT used for marker styling calculation within this component anymore ---
    colorByOption: string;
    shapeByOption: string;
    sizeByOption: string;
    bmdRefToExperimentNameMap: Map<number, string>;
}


// Constants
const PLOT_HEIGHT = 400;
const LINE_COLOR = '#1f77b4'; // Color for the cumulative line itself

const AccumulationPlot: React.FC<AccumulationPlotProps> = React.memo(
    function AccumulationPlot({
        analysisName,
        styledPointsForPlot, // Use the new prop
        goIdFilterList,
        referenceDataMap,
        bmdResultRef,
        colorByOption, // Keep if needed for tooltips/other logic
        shapeByOption,
        sizeByOption,
        bmdRefToExperimentNameMap,
    }) {

        const dispatch = useAppDispatch();

        console.log(`[AccumulationPlot ${analysisName}] Rendering. Received ${styledPointsForPlot?.length ?? 0} styled points.`);

        // --- Calculate Cumulative Line Data ---
        // This part still needs to process the points to get cumulative counts vs BMD
        const linePlotData = useMemo(() => {
            console.log(`[AccumulationPlot ${analysisName}] Calculating line data...`);
            if (!styledPointsForPlot || styledPointsForPlot.length === 0) {
                console.log(`[AccumulationPlot ${analysisName}] No styled points to process for line.`);
                return null;
            }

            try {
                // Filter out points without valid BMD values for the line plot itself
                const validPoints = styledPointsForPlot.filter(p =>
                    p.bmdFifthPercentileTotalGenes != null &&
                    !isNaN(p.bmdFifthPercentileTotalGenes) &&
                    isFinite(p.bmdFifthPercentileTotalGenes) &&
                    p.bmdFifthPercentileTotalGenes > 0
                );

                if (validPoints.length === 0) {
                    console.log(`[AccumulationPlot ${analysisName}] No points with valid BMD values found.`);
                    return null;
                }

                // Sort points by BMD value (rankValue in BaseOverlayPlotPoint, mapped to bmdFifthPercentileTotalGenes)
                const sortedPoints = [...validPoints].sort((a, b) =>
                    (a.bmdFifthPercentileTotalGenes ?? Infinity) - (b.bmdFifthPercentileTotalGenes ?? Infinity)
                );

                const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
                const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!;
                const maxX = sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!;
                const maxY = cumulativeCounts[cumulativeCounts.length - 1];

                console.log(`[AccumulationPlot ${analysisName}] Line data calculated. Points: ${sortedPoints.length}, MinX: ${minX}, MaxX: ${maxX}, MaxY: ${maxY}`);

                return {
                    points: sortedPoints, // Sorted points with valid BMD
                    cumulativeCounts,
                    minXValue: minX,
                    maxXValue: maxX,
                    minYValue: 0,
                    maxYValue: maxY,
                    totalPoints: sortedPoints.length,
                };
            } catch (error) {
                console.error(`[AccumulationPlot ${analysisName}] Error processing line data:`, error);
                return null;
            }
        }, [styledPointsForPlot, analysisName]); // Depends only on the styled points prop


        // --- Generate Plotly Traces ---
        const plotData = useMemo((): Data[] | null => {
            console.log(`[AccumulationPlot ${analysisName} plotData Memo] Recalculating traces...`);

            if (!linePlotData) {
                console.log(`[AccumulationPlot ${analysisName} plotData Memo] Exiting early: no linePlotData.`);
                return null;
            }

            const lineTrace: Data = {
                x: linePlotData.points.map(p => p.bmdFifthPercentileTotalGenes),
                y: linePlotData.cumulativeCounts,
                type: 'scattergl',
                mode: 'lines',
                name: 'Cumulative Count',
                line: { color: LINE_COLOR, width: 2 },
                customdata: linePlotData.points.map(p => p.go_id), // Keep GO ID for click events
                text: linePlotData.points.map((p, i) =>
                    `Rank: ${i + 1}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Count: ${linePlotData.cumulativeCounts[i]}`
                ),
                hoverinfo: 'text',
                hoverlabel: { bgcolor: '#FFF', bordercolor: LINE_COLOR },
                showlegend: false,
            };

            // --- Marker Trace Generation using pre-calculated styles ---
            // Use the original 'styledPointsForPlot' which includes points filtered by rank upstream but potentially highlighted by GO ID
            const pointsForMarkers = (styledPointsForPlot || []).filter(p =>
                p.finalOpacity > 0 && // Must be visible (not hidden by legend or highlight mode)
                p.bmdFifthPercentileTotalGenes != null && // Must have a valid BMD for plotting
                !isNaN(p.bmdFifthPercentileTotalGenes) &&
                isFinite(p.bmdFifthPercentileTotalGenes) &&
                p.bmdFifthPercentileTotalGenes > 0
            );

            // Create a map for efficient lookup of rank within the line plot context
            const bmdToRankMap = new Map<string, number>();
            linePlotData.points.forEach((p, index) => {
                bmdToRankMap.set(p.go_id, index + 1);
            });

            console.log(`[AccumulationPlot ${analysisName} plotData Memo] Found ${pointsForMarkers.length} potential marker points (visible & valid BMD).`);

            const markerTrace: Data | null = pointsForMarkers.length > 0 ? {
                x: pointsForMarkers.map(p => p.bmdFifthPercentileTotalGenes),
                // Use the cumulative count corresponding to the rank of this point in the *line plot*
                y: pointsForMarkers.map(p => linePlotData.cumulativeCounts[bmdToRankMap.get(p.go_id)! - 1] ?? null),
                // Custom data for interactions
                customdata: pointsForMarkers.map(p => p.go_id),
                text: pointsForMarkers.map(p =>
                    `Rank: ${bmdToRankMap.get(p.go_id) ?? 'N/A'}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Source: ${p.bmdResultName}`
                ),
                type: 'scattergl',
                mode: 'markers',
                name: 'Selected/Highlighted Points',
                marker: {
                    // Use the pre-calculated styles directly from UmapAnalysisDataValue
                    color: pointsForMarkers.map(p => p.finalColor),
                    symbol: pointsForMarkers.map(p => p.finalShape),
                    size: pointsForMarkers.map(p => p.finalSize),
                    opacity: pointsForMarkers.map(p => p.finalOpacity),
                    line: { color: 'black', width: 0.5 }
                },
                hoverinfo: 'text',
                hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' }, // Generic border color
                showlegend: false,
            } : null;

            console.log(`[AccumulationPlot ${analysisName} plotData Memo] markerTrace created?`, !!markerTrace);
            return markerTrace ? [lineTrace, markerTrace] : [lineTrace];

        }, [ // Dependencies updated
            linePlotData, styledPointsForPlot, goIdFilterList, analysisName, bmdRefToExperimentNameMap, bmdResultRef // Added bmdResultRef back if needed for map lookups
        ]);

        // Layout calculation remains the same
        const plotLayout = useMemo((): Partial<Layout> | null => {
            if (!linePlotData) return null;
            const epsilon = 1e-10;
            const logMinX = Math.log10(Math.max(linePlotData.minXValue, epsilon));
            const logMaxX = Math.log10(linePlotData.maxXValue);
            const minYValue = 0;
            const maxYValueWithPadding = linePlotData.maxYValue * 1.05;

            return {
                xaxis: { title: '5th Percentile BMD (Log Scale)', type: 'log', autorange: false, range: [logMinX, logMaxX], },
                yaxis: { title: 'Cumulative Count', autorange: false, range: [minYValue, maxYValueWithPadding], },
                height: PLOT_HEIGHT, margin: { l: 60, r: 20, t: 20, b: 50 }, hovermode: 'closest', showlegend: false, autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', dragmode: 'lasso', clickmode: 'event+select',
            };
        }, [linePlotData]);

        // Event Handlers
        const handleSelection = useCallback((event: Readonly<PlotSelectionEvent> | undefined) => {
            const selectedGoIds = event?.points?.map(p => p.customdata as string).filter(Boolean) || [];
            console.log(`[AccumulationPlot ${analysisName}] handleSelection - Dispatching selection:`, selectedGoIds);
            dispatch(setAccumulationPlotSelection(selectedGoIds));
        }, [dispatch, analysisName]);

        const handleClick = useCallback((event: Readonly<PlotMouseEvent>) => {
            const clickedGoId = event.points[0]?.customdata as string;
            if (clickedGoId) {
                console.log(`[AccumulationPlot ${analysisName}] handleClick - Dispatching single selection:`, [clickedGoId]);
                dispatch(setAccumulationPlotSelection([clickedGoId]));
            } else {
                console.log(`[AccumulationPlot ${analysisName}] handleClick - No GO ID found, dispatching empty selection.`);
                dispatch(setAccumulationPlotSelection([]));
            }
        }, [dispatch, analysisName]);

        const handleDoubleClick = useCallback(() => {
            console.log(`[AccumulationPlot ${analysisName}] handleDoubleClick - Dispatching empty selection.`);
            dispatch(setAccumulationPlotSelection([]));
        }, [dispatch, analysisName]);

        // Render Logic
        console.log(`[AccumulationPlot ${analysisName}] FINAL check before AccumulationPlotAnalysis. plotData is null?`, plotData === null, 'plotLayout is null?', plotLayout === null);
        if (plotData) { console.log(`[AccumulationPlot ${analysisName}] FINAL plotData length:`, plotData.length); }

        // Show spinner if styledPointsForPlot is still null (indicating parent is processing)
        if (styledPointsForPlot === null) {
            return <Spin tip="Processing plot data..." />;
        }
        // Show message if processing completed but yielded no valid data
        if (!plotData || !plotLayout) {
            return (<div style={{ height: `${PLOT_HEIGHT}px`, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid lightgrey' }}> <span>No valid data for plot after filtering.</span> </div>);
        }

        // Render the plot
        return (
            <div style={{ height: `${PLOT_HEIGHT}px`, width: '100%' }}>
                <AccumulationPlotAnalysis
                    plotId={`${analysisName}-accumulation`}
                    data={plotData}
                    layoutProp={plotLayout}
                    onClick={handleClick}
                    onSelected={handleSelection}
                    onDeselect={() => handleSelection(undefined)} // Dispatch empty on deselect
                    onDoubleClick={handleDoubleClick}
                />
            </div>
        );
    }
);

export default AccumulationPlot;
