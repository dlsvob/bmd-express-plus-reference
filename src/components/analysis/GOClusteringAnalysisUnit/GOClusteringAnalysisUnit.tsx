// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit.tsx
import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { Card, Spin, Alert, Empty, Row, Col, Tabs, message, Space, Typography, Button, type RadioChangeEvent } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import {
  selectActiveClusteringRef, setActiveClusteringRef,
  selectHighlightedClusteringRefClusterIdsSet, toggleClusteringRefClusterHighlight,
  selectClusteringRankFilterValue, setClusteringRankFilterValue,
  selectGoIdInputString, selectHighlightMode, HighlightMode,
  setGoIdInputString, setHighlightMode as setHighlightModeAction
} from '../../../store/slices/analysisUISlice';
import { selectReferenceDataMap, selectReferenceData } from '../../../store/selectors/referenceDataSelector';
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi';
import { ApiClusteringInputItem } from '../../../utils/clusteringUtils';
import { usePyodideClustering } from '../../../hooks/usePyodideClustering';
import { useProcessedClusteringData } from '../../../hooks/useProcessedClusteringData';
import { useClusteringVisualizationData } from '../../../hooks/useClusteringVisualizationData';
import GOClusteringSummaryTable from './GOClusteringSummaryTable';
import GOClusteringDetailsTable from './GOClusteringDetailsTable';
import CustomLegends from '../shared/CustomLegends';
import AnalysisControls from '../controls/AnalysisControls';
import GeneEnrichmentAnalysis from './GeneEnrichmentAnalysis';
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import GoIdFilterUI from '../controls/GoUIdFilterUI';
import GOClusteringScatterPlot from './GOClusteringScatterPlot';
import styles from './GOClusteringAnalysisUnit.module.css';

const { Title } = Typography;

// Helper function
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

// Interface
interface ClusterOption { value: string; label: string; }

// Base style for sticky legend wrapper (No flex centering)
const stickyLegendBaseStyle: React.CSSProperties = {
  position: 'sticky',
  paddingBottom: '20px',
  zIndex: 15
};

