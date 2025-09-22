// src/utils/styleUtils.ts

import { HighlightMode } from '../store/slices/analysisUISlice';
import type {
  BaseCategoryAnalysisDataPoint,
  UmapAnalysisDataPoint,
} from '../models/applicationModel';
import {
  // No longer importing DEFAULT_MARKER_SIZE from here
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DIRECTION_COLOR_MAP,
  DIRECTION_SHAPE_MAP,
  PERCENTAGE_BINS,
  PERCENTAGE_SIZES,
  SIZE_BIN_LABELS,
  getDirectionLegendName,
  DEFAULT_SHAPE_LABEL,
  DEFAULT_SIZE_LABEL,
  UNCLUSTERED_COLOR,
} from './legendUtils';
// --- Import the base marker size constant ---
import { BASE_MARKER_SIZE_PX } from '../config/analysisConstants';
// -------------------------------------------
import type { ReferenceUmapItem } from '../data/referenceUmapData';

type StyledUmapGroupedData = Map<string, UmapAnalysisDataPoint[]>;

// Opacity and Highlight constants
export const VISIBLE_OPACITY = 0.9;
export const HIDDEN_OPACITY = 0.0;
export const DIM_OPACITY = 0.4;
export const HIGHLIGHT_OPACITY = 1.0;
export const HIGHLIGHT_SIZE_MULTIPLIER = 1.5;

// Helper function to get binned size
function getBinnedSize(percentage: number | null | undefined): number {
  const defaultBinnedSize = PERCENTAGE_SIZES[0] ?? BASE_MARKER_SIZE_PX;
  if (percentage == null || isNaN(percentage)) return defaultBinnedSize;
  for (let i = 0; i < PERCENTAGE_BINS.length; i++) {
    if (percentage <= PERCENTAGE_BINS[i]) {
      return PERCENTAGE_SIZES[i];
    }
  }
  return PERCENTAGE_SIZES[PERCENTAGE_SIZES.length - 1] ?? defaultBinnedSize;
}

// Helper function for direction shape
function getDirectionShape(direction: string | null | undefined): string {
  const key = direction?.toLowerCase() ?? 'none';
  return DIRECTION_SHAPE_MAP[key] || DEFAULT_MARKER_SHAPE;
}

// Helper function for direction color
function getDirectionColor(direction: string | null | undefined): string {
  const key = direction?.toLowerCase() ?? 'none';
  return DIRECTION_COLOR_MAP[key] || DEFAULT_MARKER_COLOR;
}

