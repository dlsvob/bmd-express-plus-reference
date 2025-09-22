// src/components/analysis/GOUmapAnalysisUnit/UmapDataTable.tsx

import React from 'react';
import { Row, Col, Card } from 'antd';
import { GOUmapAnalysisTable } from './GOUmapAnalysisTable';
import { HighlightMode } from '../../../store/slices/analysisUISlice';
import type {
    AnalysisTableRow,
} from '../../../models/applicationModel';
import type {
    TablePaginationConfig,
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table';

type TableSorterType = SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[];

export interface UmapDataTableProps {
    // Data
    dataSource: AnalysisTableRow[];
    columns: ColumnType<AnalysisTableRow>[];
    loading: boolean;

    // Interaction state
    highlightMode: HighlightMode;
    highlightGoIdsSet: Set<string>;
    selectedAccumGoIdsSet: Set<string>;

    // Table state
    pagination: TablePaginationConfig;

    // Callbacks
    onChange: (
        pagination: TablePaginationConfig,
        filters: Record<string, FilterValue | null>,
        sorter: TableSorterType
    ) => void;
    onRowClick: (record: AnalysisTableRow) => void;

    // Optional style overrides
    style?: React.CSSProperties;
}

const UmapDataTable: React.FC<UmapDataTableProps> = ({
    dataSource,
    columns,
    loading,
    highlightMode,
    highlightGoIdsSet,
    selectedAccumGoIdsSet,
    pagination,
    onChange,
    onRowClick,
    style
}) => {
    return (
        <Card
            size="small"
            title="Analysis Data Table"
            bordered={false}
            style={{
                marginTop: 'auto',
                flexShrink: 0,
                ...style
            }}
        >
            <Row>
                <Col span={24}>
                    <GOUmapAnalysisTable
                        dataSource={dataSource || []}
                        columns={columns}
                        loading={loading}
                        highlightMode={highlightMode}
                        highlightGoIdsSet={highlightGoIdsSet}
                        selectedAccumGoIdsSet={selectedAccumGoIdsSet}
                        size="small"
                        scroll={{ y: 400, x: 'max-content' }}
                        pagination={pagination}
                        onChange={onChange}
                        onRowClick={onRowClick}
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default UmapDataTable;