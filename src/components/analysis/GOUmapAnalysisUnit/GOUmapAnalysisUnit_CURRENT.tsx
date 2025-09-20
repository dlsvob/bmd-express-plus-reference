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
import { selectSelectedProjectName } from '../../../store/slices/projectSlice';
import { useCategoryAnalysisDataService } from '../../../hooks/useCategoryAnalysisDataService';
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
    TARGET_UMAP_PLOT_DIMENSION,
    FONT_SIZE_MULTIPLIER,
    BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css';

const { Text, Title } = Typography;
type UmapViewMode = 'single' | 'multiple';

// --- Style Constants ---
const verticalSpacingStyle: React.CSSProperties = { marginBottom: '24px' };
const horizontalScrollRowStyle: React.CSSProperties = { display: 'flex', width: '100%', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap', paddingBottom: '10px', gap: '16px', justifyContent: 'center' };
const stickyLegendBaseStyle: React.CSSProperties = { position: 'sticky', paddingBottom: '20px' };
type TableSorterType = SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[];

// ==========================================================================
// GOUmapAnalysisUnit Component
// ==========================================================================
const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- State ---
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('single');
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] = useState(true);
    const [umapRenderedWidth, setUmapRenderedWidth] = useState<number | null>(null);
    const [legendTopOffset, setLegendTopOffset] = useState<number>(50);
    const [tableSorter, setTableSorter] = useState<TableSorterType>([{ field: 'go_term', order: 'ascend', columnKey: 'go_term' }, { field: 'bmdResultName', order: 'ascend', columnKey: 'bmdResultName' }]);
    const [tablePagination, setTablePagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 50, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100', '500'], position: ['bottomRight'] });

    // --- Refs ---
    const umapContainerRef = useRef<HTMLDivElement>(null);
    const filterHeaderRef = useRef<HTMLDivElement>(null);

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
    const { data: rawData, isLoading: isLoadingRaw, isFetching, error: rawError, isSuccess: rawSuccess } = useCategoryAnalysisDataService(projectName, selectedBmdResultRefs);

    // --- Data Processing Hooks ---
       const { bmdRefToExperimentNameMap } = useMemo<{ // <<< Remove bmdResultMap here
         bmdResultMap: Map<number, BMDResult>; // Keep type annotation if needed
         bmdRefToExperimentNameMap: Map<number, string>;
     }>(() => {
         const tempBmdResultMap = new Map<number, BMDResult>();
         const tempBmdRefToNameMap = new Map<number, string>();
         // ... (calculations using rawData to populate tempBmdResultMap and tempBmdRefToNameMap) ...
         // Still return both values from the useMemo function
         return { bmdResultMap: tempBmdResultMap, bmdRefToExperimentNameMap: tempBmdRefToNameMap };
     }, [rawSuccess, rawData]);
     
     const { allStyledPoints, colorItems, shapeItems, sizeItems, minRank, maxRank }: PreparedPlotHookData = usePreparedPlotData({ // <<< Removed analysisPoints, styledGroupedData
         selectedBmdResultRefs: selectedBmdResultRefs || [],
         referenceDataMap: referenceDataMap,
         referenceData: referenceData
     });

const tableDataSource = useMemo(() => {
    const points = allStyledPoints || [];
    const sorters = (
        Array.isArray(tableSorter) ? tableSorter : (tableSorter && tableSorter.columnKey ? [tableSorter] : [])
    ).filter(s => s.order);

    if (!sorters || sorters.length === 0) return points;

    const sortedPoints = [...points];

    sortedPoints.sort((a, b) => {
        for (const sorter of sorters) {
            const column = DEFAULT_GOUMAP_TABLE_COLUMNS.find(
                col => col.key === sorter.columnKey || col.key === sorter.field
            );
            if (column && typeof column.sorter === 'function') {
                let result: number;
                try {
                    // Attempt to call sorter with order (might fail for some)
                    result = column.sorter(a, b, sorter.order);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_e) {
                    // Fallback: call sorter without order if the above failed
                    result = (column.sorter as (a: AnalysisTableRow, b: AnalysisTableRow) => number)(a, b);
                }
                if (result !== 0) {
                    return sorter.order === 'descend' ? -result : result;
                }
            }
        }
        return 0;
    });

    return sortedPoints;
}, [allStyledPoints, tableSorter]); // Dependencies for useMemo

    const tableColumns = useMemo(() => {
        const sortersArray = Array.isArray(tableSorter) ? tableSorter : (tableSorter && tableSorter.columnKey ? [tableSorter] : []); return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col: ColumnType<AnalysisTableRow>) => { if (!col.key || !col.sorter) return col; const currentColumnSorter = sortersArray.find(s => s.columnKey === col.key || s.field === col.key); return { ...col, sortOrder: currentColumnSorter ? currentColumnSorter.order : null, }; });
    }, [tableSorter]);

    const highlightGoIdsSet = useMemo(() => new Set(goIdFilterList), [goIdFilterList]);

    // *** MOVED HOOK CALLS BEFORE EARLY RETURNS ***
    // Calculate Accumulation plot size based on MEASURED UMAP width
    const accumPlotSize = useMemo(() => umapRenderedWidth ? Math.round(umapRenderedWidth / 2) : undefined, [umapRenderedWidth]);

    // Calculate Accumulation plot title style
    const accumTitleStyle: React.CSSProperties = useMemo(() => ({
        fontSize: `${BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER}px`,
        textAlign: 'center', marginBottom: '8px', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        width: accumPlotSize ?? 'auto' // Use calculated size for width constraint
    }), [accumPlotSize]);
    // **********************************************

    // --- Effects ---
    useEffect(() => { // Measure UMAP Width
        const targetElement = umapContainerRef.current;
        if (!targetElement || !allStyledPoints) { console.log(`[UMAP Measure Effect] Skipping: Ref element (${!!targetElement}) or allStyledPoints (${!!allStyledPoints}) not ready.`); setUmapRenderedWidth(prevWidth => (prevWidth !== null ? null : prevWidth)); return; }
        console.log('[UMAP Measure Effect] Setting up ResizeObserver on inner div.');
        const resizeObserver = new ResizeObserver((entries) => { const entry = entries[0]; if (entry) { const width = entry.contentRect?.width; console.log(`[UMAP Measure Effect] ResizeObserver fired. contentRect.width = ${width}`); if (width !== undefined && width > 0) { const roundedWidth = Math.round(width); setUmapRenderedWidth(prevWidth => (prevWidth !== roundedWidth ? roundedWidth : prevWidth)); } else { console.warn(`[UMAP Measure Effect] ResizeObserver reported width <= 0 or undefined.`); } } });
        resizeObserver.observe(targetElement);
        const rafId = requestAnimationFrame(() => { if (umapContainerRef.current) { const initialWidth = umapContainerRef.current.offsetWidth; console.log(`[UMAP Measure Effect] Initial offsetWidth (inside rAF): ${initialWidth}`); if (initialWidth > 0) setUmapRenderedWidth(prevWidth => (prevWidth !== initialWidth ? initialWidth : prevWidth)); else console.warn('[UMAP Measure Effect] Initial offsetWidth is still 0 inside rAF.'); } });
        return () => { console.log('[UMAP Measure Effect] Disconnecting ResizeObserver.'); resizeObserver.disconnect(); cancelAnimationFrame(rafId); };
    }, [allStyledPoints]);

