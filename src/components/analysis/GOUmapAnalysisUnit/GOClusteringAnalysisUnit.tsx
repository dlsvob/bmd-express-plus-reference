// src/components/analysis/GOClusteringAnalysisUnit.tsx
// Handles multiple selected analyses via Tabs. Adds Copy/Export controls and Enrichment Analysis.

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
    Card,
    Spin,
    Alert,
    Empty,
    Row,
    Col,
    Tabs,
    Select,
    Typography,
    message,
} from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    ExperimentOutlined,
} from '@ant-design/icons';
import debounce from 'lodash.debounce'; // <-- Import debounce
import { useAppSelector, useAppDispatch } from '../../../store/hooks'; // Adjust path
import { selectSelectedProjectName } from '../../../store/selectors/projectSelectors'; // Adjust path
import { selectSelectedAnalysisRefs } from '../../../store/slices/selectedAnalysisSlice'; // Adjust path
import {
    selectActiveClusteringRef,
    setActiveClusteringRef,
    selectHighlightedClusteringRefClusterIdsSet,
    toggleClusteringRefClusterHighlight,
} from '../../../store/slices/analysisUISlice'; // Adjust path
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../../store/selectors/referenceDataSelector'; // Adjust path
import { useGetRawAnalysisDataQuery } from '../../../store/apis/experimentsApi'; // Adjust path
import {
    ApiClusteringInputItem,
    CategoryRow,
    SummaryRow,
} from '../../../utils/clusteringUtils'; // Adjust path
import {
    usePyodideClustering,
    PyodideClusteringResult,
} from '../../../hooks/usePyodideClustering'; // Adjust path
import { useProcessedClusteringData } from '../../../hooks/useProcessedClusteringData'; // Adjust path
import { useClusteringVisualizationData } from '../../../hooks/useClusteringVisualizationData'; // Adjust path
import { BMDResult, CategoryAnalysisItem } from '../../../models/BMDxExported'; // Adjust path
import GOClusteringScatterPlot, {
    ClusteringScatterPoint,
} from './GOClusteringScatterPlot'; // Adjust path
import GOClusteringSummaryTable from './GOClusteringSummaryTable'; // Adjust path
import GOClusteringDetailsTable from './GOClusteringDetailsTable'; // Adjust path
import CustomLegends from '../shared/CustomLegends'; // Adjust path
import AnalysisControls from '../controls/AnalysisControls'; // Adjust path
import GeneEnrichmentAnalysis from './GeneEnrichmentAnalysis'; // Adjust path

const PRIMARY_COLOR = '#1677ff'; // Example color
const { Text } = Typography;
const { Option } = Select;

// Helper function to get a displayable error message
const getErrorMessage = (error: unknown): string => {
    if (!error) {
        return 'An unknown error occurred.';
    }
    if (typeof error === 'string') {
        return error;
    }
    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
    ) {
        return error.message;
    }
    try {
        return JSON.stringify(error);
    } catch {
        return 'Could not stringify error object.';
    }
};

// Define structure for cluster dropdown options used in AnalysisControls
interface ClusterOption {
    value: string; // Cluster ID (as string)
    label: string; // Text to display (e.g., "Cluster 1")
}

