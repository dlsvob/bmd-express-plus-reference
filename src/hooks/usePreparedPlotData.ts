/**
 * src/hooks/usePreparedPlotData.ts
 */
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { useGetRawAnalysisDataQuery } from '../store/apis/experimentsApi';
import {
  UmapAnalysisDataPoint,
  BaseCategoryAnalysisDataPoint,
  PreparedPlotHookData, // Updated interface
  SelectableAnalysisInfo,
  DetailedAnalysisData,
} from '../models/applicationModel'; // Updated import
import { HighlightMode } from '../store/slices/analysisUISlice';
import {
  calculateOverlayStyles,
  HIDDEN_OPACITY,
  VISIBLE_OPACITY,
  DIM_OPACITY,
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
  DIRECTION_LABELS,
  getDirectionLegendName,
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DEFAULT_MARKER_SIZE,
  UNCLUSTERED_COLOR,
} from '../utils/legendUtils';
import { prepareGroupedOverlayData } from '../utils/analysisUtils';
import { selectSelectedProjectName } from '../store/selectors/projectSelectors';
// import { filterPlotItems } from '../utils/plotUtils'; // Not needed for rank

// Args Interface (Unchanged)
export interface UsePreparedPlotDataArgs {
  selectedBmdResultRefs: string[];
  referenceDataMap: Map<string, ReferenceUmapItem> | null;
  referenceData: ReferenceUmapItem[] | null;
  colorByOption: string;
  shapeByOption: string;
  sizeByOption: string;
  hiddenColorLabels: Set<string>;
  hiddenShapeLabels: Set<string>;
  hiddenSizeLabels: Set<string>;
  goIdFilterList: string[];
  highlightMode: HighlightMode;
  selectedGoIdsSet: Set<string>;
  committedRankSliderValue: [number, number]; // Rank window [start_rank, end_rank]
}

// Legend Derivation Helper
interface LegendItems {
  colorItems: [string, string][];
  shapeItems: [string, string][];
  sizeItems: [string, number][];
}

function deriveLegendItemsInternal(
  allStyledPoints: UmapAnalysisDataPoint[] | null | undefined,
  colorBy: string,
  shapeBy: string,
  sizeBy: string,
  bmdRefToExperimentNameMap: Map<number, string> | null
): LegendItems {
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
      const labelA = a[0];
      const labelB = b[0];
      const isAUnclustered = labelA === 'Unclustered';
      const isBUnclustered = labelB === 'Unclustered';
      if (isAUnclustered && !isBUnclustered) return -1;
      if (!isAUnclustered && isBUnclustered) return 1;
      if (isAUnclustered && isBUnclustered) return 0;
      const numA = parseInt(labelA.replace('Cluster ', ''), 10);
      const numB = parseInt(labelB.replace('Cluster ', ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) { return numA - numB; }
      return labelA.localeCompare(labelB);
    });

  const sortedShapeItems: [string, string][] = Array.from(uniqueLabelsAndShapes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));
  const sortedSizeItems: [string, number][] = Array.from(uniqueLabelsAndSizes.entries())
    .sort((a, b) => a[1] - b[1]);

  return {
    colorItems: sortedColorItems,
    shapeItems: sortedShapeItems,
    sizeItems: sortedSizeItems,
  };
}
// --- END HELPER FUNCTION ---


