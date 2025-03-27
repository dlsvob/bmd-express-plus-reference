// src/components/ClusteringDetails.tsx
import React, { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { Table, Spin, Typography, Collapse, Alert } from 'antd'; // Added Alert
import { useRunHierarchicalClusteringQuery } from '../store/api/pyodideClusteringApi';
import {
    transformDataForClustering,
    parseLabelToObject,
    prepareClusteringDetails, // Import the function to calculate sizes
    calculateSummaries, // Import the summary calculation function
    CategoryRow, // Import the type for processed rows
    SummaryRow, // Import the type for summary rows
    SourceDataForClustering, // Assuming this is defined in utils for input type
    ApiClusteringInputItem, // Assuming this is defined in utils for API input type
} from '../utils/clusteringUtils'; // Adjust path if needed
// import { defineCategoryColumns, defineSummaryColumns } from './ClusteringTableColumns'; // Optional: Move column definitions out

const { Panel } = Collapse;
const { Text } = Typography;

// Interface for the raw API result structure
export interface ClusteringResult {
    orderedLabels?: string[];
    orderedClusters?: (string | number)[];
    displayName?: string;
}

interface ClusteringDetailsProps {
    // rowData should match the structure expected by transformDataForClustering
    rowData: SourceDataForClustering[]; // Use a more specific input type
    method?: string;
    numClusters?: number;
}

const ClusteringDetails: React.FC<ClusteringDetailsProps> = ({
    rowData,
    method = 'average',
    numClusters = 0,
}) => {
    // --- 1. Compute Cluster Count & Transform Input Data ---
    const computedNumClusters = useMemo(
        () =>
            numClusters > 0
                ? numClusters
                : Math.ceil(Math.sqrt(rowData.length) / 2),
        [numClusters, rowData.length],
    );

    // Memoize transformed rows for API call
    const transformedRowsForApi: ApiClusteringInputItem[] = useMemo(
        () => transformDataForClustering(rowData),
        [rowData],
    );
    console.log('Transformed rows for clustering API:', transformedRowsForApi);

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

    // --- 3. Parse API Response ---
    // Memoize the parsed API response to avoid re-parsing on every render
    const parsedApiResponse = useMemo<{
        clusters: ClusteringResult[] | null;
        parsingError: Error | null;
    }>(() => {
        if (!apiResponseString) return { clusters: null, parsingError: null };
        try {
            const parsed = JSON.parse(apiResponseString);
            const clustersArray = Array.isArray(parsed) ? parsed : [parsed];
            // Add display name if needed (can also be done later)
            if (clustersArray.length === 1 && !clustersArray[0].displayName) {
                clustersArray[0].displayName = `Clusters (n=${computedNumClusters})`;
            }
            console.log('Parsed clustering data:', clustersArray);
            return { clusters: clustersArray, parsingError: null };
        } catch (e) {
            console.error('Error parsing clustering API response:', e);
            return {
                clusters: null,
                parsingError: e instanceof Error ? e : new Error(String(e)),
            };
        }
    }, [apiResponseString, computedNumClusters]);

    // --- 4. Process Parsed Data into Table Rows ---
    // Memoize the processed table data derived from the API response
    const { categoryTableData, summaryTableData, processingError } = useMemo<{
        categoryTableData: CategoryRow[];
        summaryTableData: SummaryRow[];
        processingError: Error | null;
    }>(() => {
        // Don't process if API hasn't returned data or if parsing failed
        if (!parsedApiResponse.clusters) {
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: parsedApiResponse.parsingError, // Pass parsing error along
            };
        }

        try {
            // --- 4a. Flatten API results and create initial CategoryRow objects ---
            const initialCategoryRows = parsedApiResponse.clusters.flatMap(
                (clusterResult) => {
                    if (
                        !Array.isArray(clusterResult.orderedLabels) ||
                        !Array.isArray(clusterResult.orderedClusters) ||
                        clusterResult.orderedLabels.length !==
                        clusterResult.orderedClusters.length
                    ) {
                        console.warn('Skipping malformed cluster result:', clusterResult);
                        return []; // Skip malformed results
                    }

                    return clusterResult.orderedLabels.map((label, i) => {
                        // Use imported parseLabelToObject
                        const parsedLabelData = parseLabelToObject(label);
                        const clusterString = (
                            clusterResult.orderedClusters?.[i] ?? ''
                        ).toString().trim();
                        const clusterValue = parseFloat(clusterString);

                        // Create a partial CategoryRow (without sizes yet)
                        // Use explicit property names from CategoryRow interface
                        const partialRow: Omit<
                            CategoryRow,
                            'allGenesSize' | 'upGenesSize' | 'downGenesSize'
                        > = {
                            key: parsedLabelData['Category ID'] || `missing-key-${i}`, // Ensure key exists
                            categoryId: parsedLabelData['Category ID'] || '',
                            categoryTitle: parsedLabelData['Category Title'] || '',
                            clusterBMD: parsedLabelData['Cluster BMD'] || '',
                            upGenes: parsedLabelData['Up Genes'] || '',
                            downGenes: parsedLabelData['Down Genes'] || '',
                            allGenes: parsedLabelData['All Genes'] || '',
                            cluster: clusterString,
                            clusterValue: isNaN(clusterValue) ? -1 : clusterValue, // Handle NaN
                        };

                        // Use prepareClusteringDetails to calculate sizes and complete the row
                        return prepareClusteringDetails(partialRow);
                    });
                },
            );
            console.log('Initial Category Rows (with sizes):', initialCategoryRows);

            // --- 4b. Group by cluster ---
            const groupedByCluster = initialCategoryRows.reduce(
                (acc: { [key: string]: CategoryRow[] }, curr) => {
                    const clusterKey = curr.cluster; // Already trimmed and validated during creation
                    if (!clusterKey) {
                        // Should ideally not happen if handled during creation, but good fallback
                        console.warn('Skipping row with missing cluster key:', curr);
                        return acc;
                    }
                    if (!acc[clusterKey]) {
                        acc[clusterKey] = [];
                    }
                    acc[clusterKey].push(curr);
                    return acc;
                },
                {},
            );

            // --- 4c. Add groupSize to each CategoryRow ---
            // (groupSize = number of categories in the same cluster)
            const categoryTableDataWithGroupSize: CategoryRow[] =
                initialCategoryRows.map((row) => ({
                    ...row,
                    groupSize: groupedByCluster[row.cluster]?.length || 0,
                }));
            console.log(
                'Category Rows with Group Size:',
                categoryTableDataWithGroupSize,
            );

            // --- 4d. Calculate Summaries using the utility function ---
            const finalSummaryRows = calculateSummaries(groupedByCluster);
            console.log('Final Summary Rows:', finalSummaryRows);

            return {
                categoryTableData: categoryTableDataWithGroupSize,
                summaryTableData: finalSummaryRows,
                processingError: null,
            };
        } catch (e) {
            console.error('Error processing clustering data:', e);
            return {
                categoryTableData: [],
                summaryTableData: [],
                processingError: e instanceof Error ? e : new Error(String(e)),
            };
        }
    }, [parsedApiResponse]); // Recalculate only when parsed API response changes

    // --- 5. Define Table Columns ---
    // Memoize column definitions to prevent unnecessary re-renders
    const categoryColumns = useMemo(() => {
        // Define columns using CategoryRow properties
        return [
            {
                title: 'Group Size',
                dataIndex: 'groupSize', // Use the added groupSize property
                key: 'groupSize',
                sorter: (a: CategoryRow, b: CategoryRow) => {
                    const groupDiff = (a.allGenesSize ?? 0) - (b.allGenesSize ?? 0); // Handle potential undefined
                    if (groupDiff !== 0) return groupDiff;
                    const aBMD = parseFloat(a.clusterBMD);
                    const bBMD = parseFloat(b.clusterBMD);
                    return (isNaN(aBMD) ? 0 : aBMD) - (isNaN(bBMD) ? 0 : bBMD);
                },
                defaultSortOrder: 'descend' as const, // Use 'as const' for type safety
            },
            {
                title: 'Category ID',
                dataIndex: 'categoryId',
                key: 'categoryId',
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.categoryId.localeCompare(b.categoryId),
            },
            {
                title: 'Category Title',
                dataIndex: 'categoryTitle',
                key: 'categoryTitle',
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.categoryTitle.localeCompare(b.categoryTitle),
                ellipsis: true, // Optional: shorten long titles
            },
            {
                title: 'Cluster BMD',
                dataIndex: 'clusterBMD',
                key: 'clusterBMD',
                sorter: (a: CategoryRow, b: CategoryRow) => {
                    const aVal = parseFloat(a.clusterBMD);
                    const bVal = parseFloat(b.clusterBMD);
                    return (isNaN(aVal) ? 0 : aVal) - (isNaN(bVal) ? 0 : bVal);
                },
                render: (text: string) => parseFloat(text)?.toFixed(4) ?? text, // Format display
            },
            // Add columns for upGenesSize, downGenesSize, allGenesSize if needed
            {
                title: 'Up Genes (Count)',
                dataIndex: 'upGenesSize',
                key: 'upGenesSize',
                sorter: (a: CategoryRow, b: CategoryRow) => a.upGenesSize - b.upGenesSize,
            },
            {
                title: 'Down Genes (Count)',
                dataIndex: 'downGenesSize',
                key: 'downGenesSize',
                sorter: (a: CategoryRow, b: CategoryRow) => a.downGenesSize - b.downGenesSize,
            },
            // { title: "All Genes", dataIndex: "allGenes", key: "allGenes" }, // Displaying long gene lists might be messy
            {
                title: 'Cluster',
                dataIndex: 'cluster', // Display the string representation
                key: 'cluster',
                sorter: (a: CategoryRow, b: CategoryRow) =>
                    a.clusterValue - b.clusterValue, // Sort numerically using clusterValue
            },
        ];
    }, []); // Empty dependency array means columns are defined once

    const summaryColumns = useMemo(() => {
        // Define columns using SummaryRow properties
        return [
            {
                title: 'Cluster',
                dataIndex: 'cluster',
                key: 'cluster',
                // Add sorter if needed, though data is pre-sorted
                // sorter: (a: SummaryRow, b: SummaryRow) => parseFloat(a.cluster) - parseFloat(b.cluster),
            },
            {
                title: 'Min Cluster BMD',
                dataIndex: 'minClusterBMD',
                key: 'minClusterBMD',
                render: (value: number) =>
                    isNaN(value) ? 'N/A' : value.toExponential(4), // Handle NaN
            },
            {
                title: 'Num Categories', // Renamed for clarity
                dataIndex: 'numCategoryIDs',
                key: 'numCategoryIDs',
            },
            {
                title: 'Rank', // Display the calculated sort rank
                dataIndex: 'sort',
                key: 'sort',
            },
        ];
    }, []); // Empty dependency array

    // --- 6. Render Logic ---
    const isLoading = isApiLoading; // Could add || isProcessing if processing was async
    const error = apiError || parsedApiResponse.parsingError || processingError;

    if (isLoading) return <Spin tip="Running clustering and processing results..." />;

    // Display specific errors
    if (error) {
        let errorType = 'Clustering Error';
        if (parsedApiResponse.parsingError) errorType = 'API Response Parsing Error';
        if (processingError) errorType = 'Data Processing Error';
        return (
            <Alert message={errorType} description={error.message} type="error" showIcon />
        );
    }

    if (categoryTableData.length === 0) {
        return <Text>No clustering data available or processed.</Text>;
    }

    // --- Final Render ---
    return (
        <div>
            <Collapse defaultActiveKey={['1']}>
                <Panel
                    header={`Category Details (${categoryTableData.length} items)`}
                    key="1"
                >
                    <div style={{ marginTop: '1rem' }}>
                        {/* <Title level={4}>Combined Category Table</Title> */}
                        <Table
                            dataSource={categoryTableData}
                            columns={categoryColumns}
                            rowKey="key" // Uses the 'key' property from CategoryRow
                            pagination={{ pageSize: 15, showSizeChanger: true }} // Example pagination
                            size="small" // Make table more compact
                            scroll={{ x: 1000 }} // Enable horizontal scroll if needed
                        />
                    </div>
                </Panel>
            </Collapse>

            <Collapse style={{ marginTop: '1rem' }}>
                <Panel
                    header={`Category Cluster Summary (${summaryTableData.length} clusters)`}
                    key="2" // Use a different key
                >
                    <div style={{ marginTop: '1rem' }}>
                        {/* <Title level={4}>Summary Table by Cluster</Title> */}
                        <Table
                            dataSource={summaryTableData}
                            columns={summaryColumns}
                            rowKey="key" // Uses the 'key' property from SummaryRow
                            pagination={false} // Summary table likely doesn't need pagination
                            size="small"
                        />
                    </div>
                </Panel>
            </Collapse>
        </div>
    );
};

export default ClusteringDetails;
