/**
 * src/utils/styleUtils.ts
 *
 * Utilities for applying dynamic styling (color, shape, size, opacity)
 * to prepared analysis data points based on UI settings and interactions.
 */

import { HighlightMode } from '../store/slices/analysisUISlice' // Adjust path if needed
import type {
  BaseCategoryAnalysisDataPoint,
  UmapAnalysisDataPoint,
} from '../models/ApplicationModelCompositional' // Adjust path if needed
import {
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DEFAULT_MARKER_SIZE,
  DIRECTION_COLOR_MAP,
  DIRECTION_SHAPE_MAP,
  PERCENTAGE_BINS,
  PERCENTAGE_SIZES,
  SIZE_BIN_LABELS, // Ensure defined/exported from legendUtils
  getDirectionLegendName,
  DEFAULT_SHAPE_LABEL,
  DEFAULT_SIZE_LABEL,
} from './legendUtils' // Adjust path if needed
import type { ReferenceUmapItem } from '../data/referenceUmapData' // Adjust path if needed

// Define input/output Map types
type BaseGroupedData = Map<string, BaseCategoryAnalysisDataPoint[]> // Key is string ref
type StyledUmapGroupedData = Map<string, UmapAnalysisDataPoint[]> // Key is string ref

// Constants for Opacity
const VISIBLE_OPACITY = 0.9
const HIDDEN_OPACITY = 0.0
const DIM_OPACITY = 0.4

