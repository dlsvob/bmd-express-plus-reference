// src/utils/legendUtils.ts

// --- Defaults/Labels for Legend Derivation ---

export const DEFAULT_MARKER_SHAPE = 'circle';
export const DEFAULT_MARKER_SIZE = 8;
export const DEFAULT_MARKER_COLOR = '#7f7f7f'; // General default/fallback

// --- Constant for Unclustered Points ---
export const UNCLUSTERED_COLOR = '#cccccc'; // Specific light gray for cluster -1

// --- COLOR MAP DEFINITION ---
export const DIRECTION_COLOR_MAP: Record<string, string> = {
  'up': '#d62728',
  'down': '#1f77b4',
  'conflict': '#ff7f0e',
  'none': DEFAULT_MARKER_COLOR,
};

// --- SHAPE MAP DEFINITION ---
export const DIRECTION_SHAPE_MAP: Record<string, string> = {
  'up': 'triangle-up',
  'down': 'triangle-down',
  'conflict': 'square',
  'none': DEFAULT_MARKER_SHAPE,
};

// --- Constants for Percentage Binning ---
export const PERCENTAGE_BINS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const PERCENTAGE_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
// --------------------------------------

// --- Labels for Legend UI Component ---
export const SIZE_BIN_LABELS: Record<number, string> = {};
PERCENTAGE_SIZES.forEach((size, i) => {
  const lower = i === 0 ? 0 : PERCENTAGE_BINS[i - 1];
  const upper = PERCENTAGE_BINS[i];
  SIZE_BIN_LABELS[size] = `${lower} < % <= ${upper}`;
});
export const DEFAULT_SIZE_LABEL = "Fixed Size";

export const DIRECTION_LABELS: Record<string, string> = {
  'triangle-up': 'Up',
  'triangle-down': 'Down',
  'square': 'Conflict/None',
  'circle': 'None/Other',
};
export const DEFAULT_SHAPE_LABEL = "Circle";

export const getDirectionLegendName = (shapeSymbol: string): string => DIRECTION_LABELS[shapeSymbol] || shapeSymbol;

