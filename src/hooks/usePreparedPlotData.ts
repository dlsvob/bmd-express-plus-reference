/**
 * src/hooks/usePreparedPlotData.ts
 *
 * Central hook to fetch raw data, process it, calculate ranks,
 * apply styling and filtering (including rank and GO ID highlighting),
 * and derive legend items for the UMAP analysis view.
 * NOW SELECTS UI STATE INTERNALLY.
 */
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks'; // Keep this
import { useGetRawAnalysisDataQuery } from '../store/apis/experimentsApi';
import {
  UmapAnalysisDataPoint,
  BaseCategoryAnalysisDataPoint,
  PreparedPlotHookData,
} from '../models/applicationModel';
// --- Import selectors needed INTERNALLY ---
import {
  HighlightMode,
  selectColorBy, // Selectors for UI state
  selectShapeBy,
  selectSizeBy,
  selectHiddenColorLabelsSet,
  selectHiddenShapeLabelsSet,
  selectHiddenSizeLabelsSet,
  selectGoIdFilterList,
  selectHighlightMode,
  selectAccumulationPlotSelectedGoIdsSet,
  selectCommittedSlidingWindowValue,
} from '../store/slices/analysisUISlice'; // Adjust path
// --- End internal selector imports ---
import {
  calculateOverlayStyles,
  HIDDEN_OPACITY,
} from '../utils/styleUtils';
import { generateHaltonColors } from '../utils/colorUtils';
import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported';
import { ReferenceUmapItem } from '../data/referenceUmapData';
import {
  SHAPE_PALETTE,
  DEFAULT_PLOT_COLORS,
} from '../config/analysisConstants';
import {
  DEFAULT_SHAPE_LABEL,
  DEFAULT_SIZE_LABEL,
  SIZE_BIN_LABELS,
  getDirectionLegendName,
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DEFAULT_MARKER_SIZE,
  UNCLUSTERED_COLOR,
} from '../utils/legendUtils';
import { prepareGroupedOverlayData } from '../utils/analysisUtils';
import { selectSelectedProjectName } from '../store/selectors/projectSelectors';

// --- UPDATE Args Interface: Remove UI state props ---
export interface UsePreparedPlotDataArgs {
  selectedBmdResultRefs: string[];
  referenceDataMap: Map<string, ReferenceUmapItem> | null;
  referenceData: ReferenceUmapItem[] | null;
  // REMOVED: colorByOption, shapeByOption, sizeByOption
  // REMOVED: hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels
  // REMOVED: goIdFilterList, highlightMode, selectedGoIdsSet
  // REMOVED: committedRankSliderValue
}
// ----------------------------------------------------

