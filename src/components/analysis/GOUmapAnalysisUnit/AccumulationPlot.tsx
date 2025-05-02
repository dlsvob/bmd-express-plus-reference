// src/components/analysis/GOUmapAnalysisUnit/AccumulationPlot.tsx

import React, { useMemo, useCallback } from 'react';
import type {
    Data,
    Layout,
    PlotMouseEvent,
    PlotSelectionEvent,
    Config,
    Datum,
} from 'plotly.js';
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
// --- Import Font Constants ---
import {
    FONT_SIZE_MULTIPLIER,
    BASE_PLOT_AXIS_TITLE_FONT_SIZE_PX,
    BASE_PLOT_AXIS_TICK_FONT_SIZE_PX,
    BASE_PLOT_HOVER_FONT_SIZE_PX,
    BASE_PLOT_LEGEND_FONT_SIZE_PX,
    BASE_PLOT_AXIS_TITLE_STANDOFF_PX,
    // BASE_PLOT_TITLE_FONT_SIZE_PX // Add if using main title
} from '../../../config/analysisConstants';
// -----------------------------

const defaultPlotColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
];

export interface AccumulationPlotProps {
    analysisName: string;
    styledPointsForPlot: UmapAnalysisDataPoint[] | null;
    bmdResultRef: number;
    width?: number | string | null;
    height?: number | string | null;
    experimentNameMap?: Map<number, string>;
}

interface ProcessedGroupData {
    ref: number; name: string; sortedPoints: UmapAnalysisDataPoint[];
    cumulativeCounts: number[]; goIdToRankMap: Map<string, number>;
    minX: number; maxX: number; maxY: number; color: string;
}

interface SinglePlotProcessedData {
    sortedPoints: UmapAnalysisDataPoint[]; cumulativeCounts: number[];
    goIdToRankMap: Map<string, number>; minXValue: number; maxXValue: number;
    minYValue: number; maxYValue: number; totalPoints: number;
}

const PLOT_MARGINS = { l: 60, r: 20, t: 40, b: 50 };
const DEFAULT_PLOT_HEIGHT = 300;

