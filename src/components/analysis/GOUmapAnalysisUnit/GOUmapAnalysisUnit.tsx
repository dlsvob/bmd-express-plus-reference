// src/components/analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
    Row, Col, Spin, Alert, Space, Switch, Typography, Card, RadioChangeEvent, Empty // Added Empty
} from 'antd';
import UmapPlotComponent from './UmapPlotComponent'; // Relative path
import { useAppSelector, useAppDispatch } from '../../../store/hooks'; // Adjusted path
import {
    usePreparedPlotData,
} from '../../../hooks/usePreparedPlotData'; // Adjusted path
import type {
    AnalysisTableRow,
    PreparedPlotHookData,
} from '../../../models/applicationModel'; // Adjusted path
import type { BMDResult } from '../../../models/BMDxExported'; // ADDED Import
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
import { GOUmapAnalysisTable } from './GOUmapAnalysisTable'; // Relative path
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../../config/tableColumnDefinitions'; // Adjusted path
import type {
    TablePaginationConfig,
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table'; // ADDED Correct import for ColumnType
import CustomLegends from '../shared/CustomLegends'; // Adjusted path
import StylingSelectors from '../controls/StylingSelectors'; // Adjusted path
import SlidingWindowFilter from '../controls/SlidingWindowFilter'; // Adjusted path
import AccumulationPlot from './AccumulationPlot'; // Relative path
import GoIdFilterUI from '../controls/GoUIdFilterUI'; // Adjusted path
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../../config/analysisConstants'; // Adjusted path
// Removed CSS Module import if not needed
// import styles from './GOUmapAnalysisUnit.module.css';

const { Text } = Typography;
type UmapViewMode = 'single' | 'multiple';

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('multiple');

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
        isLoading: isLoadingRaw, // Initial load state
        isFetching, // Background refetch state
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

    // Use isFetching for UI loading state to cover initial load AND background updates
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

    // --- Prepare Plot Data ---
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

    // --- Highlight GO ID Set ---
    const highlightGoIdsSet = useMemo(
        () => new Set(goIdFilterList),
        [goIdFilterList]
    );

    // --- Prepare Table Data Source ---
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

    // --- Prepare Table Columns ---
    const tableColumns = useMemo(() => {
        return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col: ColumnType<AnalysisTableRow>) => {
            if (!col.key) return col;
            let currentSortOrder: SorterResult<AnalysisTableRow>['order'] = null;
            if (
                tableSorter &&
                'field' in tableSorter &&
                tableSorter.field === col.key
            ) {
                currentSortOrder = tableSorter.order || null;
            }
            return {
                ...col,
                sortOrder: currentSortOrder,
            };
        });
    }, [tableSorter]);

    // --- Callbacks ---
    const handleToggleColorVisibility = useCallback((label: string) => { dispatch(toggleColorLabelVisibility(label)); }, [dispatch]);
    const handleToggleShapeVisibility = useCallback((label: string) => { dispatch(toggleShapeLabelVisibility(label)); }, [dispatch]);
    const handleToggleSizeVisibility = useCallback((label: string) => { dispatch(toggleSizeLabelVisibility(label)); }, [dispatch]);
    const handleColorByChange = useCallback((value: string) => { dispatch(setColorBy(value)); }, [dispatch]);
    const handleShapeByChange = useCallback((value: string) => { dispatch(setShapeBy(value)); }, [dispatch]);
    const handleSizeByChange = useCallback((value: string) => { dispatch(setSizeBy(value)); }, [dispatch]);
    const handleRankChange = useCallback((value: [number, number]) => { dispatch(setCommittedRankSliderValue(value)); }, [dispatch]);
    const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { dispatch(setGoIdInputString(e.target.value)); }, [dispatch]);
    const handleHighlightModeChange = useCallback((e: RadioChangeEvent) => { const mode = e.target.value as HighlightMode; if (Object.values(HighlightMode).includes(mode)) { dispatch(setHighlightModeAction(mode)); } else { console.warn('Invalid highlight mode selected:', mode); dispatch(setHighlightModeAction(HighlightMode.NONE)); } }, [dispatch]);
    const handleTableChange = useCallback((pagination: TablePaginationConfig, filters: Record<string, FilterValue | null>, sorter: SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[], extra: { currentDataSource: AnalysisTableRow[]; action: string }) => { console.log('[GOUmapAnalysisUnit] handleTableChange:', { pagination, filters, sorter, action: extra.action, }); setTablePagination(pagination); setTableSorter(sorter); }, []);
    const handleTableRowClick = useCallback((record: AnalysisTableRow) => { const clickedGoId = record?.go_id; console.log('[GOUmapAnalysisUnit] Row clicked:', clickedGoId); if (clickedGoId && clickedGoId === currentTableSelectedGoId) { dispatch(setTableSelectedGoId(null)); } else { dispatch(setTableSelectedGoId(clickedGoId || null)); } }, [dispatch, currentTableSelectedGoId]);
    const handleViewModeChange = useCallback((checked: boolean) => { setUmapViewMode(checked ? 'multiple' : 'single'); }, []);

    // === Render Logic ===

    // Handle error state first
    if (queryError) {
        const errorMessage = typeof queryError === 'object' && queryError !== null && 'message' in queryError ? String(queryError.message) : String(queryError);
        return (<Alert message="Error Loading Data" description={errorMessage} type="error" showIcon style={{ margin: '24px' }} />);
    }

    // Show Empty state if no project/analyses are selected
    if (!hasSelection) {
        return <Empty description="No analyses selected." style={{ marginTop: '50px' }} />;
    }

    // Render the main structure, passing loading state down
    return (
        // Root div - no border class here
        <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* Filters Row - Card border removed */}
                <Card size="small" bordered={false} /* className={styles.innerSectionCard} - Optional */ >
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
                                disabled={isLoading || !hasSelection || maxRank <= 0 || minRank >= maxRank}
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
                                // No cardTitle prop passed here
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

                        {/* Main Content Area (Plots + Accumulation) */}
                        <Col flex="auto">
                            <Spin spinning={isLoading} tip="Loading analysis data...">
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    {/* Accumulation Plots Section - Card border removed */}
                                    <Card size="small" title="Accumulation Plots" bordered={false} /* className={styles.innerSectionCard} - Optional */ >
                                        <Row gutter={[16, 16]}>
                                            {selectedBmdResultRefs?.map((refStr) => {
                                                const numericRef = Number(refStr);
                                                if (isNaN(numericRef)) return null;
                                                const bmdInfo = bmdResultMap.get(numericRef);
                                                const analysisNameForPlot = bmdInfo?.name || `Analysis ${numericRef}`;
                                                // Pass potentially null data if loading
                                                const pointsForThisAccumPlot = isLoading ? null : (allStyledPoints?.filter(p => p.bmdResultRef === numericRef) || null);
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

                                    {/* UMAP Plot Section - Card border removed */}
                                    <Card size="small" title="UMAP Visualization" bordered={false} /* className={styles.innerSectionCard} - Optional */ >
                                        {umapViewMode === 'single' ? (
                                            <UmapPlotComponent
                                                // Pass potentially null data if loading
                                                data={isLoading ? null : analysisPoints}
                                                referenceData={referenceData}
                                            />
                                        ) : (
                                            <Row gutter={[16, 16]}>
                                                {selectedBmdResultRefs?.map((refStr) => {
                                                    const numericRef = Number(refStr);
                                                    if (isNaN(numericRef)) return null;
                                                    // Pass potentially null data if loading
                                                    const pointsForThisPlot = isLoading ? null : (styledGroupedData?.get(refStr) || null);
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
                            </Spin>
                        </Col>

                        {/* Shape/Size Legend */}
                        <Col flex="200px">
                            <CustomLegends
                                // No cardTitle prop passed here
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

                {/* Table Row - Card border removed */}
                <Card size="small" title="Analysis Data Table" bordered={false} /* className={styles.innerSectionCard} - Optional */ >
                    <Row>
                        <Col span={24}>
                            <GOUmapAnalysisTable
                                dataSource={tableDataSource || []}
                                columns={tableColumns}
                                loading={isLoading} // Pass loading state to table
                                highlightMode={highlightMode}
                                highlightGoIdsSet={highlightGoIdsSet}
                                selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                                size="small"
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