// Legend Derivation Helper (Internal - unchanged)
interface LegendItems {
  colorItems: [string, string][];
  shapeItems: [string, string][];
  sizeItems: [string, number][];
}
function deriveLegendItemsInternal(
  allStyledPoints: UmapAnalysisDataPoint[] | null | undefined,
  colorBy: string,
  shapeBy: string,
  sizeBy: string
): LegendItems {
  // ... (implementation remains the same)
  const defaultResult: LegendItems = { colorItems: [], shapeItems: [], sizeItems: [] };
  if (!allStyledPoints || allStyledPoints.length === 0) {
    return defaultResult;
  }
  const uniqueLabelsAndColors = new Map<string, string>();
  const uniqueLabelsAndShapes = new Map<string, string>();
  const uniqueLabelsAndSizes = new Map<string, number>();
  allStyledPoints.forEach((point) => {
    const { colorLabel, shapeLabel, sizeLabel, finalColor, finalShape, finalSize } = point;
    if (colorLabel && !uniqueLabelsAndColors.has(colorLabel)) {
      uniqueLabelsAndColors.set(colorLabel, finalColor || DEFAULT_MARKER_COLOR);
    }
    if (shapeBy !== 'none' || !uniqueLabelsAndShapes.has(DEFAULT_SHAPE_LABEL)) {
      if (shapeLabel && !uniqueLabelsAndShapes.has(shapeLabel)) {
        uniqueLabelsAndShapes.set(shapeLabel, finalShape || DEFAULT_MARKER_SHAPE);
      }
    }
    if (sizeBy !== 'none' || !uniqueLabelsAndSizes.has(DEFAULT_SIZE_LABEL)) {
      if (sizeLabel && !uniqueLabelsAndSizes.has(sizeLabel)) {
        uniqueLabelsAndSizes.set(sizeLabel, finalSize || DEFAULT_MARKER_SIZE);
      }
    }
  });
  const sortedColorItems: [string, string][] = Array.from(uniqueLabelsAndColors.entries())
    .sort((a, b) => { /* ... sort logic ... */
      const labelA = a[0]; const labelB = b[0];
      const isAUnclustered = labelA === 'Unclustered'; const isBUnclustered = labelB === 'Unclustered';
      if (isAUnclustered && !isBUnclustered) return -1; if (!isAUnclustered && isBUnclustered) return 1; if (isAUnclustered && isBUnclustered) return 0;
      const numA = parseInt(labelA.replace('Cluster ', ''), 10); const numB = parseInt(labelB.replace('Cluster ', ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) { return numA - numB; }
      return labelA.localeCompare(labelB);
    });
  const sortedShapeItems: [string, string][] = Array.from(uniqueLabelsAndShapes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));
  const sortedSizeItems: [string, number][] = Array.from(uniqueLabelsAndSizes.entries())
    .sort((a, b) => a[1] - b[1]);
  return { colorItems: sortedColorItems, shapeItems: sortedShapeItems, sizeItems: sortedSizeItems };
}
// --- END HELPER FUNCTION ---


