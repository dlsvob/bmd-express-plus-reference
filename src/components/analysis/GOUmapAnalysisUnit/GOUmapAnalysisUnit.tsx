// src/components/analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit.tsx

import React, {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    Row,
    Col,
    Spin,
    Alert,
    Empty,
    RadioChangeEvent,
} from 'antd';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { usePreparedPlotData } from '../../../hooks/usePreparedPlotData';
import { useUmapLayout } from '../../../hooks/useUmapLayout';
import { useUmapTable } from '../../../hooks/useUmapTable';

// Import new components
import UmapFiltersPanel from './UmapFiltersPanel';
import UmapLegendPanel from './UmapLegendPanel';
import AccumulationPlotsArea from './AccumulationPlotsArea';
import UmapVisualizationArea from './UmapVisualizationArea';
import UmapDataTable from './UmapDataTable';

import type {
    AnalysisTableRow,
    PreparedPlotHookData,
} from '../../../models/applicationModel';
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../../store/selectors/referenceDataSelector';
import {
    HighlightMode,
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabelsSet,
    selectHiddenShapeLabelsSet,
    selectHiddenSizeLabelsSet,
    selectHighlightMode,
    selectCommittedSlidingWindowValue,
    selectGoIdInputString,
    selectGoIdFilterList,
    selectAccumulationPlotSelectedGoIdsSet,
    selectTableSelectedGoId,
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
    setTableSelectedGoId,
} from '../../../store/slices/analysisUISlice';
import { selectSelectedProjectName } from '../../../store/slices/projectSlice';
import { useCategoryAnalysisDataService } from '../../../hooks/useCategoryAnalysisDataService';
import {
    FONT_SIZE_MULTIPLIER,
    BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX,
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css';

type UmapViewMode = 'single' | 'multiple';

// --- Style Constants ---
const verticalSpacingStyle: React.CSSProperties = { marginBottom: '24px' };
const horizontalScrollRowStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexWrap: 'nowrap',
    paddingBottom: '10px',
    gap: '16px',
    justifyContent: 'flex-start'
};
const stickyLegendBaseStyle: React.CSSProperties = { position: 'sticky', paddingBottom: '20px' };

// Default height for accumulation plots when height isn't derived from UMAP
const defaultAccumPlotHeight = '300px';

