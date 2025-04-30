// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit.tsx
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Card, Spin, Alert, Empty, Row, Col, Tabs, message, Space } from 'antd';
import debounce from 'lodash.debounce';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice';
import { selectActiveClusteringRef, setActiveClusteringRef, selectHighlightedClusteringRefClusterIdsSet, toggleClusteringRefClusterHighlight } from '../../../store/slices/analysisUISlice';
import { selectReferenceDataMap, selectReferenceData } from '../../../store/selectors/referenceDataSelector';
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi';
import { ApiClusteringInputItem } from '../../../utils/clusteringUtils';
import { usePyodideClustering } from '../../../hooks/usePyodideClustering';
import { useProcessedClusteringData } from '../../../hooks/useProcessedClusteringData';
import { useClusteringVisualizationData } from '../../../hooks/useClusteringVisualizationData';
import GOClusteringScatterPlot, {
  ClusteringScatterPoint,
} from './GOClusteringScatterPlot';
import GOClusteringSummaryTable from './GOClusteringSummaryTable';
import GOClusteringDetailsTable from './GOClusteringDetailsTable';
import CustomLegends from '../shared/CustomLegends';
import AnalysisControls from '../controls/AnalysisControls'; // Corrected path
import GeneEnrichmentAnalysis from './GeneEnrichmentAnalysis';
import styles from './GOClusteringAnalysisUnit.module.css';

const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

interface ClusterOption {
  value: string;
  label: string;
}

