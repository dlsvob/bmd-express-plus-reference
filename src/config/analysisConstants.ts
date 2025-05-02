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

// --- ADD THIS ---
/**
 * Target width in pixels for the main UMAP plot.
 * The plot will be square (height equals width due to CSS).
 * Accumulation plots will be half this size (width and height).
 * Adjust this value to get the desired plot size at 100% zoom.
 */
export const TARGET_UMAP_PLOT_DIMENSION = 1100; // Your tunable size
// Base width for the entire center column when UMAP is at its target size
export const BASE_CENTER_CONTENT_WIDTH = TARGET_UMAP_PLOT_DIMENSION / 0.8;
// -------------

/**
 * Global multiplier for explicit font sizes within analysis components.
 * 1.0 = default size. 1.1 = 10% larger, 0.9 = 10% smaller.
 * Note: This primarily affects Plotly plots and custom styled elements,
 * not necessarily all Ant Design component text which uses its theme.
 */
export const FONT_SIZE_MULTIPLIER = 1.5; // Adjust this value (e.g., 0.9, 1.0, 1.1)

// Define some base sizes (in px) that the multiplier will affect
export const BASE_PLOT_TITLE_FONT_SIZE_PX = 16;
export const BASE_PLOT_AXIS_TITLE_FONT_SIZE_PX = 12;
export const BASE_PLOT_AXIS_TICK_FONT_SIZE_PX = 10;
export const BASE_PLOT_HOVER_FONT_SIZE_PX = 12;
export const BASE_PLOT_LEGEND_FONT_SIZE_PX = 12; // If legends were shown
export const BASE_PLOT_AXIS_TITLE_STANDOFF_PX = 11;
export const BASE_LEGEND_LABEL_FONT_SIZE_PX = 11; // For CustomLegends component
export const BASE_LEGEND_SHAPE_FONT_SIZE_PX = 13; // For CustomLegends component shapes
export const BASE_ACCUM_PLOT_TITLE_FONT_SIZE_PX = 12; // For titles above Accumulation plots

// -------------------------
