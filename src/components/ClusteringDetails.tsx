// src/components/ClusteringDetails.tsx
import React, { useMemo } from 'react';
import { Table, Spin, Collapse, Alert, Empty } from 'antd';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { useRunHierarchicalClusteringQuery } from '../store/api/pyodideClusteringApi';
import {
    transformDataForClustering,
    // parseLabelToObject, // No longer directly used here, handled in hook
    // prepareClusteringDetails, // No longer directly used here, handled in hook
    // calculateSummaries, // No longer directly used here, handled in hook
    CategoryRow, // Still needed for column definitions and Table type
    // SummaryRow, // Type is inferred from hook, remove direct import
    SourceDataForClustering,
    ApiClusteringInputItem,
} from '../utils/clusteringUtils'; // Adjust path if needed
// Import the NEW custom hook
import { useProcessedClusteringData } from '../hooks/useProcessedClusteringData'; // Adjust path

const { Panel } = Collapse;

// Helper function to extract a displayable error message (keep as before)
const getErrorMessage = (error: unknown): string => {
    // ... (implementation as before) ...
    if (!error) { return 'An unknown error occurred.'; }
    if (typeof error === 'string') { return error; }
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        return (error as { message: string }).message;
    }
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const fetchError = error as FetchBaseQueryError;
        try {
            const dataString = typeof fetchError.data === 'string' ? fetchError.data : JSON.stringify(fetchError.data);
            return `Error ${fetchError.status}: ${dataString}`;
        } catch { return `Error ${fetchError.status}: (Could not display error data)`; }
    }
    try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};


// Interface for the raw API result structure (needed by the hook)
export interface ClusteringResult {
    orderedLabels?: string[];
    orderedClusters?: (string | number)[];
    displayName?: string;
}

interface ClusteringDetailsProps {
    rowData: SourceDataForClustering[];
    method?: string;
    numClusters?: number;
}

