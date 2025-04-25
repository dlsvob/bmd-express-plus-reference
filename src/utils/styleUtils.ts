/**
 * src/utils/styleUtils.ts
 *
 * Utilities for applying dynamic styling (color, shape, size, opacity)
 * to prepared analysis data points based on UI settings and interactions.
 */

import { HighlightMode } from '../store/slices/analysisUISlice'; // Adjust path if needed
import type {
  BaseCategoryAnalysisDataPoint,
  UmapAnalysisDataPoint,
} from '../models/ApplicationModelCompositional'; // Adjust path if needed
import {
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DEFAULT_MARKER_SIZE,
  DIRECTION_COLOR_MAP,
  DIRECTION_SHAPE_MAP,
  PERCENTAGE_BINS,
  PERCENTAGE_SIZES,
  SIZE_BIN_LABELS,
  getDirectionLegendName,
  DEFAULT_SHAPE_LABEL,
  DEFAULT_SIZE_LABEL,
  // UNKNOWN_CLUSTER_COLOR, // Removed as per previous step
} from './legendUtils'; // Adjust path if needed
import type { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path if needed

// Define input/output Map types
type BaseGroupedData = Map<string, BaseCategoryAnalysisDataPoint[]>;
type StyledUmapGroupedData = Map<string, UmapAnalysisDataPoint[]>;

// Constants for Opacity
const VISIBLE_OPACITY = 0.9;
const HIDDEN_OPACITY = 0.0;
const DIM_OPACITY = 0.4;

// --- Helper Functions ---
function getBinnedSize(percentage: number | null | undefined): number {
  if (percentage == null || isNaN(percentage)) return DEFAULT_MARKER_SIZE;
  for (let i = 0; i < PERCENTAGE_BINS.length; i++) {
    if (percentage <= PERCENTAGE_BINS[i]) {
      return PERCENTAGE_SIZES[i];
    }
  }
  return PERCENTAGE_SIZES[PERCENTAGE_SIZES.length - 1];
}
function getDirectionShape(direction: string | null | undefined): string {
  const key = direction?.toLowerCase() ?? 'none';
  return DIRECTION_SHAPE_MAP[key] || DEFAULT_MARKER_SHAPE; // Fallback to default shape
}
function getDirectionColor(direction: string | null | undefined): string {
  const key = direction?.toLowerCase() ?? 'none';
  return DIRECTION_COLOR_MAP[key] || DEFAULT_MARKER_COLOR;
}
// ------------------------------------

// --- Main Styling Function ---
export function calculateOverlayStyles(
  baseGroupedData: BaseGroupedData | null,
  stylingOptions: { colorBy: string; shapeBy: string; sizeBy: string },
  hiddenColorLabels: Set<string> | string[],
  hiddenShapeLabels: Set<string> | string[],
  hiddenSizeLabels: Set<string> | string[],
  goIdFilterList: string[],
  highlightMode: HighlightMode,
  bmdRefToExperimentNameMap: Map<number, string> | null,
  selectedGoIdsFromAccumulation: Set<string>,
  referenceMap: Map<string, ReferenceUmapItem> | null,
  clusterColorMap: Map<string, string> | null,
  bmdRefShapeMap: Map<number, string> | null, // Keep receiving this
  rankRange?: [number, number] | null
): StyledUmapGroupedData | null {
  const styleLogPrefix = '[StyleUtils v7]'; // <<< Updated version prefix

  console.log(`${styleLogPrefix} Received stylingOptions:`, stylingOptions);
  console.log(`${styleLogPrefix} Received clusterColorMap size:`, clusterColorMap?.size ?? 'null');
  console.log(`${styleLogPrefix} Received referenceMap size:`, referenceMap?.size ?? 'null');
  console.log(`${styleLogPrefix} Received bmdRefShapeMap size:`, bmdRefShapeMap?.size ?? 'null'); // Log received shape map

  // ... (Diagnostic logging, Guard Clauses, Set creation remain the same) ...
  if (!baseGroupedData || baseGroupedData.size === 0 || !referenceMap) {
    console.warn(
      `${styleLogPrefix} Skipping: Missing or empty baseGroupedData or missing referenceMap.`
    );
    return null;
  }
  const hiddenColorSet = hiddenColorLabels instanceof Set ? hiddenColorLabels : new Set(hiddenColorLabels);
  const hiddenShapeSet = hiddenShapeLabels instanceof Set ? hiddenShapeLabels : new Set(hiddenShapeLabels);
  const hiddenSizeSet = hiddenSizeLabels instanceof Set ? hiddenSizeLabels : new Set(hiddenSizeLabels);
  const styledGroupedData = new Map<string, UmapAnalysisDataPoint[]>();
  let pointsProcessed = 0;
  let pointsSkippedMissingRef = 0;
  let pointsOutput = 0;
  const failedKeysSample = new Set<string>();
  console.log(
    `${styleLogPrefix} Starting styling calculation for ${baseGroupedData.size} analysis groups...`
  );
  // ... (Highlighting pre-calculation logic remains the same) ...
  const exactMatchGoIds = new Set(goIdFilterList.map((id) => (id ?? '').toUpperCase()));
  const clusterMatchClusterIds = new Set<string | number>();
  if (highlightMode === HighlightMode.CLUSTER && exactMatchGoIds.size > 0) { /* ... */ }

  // Main Styling Loop
  baseGroupedData.forEach((basePoints, refStringKey) => {
    const styledPoints = basePoints
      .map((basePoint) => {
        pointsProcessed++;

        const goIdSource = basePoint.go_id;
        const lookupKey = typeof goIdSource === 'string' ? goIdSource.trim().toUpperCase() : null;
        const refDataItem = lookupKey ? referenceMap.get(lookupKey) : undefined;

        if (!refDataItem) {
          pointsSkippedMissingRef++;
          if (lookupKey && failedKeysSample.size < 20) {
            if (!failedKeysSample.has(lookupKey)) {
              failedKeysSample.add(lookupKey);
            }
          }
          return null;
        }

        const { colorBy, shapeBy, sizeBy } = stylingOptions;
        const experimentNameForLabel = bmdRefToExperimentNameMap?.get(basePoint.bmdResultRef) || basePoint.bmdResultName;
        const numericBmdRef = basePoint.bmdResultRef; // Get numeric ref once

        // --- COLOR LOGIC (Using DEFAULT_MARKER_COLOR fallback) ---
        let baseFinalColor = DEFAULT_MARKER_COLOR;
        let colorLabel = experimentNameForLabel;
        switch (colorBy) {
          case 'cluster_id':
            const clusterIdValue = refDataItem.cluster_id;
            const clusterIdString = String(clusterIdValue);
            const retrievedColor = clusterIdValue != null ? clusterColorMap?.get(clusterIdString) : undefined;
            baseFinalColor = retrievedColor || DEFAULT_MARKER_COLOR; // Use default if not found
            colorLabel = clusterIdValue != null ? `Cluster ${clusterIdValue}` : 'Unknown Cluster';
            console.log(
              `${styleLogPrefix} ColorByCluster: go_id=${basePoint.go_id}, ref_cluster_id=${clusterIdValue}, ` +
              `lookup_key='${clusterIdString}', map_has_key=${clusterColorMap?.has(clusterIdString)}, ` +
              `retrieved_color=${retrievedColor}, final_color=${baseFinalColor}`
            );
            break;
          case 'direction':
            baseFinalColor = getDirectionColor(basePoint.direction);
            colorLabel = getDirectionLegendName(getDirectionShape(basePoint.direction));
            break;
          // default 'bmdResultName': Keep default color/label
        }

        // --- UPDATED SHAPE LOGIC ---
        let baseFinalShape = DEFAULT_MARKER_SHAPE; // Default
        let shapeLabel = DEFAULT_SHAPE_LABEL; // Default
        switch (shapeBy) {
          case 'direction':
            const directionKey = basePoint.direction?.toLowerCase() ?? 'none';
            if (directionKey === 'up') {
              baseFinalShape = 'triangle-up';
            } else if (directionKey === 'down') {
              baseFinalShape = 'triangle-down';
            } else {
              baseFinalShape = 'square'; // Use square for conflict/none/other
            }
            shapeLabel = getDirectionLegendName(baseFinalShape);
            console.log(
              `${styleLogPrefix} ShapeByDirection: Direction=${directionKey}, final_shape=${baseFinalShape}`
            );
            break;

          case 'bmdResultName':
            // Use the map generated and passed from the hook
            const retrievedShape = bmdRefShapeMap?.get(numericBmdRef);
            baseFinalShape = retrievedShape || DEFAULT_MARKER_SHAPE; // Fallback
            shapeLabel = experimentNameForLabel; // Use experiment name for label
            console.log(
              `${styleLogPrefix} ShapeByBmdName: Ref=${numericBmdRef}, ` +
              `map_has_key=${bmdRefShapeMap?.has(numericBmdRef)}, ` +
              `retrieved_shape=${retrievedShape}, final_shape=${baseFinalShape}`
            );
            break;

          case 'none':
          default:
            // Explicitly handle 'none' or any other case by using defaults
            baseFinalShape = DEFAULT_MARKER_SHAPE;
            shapeLabel = DEFAULT_SHAPE_LABEL;
            break;
        }
        // --- END UPDATED SHAPE LOGIC ---

        // --- SIZE LOGIC (Remains unchanged) ---
        let baseFinalSize = DEFAULT_MARKER_SIZE;
        let sizeLabel = DEFAULT_SIZE_LABEL;
        switch (sizeBy) {
          case 'percentage':
            baseFinalSize = getBinnedSize(basePoint.percentage);
            try {
              sizeLabel = SIZE_BIN_LABELS && SIZE_BIN_LABELS[baseFinalSize] ? SIZE_BIN_LABELS[baseFinalSize] : DEFAULT_SIZE_LABEL;
            } catch (e) { sizeLabel = DEFAULT_SIZE_LABEL; }
            break;
          // default 'none': Keep defaults
        }

        // --- Legend Toggles & Highlighting (Remains unchanged) ---
        const isHiddenByLegend =
          hiddenColorSet.has(colorLabel) ||
          hiddenShapeSet.has(shapeLabel) ||
          hiddenSizeSet.has(sizeLabel);
        let finalSize = baseFinalSize;
        let finalOpacity = isHiddenByLegend ? HIDDEN_OPACITY : VISIBLE_OPACITY;
        const currentGoIdUpper = lookupKey;
        const isExactMatch = currentGoIdUpper && exactMatchGoIds.has(currentGoIdUpper);
        const clusterIdForHighlight = refDataItem.cluster_id;
        const isInHighlightCluster =
          highlightMode === HighlightMode.CLUSTER &&
          clusterIdForHighlight != null &&
          clusterMatchClusterIds.has(clusterIdForHighlight);
        const isSelectedFromAccumulation =
          currentGoIdUpper &&
          selectedGoIdsFromAccumulation.has(currentGoIdUpper);

        if (!isHiddenByLegend) {
          if (isSelectedFromAccumulation) {
            finalSize = baseFinalSize * 1.5;
            finalOpacity = 1.0;
          } else if (
            highlightMode !== HighlightMode.NONE &&
            exactMatchGoIds.size > 0
          ) {
            if (highlightMode === HighlightMode.SELECTED) {
              if (!isExactMatch) finalOpacity = HIDDEN_OPACITY;
            } else if (highlightMode === HighlightMode.CLUSTER) {
              if (isExactMatch) {
                finalSize = baseFinalSize * 1.2;
                finalOpacity = VISIBLE_OPACITY;
              } else if (isInHighlightCluster) {
                finalSize = Math.max(1, baseFinalSize * 0.8);
                finalOpacity = DIM_OPACITY;
              } else {
                finalOpacity = HIDDEN_OPACITY;
              }
            }
          }
        } else {
          finalOpacity = HIDDEN_OPACITY;
        }
        if (finalOpacity === HIDDEN_OPACITY) { return null; }
        // ---------------------------------------------------------

        // --- Final Logging ---
        console.log(
          `${styleLogPrefix} Point ${basePoint.go_id} (Ref: ${basePoint.bmdResultRef}): ` +
          `baseSize=${baseFinalSize}, finalSize=${finalSize}, ` +
          `baseColor=${baseFinalColor}, finalColor=${baseFinalColor}, ` +
          `baseShape=${baseFinalShape}, finalShape=${baseFinalShape}, ` + // Log determined shape
          `opacity=${finalOpacity}`
        );
        // -------------------

        // Create Point
        pointsOutput++;
        const styledPoint: UmapAnalysisDataPoint = {
          ...basePoint,
          UMAP_1: refDataItem.UMAP_1,
          UMAP_2: refDataItem.UMAP_2,
          cluster_id: refDataItem.cluster_id,
          finalColor: baseFinalColor,
          finalShape: baseFinalShape, // Assign determined shape
          finalSize: finalSize,
          finalOpacity: finalOpacity,
          colorLabel,
          shapeLabel, // Assign determined label
          sizeLabel,
        };
        return styledPoint;
      })
      .filter((p): p is UmapAnalysisDataPoint => p !== null);

    if (styledPoints.length > 0) {
      styledGroupedData.set(refStringKey, styledPoints);
    }
  }); // End baseGroupedData.forEach

  // --- Final Summary Logging ---
  if (pointsSkippedMissingRef > 0) {
    console.warn(
      `${styleLogPrefix} Total points skipped due to missing reference data: ${pointsSkippedMissingRef} out of ${pointsProcessed}`
    );
    if (failedKeysSample.size > 0) {
      console.warn(
        `${styleLogPrefix} Sample of missing keys (normalized, uppercase):`,
        Array.from(failedKeysSample)
      );
    }
  }
  console.log(
    `${styleLogPrefix} Finished styling. Output Points: ${pointsOutput}. Result map size: ${styledGroupedData.size}`
  );

  return styledGroupedData;
}
