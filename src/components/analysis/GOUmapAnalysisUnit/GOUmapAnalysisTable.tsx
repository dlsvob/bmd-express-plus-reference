// src/components/GOUmapAnalysisTable.tsx
import React from 'react';
import { Table } from 'antd';
import type { TableProps, TableColumnType } from 'antd';
import { AnalysisTableRow } from '../../../models/applicationModel'; // Adjust path as needed
import { HighlightMode } from '../../../store/slices/analysisUISlice'; // Adjust path as needed
import { HIDDEN_OPACITY } from '../../../utils/styleUtils'; // Import HIDDEN_OPACITY

// --- Helper function to convert HEX to RGBA ---
function hexToRgba(hex: string, alpha: number): string {
    const validAlpha = Math.max(0, Math.min(1, alpha));
    if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${validAlpha})`; // Default to white with alpha
    try {
        let color = hex.startsWith('#') ? hex.substring(1) : hex;
        if (color.length === 3) color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        if (color.length !== 6) return `rgba(255, 255, 255, ${validAlpha})`; // Default if not 6 digits
        const num = parseInt(color, 16);
        const r = num >> 16;
        const g = (num >> 8) & 0x00FF;
        const b = num & 0x0000FF;
        return `rgba(${r}, ${g}, ${b}, ${validAlpha})`;
    } catch (e) {
        console.error("Error converting hex to rgba:", hex, e);
        return `rgba(255, 255, 255, ${validAlpha})`; // Default on error
    }
}

// --- Constants ---
const ANTD_CELL_COLOR_DEFAULT = '#FFFFFF'; // Fallback background (solid white)
const HIGHLIGHT_COLOR_FILTER = '#e6f7ff'; // Light blue for GO ID filter highlight
const HIGHLIGHT_COLOR_ACCUM = '#fffbe6';  // Light yellow for Accumulation plot highlight
const HIGHLIGHT_COLOR_BOTH = '#e6fffb';   // Light cyan for both highlights
const ROW_COLOR_ALPHA = 0.7; // Alpha for base marker color background
const HIDDEN_ROW_STYLE: React.CSSProperties = {
    backgroundColor: '#f5f5f5', // Light grey background
    color: '#bfbfbf', // Dimmed text color
};
// --------------------------------

// --- Component Props Interface ---
interface GOUmapAnalysisTableProps extends Omit<TableProps<AnalysisTableRow>, 'columns' | 'dataSource' | 'onRow' | 'onChange'> {
    dataSource: AnalysisTableRow[];
    columns: TableColumnType<AnalysisTableRow>[];
    loading?: boolean;
    highlightMode: HighlightMode;
    highlightGoIdsSet: Set<string>; // GO IDs from the text filter UI
    selectedAccumGoIdsSet: Set<string>; // GO IDs selected from accumulation plots
    scroll?: TableProps<AnalysisTableRow>['scroll'];
    pagination?: TableProps<AnalysisTableRow>['pagination'];
    size?: TableProps<AnalysisTableRow>['size'];
    bordered?: boolean;
    onChange?: TableProps<AnalysisTableRow>['onChange']; // Handler from parent for sort/page/filter
    onRowClick?: (record: AnalysisTableRow) => void; // Handler from parent for row click
}

/**
 * GOUmapAnalysisTable Component (Ant Design)
 */
export const GOUmapAnalysisTable: React.FC<GOUmapAnalysisTableProps> = React.memo(
    function GOUmapAnalysisTable({
        dataSource,
        columns,
        loading,
        highlightMode,
        highlightGoIdsSet,
        selectedAccumGoIdsSet,
        scroll,
        pagination,
        size,
        bordered,
        onChange,
        onRowClick, // Destructure the row click handler
        ...restTableProps
    }) {

        // --- Implement onRow to set background color AND attach onClick ---
        const handleRow = (record: AnalysisTableRow, index?: number) => {
            const rowStyle: React.CSSProperties = {};
            const isHiddenOnPlot = record.finalOpacity === HIDDEN_OPACITY;

            // Set base style (dimmed or colored)
            if (isHiddenOnPlot) {
                Object.assign(rowStyle, HIDDEN_ROW_STYLE);
            } else {
                const baseMarkerColorHex = record.finalColor;
                rowStyle.backgroundColor = baseMarkerColorHex
                    ? hexToRgba(baseMarkerColorHex, ROW_COLOR_ALPHA)
                    : ANTD_CELL_COLOR_DEFAULT;
            }

            // Apply Highlights (override base/hidden styles)
            if (record?.go_id && typeof record.go_id === 'string') {
                const goIdUpper = record.go_id.toUpperCase();
                const isFilterHighlight = highlightMode !== HighlightMode.NONE && highlightGoIdsSet.has(goIdUpper);
                const isAccumHighlight = selectedAccumGoIdsSet.has(goIdUpper);

                if (isFilterHighlight && isAccumHighlight) {
                    rowStyle.backgroundColor = HIGHLIGHT_COLOR_BOTH;
                    rowStyle.color = 'inherit'; // Reset text color
                } else if (isFilterHighlight) {
                    rowStyle.backgroundColor = HIGHLIGHT_COLOR_FILTER;
                    rowStyle.color = 'inherit';
                } else if (isAccumHighlight) {
                    rowStyle.backgroundColor = HIGHLIGHT_COLOR_ACCUM;
                    rowStyle.color = 'inherit';
                }
            }

            // Return props for the <tr> element
            return {
                style: rowStyle,
                onClick: () => { // Attach onClick handler
                    if (onRowClick) {
                        onRowClick(record);
                    }
                },
                // Add cursor style to indicate clickability
                className: onRowClick ? 'clickable-row' : '',
            };
        };

        return (
            // Add a CSS class if you want to style .clickable-row { cursor: pointer; }
            <div className="goumap-analysis-table-wrapper">
                <Table<AnalysisTableRow>
                    columns={columns}
                    dataSource={dataSource}
                    loading={loading}
                    rowKey={(record) => `${record.bmdResultRef}-${record.go_id}`} // Composite key
                    onRow={handleRow} // Apply row styles and onClick
                    scroll={scroll}
                    pagination={pagination}
                    size={size}
                    bordered={bordered}
                    onChange={onChange} // Pass AntD's handler
                    {...restTableProps}
                />
            </div>
        );
    }
);
