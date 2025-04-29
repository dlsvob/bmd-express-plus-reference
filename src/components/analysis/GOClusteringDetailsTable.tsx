// src/components/analysis/GOClusteringDetailsTable.tsx
import React, { useMemo } from 'react';
import { Table, Empty } from 'antd';
import type { TableColumnType } from 'antd';
import { CategoryRow } from '../../utils/clusteringUtils'; // Adjust path if needed

// Define Props interface
interface GOClusteringDetailsTableProps {
    dataSource: CategoryRow[] | null;
    loading?: boolean;
}

const GOClusteringDetailsTable: React.FC<GOClusteringDetailsTableProps> = React.memo(
    ({ dataSource, loading }) => {
        // Define columns inside the component
        const categoryColumns: TableColumnType<CategoryRow>[] = useMemo(
            () => [
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
                    sorter: (a: CategoryRow, b: CategoryRow) =>
                        a.upGenesSize - b.upGenesSize,
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
            ],
            []
        );

        const hasData = dataSource && dataSource.length > 0;

        return (
            <Table<CategoryRow>
                title={() => `Category Details (${dataSource?.length ?? 0} items)`}
                dataSource={hasData ? dataSource : []}
                columns={categoryColumns}
                rowKey="key"
                loading={loading}
                pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    size: 'small',
                    pageSizeOptions: ['10', '15', '25', '50', '100'],
                }}
                size="small"
                bordered
                scroll={{ x: 800, y: 400 }} // Adjust scroll as needed
                locale={{
                    emptyText: loading ? ' ' : <Empty description="No category data" />,
                }} // Show Empty state when not loading and no data
            />
        );
    }
);

export default GOClusteringDetailsTable;
