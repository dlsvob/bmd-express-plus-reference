// src/components/analysis/GOClusteringAnalysisUnit.tsx

import React, { useMemo, useCallback } from 'react';
import { Card, Spin, Alert, Collapse, Table, Empty, Row, Col } from 'antd';
import type { TableColumnType } from 'antd';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
// --- Import correct action and selector ---
import {
    selectHighlightedClusteringRefClusterId, // <<< UPDATED (Highlighting Change)
    setHighlightedClusteringRefCluster, // <<< UPDATED (Highlighting Change)
} from '../../store/slices/analysisUISlice';
// -----------------------------------------
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';
import {
    CategoryRow,
    SummaryRow,
    ApiClusteringInputItem,
} from '../../utils/clusteringUtils';
import {
    usePyodideClustering,
    PyodideClusteringResult,
} from '../../hooks/usePyodideClustering'; // Assumes v4 with memoized return
import { useProcessedClusteringData } from '../../hooks/useProcessedClusteringData';
import { BMDResult, CategoryAnalysisItem } from '../../models/BMDxExported';
import GOClusteringScatterPlot, {
    ClusteringScatterPoint,
} from './GOClusteringScatterPlot';
import { ReferenceUmapItem } from '../../data/referenceUmapData';
import { generateHaltonColors } from '../../utils/colorUtils';
import {
    UNCLUSTERED_COLOR,
    DEFAULT_MARKER_COLOR,
} from '../../utils/legendUtils';
import CustomLegends from './CustomLegends';

const { Panel } = Collapse;
const PRIMARY_COLOR = '#1677ff';
const JITTER_AMOUNT = 0.3;

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

interface GOClusteringAnalysisUnitProps { }

