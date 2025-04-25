// src/hooks/usePreparedPlotData.ts

import { useMemo } from 'react'
import {
  UmapAnalysisDataValue,
  BaseCategoryAnalysisDataPoint,
} from '../models/ApplicationModelCompositional'
import { HighlightMode } from '../store/slices/analysisUISlice'
import { prepareGroupedOverlayData } from '../utils/analysisUtils'
import { calculateOverlayStyles } from '../utils/styleUtils'
import { generateHaltonColors } from '../utils/colorUtils'
import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported'

const UNKNOWN_CLUSTER_COLOR = '#cccccc'

export interface UsePreparedPlotDataArgs {
  selectedBmdResultRefs: string[]
  isLoadingDetails: boolean
  detailsError: Error | null
  referenceDataMap: Map<string, any> | null
  referenceData: any[] | null
  colorByOption: string
  shapeByOption: string
  sizeByOption: string
  hiddenColorLabels: Set<string>
  hiddenShapeLabels: Set<string>
  hiddenSizeLabels: Set<string>
  goIdFilterList: string[]
  highlightMode: HighlightMode
  selectedGoIdsSet: Set<string>
  committedRankSliderValue: [number, number]
  bmdResultMap: Map<number, BMDResult>
  /**
   * BRAND-NEW: the single Map your component builds
   */
  categoryItemsMap: Map<string, CategoryAnalysisItem[]>
}

export interface UsePreparedPlotDataReturn {
  analysisPoints: UmapAnalysisDataValue[] | null
  styledGroupedData: Map<string, UmapAnalysisDataValue[]> | null
}

export const usePreparedPlotData = ({
  selectedBmdResultRefs,
  isLoadingDetails,
  detailsError,
  referenceDataMap,
  referenceData,
  colorByOption,
  shapeByOption,
  sizeByOption,
  hiddenColorLabels,
  hiddenShapeLabels,
  hiddenSizeLabels,
  goIdFilterList,
  highlightMode,
  selectedGoIdsSet,
  committedRankSliderValue,
  bmdResultMap,
  categoryItemsMap,
}: UsePreparedPlotDataArgs): UsePreparedPlotDataReturn => {
  // 1) only proceed when data is loaded and both Maps exist
  const canProceed = useMemo(
    () =>
      !isLoadingDetails &&
      !detailsError &&
      selectedBmdResultRefs.length > 0 &&
      bmdResultMap.size > 0 &&
      categoryItemsMap.size > 0,
    [
      isLoadingDetails,
      detailsError,
      selectedBmdResultRefs,
      bmdResultMap,
      categoryItemsMap,
    ]
  )

  // 2) group raw items by ref → BaseCategoryAnalysisDataPoint[]
  const baseGroupedData = useMemo(() => {
    if (!canProceed) return new Map<string, BaseCategoryAnalysisDataPoint[]>()
    return prepareGroupedOverlayData(bmdResultMap, categoryItemsMap)
  }, [canProceed, bmdResultMap, categoryItemsMap])

  // 3) build clusterColorMap from referenceData
  const clusterColorMap = useMemo(() => {
    const m = new Map<string, string>() // <<< Store keys as STRINGS >>>
    const logPrefix = '[usePreparedPlotData clusterColorMap]'
    if (!canProceed || !referenceData) {
      console.log(`${logPrefix} Skipping map creation.`);
      return m;
    }
    try {
      console.log(`${logPrefix} Generating map from ${referenceData.length} reference items.`);
      // Get unique cluster IDs, ensuring they are treated as strings for keys
      const clusterIds = Array.from(
        new Set(referenceData.map((r: ReferenceUmapItem) => String(r.cluster_id))) // <<< Convert to string early >>>
      );
      console.log(`${logPrefix} Unique cluster IDs found:`, clusterIds);

      const colors = generateHaltonColors(clusterIds.length);

      clusterIds.forEach((cidString, i) => {
        // Key is already a string here
        m.set(cidString, colors[i % colors.length]); // Use modulo just in case color generation is less than unique IDs
      });

      console.log(`${logPrefix} Generated clusterColorMap (first 5 entries):`, Array.from(m.entries()).slice(0, 5));
      console.log(`${logPrefix} Map size: ${m.size}`);
    } catch (error) {
      console.error(`${logPrefix} Error during map generation:`, error);
    }
    return m;
  }, [canProceed, referenceData]); // Dependencies are correct

  // 4) style each overlay point
  const styledGroupedData = useMemo(() => {
    if (!canProceed || baseGroupedData.size === 0 || !referenceDataMap)
      return null
    return calculateOverlayStyles(
      baseGroupedData,
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels,
      hiddenShapeLabels,
      hiddenSizeLabels,
      goIdFilterList,
      highlightMode,
      null,
      selectedGoIdsSet,
      referenceDataMap,
      clusterColorMap,
      new Map<number, string>(), // shape map placeholder
      committedRankSliderValue
    )
  }, [
    canProceed,
    baseGroupedData,
    referenceDataMap,
    clusterColorMap,
    colorByOption,
    shapeByOption,
    sizeByOption,
    hiddenColorLabels,
    hiddenShapeLabels,
    hiddenSizeLabels,
    goIdFilterList,
    highlightMode,
    selectedGoIdsSet,
    committedRankSliderValue,
  ])

  // 5) flatten into a single array
  const analysisPoints = useMemo(() => {
    if (!styledGroupedData) return null
    return Array.from(styledGroupedData.values()).flat()
  }, [styledGroupedData])

  if (isLoadingDetails || detailsError) {
    return { analysisPoints: null, styledGroupedData: null }
  }
  return { analysisPoints, styledGroupedData }
}
