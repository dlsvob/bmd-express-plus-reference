// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit.tsx
// Handles multiple selected analyses via Tabs. Adds Copy/Export controls and Enrichment Analysis.
// Adds container and inner section borders.

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  Card, Spin, Alert, Empty, Row, Col, Tabs, message, Space, Typography // Added Space, Typography
} from 'antd';
import {
  CopyOutlined, DownloadOutlined, ExperimentOutlined
} from '@ant-design/icons'; // Keep icons needed by AnalysisControls
import debounce from 'lodash.debounce';
import { useAppSelector, useAppDispatch } from '../../../store/hooks'; // Adjusted path
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors'; // Adjusted path
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice'; // Adjusted path
import {
  selectActiveClusteringRef,
  setActiveClusteringRef,
  selectHighlightedClusteringRefClusterIdsSet,
  toggleClusteringRefClusterHighlight,
} from '../../../store/slices/analysisUISlice'; // Adjusted path
import {
  selectReferenceDataMap,
  selectReferenceData,
} from '../../../store/selectors/referenceDataSelector'; // Adjusted path
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi'; // Adjusted path
import {
  ApiClusteringInputItem,
  CategoryRow,
  SummaryRow,
} from '../../../utils/clusteringUtils'; // Adjusted path
import {
  usePyodideClustering,
  PyodideClusteringResult,
} from '../../../hooks/usePyodideClustering'; // Adjusted path
import { useProcessedClusteringData } from '../../../hooks/useProcessedClusteringData'; // Adjusted path
import { useClusteringVisualizationData } from '../../../hooks/useClusteringVisualizationData'; // Adjusted path
import { BMDResult, CategoryAnalysisItem } from '../../../models/BMDxExported'; // Adjusted path
import GOClusteringScatterPlot, {
  ClusteringScatterPoint,
} from './GOClusteringScatterPlot'; // Relative path
import GOClusteringSummaryTable from './GOClusteringSummaryTable'; // Relative path
import GOClusteringDetailsTable from './GOClusteringDetailsTable'; // Relative path
import CustomLegends from '../shared/CustomLegends'; // Adjusted path
import AnalysisControls from '../controls/AnalysisControls'; // Relative path
import GeneEnrichmentAnalysis from './GeneEnrichmentAnalysis'; // Relative path

// --- Import CSS Module ---
import styles from './GOClusteringAnalysisUnit.module.css'; // Import the CSS module

const PRIMARY_COLOR = '#1677ff'; // Example color (adjust if needed)
const { Text } = Typography; // Keep Text if used

// Helper function to get a displayable error message
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

// Define structure for cluster dropdown options used in AnalysisControls
interface ClusterOption {
  value: string; // Cluster ID (as string)
  label: string; // Text to display (e.g., "Cluster 1")
}

