// src/components/analysis/GOClusteringAnalysisUnit.tsx
import React, { useMemo } from 'react';
import { Card, Spin, Alert, Collapse, Table, Empty, Row, Col } from 'antd';
import { useAppSelector } from '../../store/hooks';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import { selectReferenceDataMap, selectReferenceData } from '../../store/selectors/referenceDataSelector';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';
import {
    CategoryRow,
    SummaryRow,
    ApiClusteringInputItem,
} from '../../utils/clusteringUtils';
import {
    usePyodideClustering,
    PyodideClusteringResult,
} from '../../hooks/usePyodideClustering';
import { useProcessedClusteringData } from '../../hooks/useProcessedClusteringData';
import { BMDResult, CategoryAnalysisItem } from '../../models/BMDxExported';
import GOClusteringScatterPlot, {
    ClusteringScatterPoint,
} from './GOClusteringScatterPlot'; // Ensure path is correct
import { ReferenceUmapItem } from '../../data/referenceUmapData';
import { generateHaltonColors } from '../../utils/colorUtils';
import { UNCLUSTERED_COLOR, DEFAULT_MARKER_COLOR } from '../../utils/legendUtils';

const { Panel } = Collapse;
const PRIMARY_COLOR = '#1677ff';

const getErrorMessage = (error: unknown): string => {
    if (!error) { return 'An unknown error occurred.'; }
    if (typeof error === 'string') { return error; }
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

interface GOClusteringAnalysisUnitProps { }

const GOClusteringAnalysisUnit: React.FC<GOClusteringAnalysisUnitProps> = () => {
    const logPrefix = '[GOClusteringAnalysisUnit]';

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);
    const referenceData = useAppSelector(selectReferenceData);

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
    const clustersForProcessingHook = pyodideResult ? [pyodideResult] : null;
    const { categoryTableData, summaryTableData, processingError } =
        useProcessedClusteringData(
            clustersForProcessingHook,
            pyodideError ? getErrorMessage(pyodideError) : null
        );

    // --- Define Table Columns (Restored) ---
    const categoryColumns = useMemo(() => {
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
    const summaryColumns = useMemo(() => {
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
    // --- End Restored Table Columns ---

    // --- Calculate Dynamic Card Title (Restored) ---
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
    // --- End Restored Card Title ---

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
                    .map(item => item.cluster_id)
                    .filter(id => id != null && id !== -1 && id !== '-1')
            )
        );
        uniqueClusterIds.sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });

        if (uniqueClusterIds.length === 0) {
            console.log(`${colorMapLogPrefix} No valid cluster IDs found in reference data.`);
            return new Map<string | number, string>();
        }

        const colors = generateHaltonColors(uniqueClusterIds.length);
        const map = new Map<string | number, string>();
        uniqueClusterIds.forEach((id, index) => {
            map.set(String(id), colors[index % colors.length]);
        });
        console.log(`${colorMapLogPrefix} Generated map for ${map.size} clusters.`);
        return map;
    }, [referenceData]);

    // --- Combined Loading/Error State ---
    const isLoading = isLoadingRaw || isPyodideLoading;
    const error = rawError || pyodideError || processingError;
    const hasDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
    const hasResults = categoryTableData.length > 0;

    // --- Prepare Data for Scatter Plot ---
    const scatterPlotData = useMemo((): ClusteringScatterPoint[] | null => {
        const plotLogPrefix = '[GOClusteringAnalysisUnit ScatterData]';
        if (!hasResults || summaryTableData.length === 0 || !referenceDataMap) {
            console.log(`${plotLogPrefix} Prerequisites not met. HasResults: ${hasResults}, Summary Count: ${summaryTableData.length}, Has RefMap: ${!!referenceDataMap}`);
            return null;
        }

        console.log(`${plotLogPrefix} Preparing data...`);
        const clusterRankMap = new Map<string, number>();
        summaryTableData.forEach(summary => {
            if (summary.cluster && summary.sort != null) {
                clusterRankMap.set(String(summary.cluster), summary.sort);
            }
        });
        console.log(`${plotLogPrefix} Created rank map with ${clusterRankMap.size} entries.`);

        const points: ClusteringScatterPoint[] = [];
        categoryTableData.forEach(catRow => {
            const rank = clusterRankMap.get(String(catRow.cluster));
            const bmdValue = parseFloat(catRow.clusterBMD);
            const goId = catRow.categoryId;
            const goIdUpper = goId?.toUpperCase();

            const refItem = goIdUpper ? referenceDataMap.get(goIdUpper) : null;
            const referenceClusterId = refItem?.cluster_id ?? null;

            if (rank != null && !isNaN(bmdValue) && isFinite(bmdValue)) {
                points.push({
                    goId: goId,
                    goTerm: catRow.categoryTitle,
                    pyodideCluster: String(catRow.cluster),
                    referenceClusterId: referenceClusterId,
                    rank: rank, // This is now Y
                    bmdValue: bmdValue, // This is now X
                });
            }
        });

        console.log(`${plotLogPrefix} Prepared ${points.length} valid points for scatter plot.`);
        return points;

    }, [hasResults, categoryTableData, summaryTableData, referenceDataMap]);


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
                        {/* Plot Area */}
                        <Col xs={24} lg={12}>
                            <Card size="small" title="5th Percentile BMD vs. Cluster Rank">
                                {scatterPlotData ? (
                                    <GOClusteringScatterPlot
                                        plotData={scatterPlotData}
                                        clusterColorMap={clusterColorMap}
                                        summaryTableData={summaryTableData} // Pass summary data for ticks
                                    />
                                ) : (
                                    <Empty description="Not enough data to generate plot." />
                                )}
                            </Card>
                        </Col>

                        {/* Tables Area */}
                        <Col xs={24} lg={12}>
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
                                                pagination={{ pageSize: 10, showSizeChanger: true, size: 'small' }}
                                                size="small"
                                                scroll={{ x: 800, y: 300 }}
                                            />
                                        </div>
                                    </Panel>
                                    {/* Panel for Summary */}
                                    {summaryTableData.length > 0 && (
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
                                pyodideResult && <Empty description="No categories found after processing clustering results." />
                            )}
                        </Col>
                    </Row>
                )}

                {/* Empty States */}
                {!isLoading &&
                    !error &&
                    !hasDataToCluster &&
                    rawSuccess && (
                        <Empty description="No suitable data found in selected analyses for clustering." />
                    )}
                {!isLoading &&
                    !error &&
                    !hasDataToCluster &&
                    !rawSuccess &&
                    !rawError && (
                        <Empty description="Select analyses from 'Experiments' to run clustering." />
                    )}
            </Card>
        </div>
    );
};

export default GOClusteringAnalysisUnit;
