// src/hooks/useUmapTable.ts

import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_GOUMAP_TABLE_COLUMNS } from '../config/tableColumnDefinitions';
import type {
    AnalysisTableRow,
} from '../models/applicationModel';
import type {
    TablePaginationConfig,
    SorterResult,
    FilterValue,
} from 'antd/es/table/interface';
import type { ColumnType } from 'antd/es/table';

type TableSorterType = SorterResult<AnalysisTableRow> | SorterResult<AnalysisTableRow>[];

export interface UseUmapTableProps {
    allStyledPoints: AnalysisTableRow[] | null;
}

export interface UseUmapTableReturn {
    tableDataSource: AnalysisTableRow[];
    tableColumns: ColumnType<AnalysisTableRow>[];
    tableSorter: TableSorterType;
    tablePagination: TablePaginationConfig;
    setTableSorter: (sorter: TableSorterType) => void;
    setTablePagination: (pagination: TablePaginationConfig) => void;
    handleTableChange: (
        pagination: TablePaginationConfig,
        filters: Record<string, FilterValue | null>,
        sorter: TableSorterType
    ) => void;
}

export const useUmapTable = ({
    allStyledPoints
}: UseUmapTableProps): UseUmapTableReturn => {
    // Table state
    const [tableSorter, setTableSorter] = useState<TableSorterType>([]);
    const [tablePagination, setTablePagination] = useState<TablePaginationConfig>({
        current: 1,
        pageSize: 50,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100', '500'],
        position: ['bottomRight']
    });

    // Table data source derived from styled points and current sorter state
    const tableDataSource = useMemo(() => {
        const points = allStyledPoints || [];

        // Ensure sorters is always an array for easier handling
        const sorters = (Array.isArray(tableSorter)
            ? tableSorter
            : (tableSorter?.columnKey ? [tableSorter] : [])
        ).filter(s => s && s.order);

        if (!sorters || sorters.length === 0) return points;

        const sortedPoints = [...points]; // Create mutable copy

        sortedPoints.sort((a, b) => {
            for (const sorter of sorters) {
                if (!sorter.columnKey && !sorter.field) continue; // Skip if no key/field

                // Prefer columnKey but fallback to field
                const sortKey = sorter.columnKey ?? sorter.field;
                const column = DEFAULT_GOUMAP_TABLE_COLUMNS.find(col => col.key === sortKey);

                if (column && typeof column.sorter === 'function') {
                    let result: number;
                    try {
                        result = (column.sorter as (a: AnalysisTableRow, b: AnalysisTableRow) => number)(a, b);
                    } catch (e) {
                        console.error("Table sorting error:", e);
                        result = 0; // Default to no difference on error
                    }

                    if (result !== 0) {
                        return sorter.order === 'descend' ? -result : result;
                    }
                }
            }
            return 0;
        });

        return sortedPoints;
    }, [allStyledPoints, tableSorter]);

    // Table columns derived from defaults and current sorter state
    const tableColumns = useMemo(() => {
        const sortersArray = Array.isArray(tableSorter)
            ? tableSorter
            : (tableSorter?.columnKey ? [tableSorter] : []);

        return DEFAULT_GOUMAP_TABLE_COLUMNS.map((col: ColumnType<AnalysisTableRow>) => {
            if (!col.key) return col; // Column needs key for sorting state

            // Find the sorter state matching this column's key
            const currentColumnSorter = sortersArray.find(s => s.columnKey === col.key);

            return {
                ...col,
                sortOrder: currentColumnSorter ? currentColumnSorter.order : null, // Apply sortOrder for UI indicator
            };
        });
    }, [tableSorter]);

    // Table change handler
    const handleTableChange = useCallback((
        pagination: TablePaginationConfig,
        _filters: Record<string, FilterValue | null>,
        sorter: TableSorterType
    ) => {
        setTablePagination(pagination);
        setTableSorter(sorter);
    }, []);

    return {
        tableDataSource,
        tableColumns,
        tableSorter,
        tablePagination,
        setTableSorter,
        setTablePagination,
        handleTableChange,
    };
};