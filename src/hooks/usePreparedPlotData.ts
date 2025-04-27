/**
 * src/hooks/usePreparedPlotData.ts
 */
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { useGetRawAnalysisDataQuery } from '../store/apis/experimentsApi';
import {
  UmapAnalysisDataPoint,
  BaseCategoryAnalysisDataPoint,
  PreparedPlotHookData,
  SelectableAnalysisInfo,
  DetailedAnalysisData,
} from '../models/applicationModel';
import { HighlightMode } from '../store/slices/analysisUISlice';
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
  DIRECTION_LABELS,
  getDirectionLegendName,
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_SHAPE,
  DEFAULT_MARKER_SIZE,
  UNCLUSTERED_COLOR,
} from '../utils/legendUtils';
import { prepareGroupedOverlayData } from '../utils/analysisUtils';
import { selectSelectedProjectName } from '../store/selectors/projectSelectors';

// Args Interface
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
  committedRankSliderValue: [number, number];
}

// Legend Derivation Helper
interface LegendItems {
  colorItems: [string, string][];
  shapeItems: [string, string][];
  sizeItems: [string, number][];
}

// --- UPDATED deriveLegendItemsInternal with Custom Sort ---
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

  // Populate the maps (relies on labels from calculateOverlayStyles)
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

  // --- Custom Sort for Color Items ---
  const sortedColorItems: [string, string][] = Array.from(uniqueLabelsAndColors.entries())
    .sort((a, b) => {
      const labelA = a[0];
      const labelB = b[0];

      const isAUnclustered = labelA === 'Unclustered';
      const isBUnclustered = labelB === 'Unclustered';

      if (isAUnclustered && !isBUnclustered) return -1; // Unclustered comes first
      if (!isAUnclustered && isBUnclustered) return 1;  // Unclustered comes first
      if (isAUnclustered && isBUnclustered) return 0;   // Should not happen

      // Try to parse cluster numbers if applicable
      const numA = parseInt(labelA.replace('Cluster ', ''), 10);
      const numB = parseInt(labelB.replace('Cluster ', ''), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB; // Numeric sort for clusters
      }

      // Fallback to localeCompare for non-cluster labels (e.g., bmdResultName, direction)
      return labelA.localeCompare(labelB);
    });
  // --- End Custom Sort ---

  // Keep original sorting for shape and size (or adjust if needed)
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
  const hookLogPrefix = '[usePreparedPlotData v16 - Legend Sort Fix]'; // Re-applying Version

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

  // Ensure the memo ALWAYS returns the expected object structure
  const { baseGroupedData, bmdResultMap, bmdRefToExperimentNameMap } = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Base Data]`;
    if (!canProcess || !rawData?.rawBmdResults || !rawData?.rawCategoryAnalysisItems) {
      return {
        baseGroupedData: new Map<string, BaseCategoryAnalysisDataPoint[]>(),
        bmdResultMap: new Map<number, BMDResult>(),
        bmdRefToExperimentNameMap: new Map<number, string>()
      };
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
    const groupedData = prepareGroupedOverlayData(tempBmdResultMap, categoryItemsMap);
    return { baseGroupedData: groupedData, bmdResultMap: tempBmdResultMap, bmdRefToExperimentNameMap: tempBmdRefToNameMap };
  }, [canProcess, rawData]);

  // Build clusterColorMap (use string keys)
  const clusterColorMap = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Cluster Colors]`;
    if (!referenceData) return new Map<string | number, string>();
    const uniqueClusterIds = Array.from(new Set(referenceData.map(item => item.cluster_id).filter(id => id != null && id !== -1 && id !== '-1')));
    if (uniqueClusterIds.length === 0) return new Map<string | number, string>();
    const colors = generateHaltonColors(uniqueClusterIds.length);
    const map = new Map<string | number, string>();
    uniqueClusterIds.forEach((id, index) => map.set(String(id), colors[index % colors.length]));
    return map;
  }, [referenceData]);

  // Generate bmdRefColorMap
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

  // Generate bmdRefShapeMap conditionally
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
  const allStyledGroupedData = useMemo(() => {
    const logPrefix = `${hookLogPrefix} [Memo Styling]`;
    if (!canProcess || baseGroupedData.size === 0 || !referenceDataMap) {
      return null;
    }
    return calculateOverlayStyles(
      baseGroupedData,
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
      goIdFilterList, highlightMode, bmdRefToExperimentNameMap,
      selectedGoIdsSet, referenceDataMap, clusterColorMap,
      bmdRefShapeMap, bmdRefColorMap, committedRankSliderValue
    );
  }, [
    canProcess, baseGroupedData, referenceDataMap, clusterColorMap,
    bmdRefShapeMap, bmdRefColorMap, bmdRefToExperimentNameMap, colorByOption, shapeByOption,
    sizeByOption, hiddenColorLabels, hiddenShapeLabels, hiddenSizeLabels,
    goIdFilterList, highlightMode, selectedGoIdsSet, committedRankSliderValue,
  ]);

  // Derive Legend Items and Filter Plot Points
  const finalPlotDataAndLegends = useMemo((): PreparedPlotHookData => {
    const logPrefix = `${hookLogPrefix} [Memo Legends & Filtering]`;
    if (!allStyledGroupedData) {
      return { analysisPoints: null, styledGroupedData: null, colorItems: [], shapeItems: [], sizeItems: [] };
    }
    const flattenedStyledPoints: UmapAnalysisDataPoint[] = [];
    allStyledGroupedData.forEach(pointsArray => flattenedStyledPoints.push(...pointsArray));

    // --- Call the UPDATED deriveLegendItemsInternal ---
    const { colorItems, shapeItems, sizeItems } = deriveLegendItemsInternal(
      flattenedStyledPoints, colorByOption, shapeByOption, sizeByOption, bmdRefToExperimentNameMap
    );
    // -------------------------------------------------

    const analysisPointsForPlot = flattenedStyledPoints.filter(
      point => point.finalOpacity !== HIDDEN_OPACITY
    );
    return {
      analysisPoints: analysisPointsForPlot,
      styledGroupedData: allStyledGroupedData,
      colorItems: colorItems, // Use the correctly sorted items
      shapeItems: shapeItems,
      sizeItems: sizeItems,
    };
  }, [allStyledGroupedData, colorByOption, shapeByOption, sizeByOption, bmdRefToExperimentNameMap]);

  // --- Final Return ---
  return finalPlotDataAndLegends;
};