// Main Styling Function
export function calculateOverlayStyles(
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
  committedRankWindow: [number, number]
): StyledUmapGroupedData | null {

  const styleLogPrefix = '[StyleUtils v20 - Base Marker Size]';
  console.log(`${styleLogPrefix} Function called. highlightMode: "${highlightMode}", goIdFilterList size: ${goIdFilterList?.length}`);

  if (!rankedBaseGroupedData || rankedBaseGroupedData.size === 0 || !referenceMap) {
    console.warn(`${styleLogPrefix} Prerequisites not met. rankedBaseGroupedData: ${!!rankedBaseGroupedData}, referenceMap: ${!!referenceMap}`);
    return null;
  }

  const hiddenColorSet = hiddenColorLabels;
  const hiddenShapeSet = hiddenShapeLabels;
  const hiddenSizeSet = hiddenSizeLabels;
  const [startRank, endRank] = committedRankWindow;
  const isRankFilterActive = isFinite(startRank) && isFinite(endRank) && startRank <= endRank && startRank >= 1;

  console.log(`${styleLogPrefix} RANK FILTER DEBUG: startRank=${startRank}, endRank=${endRank}, isRankFilterActive=${isRankFilterActive}`);

  const styledGroupedData = new Map<string, UmapAnalysisDataPoint[]>();
  let pointsSkippedMissingRef = 0;
  let pointsProcessed = 0;
  const failedKeysSample = new Set<string>();
  const exactMatchGoIds = new Set((goIdFilterList || []).map((id) => (id ?? '').toUpperCase()));

  const clusterMatchClusterIds = new Set<string | number>();
  // Populate clusterMatchClusterIds if mode is CLUSTER and exact IDs exist
  if (highlightMode === HighlightMode.CLUSTER && exactMatchGoIds.size > 0) {
    exactMatchGoIds.forEach((goId) => {
      const refItem = referenceMap.get(goId);
      // Add the string representation of the cluster ID
      if (refItem?.cluster_id != null) {
        clusterMatchClusterIds.add(String(refItem.cluster_id));
      }
    });
    console.log(`${styleLogPrefix} Cluster highlight mode active. Matching cluster IDs:`, Array.from(clusterMatchClusterIds));
  }

  rankedBaseGroupedData.forEach((basePoints, refStringKey) => {
    const styledPoints = basePoints
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map((basePoint, _index) => {
        pointsProcessed++;
        const goIdSource = basePoint.go_id;
        const lookupKey = typeof goIdSource === 'string' ? goIdSource.trim().toUpperCase() : null;
        const refDataItem = lookupKey ? referenceMap.get(lookupKey) : undefined;

        if (!refDataItem) {
          pointsSkippedMissingRef++;
          if (lookupKey && failedKeysSample.size < 20) failedKeysSample.add(lookupKey);
          return null; // Skip point if no reference data found
        }

        const currentRank = basePoint.rank;
        const isOutsideRankRange = isRankFilterActive && (currentRank == null || currentRank < startRank || currentRank > endRank);

        // Debug rank filtering (only log first 10 points to avoid spam)
        if (pointsProcessed < 10) {
          console.log(`${styleLogPrefix} Point ${pointsProcessed}: rank=${currentRank}, isOutsideRankRange=${isOutsideRankRange}, goId=${lookupKey}`);
        }
        const { colorBy, shapeBy, sizeBy } = stylingOptions;
        const experimentNameForLabel = bmdRefToExperimentNameMap?.get(basePoint.bmdResultRef) || basePoint.bmdResultName || `Analysis ${basePoint.bmdResultRef}`;
        const numericBmdRef = basePoint.bmdResultRef;

        // --- Color Logic ---
        let baseFinalColor = DEFAULT_MARKER_COLOR;
        let colorLabel = experimentNameForLabel;
        switch (colorBy) {
          case 'cluster_id': {
            const clusterId = refDataItem.cluster_id;
            const clusterIdStr = String(clusterId); // Use string for consistency
            if (clusterId === -1 || clusterIdStr === '-1') {
              baseFinalColor = UNCLUSTERED_COLOR;
              colorLabel = `Unclustered`;
            } else if (clusterId != null) {
              const lookedUpColor = clusterColorMap.get(clusterIdStr);
              baseFinalColor = lookedUpColor || DEFAULT_MARKER_COLOR; // Fallback color
              colorLabel = `Cluster ${clusterIdStr}`;
            } else {
              baseFinalColor = DEFAULT_MARKER_COLOR; // Fallback for null/undefined cluster_id
              colorLabel = `Unknown Cluster`;
            }
            break;
          }
          case 'direction':
            baseFinalColor = getDirectionColor(basePoint.direction);
            // Derive label from shape for consistency with legend logic
            colorLabel = getDirectionLegendName(getDirectionShape(basePoint.direction));
            break;
          case 'bmdResultName':
            baseFinalColor = bmdRefColorMap.get(numericBmdRef) || DEFAULT_MARKER_COLOR;
            colorLabel = experimentNameForLabel;
            break;
          default:
            // Default color already set
            break;
        }

        // --- Shape Logic ---
        let baseFinalShape = DEFAULT_MARKER_SHAPE;
        let shapeLabel = DEFAULT_SHAPE_LABEL;
        switch (shapeBy) {
          case 'bmdResultName':
            baseFinalShape = bmdRefShapeMap.get(numericBmdRef) || DEFAULT_MARKER_SHAPE;
            shapeLabel = experimentNameForLabel;
            break;
          case 'direction':
            baseFinalShape = getDirectionShape(basePoint.direction);
            shapeLabel = getDirectionLegendName(baseFinalShape);
            break;
          case 'none':
          default:
            // Defaults already set
            break;
        }

        // --- Size Logic ---
        let baseFinalSize: number;
        let sizeLabel = DEFAULT_SIZE_LABEL;
        switch (sizeBy) {
          case 'percentage':
            baseFinalSize = getBinnedSize(basePoint.percentage);
            sizeLabel = SIZE_BIN_LABELS[baseFinalSize] || `${baseFinalSize.toFixed(0)} px`;
            break;
          case 'none':
          default:
            baseFinalSize = BASE_MARKER_SIZE_PX; // Use constant
            sizeLabel = DEFAULT_SIZE_LABEL;
            break;
        }

        // --- Visibility & Highlighting Logic ---
        const isHiddenByLegend = hiddenColorSet.has(colorLabel) || hiddenShapeSet.has(shapeLabel) || hiddenSizeSet.has(sizeLabel);
        let finalSize = baseFinalSize;
        let finalOpacity = VISIBLE_OPACITY; // Start assuming visible

        if (isOutsideRankRange || isHiddenByLegend) {
          finalOpacity = HIDDEN_OPACITY; // Hide if outside rank or hidden by legend
        } else {
          // Check highlighting rules only if potentially visible
          const currentGoIdUpper = lookupKey;
          const isExactMatch = !!currentGoIdUpper && exactMatchGoIds.has(currentGoIdUpper);
          const clusterIdForHighlight = refDataItem.cluster_id;
          // Ensure consistent string comparison for cluster ID
          const clusterIdStrForHighlight = clusterIdForHighlight != null ? String(clusterIdForHighlight) : null;
          const isInHighlightCluster = highlightMode === HighlightMode.CLUSTER && clusterIdStrForHighlight !== null && clusterMatchClusterIds.has(clusterIdStrForHighlight);
          const isSelectedFromAccumulation = !!currentGoIdUpper && selectedGoIdsFromAccumulation.has(currentGoIdUpper);

          // Accumulation plot selection overrides other highlights
          if (isSelectedFromAccumulation) {
            finalSize = baseFinalSize * HIGHLIGHT_SIZE_MULTIPLIER;
            finalOpacity = HIGHLIGHT_OPACITY;
          } else if (highlightMode !== HighlightMode.NONE && exactMatchGoIds.size > 0) {
            // Apply GO ID filter highlights if active and no accumulation selection
            if (highlightMode === HighlightMode.SELECTED) {
              if (isExactMatch) {
                finalSize = baseFinalSize * HIGHLIGHT_SIZE_MULTIPLIER;
                finalOpacity = HIGHLIGHT_OPACITY;
              } else {
                finalOpacity = HIDDEN_OPACITY; // Hide non-exact matches
              }
            } else if (highlightMode === HighlightMode.CLUSTER) {
              if (isExactMatch) {
                finalSize = baseFinalSize * 1.2; // Slightly larger exact match
                finalOpacity = VISIBLE_OPACITY; // Ensure visible
              } else if (isInHighlightCluster) {
                finalSize = Math.max(1, baseFinalSize * 0.8); // Smaller neighbors
                finalOpacity = DIM_OPACITY; // Dim neighbors
              } else {
                finalOpacity = HIDDEN_OPACITY; // Hide others not in cluster
              }
            }
          }
          // If no highlight rule applied, opacity remains VISIBLE_OPACITY
        }

        // --- Create final point object ---
        const styledPoint: UmapAnalysisDataPoint = {
          ...basePoint, // Spread original data
          UMAP_1: refDataItem.UMAP_1, // Add UMAP coordinates
          UMAP_2: refDataItem.UMAP_2,
          cluster_id: refDataItem.cluster_id, // Add cluster ID
          // Add calculated styles
          finalColor: baseFinalColor,
          finalShape: baseFinalShape,
          finalSize: finalSize,
          finalOpacity: finalOpacity,
          // Add labels used for legend/filtering
          colorLabel,
          shapeLabel,
          sizeLabel,
        };
        return styledPoint;
      })
      .filter((p): p is UmapAnalysisDataPoint => p !== null); // Filter out nulls from skipped points

    // Store the processed points for this group
    if (styledPoints.length > 0) {
      styledGroupedData.set(refStringKey, styledPoints);
    }
  });

  // Log if points were skipped
  if (pointsSkippedMissingRef > 0) {
    console.warn(`${styleLogPrefix} Skipped ${pointsSkippedMissingRef} points due to missing reference data. Sample failed keys:`, Array.from(failedKeysSample));
  }

  // Count visible vs hidden points
  let totalVisiblePoints = 0;
  let totalHiddenPoints = 0;
  styledGroupedData.forEach(points => {
    points.forEach(point => {
      if (point.finalOpacity === 0.0) {
        totalHiddenPoints++;
      } else {
        totalVisiblePoints++;
      }
    });
  });

  console.log(`${styleLogPrefix} RANK FILTER SUMMARY: Processed ${pointsProcessed} points, Visible: ${totalVisiblePoints}, Hidden: ${totalHiddenPoints}`);

  return styledGroupedData;
}