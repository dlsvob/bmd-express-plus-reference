// src/components/analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit.tsx
// Integrates GOUmapAnalysisTable, manages its state (sorting), handles row clicks.
// Includes loading/error checks and passes all necessary props.
// Allows toggling between single combined UMAP plot and multiple individual plots.

import React, { useCallback, useMemo, useState } from 'react';
import {
    Row,
    Col,
    Spin,
    Alert,
    Space,
    Switch, // Added for toggle
    Typography, // Added for toggle label
    Card, // Added for wrapping multiple plots
    RadioChangeEvent,
} from 'antd';
import type { TableProps } from 'antd';
import UmapPlotComponent from './UmapPlotComponent'; // Relative path
import { useAppSelector, useAppDispatch } from '../../../store/hooks'; // Adjusted path
import {
    usePreparedPlotData,
    PreparedPlotHookData,
} from '../../../hooks/usePreparedPlotData'; // Adjusted path
import {
    UmapAnalysisDataPoint,
    AnalysisTableRow,
    BMDResult,
} from '../../../models/applicationModel'; // Adjusted path
import { ReferenceUmapItem } from '../../../data/referenceUmapData'; // Adjusted path
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
    TableColumnType,
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface';

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

const { Text } = Typography; // Added

// --- Props Interface (if needed) ---
interface GOUmapAnalysisUnitProps { }

// --- Define View Mode Type ---
type UmapViewMode = 'single' | 'multiple';

// --- Border Colors & Helper (Unchanged) ---
const borderStyle = () => ({}); // Example: { border: '1px dashed grey' }

