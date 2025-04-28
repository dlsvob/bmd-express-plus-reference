// src/components/analysis/GOUmapAnalysisUnit.tsx
// Integrates GOUmapAnalysisTable, manages its state (sorting), handles row clicks.
// Includes loading/error checks and passes all necessary props.

import React, { useCallback, useMemo, useState } from 'react';
import { Row, Col, Spin, Alert, Space, RadioChangeEvent } from 'antd';
import type { TableProps } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
    usePreparedPlotData,
    PreparedPlotHookData,
} from '../../hooks/usePreparedPlotData'; // Adjust path if needed
import {
    UmapAnalysisDataPoint,
    AnalysisTableRow,
    BMDResult,
} from '../../models/applicationModel'; // Adjust path
import { ReferenceUmapItem } from '../../data/referenceUmapData'; // Adjust path
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
import {
    HighlightMode,
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabels,
    selectHiddenShapeLabels,
    selectHiddenSizeLabels,
    selectHighlightMode,
    selectCommittedSlidingWindowValue,
    selectGoIdInputString,
    selectGoIdFilterList,
    selectAccumulationPlotSelectedGoIdsSet,
    selectTableSelectedGoId, // Import selector for table selection
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
    setTableSelectedGoId, // Import action for table selection
} from '../../store/slices/analysisUISlice'; // Adjust path if needed
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';

// --- Import Table Component and Column Definitions ---
import { GOUmapAnalysisTable } from '../GOUmapAnalysisTable'; // Adjust path if needed
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../config/tableColumnDefinitions'; // Adjust path
import type {
    TablePaginationConfig,
    TableColumnType,
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface'; // Import specific AntD table types
// ----------------------------------------------------

// --- Import Child Components ---
import CustomLegends from './CustomLegends'; // Adjusted path
import StylingSelectors from '../StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../SlidingWindowFilter'; // Adjusted path
import AccumulationPlot from './AccumulationPlot'; // Use the functional component
import GoIdFilterUI from '../GOUIdFilterUI'; // Use the functional component (Adjusted path)
// -----------------------------
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../config/analysisConstants'; // Adjust path if needed

// --- Props Interface (if needed) ---
interface GOUmapAnalysisUnitProps { }

// --- Border Colors & Helper (Unchanged) ---
const borderStyle = () => ({});

// --- GOUmapAnalysisUnit Component ---
const GOUmapAnalysisUnit: React.FC<GOUmapAnalysisUnitProps> = () => {
    const dispatch = useAppDispatch();

    // --- Selectors needed by THIS component or its direct children ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    const hiddenColorLabelsArray = useAppSelector(selectHiddenColorLabels);
    const hiddenShapeLabelsArray = useAppSelector(selectHiddenShapeLabels);
    const hiddenSizeLabelsArray = useAppSelector(selectHiddenSizeLabels);
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
    const {
        analysisPoints, // Filtered for plot
        allStyledPoints, // All points after styling - USE THIS FOR TABLE
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
            console.log('[GOUmapAnalysisUnit] handleTableChange:', { pagination, filters, sorter, action: extra.action });
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
                    <Row gutter={[16, 16]}>
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
                                onToggleColorVisibility={handleToggleColorVisibility} // Pass the function
                                onToggleShapeVisibility={handleToggleShapeVisibility} // Pass the function
                                onToggleSizeVisibility={handleToggleSizeVisibility}   // Pass the function
                                showColor={true}
                                showShape={false} // Explicitly false for this instance
                                showSize={false}  // Explicitly false for this instance
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
                                            const pointsForThisAccumPlot = allStyledPoints
                                                ? allStyledPoints.filter(
                                                    (p) => p.bmdResultRef === numericRef
                                                )
                                                : null;
                                            return (
                                                <Col key={refStr} xs={24} sm={12} md={8} lg={6}>
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
                                {/* UMAP Plot Section */}
                                <div style={borderStyle()}>
                                    <UmapPlotComponent
                                        data={analysisPoints}
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
                                onToggleColorVisibility={handleToggleColorVisibility} // Pass the function
                                onToggleShapeVisibility={handleToggleShapeVisibility} // Pass the function
                                onToggleSizeVisibility={handleToggleSizeVisibility}   // Pass the function
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
                                dataSource={tableDataSource}
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
