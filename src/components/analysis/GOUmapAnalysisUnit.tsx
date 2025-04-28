// src/components/analysis/GOUmapAnalysisUnit.tsx
// Corrected version integrating GoIdFilterUI and AccumulationPlot

import React, { useCallback, useMemo } from 'react'; // Removed useMemo, useEffect if not needed directly
import { Row, Col, Spin, Alert, Space, RadioChangeEvent } from 'antd'; // Added RadioChangeEvent
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
import {
    HighlightMode, // Import Enum
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
    selectGoIdInputString, // Selector for input value
    setCommittedRankSliderValue,
    setColorBy,
    setShapeBy,
    setSizeBy,
    toggleColorLabelVisibility,
    toggleShapeLabelVisibility,
    toggleSizeLabelVisibility,
    setGoIdInputString, // Action for input value
    setHighlightMode as setHighlightModeAction, // Action for highlight mode (aliased)
} from '../../store/slices/analysisUISlice'; // Adjust path if needed
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
// Keep BMDResult type import if needed elsewhere, maybe bmdResultMap key type
// import { BMDResult } from '../../models/BMDxExported';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';

// --- Import Placeholders (Keep only needed ones) ---
import AnalysisDataTable from './placeholders/AnalysisDataTable'; // Keep placeholder for now
// --- Import the REAL Components ---
import CustomLegends from './CustomLegends'; // Adjusted path
import StylingSelectors from '../StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../SlidingWindowFilter'; // Adjusted path
import AccumulationPlot from './AccumulationPlot'; // Use the functional component
import GoIdFilterUI from '../../components/GOUIdFilterUI'; // Use the functional component
// ---------------------------------------------
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../config/analysisConstants'; // Adjust path if needed

// --- Define Props Interface (from parent App.tsx) ---
// This component now gets most of its state via selectors
// Props might be minimal if App.tsx doesn't need to pass much down anymore
interface GOUmapAnalysisUnitProps {
    // Potentially add props if App.tsx needs to pass specific things
    // For now, assuming it gets project context implicitly via selectors
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
    // border: `${level}px solid ${color}`,
});
// ------------------------------------------

const GOUmapAnalysisUnit: React.FC<GOUmapAnalysisUnitProps> = (
    {
        /* Destructure any props if added */
    }
) => {
    const dispatch = useAppDispatch();

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName); // Needed for query
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    const hiddenColorLabelsArray = useAppSelector(selectHiddenColorLabels);
    const hiddenShapeLabelsArray = useAppSelector(selectHiddenShapeLabels);
    const hiddenSizeLabelsArray = useAppSelector(selectHiddenSizeLabels);
    const hiddenColorLabelsSet = useAppSelector(selectHiddenColorLabelsSet);
    const hiddenShapeLabelsSet = useAppSelector(selectHiddenShapeLabelsSet);
    const hiddenSizeLabelsSet = useAppSelector(selectHiddenSizeLabelsSet);
    const goIdFilterList = useAppSelector(selectGoIdFilterList); // Needed by usePreparedPlotData
    const highlightMode = useAppSelector(selectHighlightMode); // Needed by usePreparedPlotData & GoIdFilterUI
    const selectedGoIdsSet = useAppSelector(
        selectAccumulationPlotSelectedGoIdsSet
    ); // Needed by usePreparedPlotData
    const committedRankValue = useAppSelector(selectCommittedSlidingWindowValue); // Needed by usePreparedPlotData & SlidingWindowFilter
    const referenceData = useAppSelector(selectReferenceData); // Needed by usePreparedPlotData & UmapPlotComponent
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

    const isLoading = isLoadingRaw; // Combine loading states if more sources are added
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

    // === Prepare Plot Data ===
    const {
        analysisPoints,
        allStyledPoints,
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
        goIdFilterList, // Pass the list derived from input string
        highlightMode,
        selectedGoIdsSet,
        committedRankSliderValue: committedRankValue,
    }) as PreparedPlotHookData;

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
    // --- Callbacks for GoIdFilterUI ---
    const handleGoIdInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            dispatch(setGoIdInputString(e.target.value));
        },
        [dispatch]
    );
    const handleHighlightModeChange = useCallback(
        (e: RadioChangeEvent) => {
            const mode = e.target.value as HighlightMode;
            if (Object.values(HighlightMode).includes(mode)) {
                dispatch(setHighlightModeAction(mode));
            } else {
                dispatch(setHighlightModeAction(HighlightMode.NONE));
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
        return (
            <Alert
                message="Error Loading Data"
                description={String(queryError)}
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
                            {/* --- Use functional GoIdFilterUI --- */}
                            <GoIdFilterUI
                                goIdInputString={goIdInputString}
                                highlightMode={highlightMode}
                                onGoIdInputChange={handleGoIdInputChange}
                                onHighlightModeChange={handleHighlightModeChange}
                            />
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
                <div style={borderStyle()}>
                    <Row gutter={[16, 16]} wrap={false}>
                        {/* Color Legend */}
                        <Col flex="200px" style={borderStyle()}>
                            <CustomLegends
                                cardTitle="Color"
                                colorItems={colorItems}
                                hiddenColorLabels={hiddenColorLabelsArray}
                                onToggleColorVisibility={handleToggleColorVisibility}
                                showColor={true}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                            />
                        </Col>
                        {/* Main Content Area */}
                        <Col flex="auto" style={borderStyle()}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                {/* Accumulation Plots Section */}
                                <div style={borderStyle()}>
                                    <Row gutter={[16, 16]}>
                                        {selectedBmdResultRefs?.map((refStr) => {
                                            const numericRef = Number(refStr);
                                            if (isNaN(numericRef)) return null;

                                            const bmdInfo = bmdResultMap.get(numericRef);
                                            const analysisNameForPlot =
                                                bmdInfo?.name || `Analysis ${numericRef}`;

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
                                                    // Removed unused props
                                                    />
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </div>
                                {/* UMAP Plot Section */}
                                <div style={borderStyle()}>
                                    <UmapPlotComponent
                                        data={analysisPoints || []}
                                        referenceData={referenceData}
                                    />
                                </div>
                            </Space>
                        </Col>
                        {/* Shape/Size Legend */}
                        <Col flex="200px" style={borderStyle()}>
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