// ==========================================================================
// GOClusteringAnalysisUnit Component
// ==========================================================================
const GOClusteringAnalysisUnit: React.FC = () => {
  const logPrefix = '[GOClusteringAnalysisUnit v43 - Left Align Legend]'; // Version Bump
  const dispatch = useAppDispatch();

  // --- State & Refs ---
  const [networkNodesCount, setNetworkNodesCount] = useState<number>(50);
  const [selectedClusterForEnrichment, setSelectedClusterForEnrichment] = useState<string | null>(null);
  const [enrichmentBackground, setEnrichmentBackground] = useState<string | undefined>(undefined);
  const [runEnrichmentTrigger, setRunEnrichmentTrigger] = useState<boolean>(false);
  const [geneListForEnrichment, setGeneListForEnrichment] = useState<string[] | null>(null);
  const [isFilterHeaderCollapsed, setIsFilterHeaderCollapsed] = useState(true);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState<number>(50);
  const filterHeaderRef = useRef<HTMLDivElement>(null);
  const stickyHeaderGroupRef = useRef<HTMLDivElement>(null);

  // --- Selectors ---
  const projectName = useAppSelector(selectSelectedProjectName);
  const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
  const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
  const referenceDataMap = useAppSelector(selectReferenceDataMap);
  const referenceData = useAppSelector(selectReferenceData);
  const highlightedRefClusterIdsSet = useAppSelector(selectHighlightedClusteringRefClusterIdsSet);
  const clusteringRankFilter = useAppSelector(selectClusteringRankFilterValue);
  const goIdInputString = useAppSelector(selectGoIdInputString);
  const highlightMode = useAppSelector(selectHighlightMode);

  // --- Data Fetching & Processing Hooks ---
  const { data: rawData, isLoading: isLoadingRaw, error: rawError, isSuccess: rawSuccess } = useGetRawAnalysisDataQuery({ projectName, selectedBmdResultRefs }, { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 });
  const bmdRefToExperimentNameMap = useMemo(() => {
    const tempMap = new Map<number, string>(); if (rawSuccess && rawData?.rawBmdResults) { rawData.rawBmdResults.forEach((r) => { if (r && r['@ref'] != null) { const numericRef = Number(r['@ref']); if (!isNaN(numericRef)) { tempMap.set(numericRef, r.name || `BMD Result ${numericRef}`); } } }); } return tempMap;
  }, [rawSuccess, rawData]);
  useEffect(() => { // Active analysis logic
    const effectLogPrefix = `${logPrefix} [useEffect activeRef]`; if (!isLoadingRaw && selectedBmdResultRefs && selectedBmdResultRefs.length > 0) { const firstRef = selectedBmdResultRefs[0]; if (activeClusteringRef === null || !selectedBmdResultRefs.includes(activeClusteringRef)) { console.log(`${effectLogPrefix} Initializing or resetting activeClusteringRef to first selected: ${firstRef}`); dispatch(setActiveClusteringRef(firstRef)); setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined); dispatch(setClusteringRankFilterValue([1, 1000])); } else { console.log(`${effectLogPrefix} Active ref ${activeClusteringRef} is valid.`); } } else if (!isLoadingRaw && (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0)) { if (activeClusteringRef !== null) { console.log(`${effectLogPrefix} No refs selected, clearing activeClusteringRef.`); dispatch(setActiveClusteringRef(null)); setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined); dispatch(setClusteringRankFilterValue([1, 1000])); } }
  }, [selectedBmdResultRefs, activeClusteringRef, isLoadingRaw, dispatch, logPrefix]);
  const activeAnalysisName = activeClusteringRef ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) || `Analysis ${activeClusteringRef}` : 'No Analysis Selected';
  const rowDataForClustering = useMemo(() => { // Prepare data for python
    const prepLogPrefix = `${logPrefix} [rowDataForClustering]`; if (!activeClusteringRef || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0) { return null; } console.log(`${prepLogPrefix} Preparing input data for active ref: ${activeClusteringRef}`); const finalInputItems: ApiClusteringInputItem[] = []; const itemsToProcess = rawData.rawCategoryAnalysisItems || []; itemsToProcess.forEach((entry) => { if (String(entry.bmdResultRef) !== activeClusteringRef) return; const item = entry.item; if (!item || !item.categoryIdentifier?.id) return; finalInputItems.push({ 'Category ID': item.categoryIdentifier.id, 'Category Title': item.categoryIdentifier.title ?? '', 'Cluster BMD': String(item.bmdFifthPercentileTotalGenes ?? ''), 'Genes Up': item.genesUp ?? '', 'Genes Down': item.genesDown ?? '', 'All Genes': item.geneSymbolsPrivate ?? '', }); }); console.log(`${prepLogPrefix} Prepared ${finalInputItems.length} items for clustering (ref: ${activeClusteringRef}).`); return finalInputItems.length > 0 ? finalInputItems : null;
  }, [rawData?.rawCategoryAnalysisItems, activeClusteringRef, logPrefix]);
  const dataLength = rowDataForClustering?.length ?? 0;
  const computedNumClusters = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)), [dataLength]);
  const { result: pyodideResult, isLoading: isPyodideLoading, error: pyodideError, } = usePyodideClustering(rowDataForClustering, 'average', computedNumClusters);
  const clustersForProcessingHook = useMemo(() => (pyodideResult ? [pyodideResult] : null), [pyodideResult]);
  const { categoryTableData, summaryTableData, processingError, minRank, maxRank } = useProcessedClusteringData(clustersForProcessingHook, pyodideError ? getErrorMessage(pyodideError) : null);
  const { scatterPlotData, legendColorItems, presentClusterIds } = useClusteringVisualizationData({ categoryTableData, summaryTableData, referenceDataMap, referenceData });
  const clusterOptionsForDropdown = useMemo((): ClusterOption[] => { // Options for enrichment dropdown
    if (!summaryTableData) return []; return [...summaryTableData].sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity)).map((summary) => ({ value: String(summary.cluster), label: `Cluster ${summary.cluster} (${summary.numCategoryIDs} cats)`, }));
  }, [summaryTableData]);

  // Split Legend Items Logic
  const { leftLegendItems, rightLegendItems } = useMemo(() => {
    const items = legendColorItems || [];
    const midpoint = Math.ceil(items.length / 2);
    return {
      leftLegendItems: items.slice(0, midpoint),
      rightLegendItems: items.slice(midpoint),
    };
  }, [legendColorItems]);

  // Effect to measure sticky header height
  useEffect(() => {
    const headerElement = stickyHeaderGroupRef.current;
    if (headerElement) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const height = (entry.target as HTMLElement).offsetHeight;
          if (height > 0) { setStickyHeaderHeight(prevHeight => (prevHeight !== height) ? height : prevHeight); }
        }
      });
      resizeObserver.observe(headerElement);
      const initialHeight = headerElement.offsetHeight;
      if (initialHeight > 0) { setStickyHeaderHeight(initialHeight); }
      return () => resizeObserver.disconnect();
    }
  }, [activeClusteringRef]);

  // Combined Loading/Error States
  const isLoading = isLoadingRaw || isPyodideLoading;
  const error = rawError || pyodideError || processingError;

  // --- Callbacks ---
  const handleToggleHighlightRefCluster = useCallback((clusterIdLabel: string) => { dispatch(toggleClusteringRefClusterHighlight(clusterIdLabel)); }, [dispatch]);
  const handleActiveRefChange = useCallback((activeKey: string) => {
    console.log(`${logPrefix} handleActiveRefChange called with key: ${activeKey}`); dispatch(setActiveClusteringRef(activeKey)); setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined);
  }, [dispatch, logPrefix]);
  const handleNetworkNodesChange = useCallback((value: number | null) => { setNetworkNodesCount(value ?? 50); }, []);
  const handleClusterForEnrichmentChange = useCallback((value: string | null) => { setSelectedClusterForEnrichment(value); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); }, []);
  const handleEnrichmentBackgroundChange = useCallback((value: string) => { setEnrichmentBackground(value); setRunEnrichmentTrigger(false); }, []);
  const debouncedSubmitLogic = useMemo(() => debounce(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground || !categoryTableData) { setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; } const genes = categoryTableData.filter(row => String(row.cluster) === String(selectedClusterForEnrichment)).map(row => (row.allGenes || '').split(';')).flat().map(g => g.trim()).filter(g => g.length > 0); const uniqueGenes = [...new Set(genes)]; if (uniqueGenes.length === 0) { message.warning(`No genes found in cluster ${selectedClusterForEnrichment} to submit.`); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; } console.log(`${logPrefix} Submitting ${uniqueGenes.length} unique genes for enrichment (Cluster ${selectedClusterForEnrichment}, BG: ${enrichmentBackground})`); setGeneListForEnrichment(uniqueGenes); setRunEnrichmentTrigger(true);
  }, 300), [selectedClusterForEnrichment, enrichmentBackground, categoryTableData, logPrefix]);
  const handleEnrichmentSubmit = useCallback(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground) { message.warning('Please select a cluster and a background gene set.'); return; } debouncedSubmitLogic();
  }, [debouncedSubmitLogic, selectedClusterForEnrichment, enrichmentBackground]);
  useEffect(() => () => debouncedSubmitLogic.cancel(), [debouncedSubmitLogic]);
  const handleClusteringRankChange = useCallback((value: [number, number]) => { dispatch(setClusteringRankFilterValue(value)); }, [dispatch]);
  const toggleFilterHeaderCollapse = useCallback(() => { setIsFilterHeaderCollapsed((prev) => !prev); }, []);
  const handleGoIdInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { dispatch(setGoIdInputString(e.target.value)); }, [dispatch]);
  const handleHighlightModeChange = useCallback((e: RadioChangeEvent) => {
    const mode = e.target.value as HighlightMode; dispatch(setHighlightModeAction(Object.values(HighlightMode).includes(mode) ? mode : HighlightMode.NONE));
  }, [dispatch]);

  // --- Derived Values ---
  const hasActiveDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
  const hasActiveResults = categoryTableData && categoryTableData.length > 0;
  const tabItems = useMemo(() => {
    if (!selectedBmdResultRefs) return []; return selectedBmdResultRefs.map((refStr) => { const numericRef = Number(refStr); const name = !isNaN(numericRef) ? bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}` : `Analysis ${refStr}`; return { key: refStr, label: name }; });
  }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);
  const filteredCategoryTableData = useMemo(() => {
    if (!categoryTableData) return []; const [minFilterRank, maxFilterRank] = clusteringRankFilter; return categoryTableData.filter(row => row.rank != null && row.rank >= minFilterRank && row.rank <= maxFilterRank);
  }, [categoryTableData, clusteringRankFilter]);
  const filteredScatterPlotData = useMemo(() => {
    if (!scatterPlotData) return null; const [minFilterRank, maxFilterRank] = clusteringRankFilter; return scatterPlotData.filter(point => point.rank != null && point.rank >= minFilterRank && point.rank <= maxFilterRank);
  }, [scatterPlotData, clusteringRankFilter]);

  // Define dynamic sticky style for legend wrapper
  const stickyLegendStyle: React.CSSProperties = useMemo(() => ({
    ...stickyLegendBaseStyle, // Base sticky properties
    top: `${stickyHeaderHeight}px`, // Dynamic top offset
  }), [stickyHeaderHeight]);

  // --- Render Logic ---
  if (isLoadingRaw && !activeClusteringRef) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading analysis list..." size="large" /></div>; }
  if (rawError && activeClusteringRef) { return <Alert message="Error Loading Base Data" description={getErrorMessage(rawError)} type="error" showIcon style={{ margin: '24px' }} />; }
  if (!projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { return <div style={{ padding: '24px' }}><Empty description="Please select one or more analyses from the 'Experiments' view to run GO Clustering." /></div>; }

  const spinTip = isLoading && !!activeClusteringRef ? <>Running clustering for {activeAnalysisName}...</> : undefined;

  return (
    <div className={styles.clusteringRoot}>
      {/* Sticky Header Group (Tabs + Filter Header) */}
      <div className={styles.stickyHeaderGroup} ref={stickyHeaderGroupRef}>
        <Tabs
          type="card"
          activeKey={activeClusteringRef ?? undefined}
          onChange={handleActiveRefChange}
          items={tabItems}
          style={{ marginBottom: '0px' }}
        />
        {activeClusteringRef && (
          <div
            ref={filterHeaderRef}
            className={`${styles.filterHeader} ${isFilterHeaderCollapsed ? styles.collapsed : styles.expanded}`}
          >
            <div className={styles.filterHeaderToolbar} onClick={toggleFilterHeaderCollapse} >
              <Title level={5} style={{ margin: 0, flexGrow: 1 }}> Clustering View Filters </Title>
              <Button type="text" icon={isFilterHeaderCollapsed ? <DownOutlined /> : <UpOutlined />} aria-label={isFilterHeaderCollapsed ? 'Expand Filters' : 'Collapse Filters'} />
            </div>
            <div className={styles.filterHeaderControls}>
              {hasActiveResults && !isLoading && !error ? (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <GoIdFilterUI
                    goIdInputString={goIdInputString}
                    highlightMode={highlightMode}
                    onGoIdInputChange={handleGoIdInputChange}
                    onHighlightModeChange={handleHighlightModeChange}
                  />
                  <SlidingWindowFilter
                    key={`rank-filter-${activeClusteringRef}`}
                    min={minRank} max={maxRank} value={clusteringRankFilter}
                    onAfterChange={handleClusteringRankChange}
                    disabled={maxRank <= 0 || minRank >= maxRank}
                    label="Filter Categories by Rank (Cluster BMD Asc.)"
                    analysisName={`ClusteringRankFilter-${activeClusteringRef}`}
                  />
                </Space>
              ) : (<div style={{ padding: '10px', color: '#888' }}>Loading filters...</div>)}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <Spin spinning={isLoading && !!activeClusteringRef} tip={spinTip}>
        {!isLoading && error && activeClusteringRef && (<Alert message={`Processing Error for ${activeAnalysisName}`} description={getErrorMessage(error)} type="error" showIcon style={{ margin: '0 16px 16px 16px' }} />)}

        {!isLoadingRaw && activeClusteringRef && !error && (
          <>
            {!hasActiveDataToCluster && !isLoading && (<Empty description="No suitable category data for clustering..." />)}
            {hasActiveDataToCluster && !hasActiveResults && !isLoading && pyodideResult && (<Empty description="No categories found after processing clustering results..." />)}
            {hasActiveDataToCluster && !hasActiveResults && !isLoading && !pyodideResult && !pyodideError && (<Empty description="Clustering data processed, but no valid results were returned." />)}

            {hasActiveResults && (
              <Row gutter={[16, 16]} wrap={false} style={{ padding: '0 16px' }}>

                {/* --- Legend Column --- */}
                <Col xs={24} md={4} lg={3}>
                  {/* Wrapper DIV with dynamic sticky style */}
                  <div style={stickyLegendStyle}>
                    {/* Title with text aligned left */}
                    <Typography.Title
                      level={5} style={{ marginBottom: '2px', marginTop: '0px', paddingTop: '14px', textAlign: 'left', width: '100%' }}>
                      Clusters
                    </Typography.Title>
                    {/* Inner Row for the two legends */}
                    {/* <<< Removed width: 100% from here, Col handles width >>> */}
                    <Row gutter={[4, 8]} className={styles.twoColLegendWrapper}>
                      {/* <<< Reset span to 12, remove invalid styles >>> */}
                      <Col span={8} /* style={{ removed }} */ >
                        <CustomLegends
                          // Pass empty string to ensure Card doesn't render its own title space
                          cardTitle=" "
                          colorItems={leftLegendItems}
                          highlightedLabelsSet={highlightedRefClusterIdsSet}
                          presentClusterIds={presentClusterIds}
                          onToggleColorVisibility={handleToggleHighlightRefCluster}
                          onToggleShapeVisibility={() => { }}
                          onToggleSizeVisibility={() => { }}
                          showColor={true} showShape={false} showSize={false}
                        />
                      </Col>
                      <Col span={8}>
                        <CustomLegends
                          // Pass empty string here too
                          cardTitle=" "
                          colorItems={rightLegendItems}
                          highlightedLabelsSet={highlightedRefClusterIdsSet}
                          presentClusterIds={presentClusterIds}
                          onToggleColorVisibility={handleToggleHighlightRefCluster}
                          onToggleShapeVisibility={() => { }}
                          onToggleSizeVisibility={() => { }}
                          showColor={true} showShape={false} showSize={false}
                        />
                      </Col>
                    </Row>
                  </div> {/* END sticky wrapper div */}
                </Col>

                {/* --- Main Content Column (Plot, Tables, Controls) --- */}
                <Col xs={24} md={20} lg={21}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* Plot/Summary Card */}
                    <Card size="small" bordered={false} className={styles.innerSectionCard}>
                      <Row gutter={[16, 16]} style={{ border: '1px solid #f0f0f0', borderRadius: '4px', padding: '8px', }}>
                        <Col xs={24} lg={14}>
                          <div style={{ minHeight: `500px`, position: 'relative' }}>
                            {filteredScatterPlotData && filteredScatterPlotData.length > 0 ? (
                              <GOClusteringScatterPlot plotData={filteredScatterPlotData} summaryTableData={summaryTableData} highlightedRefClusterIds={highlightedRefClusterIdsSet} />
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                                <Empty description={scatterPlotData === null ? "Preparing plot data..." : "No categories match filter."} />
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col xs={24} lg={10}>
                          <GOClusteringSummaryTable dataSource={summaryTableData} loading={isPyodideLoading} />
                        </Col>
                      </Row>
                    </Card>

                    {/* Enrichment Analysis Card (Conditional) */}
                    {runEnrichmentTrigger && geneListForEnrichment && enrichmentBackground && selectedClusterForEnrichment && (
                      <Card size="small" bordered={false} className={styles.innerSectionCard}>
                        <GeneEnrichmentAnalysis
                          geneList={geneListForEnrichment}
                          backgroundType={enrichmentBackground}
                          analysisName={`Cluster ${selectedClusterForEnrichment} (${activeAnalysisName})`}
                          triggerRun={runEnrichmentTrigger}
                          maxNodesToShow={networkNodesCount}
                        />
                      </Card>
                    )}

                    {/* Details Table Card */}
                    <Card size="small" title={`Clustered Category Details (${filteredCategoryTableData.length} items)`} bordered={false} className={styles.innerSectionCard}>
                      <Row gutter={[16, 16]}>
                        <Col span={24}>
                          <GOClusteringDetailsTable dataSource={filteredCategoryTableData} loading={isPyodideLoading} />
                        </Col>
                      </Row>
                    </Card>

                    {/* Enrichment Controls Card */}
                    <Card size="small" bordered={false} className={styles.innerSectionCard}>
                      <AnalysisControls
                        isExportDisabled={true}
                        onCopy={() => { message.info('Copy TSV not implemented yet.'); }}
                        onExport={() => { message.info('Export TSV not implemented yet.'); }}
                        networkNodesCount={networkNodesCount}
                        onNetworkNodesCountChange={handleNetworkNodesChange}
                        availableClusterOptions={clusterOptionsForDropdown}
                        selectedClusterForEnrichment={selectedClusterForEnrichment}
                        onClusterForEnrichmentChange={handleClusterForEnrichmentChange}
                        enrichmentBackgroundValue={enrichmentBackground}
                        onEnrichmentBackgroundChange={handleEnrichmentBackgroundChange}
                        onEnrichmentSubmit={handleEnrichmentSubmit}
                        isEnrichmentSubmitDisabled={isLoading || !selectedClusterForEnrichment || !enrichmentBackground}
                      />
                    </Card>
                  </Space>
                </Col>

              </Row>
            )}
          </>
        )}

        {!activeClusteringRef && selectedBmdResultRefs && selectedBmdResultRefs.length > 0 && (
          <div style={{ padding: '24px' }}><Empty description="Select an analysis tab above." /></div>
        )}
      </Spin>
    </div>
  );
};

export default GOClusteringAnalysisUnit;