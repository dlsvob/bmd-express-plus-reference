// src/components/analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit.tsx

import React, {
    useCallback,
    useMemo,
    useState,
    useRef,
    useEffect,
} from 'react';
import {
    Row,
    Col,
    Spin,
    Alert,
    Space,
    Switch,
    Typography,
    Card,
    RadioChangeEvent,
    Empty,
    Button,
} from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import UmapPlotComponent from './UmapPlotComponent';
import AccumulationPlot from './AccumulationPlot';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { usePreparedPlotData } from '../../../hooks/usePreparedPlotData';
import type {
    AnalysisTableRow,
    PreparedPlotHookData,
} from '../../../models/applicationModel';
import type { BMDResult } from '../../../models/BMDxExported';
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
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors';
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi';
import { GOUmapAnalysisTable } from './GOUmapAnalysisTable';
// *** Import the definitions ***
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../../config/tableColumnDefinitions';
import type {
    TablePaginationConfig,
    SorterResult, // Keep this type
    // *** Import TableCurrentDataSource type if available/needed, or use any ***
    // TableCurrentDataSource,
    FilterValue,
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table';
import CustomLegends from '../shared/CustomLegends';
import StylingSelectors from '../controls/StylingSelectors';
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import GoIdFilterUI from '../controls/GoUIdFilterUI';
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css';

const { Text, Title } = Typography;
type UmapViewMode = 'single' | 'multiple';

// Style for the horizontally scrolling row (for plots)
const horizontalScrollRowStyle: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexWrap: 'nowrap',
    paddingBottom: '10px',
};

// Define margin style for spacing elements vertically
const verticalSpacingStyle: React.CSSProperties = {
    marginBottom: '24px',
};

// --- Style for Sticky Legends ---
const stickyLegendBaseStyle: React.CSSProperties = {
    position: 'sticky',
    paddingBottom: '20px',
};