const ClusteringDetails: React.FC<ClusteringDetailsProps> = ({
    rowData,
    method = 'average',
    numClusters = 0,
}) => {
    // --- 1. Compute Cluster Count & Transform Input Data for API ---
    const computedNumClusters = useMemo(
        () => numClusters > 0 ? numClusters : Math.ceil(Math.sqrt(rowData.length) / 2),
        [numClusters, rowData.length]
    );

    const transformedRowsForApi: ApiClusteringInputItem[] = useMemo(
        () => transformDataForClustering(rowData),
        [rowData]
    );
    // console.log('Transformed rows for clustering API:', transformedRowsForApi); // Keep for debugging if needed

    // --- 2. Call Clustering API ---
    const {
        data: apiResponseString,
        error: apiError,
        isLoading: isApiLoading,
    } = useRunHierarchicalClusteringQuery({
        rowData: transformedRowsForApi,
        method,
        numClusters: computedNumClusters,
    });

    // --- 3. Parse API Response (Memoized) ---
    const parsedApiResponse = useMemo<{
        clusters: ClusteringResult[] | null;
        parsingError: Error | null;
    }>(() => {
        // ... (parsing logic as before) ...
        if (!apiResponseString) return { clusters: null, parsingError: null };
        try {
            const parsed = JSON.parse(apiResponseString);
            const clustersArray = Array.isArray(parsed) ? parsed : [parsed];
            if (clustersArray.length === 1 && !clustersArray[0].displayName) {
                clustersArray[0].displayName = `Clusters (n=${computedNumClusters})`;
            }
            return { clusters: clustersArray, parsingError: null };
        } catch (e) {
            console.error('Error parsing clustering API response:', e);
            return { clusters: null, parsingError: e instanceof Error ? e : new Error(String(e)) };
        }
    }, [apiResponseString, computedNumClusters]);

    // --- 4. Process Data using Custom Hook ---
    // It's assumed useProcessedClusteringData returns { categoryTableData: CategoryRow[], summaryTableData: SummaryRow[], processingError: Error | null }
    const { categoryTableData, summaryTableData, processingError } = useProcessedClusteringData(
        parsedApiResponse.clusters,
        parsedApiResponse.parsingError // This call should be correct based on hook definition
    );

    // --- 5. Define Table Columns (Memoized) ---
    // Columns definitions expect data objects conforming to CategoryRow
    const categoryColumns = useMemo(() => {
        // ... (column definitions using CategoryRow type as before) ...
        return [
            {
                title: 'Group Size', dataIndex: 'groupSize', key: 'groupSize',
                sorter: (a: CategoryRow, b: CategoryRow) => {
                    const groupDiff = (a.groupSize ?? 0) - (b.groupSize ?? 0);
                    if (groupDiff !== 0) return groupDiff;
                    const aBMD = parseFloat(a.clusterBMD); const bBMD = parseFloat(b.clusterBMD);
                    return (isNaN(aBMD) ? 0 : aBMD) - (isNaN(bBMD) ? 0 : bBMD);
                },
                defaultSortOrder: 'descend' as const,
            },
            { title: 'Category ID', dataIndex: 'categoryId', key: 'categoryId', sorter: (a: CategoryRow, b: CategoryRow) => a.categoryId.localeCompare(b.categoryId) },
            { title: 'Category Title', dataIndex: 'categoryTitle', key: 'categoryTitle', sorter: (a: CategoryRow, b: CategoryRow) => a.categoryTitle.localeCompare(b.categoryTitle), ellipsis: true },
            { title: 'Cluster BMD', dataIndex: 'clusterBMD', key: 'clusterBMD', sorter: (a: CategoryRow, b: CategoryRow) => (parseFloat(a.clusterBMD) || 0) - (parseFloat(b.clusterBMD) || 0), render: (text: string) => parseFloat(text)?.toFixed(4) ?? text },
            { title: 'Up Genes (Count)', dataIndex: 'upGenesSize', key: 'upGenesSize', sorter: (a: CategoryRow, b: CategoryRow) => a.upGenesSize - b.upGenesSize },
            { title: 'Down Genes (Count)', dataIndex: 'downGenesSize', key: 'downGenesSize', sorter: (a: CategoryRow, b: CategoryRow) => a.downGenesSize - b.downGenesSize },
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster', sorter: (a: CategoryRow, b: CategoryRow) => a.clusterValue - b.clusterValue },
        ];
    }, []);

    // Columns definitions expect data objects conforming to SummaryRow
    const summaryColumns = useMemo(() => {
        // ... (summary column definitions as before) ...
        return [
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster' },
            { title: 'Min Cluster BMD', dataIndex: 'minClusterBMD', key: 'minClusterBMD', render: (value: number) => isNaN(value) ? 'N/A' : value.toExponential(4) },
            { title: 'Num Categories', dataIndex: 'numCategoryIDs', key: 'numCategoryIDs' },
            { title: 'Rank', dataIndex: 'sort', key: 'sort' },
        ];
    }, []);

    // --- 6. Render Logic ---
    const isLoading = isApiLoading;
    const error = apiError || parsedApiResponse.parsingError || processingError;

    if (isLoading) return <Spin tip="Running clustering..." />;

    if (error) {
        let errorType = 'Clustering Error';
        if (parsedApiResponse.parsingError) errorType = 'API Response Parsing Error';
        if (processingError) errorType = 'Data Processing Error';
        const errorDescription = getErrorMessage(error);
        return <Alert message={errorType} description={errorDescription} type="error" showIcon />;
    }

    if (categoryTableData.length === 0) {
        if (rowData.length > 0) {
            return <Empty description="No categories found after processing clustering results." />;
        }
        return <Empty description="No data provided for clustering." />;
    }

    // --- Final Render ---
    return (
        <div>
            <Collapse defaultActiveKey={['1']} accordion>
                <Panel header={`Category Details (${categoryTableData.length} items)`} key="cat_details">
                    <div style={{ marginTop: '0.5rem' }}>
                        <Table
                            // FIX: Add type assertion as temporary workaround for Error 2
                            // NOTE: The real fix is ensuring useProcessedClusteringData
                            // returns objects fully matching CategoryRow.
                            dataSource={categoryTableData as CategoryRow[]}
                            columns={categoryColumns}
                            rowKey="key"
                            pagination={{ pageSize: 15, showSizeChanger: true, size: 'small' }}
                            size="small"
                            scroll={{ x: 1000 }}
                        />
                    </div>
                </Panel>
                {summaryTableData.length > 0 && (
                    <Panel header={`Cluster Summary (${summaryTableData.length} clusters)`} key="cat_summary">
                        <div style={{ marginTop: '0.5rem' }}>
                            <Table
                                // Type for summaryTableData should be inferred correctly if hook returns SummaryRow[]
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
        </div>
    );
};

export default ClusteringDetails;
