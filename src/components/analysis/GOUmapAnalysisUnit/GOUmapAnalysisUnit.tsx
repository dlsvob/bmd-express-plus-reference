// src/components/analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit.tsx
// Integrates GOUmapAnalysisTable, manages its state (sorting), handles row clicks.
// Includes loading/error checks and passes all necessary props.
// Allows toggling between single combined UMAP plot and multiple individual plots.
// Adds container and inner section borders.

import React, { useCallback, useMemo, useState } from 'react';
import {
    Row, Col, Spin, Alert, Space, Switch, Typography, Card, RadioChangeEvent
} from 'antd';
// import type { TableProps } from 'antd'; // Removed (Unused)
import UmapPlotComponent from './UmapPlotComponent'; // Relative path
import { useAppSelector, useAppDispatch } from '../../../store/hooks'; // Adjusted path
import {
    usePreparedPlotData,
    // PreparedPlotHookData, // Use type from applicationModel
} from '../../../hooks/usePreparedPlotData'; // Adjusted path
import type {
    // UmapAnalysisDataPoint, // Removed (Unused in this file)
    AnalysisTableRow,
    // BMDResult, // Removed (Import from BMDxExported)
    PreparedPlotHookData, // IMPORTED from applicationModel
} from '../../../models/applicationModel'; // Adjusted path
import type { BMDResult } from '../../../models/BMDxExported'; // ADDED Import
// import type { ReferenceUmapItem } from '../../../data/referenceUmapData'; // Removed (Unused in this file)
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice'; // Adjusted path
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../../store/selectors/referenceDataSelector'; // Adjusted path
import {
    HighlightMode,
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabelsSet, // Use Set selector
    selectHiddenShapeLabelsSet, // Use Set selector
    selectHiddenSizeLabelsSet, // Use Set selector
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
} from '../../../store/slices/analysisUISlice'; // Adjusted path
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors'; // Adjusted path
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi'; // Adjusted path

