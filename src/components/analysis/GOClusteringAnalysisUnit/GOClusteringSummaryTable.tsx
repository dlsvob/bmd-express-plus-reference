// src/components/analysis/GOClusteringAnalysisUnit/GOClusteringSummaryTable.tsx
import React, { useMemo } from 'react';
import { Table, Empty } from 'antd';
import type { TableColumnType } from 'antd';
import { SummaryRow } from '../../../utils/clusteringUtils';

interface GOClusteringSummaryTableProps {
    dataSource: SummaryRow[] | null;
    loading?: boolean;
}

const GOClusteringSummaryTable: React.FC<GOClusteringSummaryTableProps> = React.memo(
    ({ dataSource, loading }) => {
        // Define columns inside the component (or useMemo if preferred)
        const summaryColumns: TableColumnType<SummaryRow>[] = useMemo(
            () => [
                { title: 'Cluster', dataIndex: 'cluster', key: 'cluster', width: 80 },
                {
                    title: 'Min Cluster BMD',
                    dataIndex: 'minClusterBMD',
                    key: 'minClusterBMD',
                    render: (value: number) =>
                        isNaN(value) ? 'N/A' : value.toExponential(4),
                    sorter: (a, b) =>
                        (isNaN(a.minClusterBMD) ? Infinity : a.minClusterBMD) -
                        (isNaN(b.minClusterBMD) ? Infinity : b.minClusterBMD),
                    width: 130,
                },
                {
                    title: '# Categories',
                    dataIndex: 'numCategoryIDs',
                    key: 'numCategoryIDs',
                    sorter: (a, b) => a.numCategoryIDs - b.numCategoryIDs,
                    width: 110,
                },
                {
                    title: 'Rank',
                    dataIndex: 'sort',
                    key: 'sort',
                    sorter: (a, b) => (a.sort ?? Infinity) - (b.sort ?? Infinity),
                    defaultSortOrder: 'ascend', // Sort by rank ascending by default
                    width: 70,
                },
            ],
            []
        );

        const hasData = dataSource && dataSource.length > 0;

        return (
            <Table<SummaryRow>
                title={() => 'Cluster Summary'}
                dataSource={hasData ? dataSource : []}
                columns={summaryColumns}
                rowKey="key"
                loading={loading}
                pagination={false} // Summary table usually doesn't need pagination
                size="small"
                bordered
                scroll={{ y: 300 }} // Allow vertical scroll if needed
                locale={{
                    emptyText: loading ? ' ' : <Empty description="No summary data" />,
                }} // Show Empty state when not loading and no data
            />
        );
    }
);

GOClusteringSummaryTable.displayName = 'GOClusteringSummaryTable';
export default GOClusteringSummaryTable;
