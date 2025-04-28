// src/components/ClusteringDetails.tsx
import React, { useMemo } from 'react'; // Keep React import
import { Table, Spin, Collapse, Alert, Empty } from 'antd';

import {
    CategoryRow,
    ApiClusteringInputItem,
} from '../utils/clusteringUtils';

import { useProcessedClusteringData } from '../hooks/useProcessedClusteringData';

// Import the hook modified for automatic execution
import {
    usePyodideClustering,
} from '../hooks/usePyodideClustering'; // Ensure this is the automatic version

const { Panel } = Collapse;

// Helper function (keep as is)
const getErrorMessage = (error: unknown): string => {
    if (!error) { return 'An unknown error occurred.'; }
    if (typeof error === 'string') { return error; }
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        // If all checks pass, we know error.message is a string, so return it
        return error.message;
    }
    try { return JSON.stringify(error); } catch { return 'Could not stringify error object.'; }
};


interface ClusteringDetailsProps {
    rowData: ApiClusteringInputItem[] | null;
    method?: string;
    numClusters?: number;
}

// Define the base functional component
const ClusteringDetailsComponent: React.FC<ClusteringDetailsProps> = ({
    rowData,
    method = 'average',
}) => {

    console.log('[ClusteringDetails] Rendering check (Base Component).');

    // --- 1. Compute Cluster Count ---
    const dataLength = rowData?.length ?? 0;
    const computedNumClusters = useMemo(
        () => Math.max(2, Math.ceil(Math.sqrt(dataLength) / 2)),
        [dataLength] // Removed numClusters dependency if not used for override
    );

    // --- 2. Call Custom Pyodide Clustering Hook (Automatic Version) ---
    const {
        result: pyodideResult,
        isLoading: isPyodideLoading,
        error: pyodideError,
    } = usePyodideClustering(
        rowData,
        method,
        computedNumClusters
    );

    // --- 3. Process Data using Custom Hook ---
    const clustersForProcessingHook = pyodideResult ? [pyodideResult] : null;
    const { categoryTableData, summaryTableData, processingError } =
        useProcessedClusteringData(
            clustersForProcessingHook,
            pyodideError ? getErrorMessage(pyodideError) : null // Pass error message string
        );

    // --- 4. Define Table Columns ---
    const categoryColumns = useMemo(() => {
        return [
            {
                title: 'Group Size', dataIndex: 'groupSize', key: 'groupSize', width: 100,
                sorter: (a: CategoryRow, b: CategoryRow) => {
                    const groupDiff = (a.groupSize ?? 0) - (b.groupSize ?? 0);
                    if (groupDiff !== 0) return groupDiff;
                    const aBMD = parseFloat(a.clusterBMD); const bBMD = parseFloat(b.clusterBMD);
                    return (isNaN(aBMD) ? Infinity : aBMD) - (isNaN(bBMD) ? Infinity : bBMD);
                },
                defaultSortOrder: 'descend' as const,
            },
            { title: 'Category ID', dataIndex: 'categoryId', key: 'categoryId', width: 150, sorter: (a: CategoryRow, b: CategoryRow) => a.categoryId.localeCompare(b.categoryId) },
            { title: 'Category Title', dataIndex: 'categoryTitle', key: 'categoryTitle', sorter: (a: CategoryRow, b: CategoryRow) => a.categoryTitle.localeCompare(b.categoryTitle), ellipsis: true },
            { title: 'Cluster BMD', dataIndex: 'clusterBMD', key: 'clusterBMD', width: 120, sorter: (a: CategoryRow, b: CategoryRow) => (parseFloat(a.clusterBMD) || Infinity) - (parseFloat(b.clusterBMD) || Infinity), render: (text: string) => parseFloat(text)?.toFixed(4) ?? text },
            { title: 'Up Genes (Count)', dataIndex: 'upGenesSize', key: 'upGenesSize', width: 100, sorter: (a: CategoryRow, b: CategoryRow) => a.upGenesSize - b.upGenesSize },
            { title: 'Down Genes (Count)', dataIndex: 'downGenesSize', key: 'downGenesSize', width: 100, sorter: (a: CategoryRow, b: CategoryRow) => a.downGenesSize - b.downGenesSize },
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster', width: 80, sorter: (a: CategoryRow, b: CategoryRow) => a.clusterValue - b.clusterValue },
        ];
    }, []);
    const summaryColumns = useMemo(() => {
        return [
            { title: 'Cluster', dataIndex: 'cluster', key: 'cluster' },
            { title: 'Min Cluster BMD', dataIndex: 'minClusterBMD', key: 'minClusterBMD', render: (value: number) => isNaN(value) ? 'N/A' : value.toExponential(4) },
            { title: 'Num Categories', dataIndex: 'numCategoryIDs', key: 'numCategoryIDs' },
            { title: 'Rank', dataIndex: 'sort', key: 'sort' },
        ];
    }, []);

    // --- 5. Render Logic ---
    const isLoading = isPyodideLoading; // Use loading state from hook
    const error = pyodideError || processingError; // Combine errors

    return (
        <div>
            {/* Loading Indicator */}
            {isLoading && (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <Spin tip="Running clustering..." />
                </div>
            )}

            {/* Error Display */}
            {!isLoading && error && ( // Show error only if not loading
                <Alert
                    message="Clustering Error"
                    description={getErrorMessage(error)}
                    type="error"
                    showIcon
                    style={{ marginBottom: '1rem' }}
                />
            )}

            {/* Display Results */}
            {!isLoading && !error && categoryTableData.length > 0 && (
                <Collapse defaultActiveKey={['cat_details']} accordion>
                    <Panel
                        header={`Category Details (${categoryTableData.length} items)`}
                        key="cat_details"
                    >
                        <div style={{ marginTop: '0.5rem' }}>
                            <Table
                                dataSource={categoryTableData as CategoryRow[]}
                                columns={categoryColumns}
                                rowKey="key"
                                pagination={{
                                    pageSize: 15,
                                    showSizeChanger: true,
                                    size: 'small',
                                }}
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
                                <Table
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

            {/* Empty States - Simplified */}
            {!isLoading && !error && categoryTableData.length === 0 && pyodideResult && (
                <Empty description="No categories found after processing clustering results." />
            )}
            {!isLoading && !error && (!rowData || rowData.length === 0) && (
                <Empty description="No data provided for clustering (after filtering)." />
            )}
        </div>
    );
};

// Apply React.memo to the base component
const MemoizedClusteringDetails = React.memo(ClusteringDetailsComponent);

// Use named export aliased to the original name
export { MemoizedClusteringDetails as ClusteringDetails };
