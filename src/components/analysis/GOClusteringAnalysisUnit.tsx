// src/components/analysis/GOClusteringAnalysisUnit.tsx
import React, { useMemo } from 'react';
import { Card, Spin, Alert, Collapse, Table, Empty } from 'antd';
import { useAppSelector } from '../../store/hooks';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';
import {
    transformDataForClustering, // Utility to format data for Python
    CategoryRow,
    SummaryRow,
    ApiClusteringInputItem,
} from '../../utils/clusteringUtils'; // Adjust path
import {
    usePyodideClustering, // Hook to run clustering
    PyodideClusteringResult,
} from '../../hooks/usePyodideClustering'; // Adjust path
import {
    useProcessedClusteringData, // Hook to process results
} from '../../hooks/useProcessedClusteringData'; // Adjust path
import { BMDResult } from '../../models/applicationModel'; // For title calculation

const { Panel } = Collapse;

// Define the primary color for the border
const PRIMARY_COLOR = '#1677ff'; // Default Ant Design primary blue

// Helper function (keep as is)
const getErrorMessage = (error: unknown): string => {
    if (!error) { return 'An unknown error occurred.'; }
    if (typeof error === 'string') { return error; }
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};

interface GOClusteringAnalysisUnitProps {
    // Add any specific props needed later, e.g., clustering method override
}

