// src/components/analysis/GOUmapAnalysisUnit.tsx
// This version correctly integrates the functional AccumulationPlot

import React, { useMemo, useEffect, useCallback } from 'react';
import { Row, Col, Spin, Alert, Space } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
    usePreparedPlotData,
    PreparedPlotHookData,
} from '../../hooks/usePreparedPlotData'; // Adjust path if needed
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
import {
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabels,
    selectHiddenShapeLabels,
    selectHiddenSizeLabels,
    selectHiddenColorLabelsSet,
    selectHiddenShapeLabelsSet,
    selectHiddenSizeLabelsSet,
    selectGoIdFilterList,
    selectHighlightMode,
    selectAccumulationPlotSelectedGoIdsSet,
    selectCommittedSlidingWindowValue,
    setCommittedRankSliderValue,
    setColorBy,
    setShapeBy,
    setSizeBy,
    toggleColorLabelVisibility,
    toggleShapeLabelVisibility,
    toggleSizeLabelVisibility,
    // --- Import actions needed by GoIdFilterUI (if implemented later) ---
    // setGoIdInputString,
    // setHighlightMode as setHighlightModeAction, // Alias if needed
} from '../../store/slices/analysisUISlice'; // Adjust path if needed
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { BMDResult } from '../../models/BMDxExported'; // Keep BMDResult type
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';

// --- Import Placeholders (Keep only needed ones) ---
import GoIdFilterUI from './placeholders/GoIdFilterUI'; // Keep placeholder for now
import AnalysisDataTable from './placeholders/AnalysisDataTable'; // Keep placeholder for now
// --- Import the REAL Components ---
import CustomLegends from './CustomLegends'; // Adjusted path
import StylingSelectors from '../StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../SlidingWindowFilter'; // Adjusted path
// --- Import the FUNCTIONAL AccumulationPlot ---
import AccumulationPlot from './AccumulationPlot'; // Use the functional component
// ---------------------------------------------
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../config/analysisConstants'; // Adjust path if needed
// --- Import the map type needed ---
import { UmapAnalysisDataPoint } from '../../models/applicationModel'; // Adjusted path

