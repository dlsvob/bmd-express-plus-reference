import React, {
    useCallback,
    useMemo,
    useState,
    useRef, // Import useRef
    useEffect, // Import useEffect
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
import AccumulationPlot from './AccumulationPlot'; // Use the reverted/simplified version
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
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../../config/tableColumnDefinitions';
import type {
    TablePaginationConfig,
    SorterResult,
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
import styles from './GOUmapAnalysisUnit.module.css'; // Ensure this contains styles for filter header

const { Text, Title } = Typography;
type UmapViewMode = 'single' | 'multiple';

// Style for the horizontally scrolling row
const horizontalScrollRowStyle: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto', // Enable horizontal scroll
    overflowY: 'hidden', // Hide vertical scrollbar on the row itself
    flexWrap: 'nowrap', // Prevent wrapping
    paddingBottom: '10px', // Add some space for scrollbar if it appears
};

// Define margin style for spacing elements vertically
const verticalSpacingStyle: React.CSSProperties = {
    marginBottom: '24px', // Corresponds to Ant Design's 'large' space size
};

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('single');
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] =
        useState(false);

    // --- STATE FOR DYNAMIC PLOT HEIGHT ---
    // Store height as string (e.g., "250px") or null initially
    const [accumulationPlotHeight, setAccumulationPlotHeight] = useState<
        string | null
    >(null);
    // Ref for the UMAP plot's container column
    const umapContainerRef = useRef<HTMLDivElement>(null);

    // --- Selectors (Unchanged) ---
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

    // --- State for Table (Unchanged) ---
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

    // --- Data Fetching (Unchanged) ---
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

    // --- Memoized Maps (Unchanged) ---
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

    // --- Prepare Plot Data Hook (Unchanged) ---
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
        colorBy: colorByOption,
        shapeBy: shapeByOption,
        sizeBy: sizeByOption,
        rankRange: committedRankValue,
        highlightMode: highlightMode,
        highlightGoIds: goIdFilterList,
        selectedAccumGoIds: selectedAccumGoIdsSet,
        tableSelectedGoId: currentTableSelectedGoId,
    });

    // --- Highlight GO ID Set (Unchanged) ---
    const highlightGoIdsSet = useMemo(
        () => new Set(goIdFilterList),
        [goIdFilterList]
    );

    // --- Prepare Table Data Source (Unchanged) ---
    const tableDataSource = useMemo(() => {
        const points = allStyledPoints || [];
        if (!tableSorter || !('field' in tableSorter) || !tableSorter.order)
            return points;
        const { field, order } = tableSorter;
        const sorterFn = DEFAULT_GOUMAP_TABLE_COLUMNS.find(
            (col) => col.key === field
        )?.sorter;
        if (typeof sorterFn !== 'function') return points;
        const sortedPoints = [...points].sort((a, b) => {
            const result = sorterFn(a, b, order);
            return order === 'descend' ? -result : result;
        });
        return sortedPoints;
    }, [allStyledPoints, tableSorter]);

    // --- Prepare Table Columns (Unchanged) ---
    const tableColumns = useMemo(() => {
        return DEFAULT_GOUMAP_TABLE_COLUMNS.map(
            (col: ColumnType<AnalysisTableRow>) => {
                if (!col.key) return col;
                let currentSortOrder: SorterResult<AnalysisTableRow>['order'] = null;
                if (
                    tableSorter &&
                    'field' in tableSorter &&
                    tableSorter.field === col.key
                ) {
                    currentSortOrder = tableSorter.order || null;
                }
                return { ...col, sortOrder: currentSortOrder };
            }
        );
    }, [tableSorter]);

    // --- EFFECT TO MEASURE UMAP PLOT CONTAINER HEIGHT ---
    useEffect(() => {
        // Only run this effect in single view mode
        if (umapViewMode !== 'single') {
            // Optional: Reset height if switching away from single view?
            // setAccumulationPlotHeight(null);
            return;
        }

        const targetElement = umapContainerRef.current;

        // Ensure the target element exists before observing
        if (!targetElement) {
            console.log('[HeightEffect] Target element not found yet.');
            return;
        }

        console.log('[HeightEffect] Setting up ResizeObserver for:', targetElement);

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Use contentRect for dimensions
                const { height } = entry.contentRect;
                if (height > 0) {
                    // Calculate half height and round
                    const newHeight = Math.round(height / 2);
                    const newHeightPx = `${newHeight}px`;

                    // Update state only if the value actually changes
                    setAccumulationPlotHeight((prevHeight) => {
                        if (prevHeight !== newHeightPx) {
                            console.log(
                                `[ResizeObserver] UMAP container height: ${height.toFixed(
                                    1
                                )}px -> Accumulation plot height: ${newHeightPx}`
                            );
                            return newHeightPx;
                        }
                        return prevHeight; // No change needed
                    });
                } else {
                    console.log(
                        '[ResizeObserver] Observed height is 0 or less.'
                    );
                }
            }
        });

        // Start observing the target element
        resizeObserver.observe(targetElement);

        // --- Cleanup function ---
        return () => {
            console.log(
                '[HeightEffect] Cleaning up ResizeObserver for:',
                targetElement
            );
            resizeObserver.disconnect();
        };
    }, [umapViewMode]); // Dependency: Re-run if view mode changes

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
            sorter:
                | SorterResult<AnalysisTableRow>
                | SorterResult<AnalysisTableRow>[],
            extra: { currentDataSource: AnalysisTableRow[]; action: string }
        ) => {
            console.log('[GOUmapAnalysisUnit] handleTableChange:', {
                pagination,
                filters,
                sorter,
                action: extra.action,
            });
            setTablePagination(pagination);
            const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
            setTableSorter(currentSorter || {});
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
        // Optional: Reset height immediately when switching modes
        // setAccumulationPlotHeight(null);
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

    // Add a root class for potential styling/targeting
    // Also add flex properties to ensure it fills parent height
    const rootStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0, // Important for flex children height calculation
        width: '100%', // Ensure it takes full width
    };

    // --- Define a default/fallback height for initial render ---
    const defaultAccumPlotHeight = '250px'; // Adjust if needed

    return (
        <div style={rootStyle} className={styles.goumapRoot}>
            {/* --- Filter Header Section (Simplified - No hover expand) --- */}
            <div
                className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded
                    }`}
                style={verticalSpacingStyle} // Add bottom margin
            >
                <div className={styles.filterHeaderToolbar}>
                    <Title level={5} style={{ margin: 0, flexGrow: 1 }}>
                        Filters & Styling
                    </Title>
                    <Button
                        type="text"
                        icon={
                            isFilterHeaderCollapsed ? (
                                <DownOutlined />
                            ) : (
                                <UpOutlined />
                            )
                        }
                        onClick={toggleFilterHeaderCollapse}
                        aria-label={
                            isFilterHeaderCollapsed
                                ? 'Expand Filters'
                                : 'Collapse Filters'
                        }
                    />
                </div>
                <div className={styles.filterHeaderControls}>
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
                                disabled={
                                    isLoading ||
                                    !hasSelection ||
                                    maxRank <= 0 ||
                                    minRank >= maxRank
                                }
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
            {/* --- END Filter Header Section --- */}

            {/* --- Plots/Legends Row --- */}
            <div style={verticalSpacingStyle}>
                <Row gutter={[16, 16]} wrap={false}>
                    {/* Color Legend (Fixed Width) */}
                    <Col flex="0 0 200px">
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
                    </Col>

                    {/* Main Content Area (Plots) - Conditionally Rendered */}
                    <Col flex="auto">
                        <Spin spinning={isLoading} tip="Loading analysis data...">
                            {/* == MULTIPLE VIEW MODE RENDERING == */}
                            {umapViewMode === 'multiple' &&
                                selectedBmdResultRefs?.map((refStr) => {
                                    const numericRef = Number(refStr);
                                    if (isNaN(numericRef)) return null;
                                    const analysisNameForPlot =
                                        bmdRefToExperimentNameMap.get(
                                            numericRef
                                        ) || `Analysis ${numericRef}`;
                                    const pointsForAccumPlot = isLoading
                                        ? null
                                        : allStyledPoints?.filter(
                                            (p) => p.bmdResultRef === numericRef
                                        ) || null;
                                    const pointsForUmapPlot = isLoading
                                        ? null
                                        : styledGroupedData?.get(refStr) || null;
                                    return (
                                        <Card
                                            key={`exp-row-${refStr}`}
                                            size="small"
                                            title={analysisNameForPlot}
                                            bordered={false} // Ensure no border
                                            style={{
                                                width: '100%',
                                                marginBottom: '16px',
                                            }}
                                        >
                                            <Row gutter={[16, 16]} align="top">
                                                <Col xs={24} lg={12}>
                                                    <Title
                                                        level={5}
                                                        style={{
                                                            textAlign: 'center',
                                                            marginBottom: '8px',
                                                        }}
                                                    >
                                                        Accumulation
                                                    </Title>
                                                    <AccumulationPlot
                                                        analysisName={
                                                            analysisNameForPlot
                                                        }
                                                        styledPointsForPlot={
                                                            pointsForAccumPlot
                                                        }
                                                        bmdResultRef={numericRef}
                                                    // plotHeight="300px" // Optional: Fixed height for multi-view
                                                    />
                                                </Col>
                                                <Col xs={24} lg={12}>
                                                    <Title
                                                        level={5}
                                                        style={{
                                                            textAlign: 'center',
                                                            marginBottom: '8px',
                                                        }}
                                                    >
                                                        UMAP
                                                    </Title>
                                                    <UmapPlotComponent
                                                        data={pointsForUmapPlot}
                                                        referenceData={
                                                            referenceData
                                                        }
                                                    />
                                                </Col>
                                            </Row>
                                        </Card>
                                    );
                                })}

                            {/* == SINGLE VIEW MODE RENDERING (MODIFIED) == */}
                            {umapViewMode === 'single' && (
                                <>
                                    {/* Card containing the row of individual Accumulation plots */}
                                    <Card
                                        size="small"
                                        title="Individual Accumulation Plots"
                                        bordered={false} // Ensure no border
                                        style={{
                                            width: '100%',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <Row
                                            gutter={[16, 0]}
                                            style={horizontalScrollRowStyle}
                                            align="top"
                                        >
                                            {selectedBmdResultRefs?.map(
                                                (refStr) => {
                                                    const numericRef =
                                                        Number(refStr);
                                                    if (isNaN(numericRef))
                                                        return null;
                                                    const analysisNameForPlot =
                                                        bmdRefToExperimentNameMap.get(
                                                            numericRef
                                                        ) ||
                                                        `Analysis ${numericRef}`;
                                                    const pointsForThisAccumPlot =
                                                        isLoading
                                                            ? null
                                                            : allStyledPoints?.filter(
                                                                (p) =>
                                                                    p.bmdResultRef ===
                                                                    numericRef
                                                            ) || null;
                                                    return (
                                                        <Col
                                                            key={`single-accum-${refStr}`}
                                                            style={{
                                                                // Set a fixed width for consistency
                                                                width: '350px',
                                                                flexShrink: 0,
                                                                paddingBottom: '16px', // Optional spacing
                                                            }}
                                                        >
                                                            <Title
                                                                level={5}
                                                                style={{
                                                                    textAlign:
                                                                        'center',
                                                                    marginBottom:
                                                                        '8px',
                                                                    fontSize:
                                                                        '0.9em',
                                                                    whiteSpace:
                                                                        'nowrap',
                                                                    overflow:
                                                                        'hidden',
                                                                    textOverflow:
                                                                        'ellipsis',
                                                                }}
                                                                title={
                                                                    analysisNameForPlot
                                                                }
                                                            >
                                                                {
                                                                    analysisNameForPlot
                                                                }
                                                            </Title>
                                                            <AccumulationPlot
                                                                analysisName={
                                                                    analysisNameForPlot
                                                                }
                                                                styledPointsForPlot={
                                                                    pointsForThisAccumPlot
                                                                }
                                                                bmdResultRef={
                                                                    numericRef
                                                                }
                                                                // *** PASS THE DYNAMIC HEIGHT ***
                                                                // Use state value or fallback default
                                                                plotHeight={
                                                                    accumulationPlotHeight ??
                                                                    defaultAccumPlotHeight
                                                                }
                                                            />
                                                        </Col>
                                                    );
                                                }
                                            )}
                                        </Row>
                                    </Card>

                                    {/* Card containing the single combined UMAP plot */}
                                    <Card
                                        size="small"
                                        title="Combined UMAP Plot"
                                        bordered={false} // Ensure no border
                                        style={{ width: '100%' }}
                                    >
                                        <Row justify="center">
                                            {/* *** ATTACH THE REF HERE *** */}
                                            <Col
                                                xs={24}
                                                lg={16}
                                                xl={12}
                                                ref={umapContainerRef}
                                            >
                                                <Title
                                                    level={5}
                                                    style={{
                                                        textAlign: 'center',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    UMAP
                                                </Title>
                                                <UmapPlotComponent
                                                    data={
                                                        isLoading
                                                            ? null
                                                            : analysisPoints
                                                    }
                                                    referenceData={referenceData}
                                                />
                                            </Col>
                                        </Row>
                                    </Card>
                                </>
                            )}
                        </Spin>
                    </Col>
                    {/* END Main Content Area */}

                    {/* Shape/Size Legend (Fixed Width) */}
                    <Col flex="0 0 200px">
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
                    </Col>
                </Row>
            </div>
            {/* --- END Plots/Legends Row --- */}

            {/* --- Table Row --- */}
            {/* Add spacing below the table card */}
            <Card
                size="small"
                title="Analysis Data Table"
                bordered={false} // Ensure no border
                style={verticalSpacingStyle} // Add bottom margin
            >
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
                            scroll={{ y: 400, x: 'max-content' }}
                            pagination={tablePagination}
                            onChange={handleTableChange}
                            onRowClick={handleTableRowClick}
                            selectedGoId={currentTableSelectedGoId}
                        />
                    </Col>
                </Row>
            </Card>
            {/* --- END Table Row --- */}
        </div> // End of root div
    );
};

export default GOUmapAnalysisUnit;
