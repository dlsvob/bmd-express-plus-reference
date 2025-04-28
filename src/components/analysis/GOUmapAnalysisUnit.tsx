// src/components/analysis/GOUmapAnalysisUnit.tsx
// Corrected version integrating GoIdFilterUI and AccumulationPlot,
// and updating the call to usePreparedPlotData (v19.5+)

import React, { useCallback, useMemo } from 'react';
import { Row, Col, Spin, Alert, Space, RadioChangeEvent } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
    usePreparedPlotData,
    PreparedPlotHookData,
} from '../../hooks/usePreparedPlotData'; // Adjust path if needed
import {
    UmapAnalysisDataPoint,
    BMDResult,
} from '../../models/applicationModel'; // Adjust path
import { ReferenceUmapItem } from '../../data/referenceUmapData'; // Adjust path
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
// --- Import selectors needed by THIS component or its direct children ---
import {
    HighlightMode,
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabels, // Array version for CustomLegends
    selectHiddenShapeLabels,
    selectHiddenSizeLabels,
    selectHighlightMode,
    selectCommittedSlidingWindowValue,
    selectGoIdInputString,
    // Actions
    setCommittedRankSliderValue,
    setColorBy,
    setShapeBy,
    setSizeBy,
    toggleColorLabelVisibility,
    toggleShapeLabelVisibility,
    toggleSizeLabelVisibility,
    setGoIdInputString,
    setHighlightMode as setHighlightModeAction,
} from '../../store/slices/analysisUISlice'; // Adjust path if needed
// ---------------------------------------------------------------------
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';

// --- Import Placeholders (Keep only needed ones) ---
import AnalysisDataTable from './placeholders/AnalysisDataTable'; // Keep placeholder for now
// --- Import the REAL Components ---
import CustomLegends from './CustomLegends'; // Adjusted path
import StylingSelectors from '../StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../SlidingWindowFilter'; // Adjusted path
import AccumulationPlot from './AccumulationPlot'; // Use the functional component
import GoIdFilterUI from '../GOUIdFilterUI'; // Use the functional component (Adjusted path)
// ---------------------------------------------
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../config/analysisConstants'; // Adjust path if needed

// --- Define Props Interface (if needed) ---
interface GOUmapAnalysisUnitProps {
    // Potentially add props if App.tsx needs to pass specific things
}

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
const borderStyle = () => ({
    // border: `${level}px solid ${color}`, // Keep commented out
});
// ------------------------------------------

