// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit.tsx
// Adding Rank Filter based on Original Structure

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { Card, Spin, Alert, Empty, Row, Col, Tabs, message, Space } from 'antd';
// Note: Removed Button, Typography, Up/Down icons as the collapsible header was removed
import debounce from 'lodash.debounce';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import {
  selectActiveClusteringRef, setActiveClusteringRef,
  selectHighlightedClusteringRefClusterIdsSet, toggleClusteringRefClusterHighlight,
  // Import rank filter state/action
  selectClusteringRankFilterValue, setClusteringRankFilterValue
} from '../../../store/slices/analysisUISlice';
import { selectReferenceDataMap, selectReferenceData } from '../../../store/selectors/referenceDataSelector';
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi';
import { ApiClusteringInputItem, SummaryRow, CategoryRow as InputCategoryRow } from '../../../utils/clusteringUtils';
import { usePyodideClustering } from '../../../hooks/usePyodideClustering';
// Import updated hook and ranked type
import { useProcessedClusteringData, RankedCategoryRow } from '../../../hooks/useProcessedClusteringData';
import { useClusteringVisualizationData } from '../../../hooks/useClusteringVisualizationData';
import GOClusteringScatterPlot, { ClusteringScatterPoint } from './GOClusteringScatterPlot';
import GOClusteringSummaryTable from './GOClusteringSummaryTable';
import GOClusteringDetailsTable from './GOClusteringDetailsTable';
import CustomLegends from '../shared/CustomLegends';
import AnalysisControls from '../controls/AnalysisControls';
import GeneEnrichmentAnalysis from './GeneEnrichmentAnalysis';
// Import SlidingWindowFilter
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import styles from './GOClusteringAnalysisUnit.module.css'; // Keep if using custom styles

// Helper function
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

// Interface for dropdown options
interface ClusterOption { value: string; label: string; }

// Style for consistent vertical spacing
const verticalSpacingStyle: React.CSSProperties = { marginBottom: '16px' };

