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
    // Need RadioChangeEvent if keeping that callback, but it might be unused now
    // type RadioChangeEvent,
    Empty,
    Button,
} from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import UmapPlotComponent from './UmapPlotComponent';
import AccumulationPlot from './AccumulationPlot';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
// Import the hook that provides the plot data
import { usePreparedPlotData } from '../../../hooks/usePreparedPlotData';

// Import *types* used in this component
import type {
    AnalysisTableRow,
    PreparedPlotHookData,
} from '../../../models/applicationModel';
import type { BMDResult } from '../../../models/BMDxExported'; // Only used for typing Map key
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../../store/selectors/referenceDataSelector';
import {
    HighlightMode, // Keep enum import
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
import { FIELD_SELECTIONS } from '../../../constants/categoryAnalysisFields';
import { GOUmapAnalysisTable } from './GOUmapAnalysisTable';
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../../../config/tableColumnDefinitions';
import type {
    TablePaginationConfig,
    SorterResult,
    FilterValue, // Keep FilterValue if used in handleTableChange
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table';
import CustomLegends from '../shared/CustomLegends';
import StylingSelectors from '../controls/StylingSelectors';
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import GoIdFilterUI from '../controls/GoUIdFilterUI';
// Import constants used
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
    TARGET_UMAP_PLOT_DIMENSION,
    FONT_SIZE_MULTIPLIER,
    BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX,
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css';

const { Text, Title } = Typography;
type UmapViewMode = 'single' | 'multiple';

// --- Style Constants ---
const verticalSpacingStyle: React.CSSProperties = { marginBottom: '24px' };
const horizontalScrollRowStyle: React.CSSProperties = { display: 'flex', width: '100%', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap', paddingBottom: '10px', gap: '16px', justifyContent: 'flex-start' }; // Changed justify to start
const stickyLegendBaseStyle: React.CSSProperties = { position: 'sticky', paddingBottom: '20px' };
type TableSorterType = SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[];

// Default height for accumulation plots when height isn't derived from UMAP
const defaultAccumPlotHeight = '300px'; // Example fixed height

// ==========================================================================
// GOUmapAnalysisUnit Component
// ==========================================================================
const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- State ---
    const [umapViewMode, setUmapViewMode] = useState<UmapViewMode>('single');
    const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] = useState(true); // Start collapsed
    const [umapRenderedWidth, setUmapRenderedWidth] = useState<number | null>(null);
    // Accumulation plot height state (from previous version)
    const [accumulationPlotHeight, setAccumulationPlotHeight] = useState<string | null>(null);
    const [legendTopOffset, setLegendTopOffset] = useState<number>(50); // Adjusted initial guess
    // Ensure tableSorter has a default that works with Array.isArray check
    const [tableSorter, setTableSorter] = useState<TableSorterType>([]);
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
    const { data: rawData, isLoading: isLoadingRaw, isFetching, error: rawError, isSuccess: rawSuccess } = useCategoryAnalysisDataService(projectName, selectedBmdResultRefs || [], FIELD_SELECTIONS.BASIC_ANALYSIS);

    // --- Data Processing Hooks ---
    // Only need name map here
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

    // Use prepared plot data hook (gets styled points, legends, ranks)
    // Removed analysisPoints, styledGroupedData as they weren't used directly
    const { allStyledPoints, colorItems, shapeItems, sizeItems, minRank, maxRank }: PreparedPlotHookData = usePreparedPlotData({
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        referenceDataMap: referenceDataMap,
        referenceData: referenceData
        // Pass other necessary state for styling/filtering if hook requires it
        // colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption, etc.
        // Check usePreparedPlotData hook definition for required args
    });

    // Table data source derived from styled points and current sorter state
    const tableDataSource = useMemo(() => {
        const points = allStyledPoints || [];
        // Ensure sorters is always an array for easier handling
        const sorters = (Array.isArray(tableSorter) ? tableSorter : (tableSorter?.columnKey ? [tableSorter] : [])).filter(s => s && s.order);

        if (!sorters || sorters.length === 0) return points;

        const sortedPoints = [...points]; // Create mutable copy

        sortedPoints.sort((a, b) => {
            for (const sorter of sorters) {
                if (!sorter.columnKey && !sorter.field) continue; // Skip if no key/field
                // Prefer columnKey but fallback to field
                const sortKey = sorter.columnKey ?? sorter.field;

                const column = DEFAULT_GOUMAP_TABLE_COLUMNS.find(col => col.key === sortKey);

                if (column && typeof column.sorter === 'function') {
                    let result: number;
                    try {
                        // Attempt to call sorter with AntD signature (valueA, valueB, sortOrder)
                        // Note: AntD sorter function doesn't usually take order as 3rd arg directly
                        // It relies on the return value sign combined with the 'order' prop
                        // Let's call it simply, and apply order reversal later if needed
                        result = (column.sorter as (a: AnalysisTableRow, b: AnalysisTableRow) => number)(a, b);
                    } catch (e) {
                         console.error("Table sorting error:", e);
                         result = 0; // Default to no difference on error
                    }
                    if (result !== 0) {
                        return sorter.order === 'descend' ? -result : result;
                    }
                }
            }
            return 0;
        });
        return sortedPoints;
    }, [allStyledPoints, tableSorter]);

    // Table columns derived from defaults and current sorter state
    const tableColumns = useMemo(() => {
        const sortersArray = Array.isArray(tableSorter) ? tableSorter : (tableSorter?.columnKey ? [tableSorter] : []);
        return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col: ColumnType<AnalysisTableRow>) => {
            if (!col.key) return col; // Column needs key for sorting state
            // Find the sorter state matching this column's key
            const currentColumnSorter = sortersArray.find(s => s.columnKey === col.key);
            return {
                ...col,
                sortOrder: currentColumnSorter ? currentColumnSorter.order : null, // Apply sortOrder for UI indicator
            };
        });
    }, [tableSorter]);

    // Set of GO IDs for highlighting in table
    const highlightGoIdsSet = useMemo(() => new Set(goIdFilterList), [goIdFilterList]);

    // Calculate Accumulation plot size based on MEASURED UMAP width
    const accumPlotSize = useMemo(() => {
        // Only calculate size if needed (e.g., for single view's horizontal scroll)
        // For the 'multiple' view in the example, size might be determined by column layout
        if (umapViewMode === 'single' && umapRenderedWidth) {
            return Math.round(umapRenderedWidth / 2); // Example calculation
        }
         // Return undefined or a default if not in single mode or width not ready
         // The AccumulationPlot component itself might have internal defaults
        return undefined;
    }, [umapViewMode, umapRenderedWidth]);

    // Calculate Accumulation plot title style
    const accumTitleStyle: React.CSSProperties = useMemo(() => ({
        fontSize: `${BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX * FONT_SIZE_MULTIPLIER}px`,
        textAlign: 'center', marginBottom: '8px', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        // Width might not be needed if Col handles it, or use a default/max-width
        // width: accumPlotSize ?? 'auto'
    }), [/* accumPlotSize */]); // Remove accumPlotSize if width isn't set

    // --- Effects ---
     // Effect to measure UMAP width (primarily for single view accumulation plots)
     useEffect(() => {
        const targetElement = umapContainerRef.current; // Ref should be on the container in SINGLE view mode
        // Only run observer if in single view and element exists
        if (umapViewMode !== 'single' || !targetElement || !allStyledPoints) {
            // If not in single view, or element/data isn't ready, clear width
             if (umapRenderedWidth !== null) setUmapRenderedWidth(null);
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const width = entry.contentRect?.width;
                if (width !== undefined && width > 0) {
                    const roundedWidth = Math.round(width);
                    setUmapRenderedWidth(prevWidth => (prevWidth !== roundedWidth ? roundedWidth : prevWidth));
                }
            }
        });
        resizeObserver.observe(targetElement);

         // Measure initial size too
        const initialWidth = targetElement.offsetWidth;
         if (initialWidth > 0) setUmapRenderedWidth(initialWidth);

        return () => { resizeObserver.disconnect(); };
    }, [umapViewMode, allStyledPoints]); // Rerun if mode changes or data loads

    // Effect to measure filter header height for legend offset
    useEffect(() => {
        const headerElement = filterHeaderRef.current;
        if (headerElement) {
            const measureHeight = () => {
                 const height = headerElement.getBoundingClientRect().height;
                 if (height > 0) {
                     const newOffset = Math.round(height);
                     setLegendTopOffset(prevOffset => (prevOffset !== newOffset ? newOffset : prevOffset));
                 }
            }
            const resizeObserver = new ResizeObserver(measureHeight);
            resizeObserver.observe(headerElement);
            measureHeight(); // Initial measurement
            return () => resizeObserver.disconnect();
        }
    }, [isFilterHeaderCollapsed]); // Re-measure only if collapse state changes

     // Effect to calculate Accumulation Plot height based on UMAP width (only in single mode)
     // This effect seems redundant if accumPlotSize calculates width; height might be fixed or aspect ratio
     // Let's keep the original logic from the user's 'working' version for setting height state
     useEffect(() => {
         if (umapViewMode !== 'single') {
             // Clear height if not in single mode? Or set default?
             if (accumulationPlotHeight !== null) setAccumulationPlotHeight(null);
             return;
         }
         const targetElement = umapContainerRef.current; // UMAP plot container ref
         if (!targetElement) {
             return;
         }
         const resizeObserver = new ResizeObserver((entries) => {
             for (let entry of entries) {
                 const { height } = entry.contentRect;
                 if (height > 0) {
                     const newHeight = Math.round(height / 2); // Calculate based on UMAP height
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
     }, [umapViewMode, accumulationPlotHeight]); // Rerun if mode changes


    // --- Callbacks ---
    // (Keep all useCallback definitions as they were in the latest working version)
    const handleToggleColorVisibility = useCallback((label: string) => { dispatch(toggleColorLabelVisibility(label)); }, [dispatch]);
    const handleToggleShapeVisibility = useCallback((label: string) => { dispatch(toggleShapeLabelVisibility(label)); }, [dispatch]);
    const handleToggleSizeVisibility = useCallback((label: string) => { dispatch(toggleSizeLabelVisibility(label)); }, [dispatch]);
    const handleColorByChange = useCallback((value: string) => { dispatch(setColorBy(value)); }, [dispatch]);
    const handleShapeByChange = useCallback((value: string) => { dispatch(setShapeBy(value)); }, [dispatch]);
    const handleSizeByChange = useCallback((value: string) => { dispatch(setSizeBy(value)); }, [dispatch]);
    const handleRankChange = useCallback((value: [number, number]) => { dispatch(setCommittedRankSliderValue(value)); }, [dispatch]);
    const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { dispatch(setGoIdInputString(e.target.value)); }, [dispatch]);
    // Need to import RadioChangeEvent if using this specific type
    const handleHighlightModeChange = useCallback((e: any /* React.ChangeEvent<HTMLInputElement> | RadioChangeEvent */) => {
        const mode = e.target.value as HighlightMode;
        dispatch(setHighlightModeAction(Object.values(HighlightMode).includes(mode) ? mode : HighlightMode.NONE));
    }, [dispatch]);
    // Updated handleTableChange to match AntD v5 signature and only use sorter
     const handleTableChange = useCallback(
        (
            pagination: TablePaginationConfig,
            _filters: Record<string, FilterValue | null>, // Marked as unused
            sorter: TableSorterType,
            // extra: TableCurrentDataSource<AnalysisTableRow> // Optional extra arg
        ) => {
            setTablePagination(pagination);
            // Handle single or multi-sorter (take first if array)
            const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
            setTableSorter(currentSorter || {}); // Set to empty object if undefined/null
        },
        [] // No dependencies needed if only using setters
    );
    const handleTableRowClick = useCallback((record: AnalysisTableRow) => { const clickedGoId = record?.go_id; dispatch(setTableSelectedGoId(clickedGoId && clickedGoId === currentTableSelectedGoId ? null : (clickedGoId || null))); }, [dispatch, currentTableSelectedGoId]);
    const handleViewModeChange = useCallback((checked: boolean) => { setUmapViewMode(checked ? 'multiple' : 'single'); }, []);
    const toggleFilterHeaderCollapse = useCallback(() => { setIsFilterHeaderCollapsed((prev) => !prev); }, []);

    // === Render Logic ===

    // Loading/Error/NoSelection checks (keep as they were)
    const isLoading = isLoadingRaw || isFetching;
    const queryError = rawError;
    const hasSelection = selectedBmdResultRefs && selectedBmdResultRefs.length > 0;

    if (queryError) { return (<Alert message="Error Loading Analysis Data" description={String(queryError)} type="error" showIcon style={{ margin: '24px' }} />); }
    // Show loading spinner centered if loading OR if data processing isn't finished (allStyledPoints is null)
    if (isLoading || (hasSelection && !allStyledPoints)) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" tip="Loading or Processing Analysis Data..." /></div>; }
    if (!hasSelection) { return (<Empty description="No analyses selected. Please select analyses from the Experiment List." style={{ marginTop: '50px' }} />); }
    // *****************************************************************

    const rootStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, width: '100%' };
    const stickyLegendStyle: React.CSSProperties = { ...stickyLegendBaseStyle, top: `${legendTopOffset}px` };

    // --- RETURN JSX ---
    return (
        <div style={rootStyle} className={styles.goumapRoot}>
            {/* Filter Header (Keep as is) */}
            <div ref={filterHeaderRef} className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded}`} style={verticalSpacingStyle}>
                 <div className={styles.filterHeaderToolbar} onClick={toggleFilterHeaderCollapse}> {/* Make whole bar clickable */}
                     <Title level={5} style={{ margin: 0, flexGrow: 1 }}>Filters & Styling</Title>
                     <Button type="text" icon={isFilterHeaderCollapsed ? <DownOutlined /> : <UpOutlined />} aria-label={isFilterHeaderCollapsed ? 'Expand Filters' : 'Collapse Filters'} />
                 </div>
                 <div className={styles.filterHeaderControls}>
                     <Row gutter={[16, 16]}>
                         <Col xs={24} md={12} lg={8}><GoIdFilterUI {...{ goIdInputString, highlightMode, onGoIdInputChange: handleGoIdInputChange, onHighlightModeChange: handleHighlightModeChange }} /></Col>
                         <Col xs={24} md={12} lg={8}><SlidingWindowFilter {...{ min: minRank, max: maxRank, value: committedRankValue, onAfterChange: handleRankChange, disabled: !hasSelection || maxRank <= 0 || minRank >= maxRank, label: "Filter by Rank", analysisName: "GOUmapRankFilter" }} /></Col>
                         <Col xs={24} md={24} lg={8}><StylingSelectors {...{ colorByOption, shapeByOption, sizeByOption, onColorByChange: handleColorByChange, onShapeByChange: handleShapeByChange, onSizeByChange: handleSizeByChange, colorOptions: COLOR_BY_OPTIONS, shapeOptions: SHAPE_BY_OPTIONS, sizeOptions: SIZE_BY_OPTIONS, disabled: !hasSelection }} /></Col>
                         <Col xs={24}><Space style={{ marginTop: '10px' }}><Text strong>UMAP View:</Text><Switch checkedChildren="Multiple" unCheckedChildren="Single" checked={umapViewMode === 'multiple'} onChange={handleViewModeChange} disabled={!hasSelection} /></Space></Col>
                     </Row>
                 </div>
             </div>

            {/* Main Content Row (Keep as is) */}
            <Row gutter={[16, 16]} wrap={false} align="top" style={{ flexGrow: 1, minHeight: 0 }}>
                {/* Left Legend (Keep as is) */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}><div style={stickyLegendStyle}><CustomLegends {...{ colorItems, hiddenColorLabelsSet, onToggleColorVisibility: handleToggleColorVisibility, onToggleShapeVisibility: handleToggleShapeVisibility, onToggleSizeVisibility: handleToggleSizeVisibility, showColor: true, showShape: false, showSize: false }} /></div></Col>

                {/* Center Content Column (Integrate Conditional Logic Here) */}
                <Col flex="auto" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>

                    {/* == MULTIPLE VIEW MODE RENDERING (From user's 'working' code) == */}
                    {umapViewMode === 'multiple' &&
                        selectedBmdResultRefs?.map((refStr) => {
                            const numericRef = Number(refStr);
                            if (isNaN(numericRef)) return null;
                            const analysisNameForPlot =
                                bmdRefToExperimentNameMap.get(numericRef) ||
                                `Analysis ${numericRef}`;
                            // Data for sub-plots (use allStyledPoints, filter locally)
                             const pointsForAccumPlot = allStyledPoints?.filter(
                                (p) => p.bmdResultRef === numericRef
                            ) || null;
                            // For the mini-UMAP, we need points ONLY for this ref
                            // Let's filter allStyledPoints here too for consistency
                             const pointsForUmapPlot = allStyledPoints?.filter(
                                (p) => p.bmdResultRef === numericRef
                             ) || null;

                             // Skip rendering if no points for this analysis ref
                             if (!pointsForAccumPlot && !pointsForUmapPlot) return null;

                            return (
                                <Card
                                    key={`exp-row-${refStr}`}
                                    size="small"
                                    title={analysisNameForPlot}
                                    bordered={false}
                                    style={{ // Use verticalSpacingStyle for margin
                                        width: '100%',
                                        marginBottom: '16px', // Or use verticalSpacingStyle.marginBottom
                                    }}
                                >
                                    <Row gutter={[16, 16]} align="top">
                                        <Col xs={24} lg={12}>
                                            <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>Accumulation</Title>
                                            <AccumulationPlot
                                                analysisName={analysisNameForPlot}
                                                styledPointsForPlot={pointsForAccumPlot}
                                                bmdResultRef={numericRef}
                                                // Width/Height might be implicitly controlled by Col, or pass fixed values
                                                // height={defaultAccumPlotHeight} // Example fixed height
                                            />
                                        </Col>
                                        <Col xs={24} lg={12}>
                                            <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>UMAP</Title>
                                            <UmapPlotComponent
                                                // Pass only points for this specific analysis
                                                data={pointsForUmapPlot}
                                                // Reference data is the same for all mini-UMAPs
                                                referenceData={referenceData}
                                            />
                                        </Col>
                                    </Row>
                                </Card>
                            );
                        })}

                    {/* == SINGLE VIEW MODE RENDERING (From user's 'working' code) == */}
                    {umapViewMode === 'single' && (
                        <>
                            {/* Card for Accumulation Plots Row */}
                            <Card
                                size="small"
                                title="Individual Accumulation Plots"
                                bordered={false}
                                style={{ // Use verticalSpacingStyle for margin
                                     width: '100%',
                                     marginBottom: '16px', // Or use verticalSpacingStyle.marginBottom
                                }}
                            >
                                <Row
                                    gutter={[16, 0]}
                                    style={horizontalScrollRowStyle} // Apply scrolling style
                                    align="top"
                                >
                                    {selectedBmdResultRefs?.map((refStr) => {
                                        const numericRef = Number(refStr);
                                        if (isNaN(numericRef)) return null;
                                        const analysisNameForPlot =
                                            bmdRefToExperimentNameMap.get(numericRef) ||
                                            `Analysis ${numericRef}`;
                                        const pointsForThisAccumPlot =
                                            allStyledPoints?.filter( // Filter from all points
                                                (p) => p.bmdResultRef === numericRef
                                            ) || null;
                                        // Skip if no points
                                         if (!pointsForThisAccumPlot || pointsForThisAccumPlot.length === 0) return null;

                                        return (
                                            <Col
                                                key={`single-accum-${refStr}`}
                                                style={{
                                                    // Example fixed width for scrolling items
                                                    width: '350px', // Adjust as needed
                                                    flexShrink: 0,
                                                    paddingBottom: '16px',
                                                }}
                                            >
                                                <Title level={5} style={accumTitleStyle} title={analysisNameForPlot}>
                                                    {analysisNameForPlot}
                                                </Title>
                                                <AccumulationPlot
                                                    analysisName={analysisNameForPlot}
                                                    styledPointsForPlot={pointsForThisAccumPlot}
                                                    bmdResultRef={numericRef}
                                                    // Use state variable for height, fallback to default
                                                    height={accumulationPlotHeight ?? defaultAccumPlotHeight}
                                                    // Width might be implicitly set by Col, or pass fixed value
                                                />
                                            </Col>
                                        );
                                    })}
                                </Row>
                            </Card>

                            {/* Card for Combined UMAP Plot */}
                            <Card
                                size="small"
                                title="Combined UMAP Plot"
                                bordered={false}
                                style={{ width: '100%' }} // No bottom margin if table is next
                            >
                                <Row justify="center">
                                    {/* Apply ref to the Col containing the plot */}
                                    <Col
                                        xs={24}
                                        lg={16}
                                        xl={12} // Adjust responsiveness as needed
                                        ref={umapContainerRef} // <<< Ref needs to be here
                                    >
                                        {/* Title removed as Card has title */}
                                        {/* <Title level={5} style={{ textAlign: 'center', marginBottom: '8px' }}>UMAP</Title> */}
                                        <UmapPlotComponent
                                            // Pass ALL styled points to the combined plot
                                            data={allStyledPoints}
                                            referenceData={referenceData}
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </>
                    )}

                    {/* === Table Area (Keep as is) === */}
                     <Card
                        size="small"
                        title="Analysis Data Table"
                        bordered={false}
                        // Use marginTop: 'auto' to push to bottom if plots height varies
                        // Or use verticalSpacingStyle if consistent margin preferred
                        style={{ marginTop: 'auto', flexShrink: 0 }}
                    >
                        <Row><Col span={24}><GOUmapAnalysisTable
                            dataSource={tableDataSource || []} // Ensure array
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
                            // selectedGoId={currentTableSelectedGoId} // Pass prop if GOUmapAnalysisTable uses it
                            /></Col></Row>
                    </Card>
                </Col>

                {/* Right Legend (Keep as is) */}
                <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}><div style={stickyLegendStyle}><CustomLegends {...{ shapeItems, sizeItems, hiddenShapeLabelsSet, hiddenSizeLabelsSet, onToggleColorVisibility: handleToggleColorVisibility, onToggleShapeVisibility: handleToggleShapeVisibility, onToggleSizeVisibility: handleToggleSizeVisibility, showColor: false, showShape: true, showSize: true }} /></div></Col>
            </Row>
        </div>
    );
};

export default GOUmapAnalysisUnit;