// --- Border Colors & Helper (Keep as is) ---
const BORDER_COLORS = {
    level1: 'rgba(255, 0, 0, 0.3)',
    level2: 'rgba(0, 0, 255, 0.3)',
    level3: 'rgba(0, 128, 0, 0.3)',
    level4: 'rgba(255, 165, 0, 0.3)',
    level5: 'rgba(128, 0, 128, 0.3)',
    level6: 'rgba(255, 192, 203, 0.5)',
    level7: 'rgba(0, 255, 255, 0.4)',
};
const borderStyle = (color: string, level: number = 1) => ({
    // border: `${level}px solid ${color}`, // Keep commented out unless debugging layout
    // padding: `${5 - level}px`,
    // margin: '1px'
});
// ------------------------------------------

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs); // These are strings
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    const hiddenColorLabelsArray = useAppSelector(selectHiddenColorLabels);
    const hiddenShapeLabelsArray = useAppSelector(selectHiddenShapeLabels);
    const hiddenSizeLabelsArray = useAppSelector(selectHiddenSizeLabels);
    const hiddenColorLabelsSet = useAppSelector(selectHiddenColorLabelsSet);
    const hiddenShapeLabelsSet = useAppSelector(selectHiddenShapeLabelsSet);
    const hiddenSizeLabelsSet = useAppSelector(selectHiddenSizeLabelsSet);
    const goIdFilterList = useAppSelector(selectGoIdFilterList);
    const highlightMode = useAppSelector(selectHighlightMode);
    const selectedGoIdsSet = useAppSelector(
        selectAccumulationPlotSelectedGoIdsSet
    );
    const committedRankValue = useAppSelector(selectCommittedSlidingWindowValue);
    const referenceData = useAppSelector(selectReferenceData);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);

    // --- Data Fetching ---
    const {
        data: rawData,
        isLoading: isLoadingRaw,
        error: rawError,
        isSuccess: rawSuccess,
    } = useGetRawAnalysisDataQuery(
        { projectName, selectedBmdResultRefs },
        {
            skip:
                !projectName ||
                !selectedBmdResultRefs ||
                selectedBmdResultRefs.length === 0,
        }
    );

    const isLoading = isLoadingRaw;
    const queryError = rawError;
    const hasSelection = selectedBmdResultRefs && selectedBmdResultRefs.length > 0;

    // === Memoize Maps from Raw Data ===
    // This map is needed for AccumulationPlot tooltips/names
    const { bmdResultMap, bmdRefToExperimentNameMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
        bmdRefToExperimentNameMap: Map<number, string>;
    }>(() => {
        const tempBmdResultMap = new Map<number, BMDResult>();
        const tempBmdRefToNameMap = new Map<number, string>();
        if (rawSuccess && rawData) {
            rawData.rawBmdResults?.forEach((r) => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']); // Ensure numeric key for map
                    if (!isNaN(numericRef)) {
                        tempBmdResultMap.set(numericRef, r);
                        tempBmdRefToNameMap.set(
                            numericRef,
                            r.name || `BMD Result ${numericRef}`
                        );
                    }
                }
            });
        }
        return {
            bmdResultMap: tempBmdResultMap,
            bmdRefToExperimentNameMap: tempBmdRefToNameMap,
        };
    }, [rawSuccess, rawData]);

    // === Prepare Plot Data (Includes ranks, styling, filtering) ===
    const {
        analysisPoints, // Filtered points for main UMAP plot
        allStyledPoints, // All points after styling (used for legends & filtering for AccumulationPlots)
        colorItems,
        shapeItems,
        sizeItems,
        minRank,
        maxRank,
    }: PreparedPlotHookData = usePreparedPlotData({
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        referenceDataMap: referenceDataMap,
        referenceData: referenceData,
        colorByOption,
        shapeByOption,
        sizeByOption,
        hiddenColorLabels: hiddenColorLabelsSet,
        hiddenShapeLabels: hiddenShapeLabelsSet,
        hiddenSizeLabels: hiddenSizeLabelsSet,
        goIdFilterList,
        highlightMode,
        selectedGoIdsSet,
        committedRankSliderValue: committedRankValue,
    }) as PreparedPlotHookData;

    // --- Define Callbacks (Keep as is) ---
    const handleToggleColorVisibility = useCallback(
        (label: string) => {
            dispatch(toggleColorLabelVisibility(label));
        },
        [dispatch]
    );
    const handleToggleShapeVisibility = useCallback(
        (label: string) => {
            dispatch(toggleShapeLabelVisibility(label));
        },
        [dispatch]
    );
    const handleToggleSizeVisibility = useCallback(
        (label: string) => {
            dispatch(toggleSizeLabelVisibility(label));
        },
        [dispatch]
    );
    const handleColorByChange = useCallback(
        (value: string) => {
            dispatch(setColorBy(value));
        },
        [dispatch]
    );
    const handleShapeByChange = useCallback(
        (value: string) => {
            dispatch(setShapeBy(value));
        },
        [dispatch]
    );
    const handleSizeByChange = useCallback(
        (value: string) => {
            dispatch(setSizeBy(value));
        },
        [dispatch]
    );
    const handleRankChange = useCallback(
        (value: [number, number]) => {
            dispatch(setCommittedRankSliderValue(value));
        },
        [dispatch]
    );
    // --- Add callbacks for GoIdFilterUI when implemented ---
    // const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { dispatch(setGoIdInputString(e.target.value)); }, [dispatch]);
    // const handleHighlightModeChange = useCallback((e: RadioChangeEvent) => { dispatch(setHighlightModeAction(e.target.value as HighlightMode)); }, [dispatch]);

    // === Render Logic (Checks - Keep as is) ===
    if (!projectName) {
        return <Alert message="No Project Selected" type="info" showIcon />;
    }
    if (isLoading) {
        return (
            <Spin tip="Loading analysis data..." size="large">
                <div style={{ minHeight: '200px' }} />
            </Spin>
        );
    }
    if (queryError) {
        return (
            <Alert
                message="Error Loading Data"
                description={String(queryError)}
                type="error"
                showIcon
            />
        );
    }
    if (!hasSelection) {
        return (
            <Alert
                message="No Analysis Selected"
                description="Please select one or more analysis results from the list."
                type="info"
                showIcon
            />
        );
    }
    if (
        rawSuccess &&
        (bmdResultMap.size === 0 ||
            !rawData?.rawCategoryAnalysisItems ||
            rawData.rawCategoryAnalysisItems.length === 0)
    ) {
        return (
            <Alert
                message="No Data Found"
                description="No category analysis data found for the selected BMD results in this project."
                type="warning"
                showIcon
            />
        );
    }

    // --- Render Layout ---
    return (
        <div style={borderStyle(BORDER_COLORS.level1)}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Filters Row */}
                <div style={borderStyle(BORDER_COLORS.level2)}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            {/* --- TODO: Replace with functional GoIdFilterUI --- */}
                            <GoIdFilterUI />
                        </Col>
                        <Col span={24}>
                            <SlidingWindowFilter
                                min={minRank}
                                max={maxRank}
                                value={committedRankValue}
                                onAfterChange={handleRankChange}
                                disabled={
                                    isLoading ||
                                    !hasSelection ||
                                    maxRank <= 0 ||
                                    minRank >= maxRank
                                }
                                label="Filter by Rank"
                                analysisName="GOUmapRankFilter"
                            />
                            <StylingSelectors
                                colorByOption={colorByOption}
                                shapeByOption={shapeByOption}
                                sizeByOption={sizeByOption}
                                onColorByChange={handleColorByChange}
                                onShapeByChange={handleShapeByChange}
                                onSizeByChange={handleSizeByChange}
                                colorOptions={COLOR_BY_OPTIONS}
                                shapeOptions={SHAPE_BY_OPTIONS}
                                sizeOptions={SIZE_BY_OPTIONS}
                                disabled={isLoading || !hasSelection}
                            />
                        </Col>
                    </Row>
                </div>
                {/* Plots/Legends Row */}
                <div style={borderStyle(BORDER_COLORS.level3)}>
                    <Row gutter={[16, 16]} wrap={false}>
                        {/* Color Legend */}
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}>
                            <CustomLegends
                                cardTitle="Color"
                                colorItems={colorItems}
                                hiddenColorLabels={hiddenColorLabelsArray}
                                onToggleColorVisibility={handleToggleColorVisibility}
                                showColor={true}
                                // Pass other toggles even if not shown in this card
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                            />
                        </Col>
                        {/* Main Content Area (Accumulation Plots + UMAP) */}
                        <Col flex="auto" style={borderStyle(BORDER_COLORS.level5)}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                {/* Accumulation Plots Section */}
                                <div style={borderStyle(BORDER_COLORS.level6)}>
                                    <Row gutter={[16, 16]}>
                                        {/* --- Iterate and render FUNCTIONAL AccumulationPlot --- */}
                                        {selectedBmdResultRefs?.map((refStr) => {
                                            const numericRef = Number(refStr); // Convert string ref to number for map lookups
                                            if (isNaN(numericRef)) return null; // Skip if ref is not a valid number

                                            const bmdInfo = bmdResultMap.get(numericRef);
                                            const analysisNameForPlot =
                                                bmdInfo?.name || `Analysis ${numericRef}`;

                                            // Filter the globally styled points for this specific analysis
                                            const pointsForThisAccumPlot = allStyledPoints
                                                ? allStyledPoints.filter(
                                                    (p) => p.bmdResultRef === numericRef
                                                )
                                                : null; // Pass null if allStyledPoints isn't ready

                                            console.log(
                                                `[GOUmapAnalysisUnit] Preparing AccumPlot ${analysisNameForPlot}. Found ${pointsForThisAccumPlot?.length ?? 0
                                                } points.`
                                            );

                                            return (
                                                <Col key={refStr} xs={24} sm={12} md={8} lg={6}>
                                                    <AccumulationPlot
                                                        analysisName={analysisNameForPlot}
                                                        styledPointsForPlot={pointsForThisAccumPlot} // Pass the filtered, styled points
                                                        goIdFilterList={goIdFilterList} // Pass global filter list
                                                        referenceDataMap={referenceDataMap} // Pass global map
                                                        bmdResultRef={numericRef} // Pass the numeric ref
                                                        // Pass other props needed by AccumulationPlot
                                                        colorByOption={colorByOption}
                                                        shapeByOption={shapeByOption}
                                                        sizeByOption={sizeByOption}
                                                        bmdRefToExperimentNameMap={bmdRefToExperimentNameMap}
                                                    />
                                                </Col>
                                            );
                                        })}
                                        {/* ----------------------------------------------------- */}
                                    </Row>
                                </div>
                                {/* UMAP Plot Section */}
                                <div style={borderStyle(BORDER_COLORS.level7)}>
                                    <UmapPlotComponent
                                        // Pass points filtered for UMAP visibility
                                        data={analysisPoints || []}
                                        referenceData={referenceData}
                                    />
                                </div>
                            </Space>
                        </Col>
                        {/* Shape/Size Legend */}
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}>
                            <CustomLegends
                                cardTitle="Shape & Size"
                                shapeItems={shapeItems}
                                sizeItems={sizeItems}
                                hiddenShapeLabels={hiddenShapeLabelsArray}
                                hiddenSizeLabels={hiddenSizeLabelsArray}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showShape={true}
                                showSize={true}
                                // Pass other toggles even if not shown in this card
                                onToggleColorVisibility={handleToggleColorVisibility}
                            />
                        </Col>
                    </Row>
                </div>
                {/* Table Row */}
                <div style={borderStyle(BORDER_COLORS.level2)}>
                    <Row>
                        <Col span={24}>
                            {/* --- TODO: Replace with functional AnalysisDataTable --- */}
                            <AnalysisDataTable />
                        </Col>
                    </Row>
                </div>
            </Space>
        </div>
    );
};

export default GOUmapAnalysisUnit;
