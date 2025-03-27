// src/components/ClusteringDetails.tsx
import React, { useEffect, useState } from 'react';
import { Table, Spin, Typography } from 'antd';
import { useRunHierarchicalClusteringQuery } from '../store/api/pyodideClusteringApi';
import { Collapse } from 'antd';

const { Panel } = Collapse;

const { Title, Text } = Typography;

export interface ClusteringResult {
    orderedLabels?: string[];    // Expected to be strings
    orderedClusters?: (string | number)[];  // Expected to be strings or numbers converted to strings
    displayName?: string;
}

interface ClusteringDetailsProps {
    // rowData is the raw data to cluster.
    rowData: any[];
    method?: string;
    numClusters?: number;
}

const ClusteringDetails: React.FC<ClusteringDetailsProps> = ({
    rowData,
    method = 'average',
    numClusters = 0,
}) => {
    // Compute the number of clusters if not provided.
    const computedNumClusters =
        numClusters && numClusters > 0 ? numClusters : Math.ceil(Math.sqrt(rowData.length) / 2);

    // Transform each row into the expected format.
    const transformedRows = rowData.map(row => ({
        "Category ID": row.categoryIdentifier?.id || "",
        "Category Title": row.categoryIdentifier?.title || "",
        "Cluster BMD": row.bmdFifthPercentileTotalGenes || "",
        "Up Genes": row.genesUp || "",
        "Down Genes": row.genesDown || "",
        "All Genes": row.genesIds || "",
        "Genes Up": row.genesUp || "",
        "Genes Down": row.genesDown || ""
    }));

    console.log("Transformed rows for clustering:", transformedRows);

    // Call the clustering API with the transformed row data.
    const { data, error, isLoading } = useRunHierarchicalClusteringQuery({
        rowData: transformedRows,
        method,
        numClusters: computedNumClusters,
    });

    const [clusters, setClusters] = useState<ClusteringResult[]>([]);

    useEffect(() => {
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log("Parsed clustering data:", parsed);
                // Ensure we have an array of clustering results.
                const clustersArray = Array.isArray(parsed) ? parsed : [parsed];
                if (clustersArray.length === 1) {
                    clustersArray[0].displayName = `Clusters (n=${computedNumClusters})`;
                }
                setClusters(clustersArray);
                console.log("Final clustering results:", clustersArray);
            } catch (e) {
                console.error('Error parsing clustering result:', e);
            }
        }
    }, [data, computedNumClusters]);

    if (isLoading) return <Spin tip="Running clustering..." />;
    if (error)
        return <Text type="danger">Error running clustering: {JSON.stringify(error)}</Text>;
    if (!clusters || clusters.length === 0)
        return <Text>No clustering data available.</Text>;

    // Helper: Parse a label string into an object.
    // Expected format: 
    // "Category ID: GO:0034660 | Category Title: ncRNA metabolic process | Cluster BMD: 9.137755 | Up Genes: 308911;303612 | Down Genes: 498934;361184;309673;64896 | All Genes: 498934;361184;308911;309673;303612;64896"
    const parseLabelToObject = (label: string) => {
        const obj: { [key: string]: string } = {};
        label.split(" | ").forEach((part) => {
            const [key, value] = part.split(": ");
            if (key && value) {
                obj[key.trim()] = value.trim();
            }
        });
        return obj;
    };

    // --- Table 2: Combined Individual Category Table ---
    // Combine all individual rows from clusters.
    const allCategoryRows = clusters.flatMap(cluster => {
        if (
            Array.isArray(cluster.orderedLabels) &&
            Array.isArray(cluster.orderedClusters) &&
            cluster.orderedLabels.length === cluster.orderedClusters.length
        ) {
            return cluster.orderedLabels.map((label, i) => {
                const parsed = parseLabelToObject(label);
                // Attach the cluster value (as string) from the corresponding orderedClusters.
                return {
                    ...parsed,
                    cluster: (cluster.orderedClusters[i] || "").toString().trim()
                };
            });
        }
        return [];
    });
    console.log("allCategoryRows: ", allCategoryRows);

    // Group by normalized "cluster" (each group represents the cluster’s category IDs).
    const groupedByCluster = allCategoryRows.reduce((acc: { [key: string]: any[] }, curr) => {
        // Normalize the cluster key.
        const clusterKey = (curr["cluster"] || "").trim();
        if (!clusterKey) {
            console.log("Skipping row (missing cluster): ", curr);
            return acc;
        }
        if (!acc[clusterKey]) {
            acc[clusterKey] = [];
        }
        acc[clusterKey].push(curr);
        return acc;
    }, {});

    // Build final table rows — one row per individual category.
    const categoryTableRows = Object.values(groupedByCluster).flatMap(group =>
        group.map(row => ({
            key: row["Category ID"], // assuming Category IDs are unique
            categoryId: row["Category ID"],
            categoryTitle: row["Category Title"],
            clusterBMD: row["Cluster BMD"],
            upGenes: row["Up Genes"],
            downGenes: row["Down Genes"],
            allGenes: row["All Genes"],
            cluster: row.cluster, // the individual cluster value
        }))
    );

    // Now, add a new field "groupSize" to each row based on the cluster group.
    const categoryTableRowsWithSize = categoryTableRows.map(row => ({
        ...row,
        groupSize: groupedByCluster[row.cluster]?.length || 0,
    }));

    // Define the columns for the combined category table, including the new "Group Size" column.
    // Its sorter compares groupSize first, then Cluster BMD if equal.
    const categoryColumns = [
        {
            title: "Group Size",
            dataIndex: "groupSize",
            key: "groupSize",
            sorter: (a, b) => {
                const groupDiff = a.groupSize - b.groupSize;
                if (groupDiff !== 0) return groupDiff;
                // If group sizes are equal, sort by Cluster BMD numerically.
                const aBMD = typeof a.clusterBMD === 'string' ? parseFloat(a.clusterBMD.trim()) : a.clusterBMD;
                const bBMD = typeof b.clusterBMD === 'string' ? parseFloat(b.clusterBMD.trim()) : b.clusterBMD;
                return aBMD - bBMD;
            },
            defaultSortOrder: 'descend',
        },
        {
            title: "Category ID",
            dataIndex: "categoryId",
            key: "categoryId",
            sorter: (a, b) => a.categoryId.localeCompare(b.categoryId),
        },
        {
            title: "Category Title",
            dataIndex: "categoryTitle",
            key: "categoryTitle",
            sorter: (a, b) => a.categoryTitle.localeCompare(b.categoryTitle),
        },
        {
            title: "Cluster BMD",
            dataIndex: "clusterBMD",
            key: "clusterBMD",
            sorter: (a, b) => {
                const aVal = parseFloat(a.clusterBMD) || 0;
                const bVal = parseFloat(b.clusterBMD) || 0;
                return aVal - bVal;
            },
        },
        {
            title: "Up Genes",
            dataIndex: "upGenes",
            key: "upGenes",
            sorter: (a, b) => a.upGenes.localeCompare(b.upGenes),
        },
        {
            title: "Down Genes",
            dataIndex: "downGenes",
            key: "downGenes",
            sorter: (a, b) => a.downGenes.localeCompare(b.downGenes),
        },
        {
            title: "All Genes",
            dataIndex: "allGenes",
            key: "allGenes",
            sorter: (a, b) => a.allGenes.localeCompare(b.allGenes),
        },
        {
            title: "Cluster",
            dataIndex: "cluster",
            key: "cluster",
            sorter: (a, b) => {
                const aVal = parseFloat(a.cluster) || 0;
                const bVal = parseFloat(b.cluster) || 0;
                return aVal - bVal;
            },
        },
    ];

    // -- Compute summary rows ---
    // Assume groupedByCluster is available from your earlier grouping step.
    const summaryRows = Object.entries(groupedByCluster).map(([clusterKey, rows]) => {
        // Compute the minimum Cluster BMD for this cluster group.
        // Parse each "Cluster BMD" as a float.
        const minBMD = Math.min(...rows.map(r => parseFloat(r["Cluster BMD"]) || Infinity));
        const numCategoryIDs = rows.length;
        return {
            key: clusterKey,
            cluster: clusterKey,
            minClusterBMD: minBMD,
            numCategoryIDs: numCategoryIDs,
        };
    });

    // Identify the row with the highest number of Category IDs.
    const maxRow = summaryRows.reduce((max, row) =>
        row.numCategoryIDs > max.numCategoryIDs ? row : max, summaryRows[0]
    );

    // Sort the remaining rows in ascending order by minClusterBMD.
    const sortedRows = summaryRows
        .filter(row => row.key !== maxRow.key)
        .sort((a, b) => a.minClusterBMD - b.minClusterBMD);

    // Build the final ordered array by appending the maxRow at the end.
    const finalSummaryRows = [...sortedRows, maxRow].map((row, index) => ({
        ...row,
        sort: index + 1, // Assign a ranking for display.
    }));

    // --- Define summary table columns ---
    // No interactive sorting is applied—the table order is fixed.
    const summaryColumns = [
        {
            title: "Cluster",
            dataIndex: "cluster",
            key: "cluster",
        },
        {
            title: "Min Cluster BMD",
            dataIndex: "minClusterBMD",
            key: "minClusterBMD",
            render: (value: number) => value.toExponential(4),
        },
        {
            title: "Num Category IDs",
            dataIndex: "numCategoryIDs",
            key: "numCategoryIDs",
        }
    ];

    // --- Render both tables in a single return ---
    return (

        <div>
            <Collapse>
                <Panel header="Category Details" key="1">
                    <div style={{ marginTop: '2rem' }}>
                        <Title level={4}>Combined Category Table</Title>
                        <Table
                            dataSource={categoryTableRowsWithSize}
                            columns={categoryColumns}
                            rowKey="key"
                            pagination={true}
                        />
                    </div>
                </Panel>
            </Collapse >


            <Collapse>
                <Panel header="Category Cluster Summary" key="1">
                    <div style={{ marginTop: '2rem' }}>
                        <Title level={4}>Summary Table by Cluster</Title>
                        <Table
                            dataSource={finalSummaryRows}
                            columns={summaryColumns}
                            rowKey="key"
                            pagination={false}
                        />
                    </div>
                </Panel>
            </Collapse >
        </div>



    );
};

export default ClusteringDetails;