const GOClusteringAnalysisUnit: React.FC = () => {
    const logPrefix = '[GOClusteringAnalysisUnit v20 - Debounce Submit]'; // Version Bump
    const dispatch = useAppDispatch();

    // --- State for Enrichment Controls ---
    const [networkNodesCount, setNetworkNodesCount] = useState<number>(50);
    const [selectedClusterForEnrichment, setSelectedClusterForEnrichment] =
        useState<string | null>(null);
    const [enrichmentBackground, setEnrichmentBackground] = useState<
        string | undefined
    >(undefined);
    const [runEnrichmentTrigger, setRunEnrichmentTrigger] =
        useState<boolean>(false);
    const [geneListForEnrichment, setGeneListForEnrichment] = useState<
        string[] | null
    >(null);

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);
    const referenceData = useAppSelector(selectReferenceData);
    const highlightedRefClusterIdsSet = useAppSelector(
        selectHighlightedClusteringRefClusterIdsSet
    );

    // --- Log component render ---
    console.log(`${logPrefix} Rendering. State:`, {
        activeClusteringRef,
        selectedClusterForEnrichment,
        enrichmentBackground,
        runEnrichmentTrigger,
        geneListLength: geneListForEnrichment?.length,
        networkNodesCount,
    });

    // --- Data Fetching ---
    const {
        data: rawData,
        isLoading: isLoadingRaw,
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

    // --- Generate Name Map (Memoized) ---
    const bmdRefToExperimentNameMap = useMemo(() => {
        const mapLogPrefix = `${logPrefix} [bmdRefToExperimentNameMap]`;
        console.log(`${mapLogPrefix} Generating map...`);
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
            console.log(`${mapLogPrefix} Map generated with ${tempMap.size} entries.`);
        } else {
            console.log(`${mapLogPrefix} Raw data not ready for map generation.`);
        }
        return tempMap;
    }, [rawSuccess, rawData]);

    // --- Effect to manage activeClusteringRef and reset enrichment state ---
    useEffect(() => {
        const effectLogPrefix = `${logPrefix} [useEffect activeRef]`;
        if (
            !isLoadingRaw &&
            selectedBmdResultRefs &&
            selectedBmdResultRefs.length > 0
        ) {
            const firstRef = selectedBmdResultRefs[0];
            if (
                activeClusteringRef === null ||
                !selectedBmdResultRefs.includes(activeClusteringRef)
            ) {
                console.log(
                    `${effectLogPrefix} Initializing or resetting activeClusteringRef to first selected: ${firstRef}`
                );
                dispatch(setActiveClusteringRef(firstRef));
                setSelectedClusterForEnrichment(null);
                setRunEnrichmentTrigger(false);
                setGeneListForEnrichment(null);
                setEnrichmentBackground(undefined);
            } else {
                console.log(
                    `${effectLogPrefix} Active ref ${activeClusteringRef} is valid.`
                );
            }
        } else if (
            !isLoadingRaw &&
            (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0)
        ) {
            if (activeClusteringRef !== null) {
                console.log(
                    `${effectLogPrefix} No refs selected, clearing activeClusteringRef.`
                );
                dispatch(setActiveClusteringRef(null));
                setSelectedClusterForEnrichment(null);
                setRunEnrichmentTrigger(false);
                setGeneListForEnrichment(null);
                setEnrichmentBackground(undefined);
            }
        }
    }, [
        selectedBmdResultRefs,
        activeClusteringRef,
        isLoadingRaw,
        dispatch,
        logPrefix,
    ]);

    // --- Calculate Active Analysis Name ---
    const activeAnalysisName = activeClusteringRef
        ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) ||
        `Analysis ${activeClusteringRef}`
        : 'No Analysis Selected';

    // --- Prepare Data for Clustering (Based on active ref) ---
    const rowDataForClustering = useMemo(() => {
        const prepLogPrefix = `${logPrefix} [rowDataForClustering]`;
        if (
            !activeClusteringRef ||
            !rawData?.rawCategoryAnalysisItems ||
            rawData.rawCategoryAnalysisItems.length === 0
        ) {
            console.log(
                `${prepLogPrefix} Skipping: No active ref (${activeClusteringRef}) or no raw category items.`
            );
            return null;
        }
        console.log(
            `${prepLogPrefix} Preparing input data for active ref: ${activeClusteringRef}`
        );

        const finalInputItems: ApiClusteringInputItem[] = [];
        const itemsToProcess = rawData.rawCategoryAnalysisItems || [];
        itemsToProcess.forEach((entry) => {
            if (String(entry.bmdResultRef) !== String(activeClusteringRef)) {
                return;
            }
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

        console.log(
            `${prepLogPrefix} Prepared ${finalInputItems.length} items for clustering (ref: ${activeClusteringRef}).`
        );
        return finalInputItems.length > 0 ? finalInputItems : null;
    }, [rawData?.rawCategoryAnalysisItems, activeClusteringRef, logPrefix]);

    // --- Compute Cluster Count ---
    const dataLength = rowDataForClustering?.length ?? 0;
    const computedNumClusters = useMemo(
        () => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)),
        [dataLength]
    );

    // --- Call Pyodide Clustering Hook ---
    const {
        result: pyodideResult,
        isLoading: isPyodideLoading,
        error: pyodideError,
    } = usePyodideClustering(
        rowDataForClustering,
        'average',
        computedNumClusters
    );

    // --- Process Clustering Results ---
    const clustersForProcessingHook = useMemo(() => {
        return pyodideResult ? [pyodideResult] : null;
    }, [pyodideResult]);

    const { categoryTableData, summaryTableData, processingError } =
        useProcessedClusteringData(
            clustersForProcessingHook,
            pyodideError ? getErrorMessage(pyodideError) : null
        );

    // Log when table data changes
    useEffect(() => {
        console.log(`${logPrefix} Processed table data updated:`, {
            categoryTableDataCount: categoryTableData?.length,
            summaryTableDataCount: summaryTableData?.length,
            processingError: !!processingError,
        });
    }, [categoryTableData, summaryTableData, processingError, logPrefix]);


    // --- Call the Visualization Data Hook ---
    const { scatterPlotData, legendColorItems, presentClusterIds } =
        useClusteringVisualizationData({
            categoryTableData,
            summaryTableData,
            referenceDataMap,
            referenceData,
        });

    // Log when viz data changes
    useEffect(() => {
        console.log(`${logPrefix} Visualization data updated:`, {
            scatterPlotDataCount: scatterPlotData?.length,
            legendColorItemsCount: legendColorItems?.length,
            presentClusterIdsCount: presentClusterIds?.size,
        });
    }, [scatterPlotData, legendColorItems, presentClusterIds, logPrefix]);


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
    const hasActiveDataToCluster =
        rowDataForClustering && rowDataForClustering.length > 0;
    const hasActiveResults = categoryTableData && categoryTableData.length > 0;

    // --- Callbacks ---
    const handleToggleHighlightRefCluster = useCallback(
        (clusterIdLabel: string) => {
            dispatch(toggleClusteringRefClusterHighlight(clusterIdLabel));
        },
        [dispatch]
    );

    const handleActiveRefChange = useCallback(
        (activeKey: string) => {
            console.log(`${logPrefix} handleActiveRefChange called with key: ${activeKey}`);
            dispatch(setActiveClusteringRef(activeKey));
            // Reset enrichment state when changing tabs
            setSelectedClusterForEnrichment(null);
            setRunEnrichmentTrigger(false);
            setGeneListForEnrichment(null);
            setEnrichmentBackground(undefined);
        },
        [dispatch, logPrefix]
    );

    // --- Handlers for Enrichment controls ---
    const handleNetworkNodesChange = (value: number | null) => {
        const newValue = value ?? 50;
        console.log(`${logPrefix} handleNetworkNodesChange: ${newValue}`);
        setNetworkNodesCount(newValue);
    };

    const handleClusterForEnrichmentChange = (value: string | null) => {
        console.log(`${logPrefix} handleClusterForEnrichmentChange: ${value}`);
        setSelectedClusterForEnrichment(value);
        setRunEnrichmentTrigger(false); // Reset trigger on new selection
        setGeneListForEnrichment(null);
    };

    const handleEnrichmentBackgroundChange = (value: string) => {
        console.log(`${logPrefix} handleEnrichmentBackgroundChange: ${value}`);
        setEnrichmentBackground(value);
        setRunEnrichmentTrigger(false); // Reset trigger if background changes
    };

    // --- Debounced Enrichment Submit Logic ---
    const debouncedSubmitLogic = useMemo(
        () =>
            debounce(() => {
                console.log(
                    `${logPrefix} Debounced submit logic executing. State:`, { selectedClusterForEnrichment, enrichmentBackground }
                );
                if (
                    !selectedClusterForEnrichment ||
                    !enrichmentBackground ||
                    !categoryTableData
                ) {
                    console.log(`${logPrefix} Debounced submit: Aborted - missing selections.`);
                    setRunEnrichmentTrigger(false);
                    setGeneListForEnrichment(null);
                    return;
                }

                const genes = categoryTableData
                    .filter(
                        (row) => String(row.cluster) === String(selectedClusterForEnrichment)
                    )
                    .map((row) => (row.allGenes || '').split(';'))
                    .flat()
                    .map((g) => g.trim())
                    .filter((g) => g.length > 0);

                const uniqueGenes = [...new Set(genes)];

                if (uniqueGenes.length === 0) {
                    console.log(`${logPrefix} Debounced submit: Aborted - no genes found for cluster ${selectedClusterForEnrichment}.`);
                    setRunEnrichmentTrigger(false);
                    setGeneListForEnrichment(null);
                    return;
                }

                console.log(
                    `${logPrefix} Debounced submit: Setting gene list (${uniqueGenes.length} genes) and trigger.`
                );
                setGeneListForEnrichment(uniqueGenes);
                setRunEnrichmentTrigger(true); // Set the trigger
            }, 500), // Debounce for 500ms
        [selectedClusterForEnrichment, enrichmentBackground, categoryTableData, logPrefix]
    );

    // --- Handler attached to the button ---
    const handleEnrichmentSubmit = useCallback(() => {
        console.log(`${logPrefix} handleEnrichmentSubmit called (triggering debounce).`);
        if (!selectedClusterForEnrichment || !enrichmentBackground) {
            message.warning('Please select a cluster and a background gene set.');
            return;
        }
        debouncedSubmitLogic();
    }, [debouncedSubmitLogic, selectedClusterForEnrichment, enrichmentBackground]);

    // --- Cleanup debounce on unmount ---
    useEffect(() => {
        return () => {
            debouncedSubmitLogic.cancel();
        };
    }, [debouncedSubmitLogic]);
    // ------------------------------------

    // --- Export Handlers ---
    const formatDataForExport = (
        data: ClusteringScatterPoint[] | null
    ): string => {
        if (!data || data.length === 0) {
            return '';
        }
        const header = [
            'GO_ID',
            'GO_Term',
            'Pyodide_Cluster',
            'Reference_Cluster',
            'Rank',
            'BMD_5th_Percentile',
            'Jittered_Rank',
        ].join('\t');

        const rows = data.map((p) =>
            [
                p.goId ?? 'N/A',
                `"${p.goTerm?.replace(/"/g, '""') ?? 'N/A'}"`,
                p.pyodideCluster ?? 'N/A',
                p.referenceClusterId ?? 'N/A',
                p.rank ?? 'N/A',
                p.bmdValue?.toExponential(4) ?? 'N/A',
                p.jitteredRank?.toFixed(4) ?? 'N/A',
            ].join('\t')
        );

        return [header, ...rows].join('\n');
    };

    const handleCopyToClipboard = useCallback(async () => {
        const tsvData = formatDataForExport(scatterPlotData);
        if (!tsvData) {
            message.warning('No data available to copy.');
            return;
        }
        try {
            await navigator.clipboard.writeText(tsvData);
            message.success('Scatter plot data copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy data to clipboard:', err);
            message.error('Failed to copy data. See console for details.');
        }
    }, [scatterPlotData]);

    const handleExportToFile = useCallback(() => {
        const tsvData = formatDataForExport(scatterPlotData);
        if (!tsvData) {
            message.warning('No data available to export.');
            return;
        }

        const blob = new Blob([tsvData], {
            type: 'text/tab-separated-values;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const safeAnalysisName = activeAnalysisName.replace(/[^a-z0-9]/gi, '_');
        link.setAttribute(
            'download',
            `clustering_scatter_data_${safeAnalysisName}.txt`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('Scatter plot data export initiated.');
    }, [scatterPlotData, activeAnalysisName]);
    // ------------------------------------

    // === Render Logic ===
    const PLOT_AREA_MIN_HEIGHT = 550;

    const tabItems = useMemo(() => {
        if (!selectedBmdResultRefs) return [];
        return selectedBmdResultRefs.map((refStr) => {
            const numericRef = Number(refStr);
            const name = !isNaN(numericRef)
                ? bmdRefToExperimentNameMap.get(numericRef) || `Analysis ${refStr}`
                : `Analysis ${refStr}`;
            return {
                key: refStr,
                label: name,
            };
        });
    }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);

    const isExportDisabled = !scatterPlotData || scatterPlotData.length === 0;

    // Handle overall loading/error/no selection states first
    if (isLoadingRaw) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin tip="Loading analysis data..." size="large" />
            </div>
        );
    }

    if (rawError) {
        const errorMessage = getErrorMessage(rawError);
        return (
            <Alert
                message="Error Loading Data for Clustering"
                description={errorMessage}
                type="error"
                showIcon
                style={{ margin: '24px' }}
            />
        );
    }

    if (
        !projectName ||
        !selectedBmdResultRefs ||
        selectedBmdResultRefs.length === 0
    ) {
        return (
            <div style={{ padding: '24px' }}>
                <Empty description="Please select one or more analyses from the 'Experiments' view to run GO Clustering." />
            </div>
        );
    }

    // Main render structure with Tabs and active analysis display
    return (
        <div
            style={{
                border: `2px solid ${PRIMARY_COLOR}`,
                borderRadius: '8px',
                padding: '1px',
                marginTop: '24px',
            }}
        >
            {/* Render Tabs for Selection */}
            <Tabs
                type="card"
                activeKey={activeClusteringRef ?? undefined}
                onChange={handleActiveRefChange}
                items={tabItems}
                style={{ padding: '0 16px' }}
            />

            {/* Render the Active Analysis Unit Content */}
            <Card title={`Clustering Results: ${activeAnalysisName}`} bordered={false}>
                {/* Loading/Error specific to the *active* analysis clustering */}
                {isPyodideLoading && activeClusteringRef && (
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <Spin tip={`Running clustering for ${activeAnalysisName}...`} />
                    </div>
                )}
                {!isPyodideLoading && (pyodideError || processingError) && activeClusteringRef && (
                    <Alert
                        message={`Clustering Error for ${activeAnalysisName}`}
                        description={getErrorMessage(pyodideError || processingError)}
                        type="error"
                        showIcon
                        style={{ marginBottom: '1rem' }}
                    />
                )}

                {/* Render Plot and Tables if clustering ran and produced results for the active ref */}
                {!isPyodideLoading && !error && activeClusteringRef && (
                    <>
                        {!hasActiveDataToCluster && (
                            <Empty description="No suitable category data found for this specific analysis to perform clustering." />
                        )}
                        {hasActiveDataToCluster && !hasActiveResults && pyodideResult && (
                            <Empty description="No categories found after processing clustering results for this analysis." />
                        )}
                        {hasActiveDataToCluster && hasActiveResults && (
                            <>
                                {/* Plot/Summary/Legend Row */}
                                <Row gutter={[16, 16]}>
                                    {/* Legend Column */}
                                    <Col xs={24} md={4} lg={3}>
                                        <CustomLegends
                                            cardTitle="Ref Clusters"
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

                                    {/* Main Content Area (Plot and Summary Table) */}
                                    <Col xs={24} md={20} lg={21}>
                                        <Row gutter={[16, 16]}>
                                            {/* Plot Area */}
                                            <Col xs={24} lg={14}>
                                                <Card
                                                    size="small"
                                                    title="5th Percentile BMD vs. Cluster Rank"
                                                    style={{ minHeight: `${PLOT_AREA_MIN_HEIGHT}px` }}
                                                    bodyStyle={{ height: 'calc(100% - 40px)' }}
                                                >
                                                    {scatterPlotData ? (
                                                        <GOClusteringScatterPlot
                                                            plotData={scatterPlotData}
                                                            summaryTableData={summaryTableData}
                                                            highlightedRefClusterIds={
                                                                highlightedRefClusterIdsSet
                                                            }
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                height: '400px',
                                                            }}
                                                        >
                                                            <Empty description="Preparing plot data..." />
                                                        </div>
                                                    )}
                                                </Card>
                                            </Col>

                                            {/* Summary Table Area */}
                                            <Col xs={24} lg={10}>
                                                <GOClusteringSummaryTable
                                                    dataSource={summaryTableData}
                                                    loading={isPyodideLoading}
                                                // No onRow needed for enrichment here
                                                />
                                            </Col>
                                        </Row>
                                    </Col>
                                </Row>

                                {/* Render AnalysisControls Component */}
                                <AnalysisControls
                                    isExportDisabled={isExportDisabled}
                                    onCopy={handleCopyToClipboard}
                                    onExport={handleExportToFile}
                                    networkNodesCount={networkNodesCount}
                                    onNetworkNodesCountChange={handleNetworkNodesChange}
                                    availableClusterOptions={clusterOptionsForDropdown}
                                    selectedClusterForEnrichment={selectedClusterForEnrichment}
                                    onClusterForEnrichmentChange={
                                        handleClusterForEnrichmentChange
                                    }
                                    enrichmentBackgroundValue={enrichmentBackground}
                                    onEnrichmentBackgroundChange={
                                        handleEnrichmentBackgroundChange
                                    }
                                    onEnrichmentSubmit={handleEnrichmentSubmit}
                                // isEnrichmentSubmitDisabled handled internally
                                />

                                {/* Conditionally Render Enrichment Analysis */}
                                {runEnrichmentTrigger &&
                                    geneListForEnrichment &&
                                    enrichmentBackground &&
                                    selectedClusterForEnrichment && (
                                        <GeneEnrichmentAnalysis
                                            geneList={geneListForEnrichment}
                                            backgroundType={enrichmentBackground}
                                            analysisName={`Cluster ${selectedClusterForEnrichment} (${activeAnalysisName})`}
                                            triggerRun={runEnrichmentTrigger}
                                            maxNodesToShow={networkNodesCount} // Pass node count
                                        />
                                    )}

                                {/* Details Table Area */}
                                <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                                    <Col span={24}>
                                        <GOClusteringDetailsTable
                                            dataSource={categoryTableData}
                                            loading={isPyodideLoading}
                                        // No onRow needed for enrichment here
                                        />
                                    </Col>
                                </Row>
                            </>
                        )}
                    </>
                )}
                {/* Show Empty state if no active ref is selected */}
                {!activeClusteringRef && selectedBmdResultRefs.length > 0 && (
                    <Empty description="Select an analysis tab above." />
                )}
            </Card>
        </div>
    );
};

export default GOClusteringAnalysisUnit;
