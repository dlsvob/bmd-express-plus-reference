// src/config/analysisConstants.ts

/** Options for the 'Color By' selector in the analysis view. */
export const COLOR_BY_OPTIONS = [
  { value: 'bmdResultName', label: 'BMD Result (Source)' },
  { value: 'cluster_id', label: 'UMAP Cluster' },
  { value: 'direction', label: 'Direction (Up/Down)' },
];

/** Options for the 'Shape By' selector in the analysis view. */
export const SHAPE_BY_OPTIONS = [
  { value: 'none', label: 'None (Circle)' },
  { value: 'direction', label: 'Direction (Up/Down)' },
  { value: 'bmdResultName', label: 'BMD Result (Source)' },
];

/** Options for the 'Size By' selector in the analysis view. */
export const SIZE_BY_OPTIONS = [
  { value: 'none', label: 'None (Fixed Size)' },
  { value: 'percentage', label: 'Percentage (Binned)' },
];

/** Default color palette for distinguishing selected BMD result sets. */
export const DEFAULT_PLOT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
] as const;

/** Palette of shapes used for plotting when shapeBy is 'bmdResultName'. */
export const SHAPE_PALETTE = [
  'circle', 'square', 'diamond', 'cross', 'x',
  'star', 'pentagon', 'hexagon', 'triangle-up', 'triangle-down'
];
// -------------------------


