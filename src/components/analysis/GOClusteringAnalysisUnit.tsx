// src/components/analysis/GOClusteringAnalysisUnit.tsx
// Handles multiple selected analyses via Tabs.

import React, { useMemo, useCallback, useEffect } from 'react';
import { Card, Spin, Alert, Empty, Row, Col, Tabs } from 'antd'; // Added Tabs
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectActiveClusteringRef,
    setActiveClusteringRef,
    selectHighlightedClusteringRefClusterIdsSet,
    toggleClusteringRefClusterHighlight,
} from '../../store/slices/analysisUISlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';
import { ApiClusteringInputItem } from '../../utils/clusteringUtils';
import {
    usePyodideClustering,
    PyodideClusteringResult,
} from '../../hooks/usePyodideClustering';
import { useProcessedClusteringData } from '../../hooks/useProcessedClusteringData';
import { useClusteringVisualizationData } from '../../hooks/useClusteringVisualizationData';
import { BMDResult, CategoryAnalysisItem } from '../../models/BMDxExported';
import GOClusteringScatterPlot from './GOClusteringScatterPlot';
import GOClusteringSummaryTable from './GOClusteringSummaryTable';
import GOClusteringDetailsTable from './GOClusteringDetailsTable';
import CustomLegends from './CustomLegends';
// Removed ExperimentSelectionToggle import

const PRIMARY_COLOR = '#1677ff';

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

const GOClusteringAnalysisUnit: React.FC = () => {
    const logPrefix = '[GOClusteringAnalysisUnit v14 - Tabs Toggle]'; // Keep version consistent
    const dispatch = useAppDispatch();

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const activeClusteringRef = useAppSelector(selectActiveClusteringRef);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);
    const referenceData = useAppSelector(selectReferenceData);
    const highlightedRefClusterIdsSet = useAppSelector(
        selectHighlightedClusteringRefClusterIdsSet
    );

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

    // --- Generate Name Map ---
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

    // --- Effect to manage activeClusteringRef ---
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
            }
        }
    }, [
        selectedBmdResultRefs,
        activeClusteringRef,
        isLoadingRaw,
        dispatch,
        logPrefix,
    ]);

    // --- Prepare Data for Clustering (Filters based on ACTIVE ref) ---
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
        rawData.rawCategoryAnalysisItems.forEach((entry) => {
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

    // --- Call the Visualization Data Hook ---
    const { scatterPlotData, legendColorItems, presentClusterIds } = // Get presentClusterIds
        useClusteringVisualizationData({
            categoryTableData,
            summaryTableData,
            referenceDataMap,
            referenceData,
        });

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
            dispatch(setActiveClusteringRef(activeKey));
        },
        [dispatch]
    );

    // === Render Logic ===
    const activeAnalysisName = activeClusteringRef
        ? bmdRefToExperimentNameMap.get(Number(activeClusteringRef)) ||
        `Analysis ${activeClusteringRef}`
        : 'No Analysis Selected';

    const PLOT_AREA_MIN_HEIGHT = 550;

    // Prepare items for Tabs
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
                {!isPyodideLoading && !pyodideError && !processingError && activeClusteringRef && (
                    <>
                        {!hasActiveDataToCluster && (
                            <Empty description="No suitable category data found for this specific analysis to perform clustering." />
                        )}
                        {hasActiveDataToCluster && !hasActiveResults && pyodideResult && (
                            <Empty description="No categories found after processing clustering results for this analysis." />
                        )}
                        {hasActiveDataToCluster && hasActiveResults && (
                            <Row gutter={[16, 16]}>
                                {/* Legend Column */}
                                <Col xs={24} md={4} lg={3}>
                                    <CustomLegends
                                        cardTitle="Ref Clusters"
                                        colorItems={legendColorItems}
                                        highlightedLabelsSet={highlightedRefClusterIdsSet}
                                        presentClusterIds={presentClusterIds} // Pass the set of present IDs
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
                                            />
                                        </Col>
                                    </Row>

                                    {/* Details Table Area */}
                                    <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                                        <Col span={24}>
                                            <GOClusteringDetailsTable
                                                dataSource={categoryTableData}
                                                loading={isPyodideLoading}
                                            />
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
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