// --- Helper type for Sorter state (can be single or array) ---
type TableSorterType = SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[];

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('single');
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] =
        useState(true);
    const [accumulationPlotHeight, setAccumulationPlotHeight] = useState<
        string | null
    >(null);
    const umapContainerRef = useRef<HTMLDivElement>(null);
    const filterHeaderRef = useRef<HTMLDivElement>(null);
    const [legendTopOffset, setLegendTopOffset] = useState<number>(50);

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
    const selectedAccumGoIdsSet = useAppSelector(
        selectAccumulationPlotSelectedGoIdsSet
    );
    const currentTableSelectedGoId = useAppSelector(selectTableSelectedGoId);

    // --- State for Table ---
    // *** Initialize with default multi-sort state ***
    const [tableSorter, setTableSorter] = useState<TableSorterType>([
        // Primary sort: GO Term Ascending
        {
            field: 'go_term', // Field name from data record
            order: 'ascend',
            columnKey: 'go_term', // Key from column definition
        },
        // Secondary sort: Experiment Name Ascending
        {
            field: 'bmdResultName',
            order: 'ascend',
            columnKey: 'bmdResultName',
        },
    ]);
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
        isFetching,
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

    const isLoading = isLoadingRaw || isFetching;
    const queryError = rawError;
    const hasSelection = selectedBmdResultRefs && selectedBmdResultRefs.length > 0;

    // --- Memoized Maps ---
    const { bmdResultMap, bmdRefToExperimentNameMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
        bmdRefToExperimentNameMap: Map<number, string>;
    }>(() => {
        const tempBmdResultMap = new Map<number, BMDResult>();
        const tempBmdRefToNameMap = new Map<number, string>();
        if (rawSuccess && rawData?.rawBmdResults) {
            rawData.rawBmdResults.forEach((r) => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']);
                    if (!isNaN(numericRef)) {
                        tempBmdResultMap.set(numericRef, r);
                        tempBmdRefToNameMap.set(
                            numericRef,
                            r.name || `Analysis ${numericRef}`
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

    // --- Prepare Plot Data Hook ---
    const {
        analysisPoints,
        allStyledPoints, // This is the raw data for the table before sorting
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
        colorBy: colorByOption,
        shapeBy: shapeByOption,
        sizeBy: sizeByOption,
        rankRange: committedRankValue,
        highlightMode: highlightMode,
        highlightGoIds: goIdFilterList,
        selectedAccumGoIds: selectedAccumGoIdsSet,
        tableSelectedGoId: currentTableSelectedGoId,
    });

    // --- Highlight GO ID Set ---
    const highlightGoIdsSet = useMemo(
        () => new Set(goIdFilterList),
        [goIdFilterList]
    );

    // --- Prepare Table Data Source (Handles Multi-Sort) ---
    const tableDataSource = useMemo(() => {
        const points = allStyledPoints || [];
        // Ensure tableSorter is treated as an array for consistent logic
        const sorters = (Array.isArray(tableSorter) ? tableSorter : (tableSorter && tableSorter.columnKey ? [tableSorter] : [])).filter(s => s.order); // Filter out sorters without an order

        if (!sorters || sorters.length === 0) {
            // If no active sorters, return original data
            return points;
        }

        // Create a copy to sort
        const sortedPoints = [...points];

        sortedPoints.sort((a, b) => {
            for (const sorter of sorters) {
                // Find the column definition to get the sorter function
                const column = DEFAULT_GOUMAP_TABLE_COLUMNS.find(
                    (col) => col.key === sorter.columnKey || col.key === sorter.field
                );

                // Ensure the column and its sorter function exist
                if (column && typeof column.sorter === 'function') {
                    // Pass the sort order to the sorter function if it accepts it
                    // AntD sorter functions typically have signature: (a, b, sortOrder) => number
                    // If not, call it as (a, b) => number
                    let result: number;
                    try {
                        // Attempt to call with sortOrder (some sorters might use it)
                        result = column.sorter(a, b, sorter.order);
                    } catch (e) {
                        // Fallback if sorter doesn't accept third argument
                        result = (column.sorter as (a: AnalysisTableRow, b: AnalysisTableRow) => number)(a, b);
                    }


                    // Apply direction
                    if (result !== 0) {
                        return sorter.order === 'descend' ? -result : result;
                    }
                } else {
                    console.warn(`Sorter function not found for column key: ${sorter.columnKey || sorter.field}`);
                }
            }
            // If all sorters result in 0, maintain original relative order (or return 0)
            return 0;
        });

        return sortedPoints;
    }, [allStyledPoints, tableSorter]); // Depend on the sorter state

    // --- Prepare Table Columns (Handles Multi-Sort for sortOrder prop) ---
    const tableColumns = useMemo(() => {
        // Ensure tableSorter is an array for easier lookup
        const sortersArray = Array.isArray(tableSorter) ? tableSorter : (tableSorter && tableSorter.columnKey ? [tableSorter] : []);

        return DEFAULT_GOUMAP_TABLE_COLUMNS.map(
            (col: ColumnType<AnalysisTableRow>) => {
                if (!col.key || !col.sorter) return col; // Only modify sortable columns with keys

                // Find the sorter object for this column in the current state
                const currentColumnSorter = sortersArray.find(
                    s => s.columnKey === col.key || s.field === col.key
                );

                return {
                    ...col,
                    // Set sortOrder based on whether this column is in the active sorters
                    sortOrder: currentColumnSorter ? currentColumnSorter.order : null,
                };
            }
        );
    }, [tableSorter]); // Depend on the sorter state

    // --- EFFECT TO MEASURE UMAP PLOT CONTAINER HEIGHT ---
    useEffect(() => {
        if (umapViewMode !== 'single') {
            return;
        }
        const targetElement = umapContainerRef.current;
        if (!targetElement) {
            return;
        }
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { height } = entry.contentRect;
                if (height > 0) {
                    const newHeight = Math.round(height / 2);
                    const newHeightPx = `${newHeight}px`;
                    setAccumulationPlotHeight((prevHeight) => {
                        if (prevHeight !== newHeightPx) {
                            return newHeightPx;
                        }
                        return prevHeight;
                    });
                }
            }
        });
        resizeObserver.observe(targetElement);
        return () => {
            resizeObserver.disconnect();
        };
    }, [umapViewMode]);

    // --- EFFECT TO MEASURE FILTER HEADER HEIGHT for Legend Offset ---
    useEffect(() => {
        const headerElement = filterHeaderRef.current;
        const marginBottom = verticalSpacingStyle.marginBottom
            ? parseInt(String(verticalSpacingStyle.marginBottom).replace('px', ''), 10)
            : 0;
        const validMarginBottom = !isNaN(marginBottom) ? marginBottom : 0;

        if (headerElement) {
            const resizeObserver = new ResizeObserver(entries => {
                const height = headerElement.offsetHeight;
                if (height > 0) {
                    const newOffset = height + validMarginBottom;
                    setLegendTopOffset(prevOffset => {
                        if (prevOffset !== newOffset) {
                            console.log(`[Sticky Offset] Filter header offsetHeight: ${height}px, marginBottom: ${validMarginBottom}px -> Legend top: ${newOffset}px`);
                            return newOffset;
                        }
                        return prevOffset;
                    });
                }
            });
            resizeObserver.observe(headerElement);
            const initialHeight = headerElement.offsetHeight;
            if (initialHeight > 0) {
                setLegendTopOffset(initialHeight + validMarginBottom);
            }
            return () => resizeObserver.disconnect();
        }
    }, [isFilterHeaderCollapsed]);

    // --- Callbacks ---
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
                dispatch(setHighlightModeAction(HighlightMode.NONE));
            }
        },
        [dispatch]
    );
    // *** UPDATED handleTableChange to accept single or array sorter ***
    const handleTableChange = useCallback(
        (
            pagination: TablePaginationConfig,
            filters: Record<string, FilterValue | null>,
            sorter: TableSorterType, // Use the helper type
            extra: { currentDataSource: AnalysisTableRow[]; action: string }
            // extra: TableCurrentDataSource<AnalysisTableRow> // Use imported type if available
        ) => {
            console.log('[GOUmapAnalysisUnit] handleTableChange:', {
                pagination,
                filters,
                sorter, // Log the sorter received from AntD
                action: extra.action,
            });
            setTablePagination(pagination);
            // AntD might pass a single object or an array for multi-sort
            // Store whatever AntD gives us directly in the state
            setTableSorter(sorter);
        },
        [] // No dependencies needed for setTablePagination/setTableSorter
    );
    const handleTableRowClick = useCallback(
        (record: AnalysisTableRow) => {
            const clickedGoId = record?.go_id;
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
    const toggleFilterHeaderCollapse = useCallback(() => {
        setIsFilterHeaderCollapsed((prev) => !prev);
    }, []);

    // === Render Logic ===

    if (queryError) {
        const errorMessage =
            typeof queryError === 'object' &&
                queryError !== null &&
                'data' in queryError
                ? String((queryError as any).data?.message || queryError)
                : String(queryError);
        return (
            <Alert
                message="Error Loading Analysis Data"
                description={errorMessage}
                type="error"
                showIcon
                style={{ margin: '24px' }}
            />
        );
    }

    if (!hasSelection) {
        return (
            <Empty
                description="No analyses selected. Please select analyses from the Experiment List."
                style={{ marginTop: '50px' }}
            />
        );
    }

    const rootStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        width: '100%',
    };

    const defaultAccumPlotHeight = '250px';

    const stickyLegendStyle: React.CSSProperties = {
        ...stickyLegendBaseStyle,
        top: `${legendTopOffset}px`,
    };

    return (
        <div style={rootStyle} className={styles.goumapRoot}>
            {/* Filter Header */}
            <div
                ref={filterHeaderRef}
                className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded
                    }`}
                style={verticalSpacingStyle}
            >
                <div className={styles.filterHeaderToolbar}>
                    <Title level={5} style={{ margin: 0, flexGrow: 1 }}>Filters & Styling</Title>
                    <Button
                        type="text"
                        icon={isFilterHeaderCollapsed ? <DownOutlined /> : <UpOutlined />}
                        onClick={toggleFilterHeaderCollapse}
                        aria-label={isFilterHeaderCollapsed ? 'Expand Filters' : 'Collapse Filters'}
                    />
                </div>
                <div className={styles.filterHeaderControls}>
                    {/* Filter controls content */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12} lg={8}>
                            <GoIdFilterUI
                                goIdInputString={goIdInputString}
                                highlightMode={highlightMode}
                                onGoIdInputChange={handleGoIdInputChange}
                                onHighlightModeChange={handleHighlightModeChange}
                            />
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <SlidingWindowFilter
                                min={minRank}
                                max={maxRank}
                                value={committedRankValue}
                                onAfterChange={handleRankChange}
                                disabled={isLoading || !hasSelection || maxRank <= 0 || minRank >= maxRank}
                                label="Filter by Rank"
                                analysisName="GOUmapRankFilter"
                            />
                        </Col>
                        <Col xs={24} md={24} lg={8}>
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
                        <Col xs={24}>
                            <Space style={{ marginTop: '10px' }}>
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
                </div>
            </div>

            {/* Main Content Row */}
            <Row gutter={[16, 16]} wrap={false} align="top" style={{ flexGrow: 1, minHeight: 0 }}>
                {/* Left Legend */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}>
                    <div style={stickyLegendStyle}>
                        <CustomLegends
                            colorItems={colorItems}
                            hiddenColorLabelsSet={hiddenColorLabelsSet}
                            onToggleColorVisibility={handleToggleColorVisibility}
                            onToggleShapeVisibility={handleToggleShapeVisibility}
                            onToggleSizeVisibility={handleToggleSizeVisibility}
                            showColor={true}
                            showShape={false}
                            showSize={false}
                        />
                    </div>
                </Col>

                {/* Center Content */}
                <Col flex="auto" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Plots Area */}
                    <div style={{ marginBottom: '24px' }}>
                        <Spin spinning={isLoading} tip="Loading analysis data...">
                            {/* Plot rendering based on umapViewMode */}
                            {umapViewMode === 'multiple' && ( /* ... multiple view JSX ... */
                                selectedBmdResultRefs?.map((refStr) => {
                                    const numericRef = Number(refStr);
                                    if (isNaN(numericRef)) return null;
                                    const analysisNameForPlot = bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${numericRef}`;
                                    const pointsForAccumPlot = isLoading ? null : allStyledPoints?.filter(p => p.bmdResultRef === numericRef) || null;
                                    const pointsForUmapPlot = isLoading ? null : styledGroupedData?.get(refStr) || null;
                                    return (
                                        <Card key={`exp-row-${refStr}`} size="small" title={analysisNameForPlot} bordered={false} style={{ width: '100%', marginBottom: '16px' }}>
                                            <Row gutter={[16, 16]} align="top">
                                                <Col xs={24} lg={12}>
                                                    <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>Accumulation</Title>
                                                    <AccumulationPlot analysisName={analysisNameForPlot} styledPointsForPlot={pointsForAccumPlot} bmdResultRef={numericRef} />
                                                </Col>
                                                <Col xs={24} lg={12}>
                                                    <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>UMAP</Title>
                                                    <UmapPlotComponent data={pointsForUmapPlot} referenceData={referenceData} />
                                                </Col>
                                            </Row>
                                        </Card>
                                    );
                                })
                            )}
                            {umapViewMode === 'single' && ( /* ... single view JSX ... */
                                <>
                                    <Card size="small" title="Individual Accumulation Plots" bordered={false} style={{ width: '100%', marginBottom: '16px' }}>
                                        <Row gutter={[16, 0]} style={horizontalScrollRowStyle} align="top">
                                            {selectedBmdResultRefs?.map((refStr) => {
                                                const numericRef = Number(refStr);
                                                if (isNaN(numericRef)) return null;
                                                const analysisNameForPlot = bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${numericRef}`;
                                                const pointsForThisAccumPlot = isLoading ? null : allStyledPoints?.filter(p => p.bmdResultRef === numericRef) || null;
                                                return (
                                                    <Col key={`single-accum-${refStr}`} style={{ width: '350px', flexShrink: 0, paddingBottom: '16px' }}>
                                                        <Title level={5} style={{ textAlign: 'center', marginBottom: '8px', fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={analysisNameForPlot}>
                                                            {analysisNameForPlot}
                                                        </Title>
                                                        <AccumulationPlot analysisName={analysisNameForPlot} styledPointsForPlot={pointsForThisAccumPlot} bmdResultRef={numericRef} plotHeight={accumulationPlotHeight ?? defaultAccumPlotHeight} />
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    </Card>
                                    <Card size="small" title="Combined UMAP Plot" bordered={false} style={{ width: '100%' }}>
                                        <Row justify="center">
                                            <Col xs={24} lg={16} xl={12} ref={umapContainerRef}>
                                                <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>UMAP</Title>
                                                <UmapPlotComponent data={isLoading ? null : analysisPoints} referenceData={referenceData} />
                                            </Col>
                                        </Row>
                                    </Card>
                                </>
                            )}
                        </Spin>
                    </div>

                    {/* Table Area */}
                    <Card size="small" title="Analysis Data Table" bordered={false} style={{ flexShrink: 0 }}>
                        <Row>
                            <Col span={24}>
                                {/* Pass the updated tableColumns */}
                                <GOUmapAnalysisTable
                                    dataSource={tableDataSource}
                                    columns={tableColumns}
                                    loading={isLoading}
                                    highlightMode={highlightMode}
                                    highlightGoIdsSet={highlightGoIdsSet}
                                    selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                                    size="small"
                                    scroll={{ y: 400, x: 'max-content' }}
                                    pagination={tablePagination}
                                    onChange={handleTableChange} // Pass the updated handler
                                    onRowClick={handleTableRowClick}
                                    selectedGoId={currentTableSelectedGoId}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Right Legend */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}>
                    <div style={stickyLegendStyle}>
                        <CustomLegends
                            shapeItems={shapeItems}
                            sizeItems={sizeItems}
                            hiddenShapeLabelsSet={hiddenShapeLabelsSet}
                            hiddenSizeLabelsSet={hiddenSizeLabelsSet}
                            onToggleColorVisibility={handleToggleColorVisibility}
                            onToggleShapeVisibility={handleToggleShapeVisibility}
                            onToggleSizeVisibility={handleToggleSizeVisibility}
                            showColor={false}
                            showShape={true}
                            showSize={true}
                        />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default GOUmapAnalysisUnit;