const GOClusteringAnalysisUnit: React.FC = () => {
  const logPrefix = '[GOClusteringAnalysisUnit v22 - Inner Borders]';
  const dispatch = useAppDispatch();

  const [networkNodesCount, setNetworkNodesCount] = useState<number>(50);
  const [selectedClusterForEnrichment, setSelectedClusterForEnrichment] = useState<string | null>(null);
  const [enrichmentBackground, setEnrichmentBackground] = useState<string | undefined>(undefined);
  const [runEnrichmentTrigger, setRunEnrichmentTrigger] = useState<boolean>(false);
  const [geneListForEnrichment, setGeneListForEnrichment] = useState<string[] | null>(null);

  const projectName = useAppSelector(selectSelectedProjectName);
  const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
  const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
  const referenceDataMap = useAppSelector(selectReferenceDataMap);
  const referenceData = useAppSelector(selectReferenceData);
  const highlightedRefClusterIdsSet = useAppSelector(selectHighlightedClusteringRefClusterIdsSet);

  const {
    data: rawData,
    isLoading: isLoadingRaw,
    error: rawError,
    isSuccess: rawSuccess,
  } = useGetRawAnalysisDataQuery(
    { projectName, selectedBmdResultRefs },
    { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
  );

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

  useEffect(() => {
    const effectLogPrefix = `${logPrefix} [useEffect activeRef]`;
    if (!isLoadingRaw && selectedBmdResultRefs && selectedBmdResultRefs.length > 0) {
      const firstRef = selectedBmdResultRefs[0];
      if (activeClusteringRef === null || !selectedBmdResultRefs.includes(activeClusteringRef)) {
        console.log(`${effectLogPrefix} Initializing or resetting activeClusteringRef to first selected: ${firstRef}`);
        dispatch(setActiveClusteringRef(firstRef));
        setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined);
      } else {
        console.log(`${effectLogPrefix} Active ref ${activeClusteringRef} is valid.`);
      }
    } else if (!isLoadingRaw && (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0)) {
      if (activeClusteringRef !== null) {
        console.log(`${effectLogPrefix} No refs selected, clearing activeClusteringRef.`);
        dispatch(setActiveClusteringRef(null));
        setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined);
      }
    }
  }, [selectedBmdResultRefs, activeClusteringRef, isLoadingRaw, dispatch, logPrefix]);

  const activeAnalysisName = activeClusteringRef ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) || `Analysis ${activeClusteringRef}` : 'No Analysis Selected';

  const rowDataForClustering = useMemo(() => {
    const prepLogPrefix = `${logPrefix} [rowDataForClustering]`;
    if (!activeClusteringRef || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0) { return null; }
    console.log(`${prepLogPrefix} Preparing input data for active ref: ${activeClusteringRef}`);
    const finalInputItems: ApiClusteringInputItem[] = [];
    const itemsToProcess = rawData.rawCategoryAnalysisItems || [];
    itemsToProcess.forEach((entry) => {
      if (String(entry.bmdResultRef) !== String(activeClusteringRef)) return;
      const item = entry.item;
      if (!item || !item.categoryIdentifier?.id) return;
      finalInputItems.push({
        'Category ID': item.categoryIdentifier.id, 'Category Title': item.categoryIdentifier.title ?? '', 'Cluster BMD': String(item.bmdFifthPercentileTotalGenes ?? ''), 'Genes Up': item.genesUp ?? '', 'Genes Down': item.genesDown ?? '', 'All Genes': item.geneSymbolsPrivate ?? '',
      });
    });
    console.log(`${prepLogPrefix} Prepared ${finalInputItems.length} items for clustering (ref: ${activeClusteringRef}).`);
    return finalInputItems.length > 0 ? finalInputItems : null;
  }, [rawData?.rawCategoryAnalysisItems, activeClusteringRef, logPrefix]);

  const dataLength = rowDataForClustering?.length ?? 0;
  const computedNumClusters = useMemo(() => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)), [dataLength]);

  const { result: pyodideResult, isLoading: isPyodideLoading, error: pyodideError, } = usePyodideClustering(rowDataForClustering, 'average', computedNumClusters);
  const clustersForProcessingHook = useMemo(() => (pyodideResult ? [pyodideResult] : null), [pyodideResult]);
  const { categoryTableData, summaryTableData, processingError } = useProcessedClusteringData(clustersForProcessingHook, pyodideError ? getErrorMessage(pyodideError) : null);
  const { scatterPlotData, legendColorItems, presentClusterIds } = useClusteringVisualizationData({ categoryTableData, summaryTableData, referenceDataMap, referenceData, });

  const clusterOptionsForDropdown = useMemo((): ClusterOption[] => {
    if (!summaryTableData) return [];
    return [...summaryTableData].sort((a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity)).map((summary) => ({ value: String(summary.cluster), label: `Cluster ${summary.cluster} (${summary.numCategoryIDs} cats)`, }));
  }, [summaryTableData]);

  const isLoading = isLoadingRaw || isPyodideLoading;
  const error = rawError || pyodideError || processingError;
  const hasActiveDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
  const hasActiveResults = categoryTableData && categoryTableData.length > 0;

  const handleToggleHighlightRefCluster = useCallback((clusterIdLabel: string) => { dispatch(toggleClusteringRefClusterHighlight(clusterIdLabel)); }, [dispatch]);
  const handleActiveRefChange = useCallback((activeKey: string) => { console.log(`${logPrefix} handleActiveRefChange called with key: ${activeKey}`); dispatch(setActiveClusteringRef(activeKey)); setSelectedClusterForEnrichment(null); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); setEnrichmentBackground(undefined); }, [dispatch, logPrefix]);
  const handleNetworkNodesChange = (value: number | null) => { setNetworkNodesCount(value ?? 50); };
  const handleClusterForEnrichmentChange = (value: string | null) => { setSelectedClusterForEnrichment(value); setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); };
  const handleEnrichmentBackgroundChange = (value: string) => { setEnrichmentBackground(value); setRunEnrichmentTrigger(false); };

  const debouncedSubmitLogic = useMemo(() => debounce(() => {
    if (!selectedClusterForEnrichment || !enrichmentBackground || !categoryTableData) { setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; }
    const genes = categoryTableData.filter(row => String(row.cluster) === String(selectedClusterForEnrichment)).map(row => (row.allGenes || '').split(';')).flat().map(g => g.trim()).filter(g => g.length > 0);
    const uniqueGenes = [...new Set(genes)];
    if (uniqueGenes.length === 0) { setRunEnrichmentTrigger(false); setGeneListForEnrichment(null); return; }
    setGeneListForEnrichment(uniqueGenes); setRunEnrichmentTrigger(true);
  }, 500), [selectedClusterForEnrichment, enrichmentBackground, categoryTableData]);

  const handleEnrichmentSubmit = useCallback(() => { if (!selectedClusterForEnrichment || !enrichmentBackground) { message.warning('Please select a cluster and a background gene set.'); return; } debouncedSubmitLogic(); }, [debouncedSubmitLogic, selectedClusterForEnrichment, enrichmentBackground]);
  useEffect(() => () => debouncedSubmitLogic.cancel(), [debouncedSubmitLogic]);

  const formatDataForExport = (data: ClusteringScatterPoint[] | null): string => {
    if (!data || data.length === 0) return '';
    const header = ['GO_ID', 'GO_Term', 'Pyodide_Cluster', 'Reference_Cluster', 'Rank', 'BMD_5th_Percentile', 'Jittered_Rank'].join('\t');
    const rows = data.map(p => [p.goId ?? 'N/A', `"${p.goTerm?.replace(/"/g, '""') ?? 'N/A'}"`, p.pyodideCluster ?? 'N/A', p.referenceClusterId ?? 'N/A', p.rank ?? 'N/A', p.bmdValue?.toExponential(4) ?? 'N/A', p.jitteredRank?.toFixed(4) ?? 'N/A',].join('\t'));
    return [header, ...rows].join('\n');
  };

  const handleCopyToClipboard = useCallback(async () => { const tsvData = formatDataForExport(scatterPlotData); if (!tsvData) { message.warning('No data available to copy.'); return; } try { await navigator.clipboard.writeText(tsvData); message.success('Scatter plot data copied!'); } catch (err) { console.error('Failed to copy:', err); message.error('Failed to copy data.'); } }, [scatterPlotData]);
  const handleExportToFile = useCallback(() => { const tsvData = formatDataForExport(scatterPlotData); if (!tsvData) { message.warning('No data available to export.'); return; } const blob = new Blob([tsvData], { type: 'text/tab-separated-values;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.setAttribute('href', url); const safeAnalysisName = activeAnalysisName.replace(/[^a-z0-9]/gi, '_'); link.setAttribute('download', `clustering_scatter_data_${safeAnalysisName}.txt`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); message.success('Scatter plot data export initiated.'); }, [scatterPlotData, activeAnalysisName]);

  const PLOT_AREA_MIN_HEIGHT = 550;
  const tabItems = useMemo(() => { if (!selectedBmdResultRefs) return []; return selectedBmdResultRefs.map((refStr) => { const numericRef = Number(refStr); const name = !isNaN(numericRef) ? bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}` : `Analysis ${refStr}`; return { key: refStr, label: name }; }); }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);
  const isExportDisabled = !scatterPlotData || scatterPlotData.length === 0;

  if (isLoadingRaw) { return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Loading analysis data..." size="large" /></div>; }
  if (rawError) { return <Alert message="Error Loading Data for Clustering" description={getErrorMessage(rawError)} type="error" showIcon style={{ margin: '24px' }} />; }
  if (!projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { return <div style={{ padding: '24px' }}><Empty description="Please select one or more analyses from the 'Experiments' view to run GO Clustering." /></div>; }

  const spinTip = isLoading && activeClusteringRef ? <>Running clustering for {activeAnalysisName}...</> : undefined;

  return (
    // Root element - no border class here
    <div>
      <Tabs
        type="card"
        activeKey={activeClusteringRef ?? undefined}
        onChange={handleActiveRefChange}
        items={tabItems}
        style={{ marginBottom: '16px' }}
      />

      <>
        {isLoading && activeClusteringRef && (<div style={{ padding: '1rem', textAlign: 'center' }}> <Spin tip={spinTip} /> </div>)}
        {!isLoading && error && activeClusteringRef && (<Alert message={`Clustering Error for ${activeAnalysisName}`} description={getErrorMessage(error)} type="error" showIcon style={{ marginBottom: '1rem' }} />)}

        {!isLoading && !error && activeClusteringRef && (
          <>
            {!hasActiveDataToCluster && (<Empty description="No suitable category data found for this specific analysis to perform clustering." />)}
            {hasActiveDataToCluster && !hasActiveResults && pyodideResult && (<Empty description="No categories found after processing clustering results for this analysis." />)}
            {hasActiveDataToCluster && hasActiveResults && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* Plot/Summary/Legend Row - Card with border removed */}
                <Card size="small" bordered={false} className={styles.innerSectionCard}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={4} lg={3}>
                      <CustomLegends
                        cardTitle="Ref Clusters" // Keep title for this legend
                        colorItems={legendColorItems}
                        highlightedLabelsSet={highlightedRefClusterIdsSet}
                        presentClusterIds={presentClusterIds}
                        onToggleColorVisibility={handleToggleHighlightRefCluster}
                        onToggleShapeVisibility={() => { }}
                        onToggleSizeVisibility={() => { }}
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

                {/* Analysis Controls - border removed inside its component */}
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

                {/* Enrichment Analysis - border removed inside its component */}
                {runEnrichmentTrigger && geneListForEnrichment && enrichmentBackground && selectedClusterForEnrichment && (
                  <GeneEnrichmentAnalysis
                    geneList={geneListForEnrichment}
                    backgroundType={enrichmentBackground}
                    analysisName={`Cluster ${selectedClusterForEnrichment} (${activeAnalysisName})`}
                    triggerRun={runEnrichmentTrigger}
                    maxNodesToShow={networkNodesCount}
                  />
                )}

                {/* Details Table - Card with border removed */}
                <Card size="small" title="Clustered Category Details" bordered={false} className={styles.innerSectionCard}>
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
