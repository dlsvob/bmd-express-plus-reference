// src/components/CategoryAnalysisDetails.tsx
import React, { useEffect, useState, useMemo } from 'react';
// Use Empty for no data state
import { Spin, Typography, Collapse, Table, Empty } from 'antd';
// Import specific types needed
import { CategoryAnalysisResult, CategoryAnalysisItem } from '../models/BMDxExported';
import ClusteringDetails from './ClusteringDetails'; // Assuming ClusteringDetails expects SourceDataForClustering[]

const { Text } = Typography; // Keep Text for messages or use Empty
const { Panel } = Collapse;

// Define props - Accepts data directly
interface CategoryAnalysisDetailsProps {
    experimentName: string; // Keep if needed for display/titles
    // Accept data as prop, can be undefined if not loaded/filtered yet
    categoryAnalysisData: CategoryAnalysisResult[] | undefined;
}

const CategoryAnalysisDetails: React.FC<CategoryAnalysisDetailsProps> = ({
    experimentName,
    categoryAnalysisData
}) => {
    // State for processed/filtered results derived from props
    const [processedResults, setProcessedResults] = useState<CategoryAnalysisResult[]>([]);
    // State to indicate processing of props is happening
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Process incoming data when it changes
    useEffect(() => {
        if (categoryAnalysisData) {
            setIsProcessing(true);
            // Simulate async processing if needed, otherwise can be sync
            Promise.resolve().then(() => { // Use Promise.resolve for microtask timing
                try {
                    // Apply filtering logic (moved from old useEffect)
                    const filtered = categoryAnalysisData
                        .map((result) => {
                            const filteredItems = result.categoryAnalsyisResults?.filter((item) => {
                                // Add null checks for safety
                                return (
                                    item.geneAllCount != null && item.geneAllCount >= 40 &&
                                    item.geneAllCount <= 500 &&
                                    item.percentage != null && item.percentage >= 5 &&
                                    item.genesThatPassedAllFilters != null && item.genesThatPassedAllFilters >= 3
                                );
                            }) || []; // Handle case where categoryAnalsyisResults might be null/undefined
                            return { ...result, categoryAnalsyisResults: filteredItems };
                        })
                        .filter((result) => result.categoryAnalsyisResults.length > 0);
                    setProcessedResults(filtered);
                } catch (err) {
                    console.error('Error processing category analysis data:', err);
                    setProcessedResults([]); // Clear results on error
                } finally {
                    setIsProcessing(false);
                }
            });
        } else {
            setProcessedResults([]); // Clear results if no data is passed
        }
    }, [categoryAnalysisData]); // Re-process only when input data changes

    // --- Prepare data for ClusteringDetails ---
    // Memoize this calculation
    const clusteringRowData = useMemo(() => {
        // IMPORTANT: ClusteringDetails expects SourceDataForClustering[]
        // We need to map CategoryAnalysisItem[] to SourceDataForClustering[]
        // Assuming SourceDataForClustering is { value: Partial<CategoryRow> }
        // And CategoryAnalysisItem has the fields needed for CategoryRow
        const items = processedResults.flatMap((result) => result.categoryAnalsyisResults || []);

        return items.map(item => ({
            // Wrap the item data inside the 'value' property
            value: {
                // Map fields from CategoryAnalysisItem to CategoryRow structure
                // Add nullish coalescing for safety
                key: item.categoryIdentifier?.id ?? `missing-key-${item['@ref']}`,
                categoryId: item.categoryIdentifier?.id ?? '',
                categoryTitle: item.categoryIdentifier?.title ?? '',
                clusterBMD: String(item.bmdFifthPercentileTotalGenes ?? ''), // Example mapping
                upGenes: item.genesUp ?? '', // Adjust based on actual CategoryAnalysisItem fields
                downGenes: item.genesDown ?? '', // Adjust based on actual CategoryAnalysisItem fields
                allGenes: item.genesIds ?? '', // Adjust based on actual CategoryAnalysisItem fields
                // cluster and clusterValue will be determined by ClusteringDetails itself
                // allGenesSize, upGenesSize, downGenesSize will be calculated by prepareClusteringDetails
            }
        }));
    }, [processedResults]);

    // --- Render logic ---
    if (isProcessing) return <Spin tip="Processing category analysis details..." />;

    // Use Empty component if no data passed filters or no initial data
    if (clusteringRowData.length === 0) {
        return <Empty description={
            categoryAnalysisData && categoryAnalysisData.length > 0
                ? "No Category Analysis data passed the filters."
                : "No Category Analysis data available."
        } style={{ marginTop: '1rem' }} />;
    }

    console.log("Data passed to ClusteringDetails:", clusteringRowData);

    return (
        <div>
            {/* Pass the correctly formatted rowData */}
            <ClusteringDetails rowData={clusteringRowData} />

            {/* Optional: Raw filtered data display (consider removing for production) */}
            {/* <Collapse> ... </Collapse> */}
        </div>
    );
};

export default CategoryAnalysisDetails;