const GOUmapAnalysisUnit: React.FC<GOUmapAnalysisUnitProps> = (
    {
        /* Destructure any props if added */
    }
) => {
    const dispatch = useAppDispatch();

    // --- Selectors needed by THIS component or its direct children ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy); // Needed for StylingSelectors
    const shapeByOption = useAppSelector(selectShapeBy); // Needed for StylingSelectors
    const sizeByOption = useAppSelector(selectSizeBy); // Needed for StylingSelectors
    const hiddenColorLabelsArray = useAppSelector(selectHiddenColorLabels); // Needed for CustomLegends
    const hiddenShapeLabelsArray = useAppSelector(selectHiddenShapeLabels); // Needed for CustomLegends
    const hiddenSizeLabelsArray = useAppSelector(selectHiddenSizeLabels); // Needed for CustomLegends
    const highlightMode = useAppSelector(selectHighlightMode); // Needed for GoIdFilterUI
    const committedRankValue = useAppSelector(selectCommittedSlidingWindowValue); // Needed for SlidingWindowFilter
    const referenceData = useAppSelector(selectReferenceData); // Needed by UmapPlotComponent & usePreparedPlotData
    const referenceDataMap = useAppSelector(selectReferenceDataMap); // Needed by usePreparedPlotData
    const goIdInputString = useAppSelector(selectGoIdInputString); // Needed by GoIdFilterUI

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
    const { bmdResultMap, bmdRefToExperimentNameMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
        bmdRefToExperimentNameMap: Map<number, string>;
    }>(() => {
        const tempBmdResultMap = new Map<number, BMDResult>();
        const tempBmdRefToNameMap = new Map<number, string>();
        if (rawSuccess && rawData) {
            rawData.rawBmdResults?.forEach((r) => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']);
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

    // === Prepare Plot Data (Call hook with FEWER props) ===
    // The hook now selects most UI state internally
    const {
        analysisPoints,
        allStyledPoints,
        colorItems,
        shapeItems,
        sizeItems,
        minRank,
        maxRank,
    }: PreparedPlotHookData = usePreparedPlotData({
        // --- Pass ONLY the props the hook still needs ---
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        referenceDataMap: referenceDataMap,
        referenceData: referenceData,
        // --- UI state props are REMOVED from this call ---
    });

    // --- Define Callbacks ---
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
    const handleGoIdInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            dispatch(setGoIdInputString(e.target.value));
        },
        [dispatch]
    );
    const handleHighlightModeChange = useCallback(
        (e: RadioChangeEvent) => {
            const mode = e.target.value as HighlightMode;
            // Basic validation before dispatching
            if (Object.values(HighlightMode).includes(mode)) {
                dispatch(setHighlightModeAction(mode));
            } else {
                console.warn('Invalid highlight mode selected:', mode);
                dispatch(setHighlightModeAction(HighlightMode.NONE)); // Default to NONE
            }
        },
        [dispatch]
    );
    // ---------------------------------

    // === Render Logic Checks ===
    if (isLoading) {
        return (
            <Spin tip="Loading analysis data..." size="large">
                <div style={{ minHeight: '200px' }} />
            </Spin>
        );
    }
    if (queryError) {
        // Attempt to access potential error message property
        const errorMessage =
            typeof queryError === 'object' && queryError !== null && 'message' in queryError
                ? String(queryError.message)
                : String(queryError);
        return (
            <Alert
                message="Error Loading Data"
                description={errorMessage}
                type="error"
                showIcon
            />
        );
    }
    // No need to check for project selection here, as App.tsx handles that

    // --- Render Layout ---
    return (
        <div style={borderStyle()}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Filters Row */}
                <div style={borderStyle()}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            {/* Pass selected state to GoIdFilterUI */}
                            <GoIdFilterUI
                                goIdInputString={goIdInputString}
                                highlightMode={highlightMode}
                                onGoIdInputChange={handleGoIdInputChange}
                                onHighlightModeChange={handleHighlightModeChange}
                            />
                        </Col>
                        <Col span={24}>
                            {/* Pass selected state to SlidingWindowFilter */}
                            <SlidingWindowFilter
                                min={minRank}
                                max={maxRank}
                                value={committedRankValue} // Pass selected value
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
                            {/* Pass selected state to StylingSelectors */}
                            <StylingSelectors
                                colorByOption={colorByOption} // Pass selected value
                                shapeByOption={shapeByOption} // Pass selected value
                                sizeByOption={sizeByOption} // Pass selected value
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
                <div style={borderStyle()}>
                    <Row gutter={[16, 16]} wrap={false}>
                        {/* Color Legend */}
                        <Col flex="200px" style={borderStyle()}>
                            {/* Pass selected state to CustomLegends */}
                            <CustomLegends
                                cardTitle="Color"
                                colorItems={colorItems}
                                hiddenColorLabels={hiddenColorLabelsArray} // Pass array version
                                onToggleColorVisibility={handleToggleColorVisibility}
                                showColor={true}
                                // Pass other toggles even if not shown in this instance
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                            />
                        </Col>
                        {/* Main Content Area */}
                        <Col flex="auto" style={borderStyle()}>
                            <Space
                                direction="vertical"
                                size="middle"
                                style={{ width: '100%' }}
                            >
                                {/* Accumulation Plots Section */}
                                <div style={borderStyle()}>
                                    <Row gutter={[16, 16]}>
                                        {selectedBmdResultRefs?.map((refStr) => {
                                            const numericRef = Number(refStr);
                                            if (isNaN(numericRef)) return null;

                                            const bmdInfo = bmdResultMap.get(numericRef);
                                            const analysisNameForPlot =
                                                bmdInfo?.name || `Analysis ${numericRef}`;

                                            // Filter allStyledPoints for this specific analysis ref
                                            const pointsForThisAccumPlot = allStyledPoints
                                                ? allStyledPoints.filter(
                                                    (p: UmapAnalysisDataPoint) =>
                                                        p.bmdResultRef === numericRef
                                                )
                                                : null;

                                            console.log(
                                                `[GOUmapAnalysisUnit] Preparing AccumPlot ${analysisNameForPlot}. Found ${pointsForThisAccumPlot?.length ?? 0
                                                } points.`
                                            );

                                            return (
                                                <Col key={refStr} xs={24} sm={12} md={8} lg={6}>
                                                    <AccumulationPlot
                                                        analysisName={analysisNameForPlot}
                                                        styledPointsForPlot={pointsForThisAccumPlot}
                                                        bmdResultRef={numericRef}
                                                    // Pass other props if AccumulationPlot needs them
                                                    />
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </div>
                                {/* UMAP Plot Section */}
                                <div style={borderStyle()}>
                                    <UmapPlotComponent
                                        data={analysisPoints} // Use filtered points
                                        referenceData={referenceData}
                                    />
                                </div>
                            </Space>
                        </Col>
                        {/* Shape/Size Legend */}
                        <Col flex="200px" style={borderStyle()}>
                            {/* Pass selected state to CustomLegends */}
                            <CustomLegends
                                cardTitle="Shape & Size"
                                shapeItems={shapeItems}
                                sizeItems={sizeItems}
                                hiddenShapeLabels={hiddenShapeLabelsArray} // Pass array version
                                hiddenSizeLabels={hiddenSizeLabelsArray} // Pass array version
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showShape={true}
                                showSize={true}
                                // Pass other toggles even if not shown in this instance
                                onToggleColorVisibility={handleToggleColorVisibility}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Table Row */}
                <div style={borderStyle()}>
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