const GOClusteringAnalysisUnit: React.FC<GOClusteringAnalysisUnitProps> = () => {
    const logPrefix = '[GOClusteringAnalysisUnit v8 - Highlight Mode]'; // Version Bump
    const dispatch = useAppDispatch();

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);
    const referenceData = useAppSelector(selectReferenceData);
    // --- Use new selector ---
    const highlightedRefClusterId = useAppSelector( // <<< UPDATED (Highlighting Change)
        selectHighlightedClusteringRefClusterId
    );
    // -----------------------

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

    // --- Prepare Data for Clustering ---
    const { rowDataForClustering, bmdRefToExperimentNameMap } = useMemo(() => {
        const logPrefix = '[GOClusteringAnalysisUnit useMemo v2]';
        console.log(`${logPrefix} Preparing rowDataForClustering...`);
        const tempBmdRefToNameMap = new Map<number, string>();
        const finalInputItems: ApiClusteringInputItem[] = [];

        if (
            rawSuccess &&
            rawData?.rawCategoryAnalysisItems &&
            rawData?.rawBmdResults
        ) {
            rawData.rawBmdResults.forEach((r) => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']);
                    if (!isNaN(numericRef)) {
                        tempBmdRefToNameMap.set(
                            numericRef,
                            r.name || `BMD Result ${numericRef}`
                        );
                    }
                }
            });

            rawData.rawCategoryAnalysisItems.forEach((entry) => {
                const item = entry.item;
                if (!item || !item.categoryIdentifier?.id) {
                    console.warn(
                        `${logPrefix} Skipping item due to missing category ID:`,
                        item
                    );
                    return;
                }
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
                `${logPrefix} Prepared ${finalInputItems.length} items directly for clustering.`
            );
        } else {
            console.log(
                `${logPrefix} Raw data not ready for clustering preparation.`
            );
        }
        return {
            rowDataForClustering: finalInputItems,
            bmdRefToExperimentNameMap: tempBmdRefToNameMap,
        };
    }, [rawSuccess, rawData]);

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
        const logPrefix = '[GOClusteringAnalysisUnit clustersForProcessingHook]';
        if (pyodideResult) {
            console.log(`${logPrefix} Creating array with pyodideResult.`);
            return [pyodideResult];
        }
        console.log(`${logPrefix} pyodideResult is null, returning null.`);
        return null;
    }, [pyodideResult]);

    const { categoryTableData, summaryTableData, processingError } =
        useProcessedClusteringData(
            clustersForProcessingHook,
            pyodideError ? getErrorMessage(pyodideError) : null
        );

    // --- Define Table Columns ---
    const categoryColumns = useMemo((): TableColumnType<CategoryRow>[] => {
        return [
            {
                title: 'Group Size',
                dataIndex: 'groupSize',
                key: 'groupSize',
                width: 100,
                sorter: (a: CategoryRow, b: CategoryRow) => {
                    const groupDiff = (a.groupSize ?? 0) - (b.groupSize ?? 0);
                    if (groupDiff !== 0) return groupDiff;
                    const aBMD = parseFloat(a.clusterBMD);
                    const bBMD = parseFloat(b.clusterBMD);
                    return (isNaN(aBMD) ? Infinity : aBMD) - (isNaN(bBMD) ? Infinity : bBMD);
                },
                defaultSortOrder: 'descend' as const,
            },
            {
                title: 'Category ID',
                dataIndex: 'categoryId',
                key: 'categoryId',
                width: 150,
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.categoryId.localeCompare(b.categoryId),
            },
            {
                title: 'Category Title',
                dataIndex: 'categoryTitle',
                key: 'categoryTitle',
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.categoryTitle.localeCompare(b.categoryTitle),
                ellipsis: true,
            },
            {
                title: 'Cluster BMD',
                dataIndex: 'clusterBMD',
                key: 'clusterBMD',
                width: 120,
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    (parseFloat(a.clusterBMD) || Infinity) -
                    (parseFloat(b.clusterBMD) || Infinity),
                render: (text: string) => parseFloat(text)?.toFixed(4) ?? text,
            },
            {
                title: 'Up Genes (Count)',
                dataIndex: 'upGenesSize',
                key: 'upGenesSize',
                width: 100,
                sorter: (a: CategoryRow, b: CategoryRow) => a.upGenesSize - b.upGenesSize,
            },
            {
                title: 'Down Genes (Count)',
                dataIndex: 'downGenesSize',
                key: 'downGenesSize',
                width: 100,
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.downGenesSize - b.downGenesSize,
            },
            {
                title: 'Cluster',
                dataIndex: 'cluster',
                key: 'cluster',
                width: 80,
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.clusterValue - b.clusterValue,
            },
        ];
    }, []);
    const summaryColumns = useMemo((): TableColumnType<SummaryRow>[] => {
        return [
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster' },
            {
                title: 'Min Cluster BMD',
                dataIndex: 'minClusterBMD',
                key: 'minClusterBMD',
                render: (value: number) => (isNaN(value) ? 'N/A' : value.toExponential(4)),
            },
            { title: 'Num Categories', dataIndex: 'numCategoryIDs', key: 'numCategoryIDs' },
            { title: 'Rank', dataIndex: 'sort', key: 'sort' },
        ];
    }, []);
    // --- End Table Columns ---

    // --- Calculate Dynamic Card Title ---
    const cardTitle = useMemo(() => {
        const baseTitle = 'GO Clustering Analysis';
        if (
            !selectedBmdResultRefs ||
            selectedBmdResultRefs.length === 0 ||
            bmdRefToExperimentNameMap.size === 0
        ) {
            return baseTitle;
        }
        const names = selectedBmdResultRefs
            .map((refStr) => {
                const numericRef = Number(refStr);
                if (isNaN(numericRef)) return null;
                return bmdRefToExperimentNameMap.get(numericRef) || `Ref ${numericRef}`;
            })
            .filter((name) => name !== null);

        if (names.length === 0) return baseTitle;

        const maxNamesToShow = 2;
        let nameString = names.slice(0, maxNamesToShow).join(' || ');
        if (names.length > maxNamesToShow) {
            nameString += ` || ${names.length - maxNamesToShow} more`;
        }
        return `${baseTitle} - ${nameString}`;
    }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);
    // --- End Card Title ---

    // --- Generate Cluster Color Map ---
    const clusterColorMap = useMemo(() => {
        const colorMapLogPrefix = '[GOClusteringAnalysisUnit clusterColorMap]';
        console.log(`${colorMapLogPrefix} Generating...`);
        if (!referenceData) {
            console.log(`${colorMapLogPrefix} No reference data available.`);
            return null;
        }
        const uniqueClusterIds = Array.from(
            new Set(
                referenceData
                    .map((item) => item.cluster_id)
                    .filter((id) => id != null && id !== -1 && id !== '-1')
            )
        );
        uniqueClusterIds.sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });

        if (uniqueClusterIds.length === 0) {
            console.log(
                `${colorMapLogPrefix} No valid cluster IDs found in reference data.`
            );
            return new Map<string | number, string>();
        }

        const colors = generateHaltonColors(uniqueClusterIds.length);
        const map = new Map<string | number, string>();
        uniqueClusterIds.forEach((id, index) => {
            map.set(String(id), colors[index % colors.length]);
        });
        map.set('-1', UNCLUSTERED_COLOR);
        console.log(`${colorMapLogPrefix} Generated map for ${map.size} clusters (incl. -1).`);
        return map;
    }, [referenceData]);

    // --- Combined Loading/Error State ---
    const isLoading = isLoadingRaw || isPyodideLoading;
    const error = rawError || pyodideError || processingError;
    const hasDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
    const hasResults = categoryTableData && categoryTableData.length > 0;

    // --- Generate Stable Jitter Map ---
    const jitterMap = useMemo((): Map<string, number> => {
        const mapLogPrefix = '[GOClusteringAnalysisUnit JitterMap]';
        console.log(`${mapLogPrefix} Generating jitter map...`);
        const map = new Map<string, number>();
        if (!categoryTableData || categoryTableData.length === 0) {
            console.log(`${mapLogPrefix} No category data available.`);
            return map;
        }
        categoryTableData.forEach((row) => {
            if (row.categoryId && !map.has(row.categoryId)) {
                const jitterOffset = (Math.random() - 0.5) * 2 * JITTER_AMOUNT;
                map.set(row.categoryId, jitterOffset);
            }
        });
        console.log(`${mapLogPrefix} Generated jitter map for ${map.size} unique GO IDs.`);
        return map;
    }, [categoryTableData]);

    // --- Prepare Data for Scatter Plot ---
    const scatterPlotData = useMemo((): ClusteringScatterPoint[] | null => {
        const plotLogPrefix = '[GOClusteringAnalysisUnit ScatterData v4 - Stable Jitter Fix]';
        if (!hasResults || !summaryTableData || summaryTableData.length === 0 || !referenceDataMap || !clusterColorMap || !jitterMap) {
            console.log(
                `${plotLogPrefix} Prerequisites not met. HasResults: ${hasResults}, Summary Count: ${summaryTableData?.length}, Has RefMap: ${!!referenceDataMap}, Has ColorMap: ${!!clusterColorMap}, Has JitterMap: ${!!jitterMap}`
            );
            return null;
        }

        console.log(`${plotLogPrefix} Preparing data using stable jitter map...`);
        const clusterRankMap = new Map<string, number>();
        summaryTableData.forEach((summary) => {
            if (summary.cluster && summary.sort != null && !isNaN(summary.sort)) {
                clusterRankMap.set(String(summary.cluster), summary.sort);
            } else {
                console.warn(`${plotLogPrefix} Invalid rank for cluster ${summary.cluster}:`, summary.sort);
            }
        });

        const points: ClusteringScatterPoint[] = [];
        categoryTableData.forEach((catRow) => {
            const rank = clusterRankMap.get(String(catRow.cluster));
            const bmdValue = parseFloat(catRow.clusterBMD);
            const goId = catRow.categoryId;
            const goIdUpper = goId?.toUpperCase();

            const refItem = goIdUpper ? referenceDataMap.get(goIdUpper) : null;
            const referenceClusterId = refItem?.cluster_id ?? null;

            // Apply Jitter from Map
            let calculatedJitteredRank: number | null = null;
            if (rank != null) {
                const jitterOffset = jitterMap.get(goId) ?? 0;
                calculatedJitteredRank = rank + jitterOffset;
            }

            // Calculate Color
            let pointColor = DEFAULT_MARKER_COLOR;
            if (referenceClusterId === -1 || referenceClusterId === '-1') {
                pointColor = UNCLUSTERED_COLOR;
            } else if (referenceClusterId != null) {
                pointColor =
                    clusterColorMap.get(String(referenceClusterId)) ||
                    DEFAULT_MARKER_COLOR;
            }

            if (rank != null && !isNaN(bmdValue) && isFinite(bmdValue)) {
                points.push({
                    goId: goId,
                    goTerm: catRow.categoryTitle,
                    pyodideCluster: String(catRow.cluster),
                    referenceClusterId: referenceClusterId,
                    rank: rank,
                    bmdValue: bmdValue,
                    jitteredRank: calculatedJitteredRank,
                    color: pointColor,
                });
            } else {
                console.warn(`${plotLogPrefix} Skipping point due to invalid rank or BMD:`, { goId, rank, bmdValue });
            }
        });

        console.log(
            `${plotLogPrefix} Prepared ${points.length} valid points for scatter plot.`
        );
        return points;
    }, [
        hasResults,
        categoryTableData,
        summaryTableData,
        referenceDataMap,
        clusterColorMap,
        jitterMap,
    ]);

    // --- Generate Legend Items ---
    const legendColorItems = useMemo((): [string, string][] => {
        const legendLogPrefix = '[GOClusteringAnalysisUnit LegendItems v4 - String Label]';
        if (!clusterColorMap || clusterColorMap.size === 0) {
            console.log(`${legendLogPrefix} No clusterColorMap available.`);
            return [];
        }
        console.log(`${legendLogPrefix} Generating legend items from color map...`);
        const items: [string, string][] = [];

        const sortedClusterIds = Array.from(clusterColorMap.keys())
            .filter(id => String(id) !== '-1')
            .sort((a, b) => {
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });

        sortedClusterIds.forEach(clusterId => {
            const color = clusterColorMap.get(clusterId);
            if (color) {
                items.push([String(clusterId), color]);
            }
        });

        if (clusterColorMap.has('-1')) {
            items.push(['-1', UNCLUSTERED_COLOR]);
        }

        console.log(`${legendLogPrefix} Generated ${items.length} legend items.`);
        return items;
    }, [clusterColorMap]);

    // --- *** Callback for Legend Highlight *** ---
    const handleHighlightRefCluster = useCallback( // <<< UPDATED (Highlighting Change)
        (clusterIdLabel: string) => {
            console.log(`${logPrefix} Setting highlight for Ref Cluster ID Label: ${clusterIdLabel}`);
            dispatch(setHighlightedClusteringRefCluster(clusterIdLabel)); // <<< UPDATED (Highlighting Change)
        },
        [dispatch]
    );
    // --- ********************************** ---

    // === Render Logic ===
    return (
        <div
            style={{
                border: `2px solid ${PRIMARY_COLOR}`,
                borderRadius: '8px',
                padding: '1px',
                marginTop: '24px',
            }}
        >
            <Card title={cardTitle} bordered={false}>
                {/* Loading Indicator */}
                {isLoading && (
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <Spin
                            tip={isLoadingRaw ? 'Loading data...' : 'Running clustering...'}
                        />
                    </div>
                )}

                {/* Error Display */}
                {!isLoading && error && (
                    <Alert
                        message="Clustering Analysis Error"
                        description={getErrorMessage(error)}
                        type="error"
                        showIcon
                        style={{ marginBottom: '1rem' }}
                    />
                )}

                {/* Render Plot and Tables */}
                {!isLoading && !error && hasDataToCluster && (
                    <Row gutter={[16, 16]}>
                        {/* Legend Column */}
                        <Col xs={24} md={4} lg={3}>
                            <CustomLegends
                                cardTitle="Ref Clusters"
                                colorItems={legendColorItems}
                                // --- Pass highlighted ID for visual feedback ---
                                highlightedLabel={highlightedRefClusterId} // <<< ADDED (Highlighting Change)
                                // --- Pass the highlight handler ---
                                onToggleColorVisibility={handleHighlightRefCluster} // <<< UPDATED (Highlighting Change)
                                // ---------------------------------
                                onToggleShapeVisibility={() => { }}
                                onToggleSizeVisibility={() => { }}
                                showColor={true}
                                showShape={false}
                                showSize={false}
                            />
                        </Col>

                        {/* Plot Area */}
                        <Col xs={24} md={10} lg={9}>
                            <Card size="small" title="5th Percentile BMD vs. Cluster Rank">
                                {hasResults && scatterPlotData ? (
                                    <GOClusteringScatterPlot
                                        plotData={scatterPlotData}
                                        summaryTableData={summaryTableData}
                                        // --- Pass highlighted ID for marker styling ---
                                        highlightedRefClusterId={highlightedRefClusterId} // <<< ADDED (Highlighting Change)
                                    // -------------------------------------------
                                    />
                                ) : (
                                    <Empty description={!hasResults ? "No clustering results to plot." : "Preparing plot data..."} />
                                )}
                            </Card>
                        </Col>

                        {/* Tables Area */}
                        <Col xs={24} md={10} lg={12}>
                            {hasResults ? (
                                <Collapse defaultActiveKey={['cat_details']} accordion>
                                    {/* Panel for Category Details */}
                                    <Panel
                                        header={`Category Details (${categoryTableData.length} items)`}
                                        key="cat_details"
                                    >
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <Table<CategoryRow>
                                                dataSource={categoryTableData}
                                                columns={categoryColumns}
                                                rowKey="key"
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    size: 'small',
                                                }}
                                                size="small"
                                                scroll={{ x: 800, y: 300 }}
                                            />
                                        </div>
                                    </Panel>
                                    {/* Panel for Summary */}
                                    {summaryTableData && summaryTableData.length > 0 && (
                                        <Panel
                                            header={`Cluster Summary (${summaryTableData.length} clusters)`}
                                            key="cat_summary"
                                        >
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <Table<SummaryRow>
                                                    dataSource={summaryTableData}
                                                    columns={summaryColumns}
                                                    rowKey="key"
                                                    pagination={false}
                                                    size="small"
                                                />
                                            </div>
                                        </Panel>
                                    )}
                                </Collapse>
                            ) : (
                                pyodideResult && (
                                    <Empty description="No categories found after processing clustering results." />
                                )
                            )}
                        </Col>
                    </Row>
                )}

                {/* Empty States */}
                {!isLoading && !error && !hasDataToCluster && rawSuccess && (
                    <Empty description="No suitable data found in selected analyses for clustering." />
                )}
                {!isLoading && !error && !hasDataToCluster && !rawSuccess && !rawError && (
                    <Empty description="Select analyses from 'Experiments' to run clustering." />
                )}
            </Card>
        </div>
    );
};

export default GOClusteringAnalysisUnit;