// ==========================================================================
// GOUmapAnalysisUnit Component
// ==========================================================================
const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- State ---
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('single');
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] = useState(true);

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    const hiddenColorLabelsSet = useAppSelector(selectHiddenColorLabelsSet);
    const hiddenShapeLabelsSet = useAppSelector(selectHiddenShapeLabelsSet);
    const hiddenSizeLabelsSet = useAppSelector(selectHiddenSizeLabelsSet);
    const highlightMode = useAppSelector(selectHighlightMode);
    const committedRankValue = useAppSelector(selectCommittedSlidingWindowValue);
    const referenceData = useAppSelector(selectReferenceData);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);
    const goIdInputString = useAppSelector(selectGoIdInputString);
    const goIdFilterList = useAppSelector(selectGoIdFilterList);
    const selectedAccumGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
    const currentTableSelectedGoId = useAppSelector(selectTableSelectedGoId);

    // --- Data Fetching ---
    const { data: rawData, isLoading: isLoadingRaw, isFetching, error: rawError, isSuccess: rawSuccess } = useCategoryAnalysisDataService(
        projectName,
        selectedBmdResultRefs || []
    );

    // --- Data Processing ---
    const { bmdRefToExperimentNameMap } = useMemo<{ bmdRefToExperimentNameMap: Map<number, string>; }>(() => {
        const tempBmdRefToNameMap = new Map<number, string>();
        if (rawSuccess && rawData?.rawBmdResults) {
            rawData.rawBmdResults.forEach((r) => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']);
                    if (!isNaN(numericRef)) {
                        tempBmdRefToNameMap.set(numericRef, r.name || `Analysis ${numericRef}`);
                    }
                }
            });
        }
        return { bmdRefToExperimentNameMap: tempBmdRefToNameMap };
    }, [rawSuccess, rawData]);

    // --- Custom Hooks ---
    const { allStyledPoints, colorItems, shapeItems, sizeItems, minRank, maxRank }: PreparedPlotHookData = usePreparedPlotData({
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        referenceDataMap: referenceDataMap,
        referenceData: referenceData
    });

    const {
        umapRenderedWidth,
        accumulationPlotHeight,
        legendTopOffset,
        umapContainerRef,
        filterHeaderRef,
    } = useUmapLayout({
        umapViewMode,
        allStyledPoints,
        isFilterHeaderCollapsed
    });

    const {
        tableDataSource,
        tableColumns,
        handleTableChange,
        tablePagination,
    } = useUmapTable({
        allStyledPoints
    });

    // --- Computed Values ---
    const highlightGoIdsSet = useMemo(() => new Set(goIdFilterList), [goIdFilterList]);

    const accumTitleStyle: React.CSSProperties = useMemo(() => ({
        fontSize: `${BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER}px`,
        textAlign: 'center',
        marginBottom: '8px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: umapRenderedWidth ? Math.round(umapRenderedWidth / 2) : 'auto'
    }), [umapRenderedWidth]);

    const stickyLegendStyle: React.CSSProperties = useMemo(() => ({
        ...stickyLegendBaseStyle,
        top: `${legendTopOffset}px`
    }), [legendTopOffset]);

    // --- Callbacks ---
    const handleToggleColorVisibility = useCallback((label: string) => {
        dispatch(toggleColorLabelVisibility(label));
    }, [dispatch]);

    const handleToggleShapeVisibility = useCallback((label: string) => {
        dispatch(toggleShapeLabelVisibility(label));
    }, [dispatch]);

    const handleToggleSizeVisibility = useCallback((label: string) => {
        dispatch(toggleSizeLabelVisibility(label));
    }, [dispatch]);

    const handleColorByChange = useCallback((value: string) => {
        dispatch(setColorBy(value));
    }, [dispatch]);

    const handleShapeByChange = useCallback((value: string) => {
        dispatch(setShapeBy(value));
    }, [dispatch]);

    const handleSizeByChange = useCallback((value: string) => {
        dispatch(setSizeBy(value));
    }, [dispatch]);

    const handleRankChange = useCallback((value: [number, number]) => {
        dispatch(setCommittedRankSliderValue(value));
    }, [dispatch]);

    const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setGoIdInputString(e.target.value));
    }, [dispatch]);

    const handleHighlightModeChange = useCallback((e: RadioChangeEvent) => {
        const mode = e.target.value as HighlightMode;
        dispatch(setHighlightModeAction(Object.values(HighlightMode).includes(mode) ? mode : HighlightMode.NONE));
    }, [dispatch]);

    const handleTableRowClick = useCallback((record: AnalysisTableRow) => {
        const clickedGoId = record?.go_id;
        dispatch(setTableSelectedGoId(clickedGoId && clickedGoId === currentTableSelectedGoId ? null : (clickedGoId || null)));
    }, [dispatch, currentTableSelectedGoId]);

    const handleViewModeChange = useCallback((checked: boolean) => {
        setUmapViewMode(checked ? 'multiple' : 'single');
    }, []);

    const toggleFilterHeaderCollapse = useCallback(() => {
        setIsFilterHeaderCollapsed((prev) => !prev);
    }, []);

    // === Early Returns ===
    const isLoading = isLoadingRaw || isFetching;
    const queryError = rawError;
    const hasSelection = selectedBmdResultRefs && selectedBmdResultRefs.length > 0;

    if (queryError) {
        return (
            <Alert
                message="Error Loading Analysis Data"
                description={String(queryError)}
                type="error"
                showIcon
                style={{ margin: '24px' }}
            />
        );
    }

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" tip="Loading analysis data..." />
            </div>
        );
    }

    if (!hasSelection) {
        return (
            <Empty description="No analyses selected." style={{ marginTop: '50px' }} />
        );
    }

    // === Main Render ===
    return (
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' }} className={styles.goumapRoot}>
            {/* Filter Header */}
            <UmapFiltersPanel
                ref={filterHeaderRef}
                isCollapsed={isFilterHeaderCollapsed}
                onToggleCollapse={toggleFilterHeaderCollapse}
                hasSelection={hasSelection}
                minRank={minRank}
                maxRank={maxRank}
                goIdInputString={goIdInputString}
                highlightMode={highlightMode}
                committedRankValue={committedRankValue}
                colorByOption={colorByOption}
                shapeByOption={shapeByOption}
                sizeByOption={sizeByOption}
                umapViewMode={umapViewMode}
                onGoIdInputChange={handleGoIdInputChange}
                onHighlightModeChange={handleHighlightModeChange}
                onRankChange={handleRankChange}
                onColorByChange={handleColorByChange}
                onShapeByChange={handleShapeByChange}
                onSizeByChange={handleSizeByChange}
                onViewModeChange={handleViewModeChange}
                style={verticalSpacingStyle}
            />

            {/* Main Content Row */}
            <Row gutter={[16, 16]} wrap={false} align="top" style={{ flexGrow: 1, minHeight: 0 }}>
                {/* Left Legend */}
                <UmapLegendPanel
                    position="left"
                    colorItems={colorItems}
                    hiddenColorLabelsSet={hiddenColorLabelsSet}
                    onToggleColorVisibility={handleToggleColorVisibility}
                    onToggleShapeVisibility={handleToggleShapeVisibility}
                    onToggleSizeVisibility={handleToggleSizeVisibility}
                    stickyStyle={stickyLegendStyle}
                />

                {/* Center Content */}
                <Col flex="auto" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Accumulation Plots Area (Single View Only) */}
                    <AccumulationPlotsArea
                        viewMode={umapViewMode}
                        selectedRefs={selectedBmdResultRefs || []}
                        bmdRefToNameMap={bmdRefToExperimentNameMap}
                        allStyledPoints={allStyledPoints}
                        plotHeight={accumulationPlotHeight}
                        defaultPlotHeight={defaultAccumPlotHeight}
                        horizontalScrollRowStyle={horizontalScrollRowStyle}
                        accumTitleStyle={accumTitleStyle}
                    />

                    {/* UMAP Visualization Area (Single View Only) */}
                    {umapViewMode === 'single' && (
                        <UmapVisualizationArea
                            ref={umapContainerRef}
                            allStyledPoints={allStyledPoints}
                            referenceData={referenceData}
                        />
                    )}

                    {/* Data Table */}
                    <UmapDataTable
                        dataSource={tableDataSource}
                        columns={tableColumns}
                        loading={isLoading}
                        highlightMode={highlightMode}
                        highlightGoIdsSet={highlightGoIdsSet}
                        selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                        pagination={tablePagination}
                        onChange={handleTableChange}
                        onRowClick={handleTableRowClick}
                    />
                </Col>

                {/* Right Legend */}
                <UmapLegendPanel
                    position="right"
                    shapeItems={shapeItems}
                    sizeItems={sizeItems}
                    hiddenShapeLabelsSet={hiddenShapeLabelsSet}
                    hiddenSizeLabelsSet={hiddenSizeLabelsSet}
                    onToggleColorVisibility={handleToggleColorVisibility}
                    onToggleShapeVisibility={handleToggleShapeVisibility}
                    onToggleSizeVisibility={handleToggleSizeVisibility}
                    stickyStyle={stickyLegendStyle}
                />
            </Row>
        </div>
    );
};

export default GOUmapAnalysisUnit;