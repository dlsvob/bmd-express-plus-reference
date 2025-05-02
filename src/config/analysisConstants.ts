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

/**
 * Base marker size in pixels when no specific sizing rule ("Size By: None")
 * or percentage binning is applied.
 */
export const BASE_MARKER_SIZE_PX = 9;
// -------------

// ========================================================
// --- ADDED: GO Clustering Scatter Plot Styles ---
// ========================================================

/** Base opacity for non-highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_BASE_ALPHA = 0.6;
/** Opacity for highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_HIGHLIGHT_ALPHA = 1.0;
/** Base size for non-highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_BASE_SIZE = 9;
/** Size for highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_HIGHLIGHT_SIZE = 14;
/** Base marker shape for non-highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_BASE_MARKER_SHAPE = 'cross'; // <<< ADDED
/** Marker shape for highlighted points in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_HIGHLIGHT_MARKER_SHAPE = 'circle'; // <<< ADDED (Can be different, e.g., 'star')

/** Color for the Y-axis grid lines in the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_GRID_COLOR = '#cccccc';
/** Color for the marker border line (highlight trace). */
export const CLUSTERING_PLOT_MARKER_LINE_COLOR = '#333333'; // Darker grey than black
/** Width for the marker border line (highlight trace). */
export const CLUSTERING_PLOT_MARKER_LINE_WIDTH = 0.7;
/** Background color for Plotly hover labels. */
export const CLUSTERING_PLOT_HOVER_BG_COLOR = '#FFFFFF'; // White
/** Border color for the highlighted marker hover label. */
export const CLUSTERING_PLOT_HIGHLIGHT_HOVER_BORDER_COLOR = '#333333'; // Dark Grey

/** Title for the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_TITLE = '5th Percentile BMD vs. Cluster Rank';
/** X-Axis Title for the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_X_AXIS_TITLE = '5th Percentile BMD (Log Scale)';
/** Y-Axis Title for the Clustering Scatter Plot. */
export const CLUSTERING_PLOT_Y_AXIS_TITLE = 'Cluster Rank (by Min BMD)'; // Updated Title
// ========================================================
// --- END: GO Clustering Scatter Plot Styles ---
// ========================================================
