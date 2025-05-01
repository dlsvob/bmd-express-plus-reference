import React, { useCallback, useMemo, useState } from 'react';
import {
    Row, Col, Spin, Alert, Space, Switch, Typography, Card, RadioChangeEvent, Empty, Button
} from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { usePreparedPlotData } from '../../../hooks/usePreparedPlotData';
import type { AnalysisTableRow, PreparedPlotHookData } from '../../../models/applicationModel';
import type { BMDResult } from '../../../models/BMDxExported';
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import { selectReferenceDataMap, selectReferenceData } from '../../../store/selectors/referenceDataSelector';
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
import type { TablePaginationConfig, SorterResult, FilterValue } from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table';
import CustomLegends from '../shared/CustomLegends';
import StylingSelectors from '../controls/StylingSelectors';
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import AccumulationPlot from './AccumulationPlot';
import GoIdFilterUI from '../controls/GoUIdFilterUI'; // Corrected path
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css'; // Import CSS module

const { Text, Title } = Typography;
type UmapViewMode = 'single' | 'multiple';

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('multiple');
    // State for Filter Header Collapse
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] = useState(false);

    // Selectors
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

    // State for Table
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

    // Data Fetching
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

    // Memoized Maps
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

    // Prepare Plot Data
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

    // Highlight GO ID Set
    const highlightGoIdsSet = useMemo(
        () => new Set(goIdFilterList),
        [goIdFilterList]
    );

    // Prepare Table Data Source
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

    // Prepare Table Columns
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

    // Callbacks
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
    // Handler for collapsing the filter header
    const toggleFilterHeaderCollapse = useCallback(() => {
        setIsFilterHeaderCollapsed(prev => !prev);
    }, []);

    // === Render Logic ===

    if (queryError) {
        const errorMessage = typeof queryError === 'object' && queryError !== null && 'message' in queryError ? String(queryError.message) : String(queryError);
        return (<Alert message="Error Loading Data" description={errorMessage} type="error" showIcon style={{ margin: '24px' }} />);
    }

    if (!hasSelection) {
        return <Empty description="No analyses selected." style={{ marginTop: '50px' }} />;
    }

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* --- Filter Header Section --- */}
                <div className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded}`}>
                    <div className={styles.filterHeaderToolbar}>
                        <Title level={5} style={{ margin: 0, flexGrow: 1 }}>Filters & Styling</Title>
                        <Button
                            type="text"
                            icon={isFilterHeaderCollapsed ? <DownOutlined /> : <UpOutlined />}
                            onClick={toggleFilterHeaderCollapse}
                            aria-label={isFilterHeaderCollapsed ? 'Expand Filters' : 'Collapse Filters'}
                        />
                    </div>
                    {/* Controls div is ALWAYS rendered, visibility controlled by CSS */}
                    <div className={styles.filterHeaderControls}>
                        <GoIdFilterUI
                            goIdInputString={goIdInputString}
                            highlightMode={highlightMode}
                            onGoIdInputChange={handleGoIdInputChange}
                            onHighlightModeChange={handleHighlightModeChange}
                        />
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
                    </div>
                </div>
                {/* --- END Filter Header Section --- */}


                {/* Plots/Legends Row */}
                <div>
                    <Row gutter={[16, 16]} wrap={false}>
                        {/* Color Legend */}
                        <Col flex="200px">
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

                        {/* Main Content Area (Plots + Accumulation) */}
                        <Col flex="auto">
                            <Spin spinning={isLoading} tip="Loading analysis data...">
                                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                    {/* Accumulation Plots Section */}
                                    <Card size="small" title="Accumulation Plots" variant={'borderless'}>
                                        <Row gutter={[16, 16]}>
                                            {selectedBmdResultRefs?.map((refStr) => {
                                                const numericRef = Number(refStr);
                                                if (isNaN(numericRef)) return null;
                                                const bmdInfo = bmdResultMap.get(numericRef);
                                                const analysisNameForPlot = bmdInfo?.name || `Analysis ${numericRef}`;
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

                                    {/* UMAP Plot Section */}
                                    <Card size="small" title="UMAP Visualization" bordered={false}>
                                        {umapViewMode === 'single' ? (
                                            <UmapPlotComponent
                                                data={isLoading ? null : analysisPoints}
                                                referenceData={referenceData}
                                            />
                                        ) : (
                                            <Row gutter={[16, 16]}>
                                                {selectedBmdResultRefs?.map((refStr) => {
                                                    const numericRef = Number(refStr);
                                                    if (isNaN(numericRef)) return null;
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

                {/* Table Row */}
                <Card size="small" title="Analysis Data Table" bordered={false}>
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
                            />
                        </Col>
                    </Row>
                </Card>

            </Space>
        </div>
    );
};

export default GOUmapAnalysisUnit;