const GOClusteringAnalysisUnit: React.FC<GOClusteringAnalysisUnitProps> = () => {
    const logPrefix = '[GOClusteringAnalysisUnit]';

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);

    // --- Data Fetching ---
    // Fetch raw data needed to prepare input for clustering
    const {
        data: rawData,
        isLoading: isLoadingRaw,
        error: rawError,
        isSuccess: rawSuccess,
    } = useGetRawAnalysisDataQuery(
        { projectName, selectedBmdResultRefs },
        { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
    );

    // --- Prepare Data for Clustering ---
    const { rowDataForClustering, bmdRefToExperimentNameMap } = useMemo(() => {
        console.log(`${logPrefix} Preparing rowDataForClustering...`);
        const tempBmdRefToNameMap = new Map<number, string>();
        let inputItems: ApiClusteringInputItem[] = [];

        if (rawSuccess && rawData?.rawCategoryAnalysisItems && rawData?.rawBmdResults) {
            // Build name map first
            rawData.rawBmdResults.forEach(r => {
                if (r && r['@ref'] != null) {
                    const numericRef = Number(r['@ref']);
                    if (!isNaN(numericRef)) {
                        tempBmdRefToNameMap.set(numericRef, r.name || `BMD Result ${numericRef}`);
                    }
                }
            });

            // Now transform category items
            // Assuming rawCategoryAnalysisItems is Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }>
            // We need to flatten the 'item' part for transformDataForClustering
            const itemsToTransform = rawData.rawCategoryAnalysisItems.map(entry => entry.item);
            // The transformDataForClustering expects a slightly different input structure based on its definition.
            // Let's adapt the input preparation here based on what transformDataForClustering expects.
            // It expects { value: Partial<CategoryRow> }[]

            // We need to map the raw CategoryAnalysisItem to the structure expected by transformDataForClustering
            const sourceDataForTransform: { value: Partial<CategoryRow> }[] = itemsToTransform.map(item => ({
                value: {
                    // Map fields from CategoryAnalysisItem to CategoryRow keys expected by the util
                    categoryId: item.categoryIdentifier?.id,
                    categoryTitle: item.categoryIdentifier?.title,
                    // Cluster BMD might not be directly available on CategoryAnalysisItem,
                    // it might need calculation or be sourced differently depending on your exact data model.
                    // Using a placeholder or null for now. Adjust as needed.
                    clusterBMD: String(item.bmdFifthPercentileTotalGenes ?? ''), // Example: Using 5th percentile as placeholder
                    upGenes: item.genesUp ?? '',
                    downGenes: item.genesDown ?? '',
                    allGenes: item.geneSymbolsPrivate ?? '', // Assuming this holds all genes; adjust if needed
                }
            }));

            inputItems = transformDataForClustering(sourceDataForTransform);
            console.log(`${logPrefix} Prepared ${inputItems.length} items for clustering.`);
        } else {
            console.log(`${logPrefix} Raw data not ready for clustering preparation.`);
        }
        return { rowDataForClustering: inputItems, bmdRefToExperimentNameMap: tempBmdRefToNameMap };
    }, [rawSuccess, rawData]);

    // --- Compute Cluster Count ---
    const dataLength = rowDataForClustering?.length ?? 0;
    const computedNumClusters = useMemo(
        () => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)),
        [dataLength]
    );

    // --- Call Pyodide Clustering Hook ---
    // Using 'average' method as default, can be made configurable via props later
    const {
        result: pyodideResult,
        isLoading: isPyodideLoading,
        error: pyodideError,
    } = usePyodideClustering(
        rowDataForClustering, // Pass the prepared data
        'average', // Default method
        computedNumClusters
    );

    // --- Process Clustering Results ---
    const clustersForProcessingHook = pyodideResult ? [pyodideResult] : null;
    const { categoryTableData, summaryTableData, processingError } =
        useProcessedClusteringData(
            clustersForProcessingHook,
            pyodideError ? getErrorMessage(pyodideError) : null
        );

    // --- Define Table Columns (Copied from ClusteringDetails) ---
    const categoryColumns = useMemo(() => { /* ... columns definition ... */
        return [
            { title: 'Group Size', dataIndex: 'groupSize', key: 'groupSize', width: 100, sorter: (a: CategoryRow, b: CategoryRow) => { const groupDiff = (a.groupSize ?? 0) - (b.groupSize ?? 0); if (groupDiff !== 0) return groupDiff; const aBMD = parseFloat(a.clusterBMD); const bBMD = parseFloat(b.clusterBMD); return (isNaN(aBMD) ? Infinity : aBMD) - (isNaN(bBMD) ? Infinity : bBMD); }, defaultSortOrder: 'descend' as const, },
            { title: 'Category ID', dataIndex: 'categoryId', key: 'categoryId', width: 150, sorter: (a: CategoryRow, b: CategoryRow) => a.categoryId.localeCompare(b.categoryId) },
            { title: 'Category Title', dataIndex: 'categoryTitle', key: 'categoryTitle', sorter: (a: CategoryRow, b: CategoryRow) => a.categoryTitle.localeCompare(b.categoryTitle), ellipsis: true },
            { title: 'Cluster BMD', dataIndex: 'clusterBMD', key: 'clusterBMD', width: 120, sorter: (a: CategoryRow, b: CategoryRow) => (parseFloat(a.clusterBMD) || Infinity) - (parseFloat(b.clusterBMD) || Infinity), render: (text: string) => parseFloat(text)?.toFixed(4) ?? text },
            { title: 'Up Genes (Count)', dataIndex: 'upGenesSize', key: 'upGenesSize', width: 100, sorter: (a: CategoryRow, b: CategoryRow) => a.upGenesSize - b.upGenesSize },
            { title: 'Down Genes (Count)', dataIndex: 'downGenesSize', key: 'downGenesSize', width: 100, sorter: (a: CategoryRow, b: CategoryRow) => a.downGenesSize - b.downGenesSize },
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster', width: 80, sorter: (a: CategoryRow, b: CategoryRow) => a.clusterValue - b.clusterValue },
        ];
    }, []);
    const summaryColumns = useMemo(() => { /* ... columns definition ... */
        return [
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster' },
            { title: 'Min Cluster BMD', dataIndex: 'minClusterBMD', key: 'minClusterBMD', render: (value: number) => isNaN(value) ? 'N/A' : value.toExponential(4) },
            { title: 'Num Categories', dataIndex: 'numCategoryIDs', key: 'numCategoryIDs' },
            { title: 'Rank', dataIndex: 'sort', key: 'sort' },
        ];
    }, []);

    // --- Calculate Dynamic Card Title ---
    const cardTitle = useMemo(() => {
        const baseTitle = "GO Clustering Analysis";
        if (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0 || bmdRefToExperimentNameMap.size === 0) {
            return baseTitle;
        }
        const names = selectedBmdResultRefs
            .map(refStr => {
                const numericRef = Number(refStr);
                if (isNaN(numericRef)) return null;
                return bmdRefToExperimentNameMap.get(numericRef) || `Ref ${numericRef}`;
            })
            .filter(name => name !== null);

        if (names.length === 0) return baseTitle;

        const maxNamesToShow = 2;
        let nameString = names.slice(0, maxNamesToShow).join(' || ');
        if (names.length > maxNamesToShow) {
            nameString += ` || ${names.length - maxNamesToShow} more`;
        }
        return `${baseTitle} - ${nameString}`;
    }, [selectedBmdResultRefs, bmdRefToExperimentNameMap]);

    // --- Combined Loading/Error State ---
    const isLoading = isLoadingRaw || isPyodideLoading;
    const error = rawError || pyodideError || processingError;
    const hasDataToCluster = rowDataForClustering && rowDataForClustering.length > 0;
    const hasResults = categoryTableData.length > 0;

    // === Render Logic ===
    return (
        <div style={{
            border: `2px solid ${PRIMARY_COLOR}`,
            borderRadius: '8px',
            padding: '1px',
            marginTop: '24px' // Add margin to separate from other units
        }}>
            <Card title={cardTitle} bordered={false}>
                {/* Loading Indicator */}
                {isLoading && (
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <Spin tip={isLoadingRaw ? "Loading data..." : "Running clustering..."} />
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

                {/* Display Results */}
                {!isLoading && !error && hasResults && (
                    <Collapse defaultActiveKey={['cat_details']} accordion>
                        <Panel
                            header={`Category Details (${categoryTableData.length} items)`}
                            key="cat_details"
                        >
                            <div style={{ marginTop: '0.5rem' }}>
                                <Table<CategoryRow> // Explicit type for Table
                                    dataSource={categoryTableData}
                                    columns={categoryColumns}
                                    rowKey="key"
                                    pagination={{ pageSize: 15, showSizeChanger: true, size: 'small' }}
                                    size="small"
                                    scroll={{ x: 1000 }}
                                />
                            </div>
                        </Panel>
                        {summaryTableData.length > 0 && (
                            <Panel
                                header={`Cluster Summary (${summaryTableData.length} clusters)`}
                                key="cat_summary"
                            >
                                <div style={{ marginTop: '0.5rem' }}>
                                    <Table<SummaryRow> // Explicit type for Table
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
                )}

                {/* Empty States */}
                {!isLoading && !error && !hasResults && pyodideResult && (
                    <Empty description="No categories found after processing clustering results." />
                )}
                {!isLoading && !error && !hasDataToCluster && rawSuccess && ( // Show only if raw data loaded but was empty/filtered out
                    <Empty description="No suitable data found in selected analyses for clustering." />
                )}
                {!isLoading && !error && !hasDataToCluster && !rawSuccess && !rawError && ( // Show if raw data query hasn't run/succeeded yet
                    <Empty description="Select analyses from 'Experiments' to run clustering." />
                )}
            </Card>
        </div>
    );
};

export default GOClusteringAnalysisUnit;