// --- Main Hook ---
export const usePreparedPlotData = ({ // Destructure only the necessary props
  selectedBmdResultRefs,
  referenceDataMap,
  referenceData,
}: UsePreparedPlotDataArgs): PreparedPlotHookData => {
  const hookLogPrefix = '[usePreparedPlotData v19.5 - Internal Selectors]'; // Version Bump

  // --- Select UI state INTERNALLY ---
  const projectName = useAppSelector(selectSelectedProjectName);
  const colorByOption = useAppSelector(selectColorBy);
  const shapeByOption = useAppSelector(selectShapeBy);
  const sizeByOption = useAppSelector(selectSizeBy);
  const hiddenColorLabels = useAppSelector(selectHiddenColorLabelsSet);
  const hiddenShapeLabels = useAppSelector(selectHiddenShapeLabelsSet);
  const hiddenSizeLabels = useAppSelector(selectHiddenSizeLabelsSet);
  const goIdFilterList = useAppSelector(selectGoIdFilterList);
  const highlightMode = useAppSelector(selectHighlightMode);
  const selectedGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
  const committedRankSliderValue = useAppSelector(selectCommittedSlidingWindowValue);
  // ----------------------------------

  // --- Step 1: Fetch Raw Data ---
  const {
    data: rawData,
    isLoading: isLoadingRaw,
    error: rawError,
    isSuccess: rawSuccess,
  } = useGetRawAnalysisDataQuery(
    { projectName, selectedBmdResultRefs },
    { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
  );

  // --- Step 2: Check if data is ready for processing ---
  const canProcess = useMemo(() => {
    return !isLoadingRaw && !rawError && rawSuccess && !!rawData && !!referenceDataMap && selectedBmdResultRefs && selectedBmdResultRefs.length > 0;
  }, [isLoadingRaw, rawError, rawSuccess, rawData, referenceDataMap, selectedBmdResultRefs]);

  // --- Step 3: Prepare Base Data and Maps ---
  const { baseGroupedData, bmdResultMap, bmdRefToExperimentNameMap } = useMemo(() => {
    // ... (implementation remains the same)
    const logPrefix = `${hookLogPrefix} [Memo Base Data]`;
    if (!canProcess || !rawData?.rawBmdResults || !rawData?.rawCategoryAnalysisItems) {
      return { baseGroupedData: new Map(), bmdResultMap: new Map(), bmdRefToExperimentNameMap: new Map() };
    }
    const tempBmdResultMap = new Map<number, BMDResult>();
    const tempBmdRefToNameMap = new Map<number, string>();
    rawData.rawBmdResults.forEach(r => {
      if (r && r['@ref'] != null) {
        const numericRef = Number(r['@ref']);
        if (!isNaN(numericRef)) {
          tempBmdResultMap.set(numericRef, r);
          tempBmdRefToNameMap.set(numericRef, r.name || `BMD Result ${numericRef}`);
        }
      }
    });
    const categoryItemsMap = new Map<string, CategoryAnalysisItem[]>();
    rawData.rawCategoryAnalysisItems.forEach(entry => {
      const refStr = String(entry.bmdResultRef);
      if (!categoryItemsMap.has(refStr)) { categoryItemsMap.set(refStr, []); }
      categoryItemsMap.get(refStr)?.push(entry.item);
    });
    const groupedData = prepareGroupedOverlayData(tempBmdResultMap, categoryItemsMap);
    console.log(`${logPrefix} Prepared base data. Groups: ${groupedData.size}`);
    return { baseGroupedData: groupedData, bmdResultMap: tempBmdResultMap, bmdRefToExperimentNameMap: tempBmdRefToNameMap };
  }, [canProcess, rawData]);

  // --- Step 4: Calculate Ranks ---
  const { rankedData, minRank, maxRank } = useMemo(() => {
    // ... (implementation remains the same)
    const logPrefix = `${hookLogPrefix} [Memo Ranking]`;
    if (!baseGroupedData || baseGroupedData.size === 0) {
      return { rankedData: new Map<string, BaseCategoryAnalysisDataPoint[]>(), minRank: 0, maxRank: 0 };
    }
    const allPointsWithRankValue: BaseCategoryAnalysisDataPoint[] = [];
    baseGroupedData.forEach(points => {
      points.forEach(point => {
        if (point.rankValue != null && isFinite(point.rankValue)) {
          allPointsWithRankValue.push(point);
        }
      });
    });
    if (allPointsWithRankValue.length === 0) {
      return { rankedData: baseGroupedData, minRank: 0, maxRank: 0 };
    }
    allPointsWithRankValue.sort((a, b) => (a.rankValue ?? Infinity) - (b.rankValue ?? Infinity));
    const rankMap = new Map<string, number>();
    const N = allPointsWithRankValue.length;
    allPointsWithRankValue.forEach((point, index) => {
      const uniqueKey = `${point.bmdResultRef}-${point.go_id}`;
      rankMap.set(uniqueKey, index + 1);
    });
    console.log(`${logPrefix} Assigned ranks 1 to ${N}.`);
    const newRankedGroupedData = new Map<string, BaseCategoryAnalysisDataPoint[]>();
    baseGroupedData.forEach((originalPoints, refKey) => {
      const newPoints = originalPoints.map(point => {
        const uniqueKey = `${point.bmdResultRef}-${point.go_id}`;
        return { ...point, rank: rankMap.get(uniqueKey) ?? null };
      });
      newRankedGroupedData.set(refKey, newPoints);
    });
    return { rankedData: newRankedGroupedData, minRank: N > 0 ? 1 : 0, maxRank: N };
  }, [baseGroupedData]);

  // --- Step 5: Build Color/Shape Maps ---
  const clusterColorMap = useMemo(() => {
    // ... (implementation remains the same)
    if (!referenceData) return new Map<string | number, string>();
    const uniqueClusterIds = Array.from(new Set(referenceData.map(item => item.cluster_id).filter(id => id != null && id !== -1 && id !== '-1')));
    if (uniqueClusterIds.length === 0) return new Map<string | number, string>();
    const colors = generateHaltonColors(uniqueClusterIds.length);
    const map = new Map<string | number, string>();
    uniqueClusterIds.forEach((id, index) => map.set(String(id), colors[index % colors.length]));
    return map;
  }, [referenceData]);
  const bmdRefColorMap = useMemo(() => {
    // ... (implementation remains the same)
    const map = new Map<number, string>();
    selectedBmdResultRefs.forEach((refStr, index) => {
      const numericRef = parseInt(refStr, 10);
      if (!isNaN(numericRef)) map.set(numericRef, DEFAULT_PLOT_COLORS[index % DEFAULT_PLOT_COLORS.length]);
    });
    return map;
  }, [selectedBmdResultRefs]);
  const bmdRefShapeMap = useMemo(() => {
    // ... (implementation remains the same)
    const map = new Map<number, string>();
    if (shapeByOption === 'bmdResultName') {
      selectedBmdResultRefs.forEach((refStr, index) => {
        const numericRef = parseInt(refStr, 10);
        if (!isNaN(numericRef)) map.set(numericRef, SHAPE_PALETTE[index % SHAPE_PALETTE.length]);
      });
    }
    return map;
  }, [shapeByOption, selectedBmdResultRefs]);

  // --- Step 6: Calculate ALL Styled Points (using internally selected state) ---
  const allStyledGroupedData = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Styling]`;
    if (!canProcess || rankedData.size === 0 || !referenceDataMap) {
      console.log(`${logPrefix} Skipping styling: Not ready or no ranked data/ref map.`);
      return null;
    }
    // Log the values selected *inside* the hook, right before use
    console.log(
      `${logPrefix} Calling calculateOverlayStyles with internally selected highlightMode: ${highlightMode}, goIdFilterList size: ${goIdFilterList?.length}`
    );
    // Call the styling function using the internally selected state
    return calculateOverlayStyles(
      rankedData,
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
      goIdFilterList, highlightMode, // Use internally selected values
      bmdRefToExperimentNameMap,
      selectedGoIdsSet, referenceDataMap, clusterColorMap,
      bmdRefShapeMap, bmdRefColorMap,
      committedRankSliderValue // Use internally selected value
    );
  }, [ // --- DEPENDENCY ARRAY for STYLING (Now uses internally selected state) ---
    canProcess,
    rankedData,
    referenceDataMap,
    clusterColorMap,
    bmdRefShapeMap,
    bmdRefColorMap,
    bmdRefToExperimentNameMap,
    // Include the selected state variables as dependencies
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
  ]); // --- END DEPENDENCY ARRAY ---

  // --- Step 7: Derive Legends and Filter Points for Plot ---
  const finalPlotDataAndLegends = useMemo((): PreparedPlotHookData => {
    // ... (implementation remains the same)
    const logPrefix = `${hookLogPrefix} [Memo Legends & Filtering]`;
    const defaultReturn: PreparedPlotHookData = {
      analysisPoints: null, allStyledPoints: null, styledGroupedData: null,
      colorItems: [], shapeItems: [], sizeItems: [],
      minRank: 0, maxRank: 0,
    };
    if (!allStyledGroupedData) {
      return { ...defaultReturn, minRank: minRank, maxRank: maxRank };
    }
    const flattenedStyledPoints: UmapAnalysisDataPoint[] = [];
    allStyledGroupedData.forEach(pointsArray => flattenedStyledPoints.push(...pointsArray));
    console.log(`${logPrefix} Total styled points before final filter: ${flattenedStyledPoints.length}`);
    const { colorItems, shapeItems, sizeItems } = deriveLegendItemsInternal(
      flattenedStyledPoints, colorByOption, shapeByOption, sizeByOption
    );
    const analysisPointsForPlot = flattenedStyledPoints.filter(
      point => point.finalOpacity !== HIDDEN_OPACITY
    );
    console.log(`${logPrefix} Points visible on plot after opacity filter: ${analysisPointsForPlot.length}`);
    return {
      analysisPoints: analysisPointsForPlot,
      allStyledPoints: flattenedStyledPoints,
      styledGroupedData: allStyledGroupedData,
      colorItems: colorItems,
      shapeItems: shapeItems,
      sizeItems: sizeItems,
      minRank: minRank,
      maxRank: maxRank,
    };
  }, [allStyledGroupedData, colorByOption, shapeByOption, sizeByOption, bmdRefToExperimentNameMap, minRank, maxRank]);

  // --- Final Return ---
  return finalPlotDataAndLegends;
};