// --- Helper Functions (Keep as is) ---
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
  // *** CORRECTED TYPE HINT ***
  clusterColorMap: Map<string, string> | null,
  // ***************************
  bmdRefShapeMap: Map<number, string> | null,
  rankRange?: [number, number] | null
): StyledUmapGroupedData | null {

  // *** ADDED LOGS ***
  console.log('[calculateOverlayStyles] Received stylingOptions:', stylingOptions);
  console.log('[calculateOverlayStyles] Received clusterColorMap size:', clusterColorMap?.size ?? 'null');
  // ****************

  // --- DIAGNOSTIC LOGGING ---
  if (baseGroupedData && referenceMap && baseGroupedData.size > 0) {
    console.groupCollapsed('[StyleUtils Diagnostics] GO ID Matching Check')
    try {
      const firstGroupKey = baseGroupedData.keys().next().value
      const sampleAnalysisPoints = firstGroupKey
        ? baseGroupedData.get(firstGroupKey)?.slice(0, 5) || []
        : []
      const sampleAnalysisGoIds = sampleAnalysisPoints.map((pt) => pt.go_id)
      console.log(
        `Sample analysis GO IDs (from ref ${firstGroupKey}):`,
        sampleAnalysisGoIds
      )
      const sampleRefKeys = Array.from(referenceMap.keys()).slice(0, 5)
      console.log('Sample referenceMap keys:', sampleRefKeys)
      sampleAnalysisGoIds.forEach((goId) => {
        const normalizedKey = (goId ?? '').trim().toUpperCase()
        const exists = referenceMap.has(normalizedKey)
        console.log(
          `  Check: Analysis GO ID '${goId}' (Normalized: '${normalizedKey}') exists in refMap? ${exists}`
        )
      })
    } catch (e) {
      console.error('Error during diagnostic logging:', e)
    } finally {
      console.groupEnd()
    }
  }
  // --- END DIAGNOSTIC LOGGING ---

  // Initial Guard Clauses
  if (!baseGroupedData || baseGroupedData.size === 0 || !referenceMap) {
    console.warn(
      '[calculateOverlayStyles v2] Skipping: Missing or empty baseGroupedData or missing referenceMap.'
    )
    return null
  }

  // Ensure hidden labels are Sets
  const hiddenColorSet =
    hiddenColorLabels instanceof Set
      ? hiddenColorLabels
      : new Set(hiddenColorLabels)
  const hiddenShapeSet =
    hiddenShapeLabels instanceof Set
      ? hiddenShapeLabels
      : new Set(hiddenShapeLabels)
  const hiddenSizeSet =
    hiddenSizeLabels instanceof Set
      ? hiddenSizeLabels
      : new Set(hiddenSizeLabels)

  const styledGroupedData = new Map<string, UmapAnalysisDataPoint[]>()
  let pointsProcessed = 0
  let pointsSkippedMissingRef = 0
  let pointsOutput = 0
  const failedKeysSample = new Set<string>()

  console.log(
    `[calculateOverlayStyles v2] Starting styling calculation for ${baseGroupedData.size} analysis groups...`
  )

  // Pre-calculation for highlighting
  const exactMatchGoIds = new Set(
    goIdFilterList.map((id) => (id ?? '').toUpperCase())
  )
  const clusterMatchClusterIds = new Set<string | number>()
  if (highlightMode === HighlightMode.CLUSTER && exactMatchGoIds.size > 0) {
    baseGroupedData.forEach((points) => {
      points.forEach((point) => {
        const goIdUpper = (point.go_id ?? '').toUpperCase()
        if (exactMatchGoIds.has(goIdUpper)) {
          const lookupKey = (point.go_id ?? '').trim().toUpperCase()
          const refData = lookupKey ? referenceMap.get(lookupKey) : undefined
          if (refData?.cluster_id != null) {
            clusterMatchClusterIds.add(refData.cluster_id)
          }
        }
      })
    })
    console.log(
      `[calculateOverlayStyles v2] Cluster highlight mode: Found ${clusterMatchClusterIds.size} clusters containing target GO IDs.`
    )
  }

  // Main Styling Loop
  baseGroupedData.forEach((basePoints, refStringKey) => {
    const styledPoints = basePoints
      .map((basePoint) => {
        pointsProcessed++

        const goIdSource = basePoint.go_id
        const lookupKey =
          typeof goIdSource === 'string'
            ? goIdSource.trim().toUpperCase()
            : null

        const refDataItem = lookupKey ? referenceMap.get(lookupKey) : undefined

        if (!refDataItem) {
          pointsSkippedMissingRef++
          if (lookupKey && failedKeysSample.size < 20) {
            if (!failedKeysSample.has(lookupKey)) {
              failedKeysSample.add(lookupKey)
            }
          }
          return null
        }

        // Determine Base Styles
        const { colorBy, shapeBy, sizeBy } = stylingOptions
        const experimentNameForLabel =
          bmdRefToExperimentNameMap?.get(basePoint.bmdResultRef) ||
          basePoint.bmdResultName
        let baseFinalColor = DEFAULT_MARKER_COLOR,
          colorLabel = experimentNameForLabel
        switch (colorBy) {
          case 'cluster_id':
            const clusterIdValue = refDataItem.cluster_id; // Can be number or string
            // *** FIX: Ensure lookup key is a STRING ***
            const clusterIdString = String(clusterIdValue);
            // ****************************************
            baseFinalColor =
              clusterIdValue != null // Check original value for existence
                // *** FIX: Use string key for lookup ***
                ? clusterColorMap?.get(clusterIdString) || DEFAULT_MARKER_COLOR
                // ************************************
                : DEFAULT_MARKER_COLOR;
            colorLabel =
              clusterIdValue != null ? `Cluster ${clusterIdValue}` : 'Unknown Cluster';
            break;
          case 'direction':
            baseFinalColor = getDirectionColor(basePoint.direction)
            colorLabel = getDirectionLegendName(
              getDirectionShape(basePoint.direction)
            )
            break;
          // default: // Keep defaults
        }

        let baseFinalShape = DEFAULT_MARKER_SHAPE,
          shapeLabel = DEFAULT_SHAPE_LABEL
        switch (shapeBy) {
          case 'direction':
            baseFinalShape = getDirectionShape(basePoint.direction)
            shapeLabel = getDirectionLegendName(baseFinalShape)
            break
          case 'bmdResultName':
            baseFinalShape =
              bmdRefShapeMap?.get(basePoint.bmdResultRef) ||
              DEFAULT_MARKER_SHAPE
            shapeLabel = experimentNameForLabel
            break;
          // default: // Keep defaults
        }

        let baseFinalSize = DEFAULT_MARKER_SIZE,
          sizeLabel = DEFAULT_SIZE_LABEL
        switch (sizeBy) {
          case 'percentage':
            baseFinalSize = getBinnedSize(basePoint.percentage)
            try {
              sizeLabel =
                SIZE_BIN_LABELS && SIZE_BIN_LABELS[baseFinalSize]
                  ? SIZE_BIN_LABELS[baseFinalSize]
                  : DEFAULT_SIZE_LABEL
            } catch (e) {
              sizeLabel = DEFAULT_SIZE_LABEL
            }
            break;
          // default: // Keep defaults
        }

        // Check Legend Toggles
        const isHiddenByLegend =
          hiddenColorSet.has(colorLabel) ||
          hiddenShapeSet.has(shapeLabel) ||
          hiddenSizeSet.has(sizeLabel)

        // Apply Highlighting & Final Opacity/Size
        let finalSize = baseFinalSize
        let finalOpacity = isHiddenByLegend ? HIDDEN_OPACITY : VISIBLE_OPACITY
        const currentGoIdUpper = lookupKey
        const isExactMatch =
          currentGoIdUpper && exactMatchGoIds.has(currentGoIdUpper)
        const clusterIdForHighlight = refDataItem.cluster_id
        const isInHighlightCluster =
          highlightMode === HighlightMode.CLUSTER &&
          clusterIdForHighlight != null &&
          clusterMatchClusterIds.has(clusterIdForHighlight)
        const isSelectedFromAccumulation =
          currentGoIdUpper &&
          selectedGoIdsFromAccumulation.has(currentGoIdUpper)

        if (!isHiddenByLegend) {
          if (isSelectedFromAccumulation) {
            finalSize = baseFinalSize * 1.5
            finalOpacity = 1.0
          } else if (
            highlightMode !== HighlightMode.NONE &&
            exactMatchGoIds.size > 0
          ) {
            if (highlightMode === HighlightMode.SELECTED) {
              if (!isExactMatch) finalOpacity = HIDDEN_OPACITY
            } else if (highlightMode === HighlightMode.CLUSTER) {
              if (isExactMatch) {
                finalSize = baseFinalSize * 1.2
                finalOpacity = VISIBLE_OPACITY
              } else if (isInHighlightCluster) {
                finalSize = Math.max(1, baseFinalSize * 0.8)
                finalOpacity = DIM_OPACITY
              } else {
                finalOpacity = HIDDEN_OPACITY
              }
            }
          }
        } else {
          finalOpacity = HIDDEN_OPACITY
        }

        // Final check before returning point
        if (finalOpacity === HIDDEN_OPACITY) {
          return null
        }

        // *** ADDED LOG before creating styledPoint ***
        console.log(`[calculateOverlayStyles] Point ${basePoint.go_id}: baseSize=${baseFinalSize}, finalSize=${finalSize}, baseColor=${baseFinalColor}, finalColor=${baseFinalColor}, opacity=${finalOpacity}`);
        // ********************************************

        // Create Point (Type UmapAnalysisDataPoint)
        pointsOutput++
        const styledPoint: UmapAnalysisDataPoint = {
          ...basePoint,
          UMAP_1: refDataItem.UMAP_1,
          UMAP_2: refDataItem.UMAP_2,
          cluster_id: refDataItem.cluster_id,
          finalColor: baseFinalColor,
          finalShape: baseFinalShape,
          finalSize: finalSize,
          finalOpacity: finalOpacity,
          colorLabel,
          shapeLabel,
          sizeLabel,
        }
        return styledPoint
      })
      .filter((p): p is UmapAnalysisDataPoint => p !== null)

    if (styledPoints.length > 0) {
      styledGroupedData.set(refStringKey, styledPoints)
    }
  }) // End baseGroupedData.forEach

  // Final Summary Logging
  if (pointsSkippedMissingRef > 0) {
    console.warn(
      `[StyleUtils v2] Total points skipped due to missing reference data: ${pointsSkippedMissingRef} out of ${pointsProcessed}`
    )
    if (failedKeysSample.size > 0) {
      console.warn(
        `[StyleUtils v2] Sample of missing keys (normalized, uppercase):`,
        Array.from(failedKeysSample)
      )
    }
  }
  console.log(
    `[calculateOverlayStyles v2] Finished styling. Output Points: ${pointsOutput}. Result map size: ${styledGroupedData.size}`
  )

  return styledGroupedData
}