// --- Main Hook ---
export const usePreparedPlotData = ({
  selectedBmdResultRefs,
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
}: UsePreparedPlotDataArgs): PreparedPlotHookData => {
  const hookLogPrefix = '[usePreparedPlotData v19.2 - Complete Code]'; // Version Bump

  const projectName = useAppSelector(selectSelectedProjectName);
  const {
    data: rawData,
    isLoading: isLoadingRaw,
    error: rawError,
    isSuccess: rawSuccess,
    isFetching: isFetchingRaw,
  } = useGetRawAnalysisDataQuery(
    { projectName, selectedBmdResultRefs },
    { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
  );

  const canProcess = useMemo(() => {
    return !isLoadingRaw && !rawError && rawSuccess && !!rawData && !!referenceDataMap && selectedBmdResultRefs && selectedBmdResultRefs.length > 0;
  }, [isLoadingRaw, rawError, rawSuccess, rawData, referenceDataMap, selectedBmdResultRefs]);

  // Memoize Base Data (Includes rankValue)
  const { baseGroupedData, bmdResultMap, bmdRefToExperimentNameMap } = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Base Data]`;
    if (!canProcess || !rawData?.rawBmdResults || !rawData?.rawCategoryAnalysisItems) {
      return { baseGroupedData: new Map(), bmdResultMap: new Map(), bmdRefToExperimentNameMap: new Map() };
    }
    const tempBmdResultMap = new Map<number, BMDResult>();
    const tempBmdRefToNameMap = new Map<number, string>();
    rawData.rawBmdResults.forEach(r => {
      if (r && r['@ref'] != null) {
        tempBmdResultMap.set(Number(r['@ref']), r);
        tempBmdRefToNameMap.set(Number(r['@ref']), r.name || `BMD Result ${r['@ref']}`);
      }
    });
    const categoryItemsMap = new Map<string, CategoryAnalysisItem[]>();
    rawData.rawCategoryAnalysisItems.forEach(entry => {
      const refStr = String(entry.bmdResultRef);
      if (!categoryItemsMap.has(refStr)) {
        categoryItemsMap.set(refStr, []);
      }
      categoryItemsMap.get(refStr)?.push(entry.item);
    });
    const groupedData = prepareGroupedOverlayData(tempBmdResultMap, categoryItemsMap); // This adds rankValue
    return { baseGroupedData: groupedData, bmdResultMap: tempBmdResultMap, bmdRefToExperimentNameMap: tempBmdRefToNameMap };
  }, [canProcess, rawData]);

  // --- Calculate Ranks and Min/Max ---
  // This memo calculates the rank for each point globally and determines N (maxRank)
  const rankedBaseGroupedData = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Ranking]`;
    if (!baseGroupedData || baseGroupedData.size === 0) {
      // console.log(`${logPrefix} No base data to rank.`); // Keep logs minimal
      return { rankedData: new Map<string, BaseCategoryAnalysisDataPoint[]>(), maxRank: 0 };
    }

    // 1. Flatten all points and filter those with a valid rankValue
    const allPointsWithRankValue: BaseCategoryAnalysisDataPoint[] = [];
    baseGroupedData.forEach(points => {
      points.forEach(point => {
        if (point.rankValue != null && isFinite(point.rankValue)) {
          allPointsWithRankValue.push(point);
        }
      });
    });

    if (allPointsWithRankValue.length === 0) {
      // console.log(`${logPrefix} No points with valid rankValue found.`); // Keep logs minimal
      return { rankedData: baseGroupedData, maxRank: 0 }; // Return original data, maxRank 0
    }

    // 2. Sort points by rankValue (ascending)
    allPointsWithRankValue.sort((a, b) => (a.rankValue ?? Infinity) - (b.rankValue ?? Infinity));

    // 3. Assign ranks (1-based index) and store in a temporary map for lookup
    const rankMap = new Map<string, number>(); // Key: unique identifier (e.g., ref + go_id), Value: rank
    const N = allPointsWithRankValue.length;
    allPointsWithRankValue.forEach((point, index) => {
      // Use a combination of ref and go_id as a unique key for each point across experiments
      const uniqueKey = `${point.bmdResultRef}-${point.go_id}`;
      rankMap.set(uniqueKey, index + 1); // Assign rank (1-based)
    });
    console.log(`${logPrefix} Assigned ranks 1 to ${N}.`); // Log N

    // 4. Create the new grouped map with the 'rank' property added
    const newRankedGroupedData = new Map<string, BaseCategoryAnalysisDataPoint[]>();
    baseGroupedData.forEach((originalPoints, refKey) => {
      const newPoints = originalPoints.map(point => {
        const uniqueKey = `${point.bmdResultRef}-${point.go_id}`;
        const calculatedRank = rankMap.get(uniqueKey);
        return {
          ...point,
          rank: calculatedRank ?? null, // Add the rank property
        };
      });
      newRankedGroupedData.set(refKey, newPoints);
    });

    return { rankedData: newRankedGroupedData, maxRank: N };

  }, [baseGroupedData]);
  // ------------------------------------

  // Extract maxRank for convenience
  const maxRank = rankedBaseGroupedData.maxRank;
  const minRank = maxRank > 0 ? 1 : 0; // Min rank is always 1 if there are points

  // Build Color/Shape Maps (Unchanged)
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
    if (selectedBmdResultRefs.length > 0) {
      selectedBmdResultRefs.forEach((refStr, index) => {
        const numericRef = parseInt(refStr, 10);
        if (!isNaN(numericRef)) map.set(numericRef, DEFAULT_PLOT_COLORS[index % DEFAULT_PLOT_COLORS.length]);
      });
    }
    return map;
  }, [selectedBmdResultRefs]);
  const bmdRefShapeMap = useMemo(() => {
    const map = new Map<number, string>();
    if (shapeByOption === 'bmdResultName' && selectedBmdResultRefs.length > 0) {
      selectedBmdResultRefs.forEach((refStr, index) => {
        const numericRef = parseInt(refStr, 10);
        if (!isNaN(numericRef)) map.set(numericRef, SHAPE_PALETTE[index % SHAPE_PALETTE.length]);
      });
    }
    return map;
  }, [shapeByOption, selectedBmdResultRefs]);

  // Calculate ALL styled points using calculateOverlayStyles
  // Pass the *ranked* data and the rank window to the styling function
  const allStyledGroupedData = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Styling]`;
    // Use rankedBaseGroupedData.rankedData here
    if (!canProcess || rankedBaseGroupedData.rankedData.size === 0 || !referenceDataMap) {
      return null;
    }
    return calculateOverlayStyles(
      rankedBaseGroupedData.rankedData, // <<< Pass data with ranks
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
      goIdFilterList, highlightMode,
      bmdRefToExperimentNameMap, // <<< Pass the map
      selectedGoIdsSet, referenceDataMap, clusterColorMap,
      bmdRefShapeMap, bmdRefColorMap,
      committedRankSliderValue // Pass the rank window [start_rank, end_rank]
    );
  }, [
    canProcess, rankedBaseGroupedData, referenceDataMap, clusterColorMap,
    bmdRefShapeMap, bmdRefColorMap,
    bmdRefToExperimentNameMap, // <<< ADDED AS DEPENDENCY
    colorByOption, shapeByOption,
    sizeByOption, hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
    goIdFilterList, highlightMode, selectedGoIdsSet, committedRankSliderValue,
  ]); // <<< Ensure bmdRefToExperimentNameMap is in the dependency array

  // Derive Legend Items and Filter Plot Points
  const finalPlotDataAndLegends = useMemo((): PreparedPlotHookData => {
    const logPrefix = `${hookLogPrefix} [Memo Legends & Filtering]`;
    const defaultReturn: PreparedPlotHookData = {
      analysisPoints: null,
      allStyledPoints: null,
      styledGroupedData: null,
      colorItems: [],
      shapeItems: [],
      sizeItems: [],
      minRank: 1,
      maxRank: 100,
    };

    if (!allStyledGroupedData) {
      // Return defaults but use the calculated min/max rank if available
      return { ...defaultReturn, minRank: minRank || 1, maxRank: maxRank || 100 };
    }

    const flattenedStyledPoints: UmapAnalysisDataPoint[] = [];
    allStyledGroupedData.forEach(pointsArray => flattenedStyledPoints.push(...pointsArray));

    // Derive legends from ALL styled points (before opacity filter)
    const { colorItems, shapeItems, sizeItems } = deriveLegendItemsInternal(
      flattenedStyledPoints, colorByOption, shapeByOption, sizeByOption, bmdRefToExperimentNameMap
    );

    // Filter points based on finalOpacity for the actual plot
    const analysisPointsForPlot = flattenedStyledPoints.filter(
      point => point.finalOpacity !== HIDDEN_OPACITY
    );

    return {
      analysisPoints: analysisPointsForPlot, // Points visible on plot
      allStyledPoints: flattenedStyledPoints, // All points after styling
      styledGroupedData: allStyledGroupedData, // Grouped version of all styled points
      colorItems: colorItems,
      shapeItems: shapeItems,
      sizeItems: sizeItems,
      minRank: minRank, // Return calculated min/max rank (1 and N)
      maxRank: maxRank,
    };
  }, [allStyledGroupedData, colorByOption, shapeByOption, sizeByOption, bmdRefToExperimentNameMap, minRank, maxRank]);

  // --- Final Return ---
  return finalPlotDataAndLegends;
};