// --- GOUmapAnalysisUnit Component ---
const GOUmapAnalysisUnit: React.FC<GOUmapAnalysisUnitProps> = () => {
    const dispatch = useAppDispatch();

    // --- Add State for View Mode ---
    const [umapViewMode, setUmapViewMode] =
        useState<UmapViewMode>('multiple'); // Default to 'multiple'

    // --- Selectors needed by THIS component or its direct children ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    // Use Set selectors directly for hidden labels
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
    // ---------------------------------

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

    // === Prepare Plot Data (Hook selects UI state internally) ===
    // *** IMPORTANT: We need styledGroupedData from this hook now ***
    const {
        analysisPoints, // Filtered for SINGLE plot
        allStyledPoints, // All points after styling - USE THIS FOR TABLE
        styledGroupedData, // <-- NEED THIS: Map<string, UmapAnalysisDataPoint[]>
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
            return points; // No sorting needed
        }
        const { field, order } = tableSorter;
        const sorterFn = DEFAULT_GOUMAP_TABLE_COLUMNS.find(
            (col) => col.key === field
        )?.sorter;
        if (typeof sorterFn !== 'function') {
            return points; // Column or sorter not found
        }
        const sortedPoints = [...points].sort((a, b) => {
            const result = sorterFn(a, b, order);
            return order === 'descend' ? -result : result;
        });
        return sortedPoints;
    }, [allStyledPoints, tableSorter]);

    // --- Prepare Columns for Table (Add sortOrder dynamically) ---
    const tableColumns = useMemo(() => {
        return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col) => {
            if (!col.key) return col;
            let currentSortOrder: SorterResult<AnalysisTableRow>['order'] = false;
            if (
                tableSorter &&
                'field' in tableSorter &&
                tableSorter.field === col.key
            ) {
                currentSortOrder = tableSorter.order || false;
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
    // --- Callback for the Toggle Switch ---
    const handleViewModeChange = useCallback((checked: boolean) => {
        // 'checked' is true for 'Multiple', false for 'Single' if using Switch
        setUmapViewMode(checked ? 'multiple' : 'single');
    }, []);
    // --------------------------------------

    // === Render Logic Checks ===
    if (isLoading) {
        return (
            <Spin tip="Loading analysis data..." size="large">
                <div style={{ minHeight: '200px' }} />
            </Spin>
        );
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

    // --- Log Check Before Render ---
    console.log('[GOUmapAnalysisUnit Prop Check]', {
        handleToggleColorVisibility_Type: typeof handleToggleColorVisibility,
        handleToggleShapeVisibility_Type: typeof handleToggleShapeVisibility,
        handleToggleSizeVisibility_Type: typeof handleToggleSizeVisibility,
    });

    // --- Render Layout ---
    return (
        <div style={borderStyle()}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Filters Row */}
                <div style={borderStyle()}>
                    <Row gutter={[16, 16]} align="middle">
                        {/* Existing Filter UI */}
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

                            {/* --- NEW: View Mode Toggle --- */}
                            <Space style={{ marginTop: '10px', marginLeft: '15px' }}>
                                <Text strong>UMAP View:</Text>
                                <Switch
                                    checkedChildren="Multiple"
                                    unCheckedChildren="Single"
                                    checked={umapViewMode === 'multiple'}
                                    onChange={handleViewModeChange}
                                    disabled={isLoading || !hasSelection} // Disable if loading or no selection
                                />
                            </Space>
                            {/* --------------------------- */}
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
                                // Pass Set directly
                                hiddenColorLabelsSet={hiddenColorLabelsSet}
                                onToggleColorVisibility={handleToggleColorVisibility}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showColor={true}
                                showShape={false} // Explicitly false for this instance
                                showSize={false} // Explicitly false for this instance
                            />
                        </Col>

                        {/* Main Content Area (Plots + Accumulation) */}
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
                                            const pointsForThisAccumPlot = allStyledPoints
                                                ? allStyledPoints.filter(
                                                    (p) => p.bmdResultRef === numericRef
                                                )
                                                : null;
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
                                </div>

                                {/* --- UMAP Plot Section (Conditional Rendering) --- */}
                                <div style={borderStyle()}>
                                    {umapViewMode === 'single' ? (
                                        // --- Render Single Combined Plot ---
                                        <UmapPlotComponent
                                            data={analysisPoints} // Use points filtered for opacity
                                            referenceData={referenceData}
                                        />
                                    ) : (
                                        // --- Render Multiple Plots ---
                                        <Row gutter={[16, 16]}>
                                            {selectedBmdResultRefs?.map((refStr) => {
                                                const numericRef = Number(refStr);
                                                if (isNaN(numericRef)) return null;

                                                // Get data specifically for this experiment's plot
                                                const pointsForThisPlot =
                                                    styledGroupedData?.get(refStr) || null;

                                                // Get the name for the title
                                                const plotTitle =
                                                    bmdRefToExperimentNameMap.get(numericRef) ||
                                                    `Analysis ${refStr}`;

                                                return (
                                                    <Col key={`umap-${refStr}`} xs={24} sm={12} md={8} lg={6}>
                                                        <Card
                                                            size="small"
                                                            title={plotTitle}
                                                            bodyStyle={{ padding: 0 }}
                                                        >
                                                            <UmapPlotComponent
                                                                data={pointsForThisPlot}
                                                                referenceData={referenceData}
                                                            />
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                </div>
                                {/* ------------------------------------------------- */}
                            </Space>
                        </Col>

                        {/* Shape/Size Legend */}
                        <Col flex="200px" style={borderStyle()}>
                            <CustomLegends
                                cardTitle="Shape & Size"
                                shapeItems={shapeItems}
                                sizeItems={sizeItems}
                                // Pass Sets directly
                                hiddenShapeLabelsSet={hiddenShapeLabelsSet}
                                // highlightedSizeLabelsSet={hiddenSizeLabelsSet} // Assuming highlight applies to shape/size too? Check CustomLegends props
                                onToggleColorVisibility={handleToggleColorVisibility}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showColor={false} // Explicitly false for this instance
                                showShape={true}
                                showSize={true}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Table Row */}
                <div style={borderStyle()}>
                    <Row>
                        <Col span={24}>
                            <GOUmapAnalysisTable
                                dataSource={tableDataSource || []} // Ensure dataSource is always an array
                                columns={tableColumns}
                                loading={isLoading}
                                highlightMode={highlightMode}
                                highlightGoIdsSet={highlightGoIdsSet}
                                selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                                size="small"
                                bordered
                                scroll={{ y: 400, x: 'max-content' }} // Example scroll
                                pagination={tablePagination}
                                onChange={handleTableChange}
                                onRowClick={handleTableRowClick} // Pass the click handler
                            />
                        </Col>
                    </Row>
                </div>
            </Space>
        </div>
    );
};

export default GOUmapAnalysisUnit;
