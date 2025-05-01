// src/config/tableColumnDefinitions.ts
import type { TableColumnType } from 'antd';
import { AnalysisTableRow } from '../models/applicationModel';

// Helper for case-insensitive string sorting (handles null/undefined)
const localeCompareSort = (a: string | null | undefined, b: string | null | undefined): number => {
  const valA = a || ''; // Treat null/undefined as empty string for comparison
  const valB = b || '';
  return valA.localeCompare(valB);
};

// Define reusable column objects for Ant Design Tables displaying AnalysisTableRow data
// Ensure keys are unique within the set of columns used in any single table instance.
export const GO_ID_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'GO ID',
  dataIndex: 'go_id',
  key: 'go_id', // Unique key for this column definition
  sorter: (a, b) => localeCompareSort(a.go_id, b.go_id), // Use helper
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 130,
};

export const GO_TERM_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'GO Term',
  dataIndex: 'go_term',
  key: 'go_term',
  ellipsis: true,
  width: 300,
  // *** ADD sorter and sortDirections ***
  sorter: (a, b) => localeCompareSort(a.go_term, b.go_term), // Use helper
  sortDirections: ['ascend', 'descend'],
};

export const CLUSTER_ID_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'Cluster',
  dataIndex: 'cluster_id',
  key: 'cluster_id',
  sorter: (a, b) => String(a.cluster_id).localeCompare(String(b.cluster_id), undefined, { numeric: true }),
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 80,
};

export const UMAP_1_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'UMAP 1',
  dataIndex: 'UMAP_1',
  key: 'UMAP_1',
  render: (val) => typeof val === 'number' ? val.toFixed(3) : '',
  sorter: (a, b) => (a.UMAP_1 ?? 0) - (b.UMAP_1 ?? 0),
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 90,
};

export const UMAP_2_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'UMAP 2',
  dataIndex: 'UMAP_2',
  key: 'UMAP_2',
  render: (val) => typeof val === 'number' ? val.toFixed(3) : '',
  sorter: (a, b) => (a.UMAP_2 ?? 0) - (b.UMAP_2 ?? 0),
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 90,
};

export const SOURCE_ANALYSIS_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'Source', // Corresponds to 'Experiment Name'
  dataIndex: 'bmdResultName',
  key: 'bmdResultName',
  ellipsis: true,
  width: 150,
  // *** ADD sorter and sortDirections ***
  sorter: (a, b) => localeCompareSort(a.bmdResultName, b.bmdResultName), // Use helper
  sortDirections: ['ascend', 'descend'],
};

export const DIRECTION_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'Dir.',
  dataIndex: 'direction',
  key: 'direction',
  width: 60,
  // Optional: Add sorter if needed
  // sorter: (a, b) => localeCompareSort(a.direction, b.direction),
  // sortDirections: ['ascend', 'descend'],
};

export const PERCENTAGE_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: '%',
  dataIndex: 'percentage',
  key: 'percentage',
  render: (val) => val != null ? `${val.toFixed(1)}%` : '',
  sorter: (a, b) => (a.percentage ?? 0) - (b.percentage ?? 0),
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 70,
};

export const BMD_5_PERC_COLUMN: TableColumnType<AnalysisTableRow> = {
  title: 'BMD 5%',
  dataIndex: 'bmdFifthPercentileTotalGenes',
  key: 'bmdFifthPercentileTotalGenes',
  render: (val) => typeof val === 'number' ? val.toExponential(2) : '',
  sorter: (a, b) => (a.bmdFifthPercentileTotalGenes ?? Infinity) - (b.bmdFifthPercentileTotalGenes ?? Infinity),
  sortDirections: ['ascend', 'descend'], // Add directions
  width: 100,
};

// --- Define Default Column Sets ---

// Example default set for the main GOUmapAnalysisTable
// No changes needed here, as the modified columns are already included.
export const DEFAULT_GOUMAP_TABLE_COLUMNS: TableColumnType<AnalysisTableRow>[] = [
  GO_ID_COLUMN,
  GO_TERM_COLUMN, // Now sortable
  CLUSTER_ID_COLUMN,
  SOURCE_ANALYSIS_COLUMN, // Now sortable
  BMD_5_PERC_COLUMN,
  DIRECTION_COLUMN,
  PERCENTAGE_COLUMN,
  // Add UMAP_1_COLUMN, UMAP_2_COLUMN here if desired by default
];

// Example set including UMAP coordinates (can be imported if needed)
// export const GOUMAP_TABLE_WITH_COORDS_COLUMNS: TableColumnType<AnalysisTableRow>[] = [
//     ...DEFAULT_GOUMAP_TABLE_COLUMNS,
//     UMAP_1_COLUMN,
//     UMAP_2_COLUMN,
// ];
