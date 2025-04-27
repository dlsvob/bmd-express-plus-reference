/**
 * src/utils/styleUtils.ts
 *
 * Utilities for applying dynamic styling (color, shape, size, opacity)
 * to prepared analysis data points based on UI settings and interactions.
 */

import { HighlightMode } from '../store/slices/analysisUISlice'; // Adjust path if needed
import type {
  BaseCategoryAnalysisDataPoint, // Now includes rank? : number | null
  UmapAnalysisDataPoint,
} from '../models/applicationModel'; // Adjust path if needed
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
  UNCLUSTERED_COLOR,
} from './legendUtils'; // Adjust path if needed
import type { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path if needed

// Define input/output Map types
type BaseGroupedData = Map<string, BaseCategoryAnalysisDataPoint[]>;
type StyledUmapGroupedData = Map<string, UmapAnalysisDataPoint[]>;

export const VISIBLE_OPACITY = 0.9;
export const HIDDEN_OPACITY = 0.0;
export const DIM_OPACITY = 0.4;

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
  return DIRECTION_SHAPE_MAP[key] || DEFAULT_MARKER_SHAPE;
}
function getDirectionColor(direction: string | null | undefined): string {
  const key = direction?.toLowerCase() ?? 'none';
  return DIRECTION_COLOR_MAP[key] || DEFAULT_MARKER_COLOR;
}
// ------------------------------------