// --- Import Table Component and Column Definitions ---
import { GOUmapAnalysisTable } from './GOUmapAnalysisTable'; // Relative path
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../../config/tableColumnDefinitions'; // Adjusted path
import type {
    TablePaginationConfig,
    // TableColumnType, // Removed (Incorrect import/unused)
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table'; // ADDED Correct import for ColumnType

// --- Import Child Components ---
import CustomLegends from '../shared/CustomLegends'; // Adjusted path
import StylingSelectors from '../controls/StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../controls/SlidingWindowFilter'; // Adjusted path
import AccumulationPlot from './AccumulationPlot'; // Relative path
import GoIdFilterUI from '../controls/GoUIdFilterUI'; // Adjusted path
// -----------------------------
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../../config/analysisConstants'; // Adjusted path

// --- Import CSS Module ---
import styles from './GOUmapAnalysisUnit.module.css'; // Import the CSS module

const { Text } = Typography;

// --- Define View Mode Type ---
type UmapViewMode = 'single' | 'multiple';

// --- Props Interface (REMOVED as it was empty) ---
// interface GOUmapAnalysisUnitProps { } // <-- Ensure this line is removed or commented out

// --- GOUmapAnalysisUnit Component ---
// --- REMOVED Props Annotation ---
const GOUmapAnalysisUnit: React.FC = () => { // <-- Remove : React.FC<GOUmapAnalysisUnitProps>
    const dispatch = useAppDispatch();

    // --- State for View Mode ---
    const [umapViewMode, setUmapViewMode] =
        useState<UmapViewMode>('multiple'); // Default to 'multiple'

    // --- Selectors needed by THIS component or its direct children ---
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
    const selectedAccumGoIdsSet = useAppSelector(
        selectAccumulationPlotSelectedGoIdsSet
    );
    const currentTableSelectedGoId = useAppSelector(selectTableSelectedGoId);

    // --- State for Controlled Table ---
    const [tableSorter, setTableSorter] = useState<
        SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[]
    >({});
    const [tablePagination, setTablePagination] = useState<TablePaginationConfig>(
        {
            current: 1,
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '500'],
            position: ['bottomRight'],
        }
    );

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
    // --- ADDED BMDResult type annotation ---
    const { bmdResultMap, bmdRefToExperimentNameMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
        bmdRefToExperimentNameMap: Map<number, string>;
    }>(() => {
        // --- ADDED BMDResult type annotation ---
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

    // === Prepare Plot Data (Hook selects UI state internally) ===
    // --- Use PreparedPlotHookData from applicationModel ---
    const {
        analysisPoints,
        allStyledPoints,
        styledGroupedData,
        colorItems,
        shapeItems,
        sizeItems,
        minRank,
        maxRank,
    }: PreparedPlotHookData = usePreparedPlotData({
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        referenceDataMap: referenceDataMap,
        referenceData: referenceData,
    });

    // --- Create Highlight GO ID Set ---
    const highlightGoIdsSet = useMemo(
        () => new Set(goIdFilterList),
        [goIdFilterList]
    );

    // --- Prepare Data Source for Table (Sort based on tableSorter state) ---
    const tableDataSource = useMemo(() => {
        const points = allStyledPoints || [];
        if (!tableSorter || !('field' in tableSorter) || !tableSorter.order) {
            return points;
        }
        const { field, order } = tableSorter;
        const sorterFn = DEFAULT_GOUMAP_TABLE_COLUMNS.find(
            (col) => col.key === field
        )?.sorter;
        if (typeof sorterFn !== 'function') {
            return points;
        }
        const sortedPoints = [...points].sort((a, b) => {
            const result = sorterFn(a, b, order);
            return order === 'descend' ? -result : result;
        });
        return sortedPoints;
    }, [allStyledPoints, tableSorter]);

    // --- Prepare Columns for Table (Add sortOrder dynamically) ---
    const tableColumns = useMemo(() => {
        // --- Use ColumnType ---
        return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col: ColumnType<AnalysisTableRow>) => {
            if (!col.key) return col;
            // --- FIX: Use null instead of false (Line ~217) ---
            let currentSortOrder: SorterResult<AnalysisTableRow>['order'] = null;
            if (
                tableSorter &&
                'field' in tableSorter &&
                tableSorter.field === col.key
            ) {
                // --- FIX: Use null instead of false (Line ~223) ---
                currentSortOrder = tableSorter.order || null;
            }
            return {
                ...col,
                sortOrder: currentSortOrder,
            };
        });
    }, [tableSorter]);

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
            if (Object.values(HighlightMode).includes(mode)) {
                dispatch(setHighlightModeAction(mode));
            } else {
                console.warn('Invalid highlight mode selected:', mode);
                dispatch(setHighlightModeAction(HighlightMode.NONE));
            }
        },
        [dispatch]
    );
    const handleTableChange = useCallback(
        (
            pagination: TablePaginationConfig,
            filters: Record<string, FilterValue | null>,
            sorter: SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[],
            extra: { currentDataSource: AnalysisTableRow[]; action: string }
        ) => {
            console.log('[GOUmapAnalysisUnit] handleTableChange:', {
                pagination,
                filters,
                sorter,
                action: extra.action,
            });
            setTablePagination(pagination);
            setTableSorter(sorter);
        },
        []
    );
    const handleTableRowClick = useCallback(
        (record: AnalysisTableRow) => {
            const clickedGoId = record?.go_id;
            console.log('[GOUmapAnalysisUnit] Row clicked:', clickedGoId);
            if (clickedGoId && clickedGoId === currentTableSelectedGoId) {
                dispatch(setTableSelectedGoId(null));
            } else {
                dispatch(setTableSelectedGoId(clickedGoId || null));
            }
        },
        [dispatch, currentTableSelectedGoId]
    );
    const handleViewModeChange = useCallback((checked: boolean) => {
        setUmapViewMode(checked ? 'multiple' : 'single');
    }, []);

    // === Render Logic Checks ===
    const spinTip = isLoading ? <>Loading UMAP data...</> : undefined;
    if (isLoading) {
        return <Spin spinning={isLoading} tip={spinTip} />
    }
    if (queryError) {
        const errorMessage =
            typeof queryError === 'object' &&
                queryError !== null &&
                'message' in queryError
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

    return (
        // Apply the container style from the CSS module
        <div className={styles.analysisUnitContainer}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* Filters Row - Wrapped in a Card */}
                {/* 'bordered' prop removed */}
                <Card size="small" className={styles.innerSectionCard}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col span={24}>
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
                            <Space style={{ marginTop: '10px', marginLeft: '15px' }}>
                                <Text strong>UMAP View:</Text>
                                <Switch
                                    checkedChildren="Multiple"
                                    unCheckedChildren="Single"
                                    checked={umapViewMode === 'multiple'}
                                    onChange={handleViewModeChange}
                                    disabled={isLoading || !hasSelection}
                                />
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Plots/Legends Row */}
                <div> {/* Simple div wrapper */}
                    <Row gutter={[16, 16]} wrap={false}>
                        {/* Color Legend */}
                        <Col flex="200px">
                            <CustomLegends
                                cardTitle="Color"
                                colorItems={colorItems}
                                hiddenColorLabelsSet={hiddenColorLabelsSet}
                                // Pass presentClusterIds if needed
                                onToggleColorVisibility={handleToggleColorVisibility}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showColor={true}
                                showShape={false}
                                showSize={false}
                            />
                        </Col>

                        {/* Main Content Area (Plots + Accumulation) */}
                        <Col flex="auto">
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                {/* Accumulation Plots Section */}
                                {/* 'bordered' prop removed */}
                                <Card size="small" title="Accumulation Plots" className={styles.innerSectionCard}>
                                    <Row gutter={[16, 16]}>
                                        {selectedBmdResultRefs?.map((refStr) => {
                                            const numericRef = Number(refStr);
                                            if (isNaN(numericRef)) return null;
                                            const bmdInfo = bmdResultMap.get(numericRef);
                                            const analysisNameForPlot = bmdInfo?.name || `Analysis ${numericRef}`;
                                            const pointsForThisAccumPlot = allStyledPoints?.filter(p => p.bmdResultRef === numericRef) || null;
                                            return (
                                                <Col key={`accum-${refStr}`} xs={24} sm={12} md={8} lg={6}>
                                                    <AccumulationPlot
                                                        analysisName={analysisNameForPlot}
                                                        styledPointsForPlot={pointsForThisAccumPlot}
                                                        bmdResultRef={numericRef}
                                                    />
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </Card>

                                {/* UMAP Plot Section */}
                                {/* 'bordered' prop removed */}
                                <Card size="small" title="UMAP Visualization" className={styles.innerSectionCard}>
                                    {umapViewMode === 'single' ? (
                                        <UmapPlotComponent
                                            data={analysisPoints}
                                            referenceData={referenceData}
                                        />
                                    ) : (
                                        <Row gutter={[16, 16]}>
                                            {selectedBmdResultRefs?.map((refStr) => {
                                                const numericRef = Number(refStr);
                                                if (isNaN(numericRef)) return null;
                                                const pointsForThisPlot = styledGroupedData?.get(refStr) || null;
                                                const plotTitle = bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}`;
                                                return (
                                                    <Col key={`umap-${refStr}`} xs={24} sm={12} md={8} lg={6}>
                                                        <UmapPlotComponent
                                                            data={pointsForThisPlot}
                                                            referenceData={referenceData}
                                                        />
                                                        <Text style={{ display: 'block', textAlign: 'center', marginTop: '-10px', fontSize: '0.8em' }}>{plotTitle}</Text>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                </Card>
                            </Space>
                        </Col>

                        {/* Shape/Size Legend */}
                        <Col flex="200px">
                            <CustomLegends
                                cardTitle="Shape & Size"
                                shapeItems={shapeItems}
                                sizeItems={sizeItems}
                                hiddenShapeLabelsSet={hiddenShapeLabelsSet}
                                hiddenSizeLabelsSet={hiddenSizeLabelsSet}
                                // Pass presentClusterIds if applicable
                                onToggleColorVisibility={handleToggleColorVisibility}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showColor={false}
                                showShape={true}
                                showSize={true}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Table Row */}
                {/* 'bordered' prop removed */}
                <Card size="small" title="Analysis Data Table" className={styles.innerSectionCard}>
                    <Row>
                        <Col span={24}>
                            <GOUmapAnalysisTable
                                dataSource={tableDataSource || []}
                                columns={tableColumns}
                                loading={isLoading}
                                highlightMode={highlightMode}
                                highlightGoIdsSet={highlightGoIdsSet}
                                selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                                size="small"
                                // 'bordered' prop removed from here too (was commented out)
                                scroll={{ y: 400, x: 'max-content' }}
                                pagination={tablePagination}
                                onChange={handleTableChange}
                                onRowClick={handleTableRowClick}
                            />
                        </Col>
                    </Row>
                </Card>

            </Space>
        </div>
    );
};

export default GOUmapAnalysisUnit;
