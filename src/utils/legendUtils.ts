// src/utils/legendUtils.ts

// --- Defaults/Labels needed for Legend Derivation ---

// Default values used internally or for markers
export const DEFAULT_MARKER_SHAPE = 'circle'; // Used as fallback shape
export const DEFAULT_MARKER_SIZE = 8;
export const DEFAULT_MARKER_COLOR = '#7f7f7f'; // Used as fallback color

// *** COLOR MAP DEFINITION ***
// Maps direction strings (lowercase) to hex colors
export const DIRECTION_COLOR_MAP: Record<string, string> = {
  'up': '#d62728',       // Red example for 'up'
  'down': '#1f77b4',     // Blue example for 'down'
  'conflict': '#ff7f0e', // Orange example for 'conflict'
  'none': DEFAULT_MARKER_COLOR, // Use default for 'none' or unmatched
};
// ***************************

// *** SHAPE MAP DEFINITION ***
// Maps direction strings (lowercase) to Plotly shape symbols
export const DIRECTION_SHAPE_MAP: Record<string, string> = {
  'up': 'triangle-up',
  'down': 'triangle-down',
  'conflict': 'cross',
  'none': DEFAULT_MARKER_SHAPE, // Use default for 'none' or unmatched
};
// ***************************

// --- Constants for Percentage Binning ---
export const PERCENTAGE_BINS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
export const PERCENTAGE_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
// --------------------------------------

// --- Labels for Legend UI Component ---

// Generates labels for size bins (e.g., "0 < % <= 10")
export const SIZE_BIN_LABELS: Record<number, string> = {};
PERCENTAGE_SIZES.forEach((size, i) => {
  const lower = i === 0 ? 0 : PERCENTAGE_BINS[i - 1];
  const upper = PERCENTAGE_BINS[i];
  SIZE_BIN_LABELS[size] = `${lower} < % <= ${upper}`;
});
// Label for the default/fixed size option
export const DEFAULT_SIZE_LABEL = "Fixed Size";

// Maps Plotly shape symbols to human-readable Display Names for the legend UI
export const DIRECTION_LABELS: Record<string, string> = {
  'triangle-up': 'Up',
  'triangle-down': 'Down',
  'cross': 'Conflict',
  'circle': 'None/Other', // Label for default shape
};
// Label for the default shape option in UI controls/legends
export const DEFAULT_SHAPE_LABEL = "Circle";

// Function to get the display name for a shape symbol (e.g., 'triangle-up' -> 'Up')
// Primarily used for checking against hidden legend labels
export const getDirectionLegendName = (shapeSymbol: string): string => DIRECTION_LABELS[shapeSymbol] || shapeSymbol;

// --- End Exports ---