// --- Main Styling Function (Updated for rank property) ---
export function calculateOverlayStyles(
  // Expects data points to potentially have the 'rank' property calculated
  rankedBaseGroupedData: Map<string, BaseCategoryAnalysisDataPoint[]> | null,
  stylingOptions: { colorBy: string; shapeBy: string; sizeBy: string },
  hiddenColorLabels: Set<string>,
  hiddenShapeLabels: Set<string>,
  hiddenSizeLabels: Set<string>,
  goIdFilterList: string[],
  highlightMode: HighlightMode,
  bmdRefToExperimentNameMap: Map<number, string> | null,
  selectedGoIdsFromAccumulation: Set<string>,
  referenceMap: Map<string, ReferenceUmapItem> | null,
  clusterColorMap: Map<string | number, string>,
  bmdRefShapeMap: Map<number, string>,
  bmdRefColorMap: Map<number, string>,
  committedRankWindow: [number, number] // This is [start_rank, end_rank]
): StyledUmapGroupedData | null {
  const styleLogPrefix = '[StyleUtils v15 - Rank Property Filter]'; // Version Bump

  if (!rankedBaseGroupedData || rankedBaseGroupedData.size === 0 || !referenceMap) {
    return null;
  }

  const hiddenColorSet = hiddenColorLabels;
  const hiddenShapeSet = hiddenShapeLabels;
  const hiddenSizeSet = hiddenSizeLabels;

  // --- Destructure committed rank window ---
  const [startRank, endRank] = committedRankWindow;
  // Check if the range is valid (min <= max and both are finite, start >= 1)
  const isRankFilterActive = isFinite(startRank) && isFinite(endRank) && startRank <= endRank && startRank >= 1;
  // ----------------------------------------

  const styledGroupedData = new Map<string, UmapAnalysisDataPoint[]>();
  let pointsProcessed = 0;
  let pointsSkippedMissingRef = 0;
  let pointsSkippedByRank = 0;
  let pointsOutput = 0;
  const failedKeysSample = new Set<string>();

  const exactMatchGoIds = new Set(
    goIdFilterList.map((id) => (id ?? '').toUpperCase())
  );
  const clusterMatchClusterIds = new Set<string | number>();
  if (highlightMode === HighlightMode.CLUSTER && exactMatchGoIds.size > 0) {
    exactMatchGoIds.forEach((goId) => {
      const refItem = referenceMap.get(goId);
      if (refItem?.cluster_id != null) {
        clusterMatchClusterIds.add(String(refItem.cluster_id));
      }
    });
  }

  rankedBaseGroupedData.forEach((basePoints, refStringKey) => {
    const styledPoints = basePoints
      .map((basePoint) => {
        pointsProcessed++;
        const goIdSource = basePoint.go_id;
        const lookupKey =
          typeof goIdSource === 'string'
            ? goIdSource.trim().toUpperCase()
            : null;
        const refDataItem = lookupKey ? referenceMap.get(lookupKey) : undefined;

        if (!refDataItem) {
          pointsSkippedMissingRef++;
          if (lookupKey && failedKeysSample.size < 20)
            failedKeysSample.add(lookupKey);
          return null;
        }

        // --- Rank Filtering based on point.rank ---
        const currentRank = basePoint.rank; // Use the pre-calculated rank
        const isOutsideRankRange = isRankFilterActive && (
          currentRank == null || // Treat null/undefined rank as outside
          currentRank < startRank ||
          currentRank > endRank
        );

        if (isOutsideRankRange) {
          pointsSkippedByRank++;
        }
        // ------------------------------------------

        const { colorBy, shapeBy, sizeBy } = stylingOptions;
        const experimentNameForLabel =
          bmdRefToExperimentNameMap?.get(basePoint.bmdResultRef) ||
          basePoint.bmdResultName;
        const numericBmdRef = basePoint.bmdResultRef;

        // --- Color Calculation ---
        let baseFinalColor = DEFAULT_MARKER_COLOR;
        let colorLabel = experimentNameForLabel;
        switch (colorBy) {
          case 'cluster_id':
            const clusterId = refDataItem.cluster_id;
            if (clusterId === -1 || clusterId === '-1') {
              baseFinalColor = UNCLUSTERED_COLOR;
              colorLabel = `Unclustered`;
            } else if (clusterId != null) {
              const clusterIdKey = String(clusterId);
              const lookedUpColor = clusterColorMap.get(clusterIdKey);
              baseFinalColor = lookedUpColor || DEFAULT_MARKER_COLOR;
              colorLabel = `Cluster ${clusterId}`;
            } else {
              baseFinalColor = DEFAULT_MARKER_COLOR;
              colorLabel = `Unknown Cluster`;
            }
            break;
          case 'direction':
            baseFinalColor = getDirectionColor(basePoint.direction);
            colorLabel = getDirectionLegendName(
              getDirectionShape(basePoint.direction)
            );
            break;
          case 'bmdResultName':
            baseFinalColor = bmdRefColorMap.get(numericBmdRef) || DEFAULT_MARKER_COLOR;
            colorLabel = experimentNameForLabel;
            break;
          default:
            baseFinalColor = DEFAULT_MARKER_COLOR;
            colorLabel = experimentNameForLabel;
            break;
        }

        // --- Shape Calculation ---
        let baseFinalShape = DEFAULT_MARKER_SHAPE;
        let shapeLabel = DEFAULT_SHAPE_LABEL;
        switch (shapeBy) {
          case 'bmdResultName':
            baseFinalShape =
              bmdRefShapeMap.get(numericBmdRef) || DEFAULT_MARKER_SHAPE;
            shapeLabel = experimentNameForLabel;
            break;
          case 'direction':
            baseFinalShape = getDirectionShape(basePoint.direction);
            shapeLabel = getDirectionLegendName(baseFinalShape);
            break;
          case 'none':
          default:
            baseFinalShape = DEFAULT_MARKER_SHAPE;
            shapeLabel = DEFAULT_SHAPE_LABEL;
            break;
        }

        // --- Size Calculation ---
        let baseFinalSize = DEFAULT_MARKER_SIZE;
        let sizeLabel = DEFAULT_SIZE_LABEL;
        switch (sizeBy) {
          case 'percentage':
            baseFinalSize = getBinnedSize(basePoint.percentage);
            sizeLabel =
              SIZE_BIN_LABELS[baseFinalSize] || `${baseFinalSize} px`;
            break;
          case 'none':
          default:
            baseFinalSize = DEFAULT_MARKER_SIZE;
            sizeLabel = DEFAULT_SIZE_LABEL;
            break;
        }

        // --- Opacity/Highlighting (Uses isOutsideRankRange) ---
        const isHiddenByLegend =
          hiddenColorSet.has(colorLabel) ||
          hiddenShapeSet.has(shapeLabel) ||
          hiddenSizeSet.has(sizeLabel);

        let finalSize = baseFinalSize;
        let finalOpacity = VISIBLE_OPACITY; // Start assuming visible

        // Apply filters sequentially: Rank -> Legend -> Highlighting
        if (isOutsideRankRange) {
          finalOpacity = HIDDEN_OPACITY; // Hide if outside rank range
        } else if (isHiddenByLegend) {
          finalOpacity = HIDDEN_OPACITY; // Hide if toggled off in legend
        } else {
          // Only apply highlighting logic if the point is potentially visible
          const currentGoIdUpper = lookupKey;
          const isExactMatch =
            currentGoIdUpper && exactMatchGoIds.has(currentGoIdUpper);
          const clusterIdForHighlight = refDataItem.cluster_id;
          const isInHighlightCluster =
            highlightMode === HighlightMode.CLUSTER &&
            clusterIdForHighlight != null &&
            clusterMatchClusterIds.has(String(clusterIdForHighlight));
          const isSelectedFromAccumulation =
            currentGoIdUpper &&
            selectedGoIdsFromAccumulation.has(currentGoIdUpper);

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
          // If no highlighting applies, finalOpacity remains VISIBLE_OPACITY
        }
        // --- End Opacity Logic ---

        pointsOutput++;
        const styledPoint: UmapAnalysisDataPoint = {
          ...basePoint,
          UMAP_1: refDataItem.UMAP_1,
          UMAP_2: refDataItem.UMAP_2,
          cluster_id: refDataItem.cluster_id,
          finalColor: baseFinalColor,
          finalShape: baseFinalShape,
          finalSize: finalSize,
          finalOpacity: finalOpacity, // Use the calculated finalOpacity
          colorLabel,
          shapeLabel,
          sizeLabel,
          // rank property is already on basePoint if added correctly
        };
        return styledPoint;
      })
      .filter((p): p is UmapAnalysisDataPoint => p !== null);

    styledGroupedData.set(refStringKey, styledPoints);
  });

  if (pointsSkippedMissingRef > 0) {
    console.warn(`${styleLogPrefix} Skipped ${pointsSkippedMissingRef} points due to missing reference data. Sample failed keys:`, Array.from(failedKeysSample));
  }
  // if (pointsSkippedByRank > 0) { // Keep logs minimal
  //   console.log(`${styleLogPrefix} Skipped ${pointsSkippedByRank} points due to rank filter [${startRank}-${endRank}].`);
  // }
  // console.log(`${styleLogPrefix} Processed ${pointsProcessed} points, output ${pointsOutput} styled points.`); // Keep logs minimal

  return styledGroupedData;
}
