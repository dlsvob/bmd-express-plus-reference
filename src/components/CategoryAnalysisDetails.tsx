// src/components/DomainDetails.tsx
import React, { useEffect, useState } from 'react';
import { Table, Spin, Typography } from 'antd';
import { IDBPDatabase } from 'idb';
import { ProjectDB } from '../utils/myIDB';
import { getCategoryAnalysisResultsByNamePrefix } from '../api/categoryAnalysisQueries';
import * as BMDxExported from '../models/BMDxExported';
import ClusteringDetails from './ClusteringDetails';

const { Title, Text } = Typography;

export interface DomainDetailsProps {
    experimentName: string; // Used as the query prefix (should be nonempty)
    db: IDBPDatabase<ProjectDB> | null;
}

const DomainDetails: React.FC<DomainDetailsProps> = ({ experimentName, db }) => {
    const [results, setResults] = useState<BMDxExported.CategoryAnalysisResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!experimentName || !db) {
            console.log('Skipping query because experimentName or db is not available');
            return;
        }

        setLoading(true);
        getCategoryAnalysisResultsByNamePrefix(db, experimentName)
            .then((queryResults) => {
                const processedResults = queryResults
                    .map((result) => {
                        const filteredItems = result.categoryAnalsyisResults.filter((item) => {
                            return (
                                item.geneAllCount >= 40 &&
                                item.geneAllCount <= 500 &&
                                item.percentage >= 5 &&
                                item.genesThatPassedAllFilters >= 3
                            );
                        });
                        return { ...result, categoryAnalsyisResults: filteredItems };
                    })
                    .filter((result) => result.categoryAnalsyisResults.length > 0);
                setResults(processedResults);
            })
            .catch((err) => {
                console.error('Error querying domain details:', err);
            })
            .finally(() => setLoading(false));
    }, [db, experimentName]);

    if (!db) return <Spin tip="Loading database..." />;
    if (loading) return <Spin tip="Loading category analysis details..." />;
    if (!results || results.length === 0)
        return <Text>No Category Analysis data available.</Text>;

    // Define columns for the raw category analysis table.
    const columns = [
        {
            title: 'Category ID',
            dataIndex: ['categoryIdentifier', 'id'],
            key: 'catId',
        },
        {
            title: 'Category Title',
            dataIndex: ['categoryIdentifier', 'title'],
            key: 'catTitle',
        },
        {
            title: 'Cluster BMD',
            key: 'clusterBMD',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.bmdFifthPercentileTotalGenes && item.bmdFifthPercentileTotalGenes > 0) {
                    return item.bmdFifthPercentileTotalGenes;
                }
                return '';
            },
        },
        {
            title: 'Overall Direction',
            key: 'overallDirection',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.overallDirection) {
                    return item.overallDirection;
                }
                return '';
            },
        },
        {
            title: 'Genes Change Count',
            key: 'genesChangeCount',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.genesAdverseUpCount && item.genesAdverseDownCount && item.genesAdverseUpCount > 0 && item.genesAdverseDownCount > 0) {
                    return item.genesAdverseUpCount + item.genesAdverseDownCount;
                }
                return '';
            },
        },
        {
            title: 'Genes Up Count',
            key: 'genesAdverseUpCount',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.genesAdverseUpCount && item.genesAdverseUpCount > 0) {
                    return item.genesAdverseUpCount;
                }
                return '';
            },
        },
        {
            title: 'Genes Down Count',
            key: 'genesAdverseDownCount',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.genesAdverseDownCount && item.genesAdverseDownCount > 0) {
                    return item.genesAdverseDownCount;
                }
                return '';
            },
        },
        {
            title: 'Percentage',
            key: 'percentage',
            render: (_: any, item: BMDxExported.CategoryAnalysisItem) => {
                if (item.percentage && item.percentage > 0) {
                    return item.percentage;
                }
                return '';
            },
        },
    ];

    // Flatten all filtered items from all results into a single array for clustering.
    const clusteringRowData = results.flatMap((result) => result.categoryAnalsyisResults);
    console.log("clusteringRowData: ", clusteringRowData);

    return (
        <div>
            {/* Render raw Category Analysis results */}
{/*             {results.map((result) => (
                <div key={result['@ref']} style={{ marginBottom: '2rem' }}>
                    <Title level={4}>{result.name}</Title>
                    <Table
                        dataSource={result.categoryAnalsyisResults}
                        columns={columns}
                        rowKey={(record: BMDxExported.CategoryAnalysisItem) =>
                            record.categoryIdentifier.id
                        }
                    />
                </div>
            ))} */}
            {/* Render clustering details computed from the Category Analysis results */}
            <ClusteringDetails rowData={clusteringRowData} />
        </div>
    );
};

export default DomainDetails;