const GOClusteringAnalysisUnit: React.FC = () => {
  const logPrefix = '[GOClusteringAnalysisUnit v21 - Borders]'; // Version Bump
  const dispatch = useAppDispatch();

  // --- State for Enrichment Controls ---
  const [networkNodesCount, setNetworkNodesCount] = useState<number>(50);
  const [selectedClusterForEnrichment, setSelectedClusterForEnrichment] = useState<string | null>(null);
  const [enrichmentBackground, setEnrichmentBackground] = useState<string | undefined>(undefined);
  const [runEnrichmentTrigger, setRunEnrichmentTrigger] = useState<boolean>(false);
  const [geneListForEnrichment, setGeneListForEnrichment] = useState<string[] | null>(null);

  // --- Selectors ---
  const projectName = useAppSelector(selectSelectedProjectName);
  const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
  const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
  const referenceDataMap = useAppSelector(selectReferenceDataMap);
  const referenceData = useAppSelector(selectReferenceData);
  const highlightedRefClusterIdsSet = useAppSelector(selectHighlightedClusteringRefClusterIdsSet);

  // --- Data Fetching ---
  const {
    data: rawData,
    isLoading: isLoadingRaw,
    error: rawError,
    isSuccess: rawSuccess,
  } = useGetRawAnalysisDataQuery(
    { projectName, selectedBmdResultRefs },
    { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
  );

  // --- Generate Name Map (Memoized) ---
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

  // --- Effect to manage activeClusteringRef and reset enrichment state ---
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
      }
    }
  }, [selectedBmdResultRefs, activeClusteringRef, isLoadingRaw, dispatch, logPrefix]);

  // --- Calculate Active Analysis Name ---
  const activeAnalysisName = activeClusteringRef
    ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) || `Analysis ${activeClusteringRef}`
    : 'No Analysis Selected';

  // --- Prepare Data for Clustering (Based on active ref) ---
  const rowDataForClustering = useMemo(() => {
    const prepLogPrefix = `${logPrefix} [rowDataForClustering]`;
    if (!activeClusteringRef || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0) {
      console.log(`${prepLogPrefix} Skipping: No active ref (${activeClusteringRef}) or no raw category items.`);
      return null;
    }
    console.log(`${prepLogPrefix} Preparing input data for active ref: ${activeClusteringRef}`);
    const finalInputItems: ApiClusteringInputItem[] = [];
    const itemsToProcess = rawData.rawCategoryAnalysisItems || [];
    itemsToProcess.forEach((entry) => {
      if (String(entry.bmdResultRef) !== String(activeClusteringRef)) return;
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

  // --- Compute Cluster Count ---
  const dataLength = rowDataForClustering?.length ?? 0;
  const computedNumClusters = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)), [dataLength]);

  // --- Call Pyodide Clustering Hook ---
  const {
    result: pyodideResult,
    isLoading: isPyodideLoading,
    error: pyodideError,
  } = usePyodideClustering(rowDataForClustering, 'average', computedNumClusters);

  // --- Process Clustering Results ---
  const clustersForProcessingHook = useMemo(() => (pyodideResult ? [pyodideResult] : null), [pyodideResult]);
  const { categoryTableData, summaryTableData, processingError } = useProcessedClusteringData(
    clustersForProcessingHook,
    pyodideError ? getErrorMessage(pyodideError) : null
  );

  // --- Call the Visualization Data Hook ---
  const { scatterPlotData, legendColorItems, presentClusterIds } = useClusteringVisualizationData({
    categoryTableData, summaryTableData, referenceDataMap, referenceData,
  });

  // --- Derive Cluster Options for Dropdown ---
  const clusterOptionsForDropdown = useMemo((): ClusterOption[] => {
    if (!summaryTableData) return [];
    return [...summaryTableData]
      .sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity))
      .map((summary) => ({
        value: String(summary.cluster),
        label: `Cluster ${summary.cluster} (${summary.numCategoryIDs} cats)`,
      }));
  }, [summaryTableData]);

  // --- Combined Loading/Error State ---
  const isLoading = isLoadingRaw || isPyodideLoading;
  const error = rawError || pyodideError || processingError;
  const hasActiveDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
  const hasActiveResults = categoryTableData && categoryTableData.length > 0;

  // --- Callbacks ---
  const handleToggleHighlightRefCluster = useCallback((clusterIdLabel: string) => {
    dispatch(toggleClusteringRefClusterHighlight(clusterIdLabel));
  }, [dispatch]);

  const handleActiveRefChange = useCallback((activeKey: string) => {
    console.log(`${logPrefix} handleActiveRefChange called with key: ${activeKey}`);
    dispatch(setActiveClusteringRef(activeKey));
    setSelectedClusterForEnrichment(null);
    setRunEnrichmentTrigger(false);
    setGeneListForEnrichment(null);
    setEnrichmentBackground(undefined);
  }, [dispatch, logPrefix]);

  // --- Handlers for Enrichment controls ---
  const handleNetworkNodesChange = (value: number | null) => {
    const newValue = value ?? 50;
    setNetworkNodesCount(newValue);
  };
  const handleClusterForEnrichmentChange = (value: string | null) => {
    setSelectedClusterForEnrichment(value);
    setRunEnrichmentTrigger(false);
    setGeneListForEnrichment(null);
  };
  const handleEnrichmentBackgroundChange = (value: string) => {
    setEnrichmentBackground(value);
    setRunEnrichmentTrigger(false);
  };

  // --- Debounced Enrichment Submit Logic ---
  const debouncedSubmitLogic = useMemo(() => debounce(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground || !categoryTableData) {
      setRunEnrichmentTrigger(false);
      setGeneListForEnrichment(null);
      return;
    }
    const genes = categoryTableData
      .filter(row => String(row.cluster) === String(selectedClusterForEnrichment))
      .map(row => (row.allGenes || '').split(';')).flat()
      .map(g => g.trim()).filter(g => g.length > 0);
    const uniqueGenes = [...new Set(genes)];
    if (uniqueGenes.length === 0) {
      setRunEnrichmentTrigger(false);
      setGeneListForEnrichment(null);
      return;
    }
    setGeneListForEnrichment(uniqueGenes);
    setRunEnrichmentTrigger(true);
  }, 500), [selectedClusterForEnrichment, enrichmentBackground, categoryTableData]);

  const handleEnrichmentSubmit = useCallback(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground) {
      message.warning('Please select a cluster and a background gene set.');
      return;
    }
    debouncedSubmitLogic();
  }, [debouncedSubmitLogic, selectedClusterForEnrichment, enrichmentBackground]);

  useEffect(() => () => debouncedSubmitLogic.cancel(), [debouncedSubmitLogic]);

  // --- Export Handlers ---
  const formatDataForExport = (data: ClusteringScatterPoint[] | null): string => {
    if (!data || data.length === 0) return '';
    const header = ['GO_ID', 'GO_Term', 'Pyodide_Cluster', 'Reference_Cluster', 'Rank', 'BMD_5th_Percentile', 'Jittered_Rank'].join('\t');
    const rows = data.map(p => [
      p.goId ?? 'N/A', `"${p.goTerm?.replace(/"/g, '""') ?? 'N/A'}"`, p.pyodideCluster ?? 'N/A',
      p.referenceClusterId ?? 'N/A', p.rank ?? 'N/A', p.bmdValue?.toExponential(4) ?? 'N/A',
      p.jitteredRank?.toFixed(4) ?? 'N/A',
    ].join('\t'));
    return [header, ...rows].join('\n');
  };

  const handleCopyToClipboard = useCallback(async () => {
    const tsvData = formatDataForExport(scatterPlotData);
    if (!tsvData) { message.warning('No data available to copy.'); return; }
    try { await navigator.clipboard.writeText(tsvData); message.success('Scatter plot data copied!'); }
    catch (err) { console.error('Failed to copy:', err); message.error('Failed to copy data.'); }
  }, [scatterPlotData]);

  const handleExportToFile = useCallback(() => {
    const tsvData = formatDataForExport(scatterPlotData);
    if (!tsvData) { message.warning('No data available to export.'); return; }
    const blob = new Blob([tsvData], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeAnalysisName = activeAnalysisName.replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('download', `clustering_scatter_data_${safeAnalysisName}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Scatter plot data export initiated.');
  }, [scatterPlotData, activeAnalysisName]);

  // === Render Logic ===
  const PLOT_AREA_MIN_HEIGHT = 550;
  const tabItems = useMemo(() => {
    if (!selectedBmdResultRefs) return [];
    return selectedBmdResultRefs.map((refStr) => {
      const numericRef = Number(refStr);
      const name = !isNaN(numericRef) ? bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}` : `Analysis ${refStr}`;
      return { key: refStr, label: name };
    });
  }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);

  const isExportDisabled = !scatterPlotData || scatterPlotData.length === 0;

  // --- Loading/Error/No Selection checks ---
  if (isLoadingRaw) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading analysis data..." size="large" /></div>; }
  if (rawError) { return <Alert message="Error Loading Data for Clustering" description={getErrorMessage(rawError)} type="error" showIcon style={{ margin: '24px' }} />; }
  if (!projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { return <div style={{ padding: '24px' }}><Empty description="Please select one or more analyses from the 'Experiments' view to run GO Clustering." /></div>; }

  return (
    // Apply the container style from the CSS module
    <div className={styles.analysisUnitContainer}>
      <Tabs
        type="card"
        activeKey={activeClusteringRef ?? undefined}
        onChange={handleActiveRefChange}
        items={tabItems}
        style={{ marginBottom: '16px' }}
      />

      <>
        {isLoading && activeClusteringRef && (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Spin tip={`Running clustering for ${activeAnalysisName}...`} />
          </div>
        )}
        {!isLoading && error && activeClusteringRef && (
          <Alert
            message={`Clustering Error for ${activeAnalysisName}`}
            description={getErrorMessage(error)}
            type="error"
            showIcon
            style={{ marginBottom: '1rem' }}
          />
        )}

        {!isLoading && !error && activeClusteringRef && (
          <>
            {!hasActiveDataToCluster && (
              <Empty description="No suitable category data found for this specific analysis to perform clustering." />
            )}
            {hasActiveDataToCluster && !hasActiveResults && pyodideResult && (
              <Empty description="No categories found after processing clustering results for this analysis." />
            )}
            {hasActiveDataToCluster && hasActiveResults && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* Plot/Summary/Legend Row - Wrapped in Card */}
                <Card size="small" bordered className={styles.innerSectionCard}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={4} lg={3}>
                      <CustomLegends
                        cardTitle="Ref Clusters"
                        colorItems={legendColorItems}
                        highlightedLabelsSet={highlightedRefClusterIdsSet}
                        presentClusterIds={presentClusterIds}
                        onToggleColorVisibility={handleToggleHighlightRefCluster}
                        onToggleShapeVisibility={() => {}}
                        onToggleSizeVisibility={() => {}}
                        showColor={true}
                        showShape={false}
                        showSize={false}
                      />
                    </Col>
                    <Col xs={24} md={20} lg={21}>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={14}>
                           <div style={{ minHeight: `${PLOT_AREA_MIN_HEIGHT}px`, border: '1px solid #f0f0f0', borderRadius: '4px', padding: '8px' }}>
                            {scatterPlotData ? (
                              <GOClusteringScatterPlot
                                plotData={scatterPlotData}
                                summaryTableData={summaryTableData}
                                highlightedRefClusterIds={highlightedRefClusterIdsSet}
                              />
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                                <Empty description="Preparing plot data..." />
                              </div>
                            )}
                           </div>
                        </Col>
                        <Col xs={24} lg={10}>
                          <GOClusteringSummaryTable
                            dataSource={summaryTableData}
                            loading={isPyodideLoading}
                          />
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card>

                {/* Analysis Controls */}
                <AnalysisControls
                  isExportDisabled={isExportDisabled}
                  onCopy={handleCopyToClipboard}
                  onExport={handleExportToFile}
                  networkNodesCount={networkNodesCount}
                  onNetworkNodesCountChange={handleNetworkNodesChange}
                  availableClusterOptions={clusterOptionsForDropdown}
                  selectedClusterForEnrichment={selectedClusterForEnrichment}
                  onClusterForEnrichmentChange={handleClusterForEnrichmentChange}
                  enrichmentBackgroundValue={enrichmentBackground}
                  onEnrichmentBackgroundChange={handleEnrichmentBackgroundChange}
                  onEnrichmentSubmit={handleEnrichmentSubmit}
                />

                {/* Enrichment Analysis */}
                {runEnrichmentTrigger && geneListForEnrichment && enrichmentBackground && selectedClusterForEnrichment && (
                  <GeneEnrichmentAnalysis
                    geneList={geneListForEnrichment}
                    backgroundType={enrichmentBackground}
                    analysisName={`Cluster ${selectedClusterForEnrichment} (${activeAnalysisName})`}
                    triggerRun={runEnrichmentTrigger}
                    maxNodesToShow={networkNodesCount}
                  />
                )}

                {/* Details Table */}
                <Card size="small" title="Clustered Category Details" bordered className={styles.innerSectionCard}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <GOClusteringDetailsTable
                        dataSource={categoryTableData}
                        loading={isPyodideLoading}
                      />
                    </Col>
                  </Row>
                </Card>
              </Space>
            )}
          </>
        )}
        {!activeClusteringRef && selectedBmdResultRefs.length > 0 && (
          <Empty description="Select an analysis tab above." />
        )}
      </>
    </div>
  );
};

export default GOClusteringAnalysisUnit;