const AccumulationPlot: React.FC<AccumulationPlotProps> = React.memo(
    function AccumulationPlot({
        analysisName, styledPointsForPlot, bmdResultRef, experimentNameMap,
        width = '100%', height = DEFAULT_PLOT_HEIGHT,
    }) {
        const dispatch = useAppDispatch();
        const logPrefix = `[AccumulationPlot ${analysisName}]`;
        const highlightMode = useAppSelector(selectHighlightMode);
        const highlightGoIdsList = useAppSelector(selectGoIdFilterList);
        const selectedAccumGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
        const tableSelectedGoId = useAppSelector(selectTableSelectedGoId);
        const isCombinedOverlayPlot = bmdResultRef === 0 && analysisName === 'Combined';

        console.log(`${logPrefix} Render. Combined: ${isCombinedOverlayPlot}. Points: ${styledPointsForPlot?.length ?? 0}. Width: ${width}, Height: ${height}`);

        // --- Memoized Data Processing ---
        const combinedOverlayData = useMemo(() => {
            if (!isCombinedOverlayPlot || !styledPointsForPlot || !experimentNameMap) return null;
            const validPoints = (styledPointsForPlot || []).filter(p => p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 && p.go_id);
            if (validPoints.length === 0) return null;
            const groups = new Map<number, UmapAnalysisDataPoint[]>();
            validPoints.forEach((p) => { if (p.bmdResultRef != null) { if (!groups.has(p.bmdResultRef)) groups.set(p.bmdResultRef, []); groups.get(p.bmdResultRef)!.push(p); } });
            if (groups.size === 0) return null;
            const processedGroups = new Map<number, ProcessedGroupData>();
            let overallMinX = Infinity, overallMaxX = -Infinity, overallMaxY = 0, colorIndex = 0;
            for (const [ref, points] of groups.entries()) {
                const sortedPoints = [...points].sort((a, b) => (a.bmdFifthPercentileTotalGenes ?? Infinity) - (b.bmdFifthPercentileTotalGenes ?? Infinity));
                const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
                const goIdToRankMap = new Map<string, number>();
                sortedPoints.forEach((p, index) => { if (p.go_id) goIdToRankMap.set(p.go_id, index + 1); });
                const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!; const maxX = sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!; const maxY = cumulativeCounts[cumulativeCounts.length - 1];
                overallMinX = Math.min(overallMinX, minX); overallMaxX = Math.max(overallMaxX, maxX); overallMaxY = Math.max(overallMaxY, maxY);
                processedGroups.set(ref, { ref, name: experimentNameMap.get(ref) || `Analysis ${ref}`, sortedPoints, cumulativeCounts, goIdToRankMap, minX, maxX, maxY, color: defaultPlotColors[colorIndex % defaultPlotColors.length], }); colorIndex++;
            }
            if (processedGroups.size === 0) return null;
            return { processedGroups, overallMinX, overallMaxX, overallMaxY };
        }, [isCombinedOverlayPlot, styledPointsForPlot, experimentNameMap]);

        const singlePlotData = useMemo((): SinglePlotProcessedData | null => {
            if (isCombinedOverlayPlot || !styledPointsForPlot) return null;
            const validPoints = styledPointsForPlot.filter(p => p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 && p.go_id);
            if (validPoints.length === 0) return null;
            const sortedPoints = [...validPoints].sort((a, b) => (a.bmdFifthPercentileTotalGenes ?? Infinity) - (b.bmdFifthPercentileTotalGenes ?? Infinity));
            const cumulativeCounts = sortedPoints.map((_, index) => index + 1);
            const goIdToRankMap = new Map<string, number>();
            sortedPoints.forEach((p, index) => { if (p.go_id) goIdToRankMap.set(p.go_id, index + 1); });
            const minX = sortedPoints[0].bmdFifthPercentileTotalGenes!; const maxX = sortedPoints[sortedPoints.length - 1].bmdFifthPercentileTotalGenes!; const maxY = cumulativeCounts[cumulativeCounts.length - 1];
            return { sortedPoints, cumulativeCounts, goIdToRankMap, minXValue: minX, maxXValue: maxX, minYValue: 0, maxYValue: maxY, totalPoints: sortedPoints.length, };
        }, [isCombinedOverlayPlot, styledPointsForPlot]);

        // --- Generate Plotly Traces ---
        const plotData = useMemo((): Data[] | null => {
            const goIdsToShowMarkers = new Set<string>([...(highlightMode !== 'NONE' ? highlightGoIdsList : []), ...selectedAccumGoIdsSet, ...(tableSelectedGoId ? [tableSelectedGoId] : [])]);
            let traces: Data[] = []; let markerPointsData: { x: number | null; y: number | null; go_id: string; text: string; color: string; shape: string; size: number; opacity: number; }[] = [];
            if (isCombinedOverlayPlot) {
                if (!combinedOverlayData) return null; for (const [, groupData] of combinedOverlayData.processedGroups.entries()) { traces.push({ x: groupData.sortedPoints.map(p => p.bmdFifthPercentileTotalGenes ?? null), y: groupData.cumulativeCounts, type: 'scattergl', mode: 'lines', name: groupData.name, line: { color: groupData.color, width: 2 }, customdata: groupData.sortedPoints.map(p => p.go_id) as Datum[], hoverinfo: 'name+x+y', legendgroup: groupData.name, }); } const pointsForMarkers = (styledPointsForPlot || []).filter(p => p.go_id && goIdsToShowMarkers.has(p.go_id) && p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 && p.bmdResultRef != null); pointsForMarkers.forEach(p => { const groupData = combinedOverlayData.processedGroups.get(p.bmdResultRef!); if (!groupData || !p.go_id) return; const rank = groupData.goIdToRankMap.get(p.go_id); if (rank == null) return; const yValue = groupData.cumulativeCounts[rank - 1] ?? null; if (yValue === null) return; markerPointsData.push({ x: p.bmdFifthPercentileTotalGenes, y: yValue, go_id: p.go_id, text: `Exp: ${groupData.name}<br>Rank: ${rank}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}`, color: p.finalColor, shape: p.finalShape, size: p.finalSize, opacity: p.finalOpacity, }); });
            } else {
                if (!singlePlotData) return null; traces.push({ x: singlePlotData.sortedPoints.map(p => p.bmdFifthPercentileTotalGenes ?? null), y: singlePlotData.cumulativeCounts, type: 'scattergl', mode: 'lines', name: 'Cumulative Count', line: { color: defaultPlotColors[0], width: 2 }, customdata: singlePlotData.sortedPoints.map(p => p.go_id) as Datum[], text: singlePlotData.sortedPoints.map((p, i) => `Rank: ${i + 1}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Count: ${singlePlotData.cumulativeCounts[i]}`), hoverinfo: 'text', hoverlabel: { bgcolor: '#FFF', bordercolor: defaultPlotColors[0] }, showlegend: false, }); const pointsForMarkers = (styledPointsForPlot || []).filter(p => p.finalOpacity > 0 && p.bmdFifthPercentileTotalGenes != null && !isNaN(p.bmdFifthPercentileTotalGenes) && isFinite(p.bmdFifthPercentileTotalGenes) && p.bmdFifthPercentileTotalGenes > 0 && p.go_id); pointsForMarkers.forEach(p => { if (!p.go_id || !singlePlotData.goIdToRankMap) return; const rank = singlePlotData.goIdToRankMap.get(p.go_id); if (rank == null) return; const yValue = singlePlotData.cumulativeCounts[rank - 1] ?? null; if (yValue === null) return; markerPointsData.push({ x: p.bmdFifthPercentileTotalGenes, y: yValue, go_id: p.go_id, text: `Rank: ${rank}<br>GO ID: ${p.go_id}<br>Term: ${p.go_term}<br>5th Perc. BMD: ${p.bmdFifthPercentileTotalGenes?.toExponential(2)}<br>Source: ${p.bmdResultName}`, color: p.finalColor, shape: p.finalShape, size: p.finalSize, opacity: p.finalOpacity, }); });
            } if (markerPointsData.length > 0) { traces.push({ x: markerPointsData.map(d => d.x), y: markerPointsData.map(d => d.y), customdata: markerPointsData.map(d => d.go_id) as Datum[], text: markerPointsData.map(d => d.text), type: 'scattergl', mode: 'markers', name: 'Selected/Highlighted', marker: { color: markerPointsData.map(d => d.color), symbol: markerPointsData.map(d => d.shape), size: markerPointsData.map(d => d.size), opacity: markerPointsData.map(d => d.opacity), line: { color: 'black', width: 0.5 }, }, hoverinfo: 'text', hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' }, showlegend: isCombinedOverlayPlot && goIdsToShowMarkers.size > 0 && markerPointsData.length > 0, legendgroup: 'markers', }); }
            return traces.length > 0 ? traces : null;
        }, [isCombinedOverlayPlot, combinedOverlayData, singlePlotData, styledPointsForPlot, logPrefix, highlightMode, highlightGoIdsList, selectedAccumGoIdsSet, tableSelectedGoId]);


        // --- Layout Calculation (Apply Multiplier) ---
        const plotLayout = useMemo((): Partial<Layout> | null => {
            let minXVal: number | undefined, maxXVal: number | undefined, maxYVal: number | undefined;
            if (isCombinedOverlayPlot) { if (!combinedOverlayData) return null; minXVal = combinedOverlayData.overallMinX; maxXVal = combinedOverlayData.overallMaxX; maxYVal = combinedOverlayData.overallMaxY; }
            else { if (!singlePlotData) return null; minXVal = singlePlotData.minXValue; maxXVal = singlePlotData.maxXValue; maxYVal = singlePlotData.maxYValue; }
            if (minXVal === undefined || maxXVal === undefined || maxYVal === undefined || !isFinite(minXVal) || !isFinite(maxXVal) || !isFinite(maxYVal) || minXVal <= 0) return null;

            const xPaddingFactor = 0.03, yPaddingFactor = 0.05;
            const logMinX_data = Math.log10(minXVal); const logMaxX_data = Math.log10(maxXVal); const logRangeX = logMaxX_data - logMinX_data; const logPaddingX = logRangeX > 1e-9 ? logRangeX * xPaddingFactor : xPaddingFactor; const finalLogMinX = logMinX_data - logPaddingX; const finalLogMaxX = logMaxX_data + logPaddingX;
            const minY_final = 0; const maxY_data = maxYVal; const rangeY = maxY_data - minY_final; const paddingY = rangeY > 0 ? rangeY * yPaddingFactor : 1; const finalMaxY = maxY_data + paddingY;

            // Apply Multiplier to font sizes
            const axisTitleFontSize = BASE_PLOT_AXIS_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
            const axisTickFontSize = BASE_PLOT_AXIS_TICK_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
            const hoverLabelFontSize = BASE_PLOT_HOVER_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
            const legendFontSize = BASE_PLOT_LEGEND_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER;
            const axisTitleStandoff = BASE_PLOT_AXIS_TITLE_STANDOFF_PX * FONT_SIZE_MULTIPLIER;

            return {
                xaxis: {
                    title: {
                            text: '5th Percentile BMD (Log Scale)',
                            font: { size: axisTitleFontSize },
                            standoff: axisTitleStandoff // Apply scaled standoff
                        },
                    tickfont: { size: axisTickFontSize },
                    type: 'log', autorange: false, range: [finalLogMinX, finalLogMaxX],
                    showline: true, showticklabels: true, ticks: 'outside',
                },
                yaxis: {
                    title: {
                        text: 'Cumulative Count',
                        font: { size: axisTitleFontSize },
                        standoff: axisTitleStandoff // Apply scaled standoff
                    },
                    tickfont: { size: axisTickFontSize },
                    autorange: false, range: [minY_final, finalMaxY],
                    showline: true, showticklabels: true, ticks: 'outside',
                },
                margin: PLOT_MARGINS,
                hovermode: 'closest',
                hoverlabel: { font: { size: hoverLabelFontSize } },
                showlegend: isCombinedOverlayPlot,
                legend: { font: { size: legendFontSize }, bgcolor: 'rgba(255,255,255,0.7)', bordercolor: '#CCCCCC', borderwidth: 1 },
                autosize: true,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                dragmode: 'lasso',
                clickmode: 'event+select',
            };
        }, [isCombinedOverlayPlot, combinedOverlayData, singlePlotData]); // FONT_SIZE_MULTIPLIER is constant

        // --- Event Handlers ---
        const handleSelection = useCallback((event: Readonly<PlotSelectionEvent> | undefined) => { const ids = event?.points?.map(p => p.customdata as string).filter(Boolean) || []; dispatch(setAccumulationPlotSelection(ids)); }, [dispatch]);
        const handleClick = useCallback((event: Readonly<PlotMouseEvent>) => { const id = event.points[0]?.customdata as string; dispatch(setAccumulationPlotSelection(id ? [id] : [])); }, [dispatch]);
        const handleDoubleClick = useCallback(() => { dispatch(setAccumulationPlotSelection([])); }, [dispatch]);

        // --- Plotly Config ---
        const plotConfig: Partial<Config> = useMemo(() => ({ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines'], modeBarButtonsToAdd: [{ name: 'Reset View', icon: Plotly.Icons.home, click: (gd) => { Plotly.relayout(gd, { 'xaxis.autorange': true, 'yaxis.autorange': true }); dispatch(setAccumulationPlotSelection([])); } }, { name: 'Lasso Select', icon: Plotly.Icons.lasso, click: (gd) => Plotly.relayout(gd, { dragmode: 'lasso' }) }, { name: 'Box Select', icon: Plotly.Icons.select, click: (gd) => Plotly.relayout(gd, { dragmode: 'select' }) }, { name: 'Pan', icon: Plotly.Icons.pan, click: (gd) => Plotly.relayout(gd, { dragmode: 'pan' }) }, { name: 'Zoom', icon: Plotly.Icons.zoom, click: (gd) => Plotly.relayout(gd, { dragmode: 'zoom' }) },] }), [dispatch]);

        // --- Render Logic ---
        const spinTip = styledPointsForPlot === null ? <>Processing plot data...</> : undefined;
        if (styledPointsForPlot === null) { return <div className={sharedStyles.plotContainer} style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin tip={spinTip} /></div>; }
        if (!plotData || !plotLayout) { return <div className={sharedStyles.plotContainer} style={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed lightgrey', fontSize: '0.9em', color: '#888', padding: '10px', textAlign: 'center' }}><span>No valid data for accumulation plot.</span></div>; }

        return (
            <div className={sharedStyles.plotContainer} style={{ width: width ?? undefined, height: height ?? undefined }} >
                <Plot
                    divId={`${analysisName}-accumulation-${bmdResultRef}`}
                    data={plotData} layout={plotLayout} config={plotConfig}
                    style={{ width: '100%', height: '100%' }} useResizeHandler={true}
                    onClick={handleClick} onSelected={handleSelection} onDoubleClick={handleDoubleClick}
                />
            </div>
        );
    }
);

export default AccumulationPlot;