// src/hooks/usePreparedPlotData.ts
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { useCategoryAnalysisDataService } from './useCategoryAnalysisDataService';
import { UmapAnalysisDataPoint, BaseCategoryAnalysisDataPoint, PreparedPlotHookData } from '../models/applicationModel';
import { selectColorBy, selectShapeBy, selectSizeBy, selectHiddenColorLabelsSet, selectHiddenShapeLabelsSet, selectHiddenSizeLabelsSet, selectGoIdFilterList, selectHighlightMode, selectAccumulationPlotSelectedGoIdsSet, selectCommittedSlidingWindowValue } from '../store/slices/analysisUISlice';
import {
  calculateOverlayStyles,
  HIDDEN_OPACITY,
} from '../utils/styleUtils';
import { generateHaltonColors } from '../utils/colorUtils';
import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported';
import { ReferenceUmapItem } from '../data/referenceUmapData';
import { SHAPE_PALETTE, DEFAULT_PLOT_COLORS } from '../config/analysisConstants';
import { DEFAULT_SHAPE_LABEL, DEFAULT_SIZE_LABEL, DEFAULT_MARKER_COLOR, DEFAULT_MARKER_SHAPE, DEFAULT_MARKER_SIZE } from '../utils/legendUtils';
// --------------------------------------------
import { prepareGroupedOverlayData } from '../utils/analysisUtils';
import { selectSelectedProjectName } from '../store/slices/projectSlice';

export interface UsePreparedPlotDataArgs {
  selectedBmdResultRefs: string[];
  referenceDataMap: Map<string, ReferenceUmapItem> | null;
  referenceData: ReferenceUmapItem[] | null;
  modelType: string;
}

interface LegendItems {
  colorItems: [string, string][];
  shapeItems: [string, string][];
  sizeItems: [string, number][];
}

function deriveLegendItemsInternal(
  allStyledPoints: UmapAnalysisDataPoint[] | null | undefined,
  // colorBy: string,
  shapeBy: string,
  sizeBy: string
): LegendItems {
  // -------------------------------------------
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
    .sort((a, b) => {
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

 // --- Central hook to fetch raw data, process it, calculate ranks,
 // --- apply styling and filtering, and derive legend items for the UMAP analysis view.
export const usePreparedPlotData = ({
  selectedBmdResultRefs,
  referenceDataMap,
  referenceData,
  modelType,
}: UsePreparedPlotDataArgs): PreparedPlotHookData => {
  const hookLogPrefix = '[usePreparedPlotData v20 - Unused Fix]'; // Version Bump

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

  const {
    data: rawData,
    isLoading: isLoadingRaw,
    error: rawError,
    isSuccess: rawSuccess,
  } = useCategoryAnalysisDataService(projectName, selectedBmdResultRefs, modelType);

  const canProcess = useMemo(() => {
    return !isLoadingRaw && !rawError && rawSuccess && !!rawData && !!referenceDataMap && selectedBmdResultRefs && selectedBmdResultRefs.length > 0;
  }, [isLoadingRaw, rawError, rawSuccess, rawData, referenceDataMap, selectedBmdResultRefs]);

  const { baseGroupedData, /* bmdResultMap, */ bmdRefToExperimentNameMap } = useMemo(() => {
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

  const { rankedData, minRank, maxRank } = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Ranking]`;
    if (!baseGroupedData || baseGroupedData.size === 0) {
      return { rankedData: new Map<string, BaseCategoryAnalysisDataPoint[]>(), minRank: 0, maxRank: 0 };
    }
    const allPointsWithRankValue: BaseCategoryAnalysisDataPoint[] = [];
    baseGroupedData.forEach(points => {
      // --- Type annotation for point ---
      points.forEach((point: BaseCategoryAnalysisDataPoint) => {
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
      // --- Type annotation for point ---
      const newPoints = originalPoints.map((point: BaseCategoryAnalysisDataPoint) => {
        const uniqueKey = `${point.bmdResultRef}-${point.go_id}`;
        return { ...point, rank: rankMap.get(uniqueKey) ?? null };
      });
      newRankedGroupedData.set(refKey, newPoints);
    });
    return { rankedData: newRankedGroupedData, minRank: N > 0 ? 1 : 0, maxRank: N };
  }, [baseGroupedData]);

  const clusterColorMap = useMemo(() => {
    if (!referenceData) return new Map<string | number, string>();
    const uniqueClusterIds = Array.from(new Set(referenceData.map(item => item.cluster_id).filter(id => id != null && id !== -1 && id !== '-1')));
    if (uniqueClusterIds.length === 0) return new Map<string | number, string>();
    const colors = generateHaltonColors(uniqueClusterIds.length);
    const map = new Map<string | number, string>();
    uniqueClusterIds.forEach((id, index) => map.set(String(id), colors[index % colors.length]));
    return map;
  }, [referenceData]);
  const bmdRefColorMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedBmdResultRefs.forEach((refStr, index) => {
      const numericRef = parseInt(refStr, 10);
      if (!isNaN(numericRef)) map.set(numericRef, DEFAULT_PLOT_COLORS[index % DEFAULT_PLOT_COLORS.length]);
    });
    return map;
  }, [selectedBmdResultRefs]);
  const bmdRefShapeMap = useMemo(() => {
    const map = new Map<number, string>();
    if (shapeByOption === 'bmdResultName') {
      selectedBmdResultRefs.forEach((refStr, index) => {
        const numericRef = parseInt(refStr, 10);
        if (!isNaN(numericRef)) map.set(numericRef, SHAPE_PALETTE[index % SHAPE_PALETTE.length]);
      });
    }
    return map;
  }, [shapeByOption, selectedBmdResultRefs]);

  const allStyledGroupedData = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Styling]`;
    if (!canProcess || rankedData.size === 0 || !referenceDataMap) {
      console.log(`${logPrefix} Skipping styling: Not ready or no ranked data/ref map.`);
      return null;
    }
    console.log(
      `${logPrefix} Calling calculateOverlayStyles with internally selected highlightMode: ${highlightMode}, goIdFilterList size: ${goIdFilterList?.length}`
    );
    return calculateOverlayStyles(
      rankedData,
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
      goIdFilterList, highlightMode,
      bmdRefToExperimentNameMap,
      selectedGoIdsSet, referenceDataMap, clusterColorMap,
      bmdRefShapeMap, bmdRefColorMap,
      committedRankSliderValue
    );
  }, [
    canProcess,
    rankedData,
    referenceDataMap,
    clusterColorMap,
    bmdRefShapeMap,
    bmdRefColorMap,
    bmdRefToExperimentNameMap,
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
  ]);

  const finalPlotDataAndLegends = useMemo((): PreparedPlotHookData => {
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
    // --- Pass parameters to helper ---
    const { colorItems, shapeItems, sizeItems } = deriveLegendItemsInternal(
      flattenedStyledPoints, /* colorByOption, */ shapeByOption, sizeByOption
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
  }, [allStyledGroupedData, /* colorByOption, */ shapeByOption, sizeByOption, minRank, maxRank]);

  return finalPlotDataAndLegends;
};