useEffect(() => { // Measure Legend Offset
    const headerElement = filterHeaderRef.current;
    // Define marginBottom calculation once (assuming verticalSpacingStyle was removed, otherwise use it)
    const marginBottom = 16; // Example: Or read from style if verticalSpacingStyle exists
    const validMarginBottom = !isNaN(marginBottom) ? marginBottom : 0;

    if (headerElement) {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                // --- Assert type for entry.target ---
                const height = (entry.target as HTMLElement).offsetHeight;
                // -------------------------------------
                if (height > 0) {
                    const newOffset = height + validMarginBottom;
                    setLegendTopOffset(prevOffset => (prevOffset !== newOffset) ? newOffset : prevOffset);
                }
            }
        });
        resizeObserver.observe(headerElement);

        // --- Assert type for headerElement ---
        const initialHeight = (headerElement as HTMLElement).offsetHeight;
        // ----------------------------------
        if (initialHeight > 0) {
            setLegendTopOffset(initialHeight + validMarginBottom);
        }
        return () => resizeObserver.disconnect();
    }
}, [isFilterHeaderCollapsed]); // Make sure dependencies are correct, might need verticalSpacingStyle if it wasn't removed

    // --- Callbacks ---
    const handleToggleColorVisibility = useCallback((label: string) => { dispatch(toggleColorLabelVisibility(label)); }, [dispatch]);
    const handleToggleShapeVisibility = useCallback((label: string) => { dispatch(toggleShapeLabelVisibility(label)); }, [dispatch]);
    const handleToggleSizeVisibility = useCallback((label: string) => { dispatch(toggleSizeLabelVisibility(label)); }, [dispatch]);
    const handleColorByChange = useCallback((value: string) => { dispatch(setColorBy(value)); }, [dispatch]);
    const handleShapeByChange = useCallback((value: string) => { dispatch(setShapeBy(value)); }, [dispatch]);
    const handleSizeByChange = useCallback((value: string) => { dispatch(setSizeBy(value)); }, [dispatch]);
    const handleRankChange = useCallback((value: [number, number]) => { dispatch(setCommittedRankSliderValue(value)); }, [dispatch]);
    const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { dispatch(setGoIdInputString(e.target.value)); }, [dispatch]);
    const handleHighlightModeChange = useCallback((e: RadioChangeEvent) => { const mode = e.target.value as HighlightMode; dispatch(setHighlightModeAction(Object.values(HighlightMode).includes(mode) ? mode : HighlightMode.NONE)); }, [dispatch]);
    const handleTableChange = useCallback((
     pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>, // <<< Prefixed with underscore
     sorter: TableSorterType
 ) => {
     setTablePagination(pagination);
     setTableSorter(sorter);
 }, []);
    const handleTableRowClick = useCallback((record: AnalysisTableRow) => { const clickedGoId = record?.go_id; dispatch(setTableSelectedGoId(clickedGoId && clickedGoId === currentTableSelectedGoId ? null : (clickedGoId || null))); }, [dispatch, currentTableSelectedGoId]);
    const handleViewModeChange = useCallback((checked: boolean) => { setUmapViewMode(checked ? 'multiple' : 'single'); }, []);
    const toggleFilterHeaderCollapse = useCallback(() => { setIsFilterHeaderCollapsed((prev) => !prev); }, []);

    // === Render Logic ===

    // ** Moved Loading/Error/NoSelection checks AFTER all hook calls **
    const isLoading = isLoadingRaw || isFetching;
    const queryError = rawError;
    const hasSelection = selectedBmdResultRefs && selectedBmdResultRefs.length > 0;

    if (queryError) { return (<Alert message="Error Loading Analysis Data" description={String(queryError)} type="error" showIcon style={{ margin: '24px' }} />); }
    if (isLoading) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading analysis data..." /></div>; }
    if (!hasSelection) { return (<Empty description="No analyses selected." style={{ marginTop: '50px' }} />); }
    // *****************************************************************

    const rootStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' };
    const stickyLegendStyle: React.CSSProperties = { ...stickyLegendBaseStyle, top: `${legendTopOffset}px` };

    return (
        <div style={rootStyle} className={styles.goumapRoot}>
            {/* Filter Header */}
            <div ref={filterHeaderRef} className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded}`} style={verticalSpacingStyle}>
                <div className={styles.filterHeaderToolbar}><Title level={5} style={{ margin: 0, flexGrow: 1 }}>Filters & Styling</Title><Button type="text" icon={isFilterHeaderCollapsed ? <DownOutlined /> : <UpOutlined />} onClick={toggleFilterHeaderCollapse} /></div>
                <div className={styles.filterHeaderControls}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12} lg={8}><GoIdFilterUI {...{ goIdInputString, highlightMode, onGoIdInputChange: handleGoIdInputChange, onHighlightModeChange: handleHighlightModeChange }} /></Col>
                        <Col xs={24} md={12} lg={8}><SlidingWindowFilter {...{ min: minRank, max: maxRank, value: committedRankValue, onAfterChange: handleRankChange, disabled: !hasSelection || maxRank <= 0 || minRank >= maxRank, label: "Filter by Rank", analysisName: "GOUmapRankFilter" }} /></Col>
                        <Col xs={24} md={24} lg={8}><StylingSelectors {...{ colorByOption, shapeByOption, sizeByOption, onColorByChange: handleColorByChange, onShapeByChange: handleShapeByChange, onSizeByChange: handleSizeByChange, colorOptions: COLOR_BY_OPTIONS, shapeOptions: SHAPE_BY_OPTIONS, sizeOptions: SIZE_BY_OPTIONS, disabled: !hasSelection }} /></Col>
                        <Col xs={24}><Space style={{ marginTop: '10px' }}><Text strong>View Mode:</Text><Switch checkedChildren="Multiple" unCheckedChildren="Single" checked={umapViewMode === 'multiple'} onChange={handleViewModeChange} disabled={!hasSelection} /></Space></Col>
                    </Row>
                </div>
            </div>

            {/* Main Content Row */}
            <Row gutter={[16, 16]} wrap={false} align="top" style={{ flexGrow: 1, minHeight: 0 }}>
                {/* Left Legend */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}><div style={stickyLegendStyle}><CustomLegends {...{ colorItems, hiddenColorLabelsSet, onToggleColorVisibility: handleToggleColorVisibility, onToggleShapeVisibility: handleToggleShapeVisibility, onToggleSizeVisibility: handleToggleSizeVisibility, showColor: true, showShape: false, showSize: false }} /></div></Col>

                {/* Center Content */}
                <Col flex="auto" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* === UMAP Plot Area === */}
                    <Card size="small" title="Combined UMAP Plot" bordered={false} style={verticalSpacingStyle}>
                        <Row justify="center">
                            <Col xs={24} md={20} lg={16} xl={14}>
                                <div ref={umapContainerRef} style={{ width: '100%', maxWidth: TARGET_UMAP_PLOT_DIMENSION, margin: '0 auto' }} >
                                    <UmapPlotComponent data={allStyledPoints} referenceData={referenceData} />
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    {/* === Accumulation Plots Area === */}
                    {umapRenderedWidth ? (
                        <Card size="small" title={`Individual Accumulation Plots (${umapViewMode} view)`} bordered={false} style={verticalSpacingStyle}>
                            <Row gutter={[16, 0]} style={horizontalScrollRowStyle} align="top">
                                {(selectedBmdResultRefs || []).map((refStr) => {
                                    const numericRef = Number(refStr); if (isNaN(numericRef)) return null;
                                    const analysisNameForPlot = bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${numericRef}`;
                                    const pointsForThisAccumPlot = allStyledPoints?.filter(p => p.bmdResultRef === numericRef) || null;
                                    // Use accumPlotSize calculated before the return
                                    if (!accumPlotSize) return null; // Skip if size invalid

                                    return (
                                        <Col key={`${umapViewMode}-accum-${refStr}`} style={{ flex: '0 0 auto' }}>
                                            <Title level={5} style={accumTitleStyle} title={analysisNameForPlot}>
                                                {analysisNameForPlot}
                                            </Title>
                                            <AccumulationPlot
                                                analysisName={analysisNameForPlot}
                                                styledPointsForPlot={pointsForThisAccumPlot}
                                                bmdResultRef={numericRef}
                                                width={accumPlotSize} height={accumPlotSize}
                                            />
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Card>
                    ) : (
                        // Show placeholder only if data is ready but layout isn't
                        !isLoading && hasSelection && <div style={{ padding: '20px', textAlign: 'center', color: '#888', ...verticalSpacingStyle }}>Calculating layout...</div>
                    )}

                    {/* === Table Area === */}
                    <Card size="small" title="Analysis Data Table" bordered={false} style={{ marginTop: 'auto' }}>
                        <Row><Col span={24}><GOUmapAnalysisTable {...{ dataSource: tableDataSource, columns: tableColumns, loading: isLoading, highlightMode, highlightGoIdsSet, selectedAccumGoIdsSet, size: "small", scroll: { y: 400, x: 'max-content' }, pagination: tablePagination, onChange: handleTableChange, onRowClick: handleTableRowClick }} /></Col></Row>
                    </Card>
                </Col>

                {/* Right Legend */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}><div style={stickyLegendStyle}><CustomLegends {...{ shapeItems, sizeItems, hiddenShapeLabelsSet, hiddenSizeLabelsSet, onToggleColorVisibility: handleToggleColorVisibility, onToggleShapeVisibility: handleToggleShapeVisibility, onToggleSizeVisibility: handleToggleSizeVisibility, showColor: false, showShape: true, showSize: true }} /></div></Col>
            </Row>
        </div>
    );
};

export default GOUmapAnalysisUnit;