// ==========================================================================
// GOClusteringAnalysisUnit Component
// ==========================================================================
const GOClusteringAnalysisUnit: React.FC = () => {
  const logPrefix = '[GOClusteringAnalysisUnit v25 - Filter Update Fix]';
  const dispatch = useAppDispatch();

  // State for Enrichment
  const [networkNodesCount, setNetworkNodesCount] = useState<number>(50);
  const [selectedClusterForEnrichment, setSelectedClusterForEnrichment] = useState<string | null>(null);
  const [enrichmentBackground, setEnrichmentBackground] = useState<string | undefined>(undefined);
  const [runEnrichmentTrigger, setRunEnrichmentTrigger] = useState<boolean>(false);
  const [geneListForEnrichment, setGeneListForEnrichment] = useState<string[] | null>(null);

  // Selectors
  const projectName = useAppSelector(selectSelectedProjectName);
  const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
  const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
  const referenceDataMap = useAppSelector(selectReferenceDataMap);
  const referenceData = useAppSelector(selectReferenceData);
  const highlightedRefClusterIdsSet = useAppSelector(selectHighlightedClusteringRefClusterIdsSet);
  // Get rank filter value from state
  const clusteringRankFilter = useAppSelector(selectClusteringRankFilterValue);

  // Data Fetching
  const { data: rawData, isLoading: isLoadingRaw, error: rawError, isSuccess: rawSuccess } = useGetRawAnalysisDataQuery({ projectName, selectedBmdResultRefs }, { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 });

  // Memoized map for experiment names
  const bmdRefToExperimentNameMap = useMemo(() => {
    const tempMap = new Map<number, string>();
    if (rawSuccess && rawData?.rawBmdResults) {
      rawData.rawBmdResults.forEach((r) => {
        if (r && r['@ref'] != null) {
          const numericRef = Number(r['@ref']);
          if (!isNaN(numericRef)) {
            tempMap.set(numericRef, r.name || `BMD Result ${numericRef}`);
          }
        }
      });
    }
    return tempMap;
  }, [rawSuccess, rawData]);

  // Active Analysis Logic (handles setting active ref and resetting enrichment state)
  useEffect(() => {
    const effectLogPrefix = `${logPrefix} [useEffect activeRef]`;
    if (!isLoadingRaw && selectedBmdResultRefs && selectedBmdResultRefs.length > 0) {
      const firstRef = selectedBmdResultRefs[0];
      if (activeClusteringRef === null || !selectedBmdResultRefs.includes(activeClusteringRef)) {
        console.log(`${effectLogPrefix} Initializing or resetting activeClusteringRef to first selected: ${firstRef}`);
        dispatch(setActiveClusteringRef(firstRef));
        setSelectedClusterForEnrichment(null);
        setRunEnrichmentTrigger(false);
        setGeneListForEnrichment(null);
        setEnrichmentBackground(undefined);
        // Initial range - might get updated once maxRank is known
        dispatch(setClusteringRankFilterValue([1, 1000]));
      } else {
        console.log(`${effectLogPrefix} Active ref ${activeClusteringRef} is valid.`);
      }
    } else if (!isLoadingRaw && (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0)) {
      if (activeClusteringRef !== null) {
        console.log(`${effectLogPrefix} No refs selected, clearing activeClusteringRef.`);
        dispatch(setActiveClusteringRef(null));
        setSelectedClusterForEnrichment(null);
        setRunEnrichmentTrigger(false);
        setGeneListForEnrichment(null);
        setEnrichmentBackground(undefined);
        dispatch(setClusteringRankFilterValue([1, 1000])); // Reset filter
      }
    }
  }, [selectedBmdResultRefs, activeClusteringRef, isLoadingRaw, dispatch, logPrefix]); // Removed maxRank from deps here

  const activeAnalysisName = activeClusteringRef ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) || `Analysis ${activeClusteringRef}` : 'No Analysis Selected';

  // Clustering Data Preparation
  const rowDataForClustering = useMemo(() => {
    const prepLogPrefix = `${logPrefix} [rowDataForClustering]`;
    if (!activeClusteringRef || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0) { return null; }
    console.log(`${prepLogPrefix} Preparing input data for active ref: ${activeClusteringRef}`);
    const finalInputItems: ApiClusteringInputItem[] = [];
    const itemsToProcess = rawData.rawCategoryAnalysisItems || [];
    itemsToProcess.forEach((entry) => {
      if (String(entry.bmdResultRef) !== activeClusteringRef) return;
      const item = entry.item;
      if (!item || !item.categoryIdentifier?.id) return;
      finalInputItems.push({
        'Category ID': item.categoryIdentifier.id,
        'Category Title': item.categoryIdentifier.title ?? '',
        'Cluster BMD': String(item.bmdFifthPercentileTotalGenes ?? ''),
        'Genes Up': item.genesUp ?? '',
        'Genes Down': item.genesDown ?? '',
        'All Genes': item.geneSymbolsPrivate ?? '',
      });
    });
    console.log(`${prepLogPrefix} Prepared ${finalInputItems.length} items for clustering (ref: ${activeClusteringRef}).`);
    return finalInputItems.length > 0 ? finalInputItems : null;
  }, [rawData?.rawCategoryAnalysisItems, activeClusteringRef, logPrefix]);

  const dataLength = rowDataForClustering?.length ?? 0;
  // Use hardcoded values for clustering parameters as requested
  const computedNumClusters = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)), [dataLength]);

  // Clustering Hook
  const { result: pyodideResult, isLoading: isPyodideLoading, error: pyodideError, } = usePyodideClustering(
    rowDataForClustering,
    'average', // Hardcoded method
    computedNumClusters
  );
  const clustersForProcessingHook = useMemo(() => (pyodideResult ? [pyodideResult] : null), [pyodideResult]);

  // Use MODIFIED processing hook to get ranks
  const { categoryTableData, summaryTableData, processingError, minRank, maxRank } = useProcessedClusteringData(clustersForProcessingHook, pyodideError ? getErrorMessage(pyodideError) : null);

  // Visualisation Hook
  const { scatterPlotData, legendColorItems, presentClusterIds } = useClusteringVisualizationData({ categoryTableData, summaryTableData, referenceDataMap, referenceData });

  // Dropdown options
  const clusterOptionsForDropdown = useMemo((): ClusterOption[] => {
    if (!summaryTableData) return [];
    return [...summaryTableData].sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity)).map((summary) => ({ value: String(summary.cluster), label: `Cluster ${summary.cluster} (${summary.numCategoryIDs} cats)`, }));
  }, [summaryTableData]);

  // Combined Loading/Error
  const isLoading = isLoadingRaw || isPyodideLoading;
  const error = rawError || pyodideError || processingError;

  // Callbacks
  const handleToggleHighlightRefCluster = useCallback((clusterIdLabel: string) => { dispatch(toggleClusteringRefClusterHighlight(clusterIdLabel)); }, [dispatch]);
  // Modified handleActiveRefChange (removed faulty filter reset)
  const handleActiveRefChange = useCallback((activeKey: string) => {
    console.log(`${logPrefix} handleActiveRefChange called with key: ${activeKey}`);
    dispatch(setActiveClusteringRef(activeKey));
    // Reset enrichment state only
    setSelectedClusterForEnrichment(null);
    setRunEnrichmentTrigger(false);
    setGeneListForEnrichment(null);
    setEnrichmentBackground(undefined);
    // NOTE: Filter reset now implicitly handled by the key prop on SlidingWindowFilter
  }, [dispatch, logPrefix]);
  const handleNetworkNodesChange = useCallback((value: number | null) => { setNetworkNodesCount(value ?? 50); }, []); // Added useCallback and empty dep array
  const handleClusterForEnrichmentChange = useCallback((value: string | null) => { setSelectedClusterForEnrichment(value); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); }, []); // Added useCallback and empty dep array
  const handleEnrichmentBackgroundChange = useCallback((value: string) => { setEnrichmentBackground(value); setRunEnrichmentTrigger(false); }, []); // Added useCallback and empty dep array
  const debouncedSubmitLogic = useMemo(() => debounce(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground || !categoryTableData) { setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; }
    const genes = categoryTableData.filter(row => String(row.cluster) === String(selectedClusterForEnrichment)).map(row => (row.allGenes || '').split(';')).flat().map(g => g.trim()).filter(g => g.length > 0);
    const uniqueGenes = [...new Set(genes)];
    if (uniqueGenes.length === 0) { message.warning(`No genes found in cluster ${selectedClusterForEnrichment} to submit.`); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; }
    console.log(`${logPrefix} Submitting ${uniqueGenes.length} unique genes for enrichment (Cluster ${selectedClusterForEnrichment}, BG: ${enrichmentBackground})`);
    setGeneListForEnrichment(uniqueGenes); setRunEnrichmentTrigger(true);
  }, 300), [selectedClusterForEnrichment, enrichmentBackground, categoryTableData, logPrefix]);
  const handleEnrichmentSubmit = useCallback(() => { if (!selectedClusterForEnrichment || !enrichmentBackground) { message.warning('Please select a cluster and a background gene set.'); return; } debouncedSubmitLogic(); }, [debouncedSubmitLogic, selectedClusterForEnrichment, enrichmentBackground]);
  useEffect(() => () => debouncedSubmitLogic.cancel(), [debouncedSubmitLogic]);

  // Callback for Rank Filter Change
  const handleClusteringRankChange = useCallback((value: [number, number]) => {
    dispatch(setClusteringRankFilterValue(value));
  }, [dispatch]);

  // Derived values
  const hasActiveDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
  const hasActiveResults = categoryTableData && categoryTableData.length > 0;
  const tabItems = useMemo(() => { if (!selectedBmdResultRefs) return []; return selectedBmdResultRefs.map((refStr) => { const numericRef = Number(refStr); const name = !isNaN(numericRef) ? bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}` : `Analysis ${refStr}`; return { key: refStr, label: name }; }); }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);

  // Filter Data based on Rank
  const filteredCategoryTableData = useMemo(() => {
    if (!categoryTableData) return [];
    const [minFilterRank, maxFilterRank] = clusteringRankFilter;
    return categoryTableData.filter(row =>
      row.rank != null && row.rank >= minFilterRank && row.rank <= maxFilterRank
    );
  }, [categoryTableData, clusteringRankFilter]);

  const filteredScatterPlotData = useMemo(() => {
    if (!scatterPlotData) return null;
    const [minFilterRank, maxFilterRank] = clusteringRankFilter;
    // Filter points based on the global category rank stored in point.rank
    return scatterPlotData.filter(point =>
      point.rank != null && point.rank >= minFilterRank && point.rank <= maxFilterRank
    );
  }, [scatterPlotData, clusteringRankFilter]);


  // --- Render Logic ---
  if (isLoadingRaw && !activeClusteringRef) { // Initial load before any tab is active
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading analysis list..." size="large" /></div>;
  }
  // Handle base data loading errors after selection
  if (rawError && activeClusteringRef) { return <Alert message="Error Loading Data for Clustering" description={getErrorMessage(rawError)} type="error" showIcon style={{ margin: '24px' }} />; }
  // Handle case where project/selections exist but maybe data loading is slow/pending for first tab
  if (!rawData && isLoadingRaw && activeClusteringRef) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading analysis data..." size="large" /></div>; }
  // Handle no project/selections
  if (!projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { return <div style={{ padding: '24px' }}><Empty description="Please select one or more analyses from the 'Experiments' view to run GO Clustering." /></div>; }


  const spinTip = isLoading && !!activeClusteringRef ? <>Running clustering for {activeAnalysisName}...</> : undefined;

  return (
    <div className={styles.clusteringRoot}> {/* Optional root class */}
      <Tabs
        type="card"
        activeKey={activeClusteringRef ?? undefined}
        onChange={handleActiveRefChange}
        items={tabItems}
        style={{ marginBottom: '0px' }} // No margin needed below tabs
      />

      {/* Add SlidingWindowFilter below Tabs */}
      {/* Show filter only when data/ranks are ready FOR THE CURRENTLY ACTIVE analysis */}
      {activeClusteringRef && hasActiveResults && !isLoading && !error && maxRank > 0 && (
        <div style={{ padding: '0 16px' }}>
          <SlidingWindowFilter
            // Add key prop tied to activeClusteringRef to force reset on tab change
            key={`rank-filter-${activeClusteringRef}`}
            min={minRank} // Use calculated minRank
            max={maxRank} // Use calculated maxRank
            value={clusteringRankFilter} // Get value from Redux state
            onAfterChange={handleClusteringRankChange} // Dispatch action on change
            disabled={isLoading || maxRank <= 0 || minRank >= maxRank}
            label="Filter Categories by Rank (Cluster BMD Asc.)"
            analysisName={`ClusteringRankFilter-${activeClusteringRef}`} // Make key unique per analysis
            style={verticalSpacingStyle} // Add bottom margin
          />
        </div>
      )}


      {/* Main Content Area: Show spinner or content */}
      <Spin spinning={isLoading && !!activeClusteringRef} tip={spinTip}>
        {/* Display error specific to clustering/processing if it occurs */}
        {!isLoading && error && activeClusteringRef && ( // Check error *after* loading flags
          <Alert message={`Processing Error for ${activeAnalysisName}`} description={getErrorMessage(error)} type="error" showIcon style={{ margin: '0 16px 16px 16px' }} />
        )}

        {/* Display content only if an analysis is active and there's no error */}
        {activeClusteringRef && !error && (
          <>
            {/* Handle cases where data exists but results couldn't be generated */}
            {!hasActiveDataToCluster && !isLoading && (<Empty description="No suitable category data found for this specific analysis to perform clustering." />)}
            {hasActiveDataToCluster && !hasActiveResults && !isLoading && pyodideResult && (<Empty description="No categories found after processing clustering results for this analysis." />)}
            {hasActiveDataToCluster && !hasActiveResults && !isLoading && !pyodideResult && !pyodideError && (<Empty description="Clustering data processed, but no results returned (check inputs/script)." />)}

            {/* Render results only if they exist */}
            {hasActiveResults && (
              <Space direction="vertical" size="large" style={{ width: '100%', padding: '0 16px' }}>

                {/* Plot/Summary/Legend Row Card */}
                <Card size="small" bordered={false} className={styles.innerSectionCard}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={4} lg={3}>
                      <CustomLegends
                        cardTitle="Ref Clusters"
                        colorItems={legendColorItems}
                        highlightedLabelsSet={highlightedRefClusterIdsSet}
                        presentClusterIds={presentClusterIds}
                        onToggleColorVisibility={handleToggleHighlightRefCluster}
                        onToggleShapeVisibility={() => { }}
                        onToggleSizeVisibility={() => { }}
                        showColor={true} showShape={false} showSize={false}
                      />
                    </Col>
                    <Col xs={24} md={20} lg={21}>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={14}>
                          <div style={{ minHeight: `500px`, border: '1px solid #f0f0f0', borderRadius: '4px', padding: '8px', position: 'relative' }}>
                            {/* Pass FILTERED scatter data */}
                            {filteredScatterPlotData && filteredScatterPlotData.length > 0 ? (
                              <GOClusteringScatterPlot
                                plotData={filteredScatterPlotData}
                                summaryTableData={summaryTableData}
                                highlightedRefClusterIds={highlightedRefClusterIdsSet}
                              />
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                                <Empty description={scatterPlotData === null ? "Preparing plot data..." : "No categories match current rank filter."} />
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col xs={24} lg={10}>
                          <GOClusteringSummaryTable dataSource={summaryTableData} loading={isPyodideLoading} />
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card>

                {/* Enrichment Controls Card */}
                <Card size="small" bordered={false} className={styles.innerSectionCard}>
                  <AnalysisControls
                    isExportDisabled={true} onCopy={() => { }} onExport={() => { }}
                    networkNodesCount={networkNodesCount} onNetworkNodesChange={handleNetworkNodesChange}
                    availableClusterOptions={clusterOptionsForDropdown} selectedClusterForEnrichment={selectedClusterForEnrichment}
                    onClusterForEnrichmentChange={handleClusterForEnrichmentChange} enrichmentBackgroundValue={enrichmentBackground}
                    onEnrichmentBackgroundChange={handleEnrichmentBackgroundChange} onEnrichmentSubmit={handleEnrichmentSubmit}
                    isEnrichmentSubmitDisabled={isLoading || !selectedClusterForEnrichment || !enrichmentBackground}
                  />
                </Card>

                {/* Enrichment Analysis (Conditional) */}
                {runEnrichmentTrigger && geneListForEnrichment && enrichmentBackground && selectedClusterForEnrichment && (
                  <GeneEnrichmentAnalysis
                    geneList={geneListForEnrichment} backgroundType={enrichmentBackground}
                    analysisName={`Cluster ${selectedClusterForEnrichment} (${activeAnalysisName})`}
                    triggerRun={runEnrichmentTrigger} maxNodesToShow={networkNodesCount}
                  />
                )}

                {/* Details Table Card */}
                <Card size="small" title={`Clustered Category Details (${filteredCategoryTableData.length} items)`} bordered={false} className={styles.innerSectionCard}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      {/* Pass FILTERED table data */}
                      <GOClusteringDetailsTable
                        dataSource={filteredCategoryTableData}
                        loading={isPyodideLoading}
                      />
                    </Col>
                  </Row>
                </Card>

              </Space>
            )}
          </>
        )}
        {/* Message if no analysis tab is selected */}
        {!activeClusteringRef && selectedBmdResultRefs && selectedBmdResultRefs.length > 0 && (
          <div style={{ padding: '24px' }}><Empty description="Select an analysis tab above." /></div>
        )}
      </Spin>
    </div>
  );
};

export default GOClusteringAnalysisUnit;