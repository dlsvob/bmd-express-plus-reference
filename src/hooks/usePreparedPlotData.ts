// src/hooks/usePreparedPlotData.ts

import { useMemo } from 'react';
import {
  UmapAnalysisDataValue,
  BaseCategoryAnalysisDataPoint,
} from '../models/ApplicationModelCompositional';
import { HighlightMode } from '../store/slices/analysisUISlice';
import { calculateOverlayStyles } from '../utils/styleUtils';
import { generateHaltonColors } from '../utils/colorUtils';
import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported';
import { ReferenceUmapItem } from '../data/referenceUmapData';
import { SHAPE_PALETTE } from '../config/analysisConstants'; // <<< Import SHAPE_PALETTE

const DEFAULT_MARKER_COLOR = '#cccccc'; // Keep for potential future use or remove if definitely not needed

// --- Args Interface (bmdRefShapeMap REMOVED) ---
export interface UsePreparedPlotDataArgs {
  selectedBmdResultRefs: string[];
  isLoadingDetails: boolean;
  detailsError: Error | null;
  referenceDataMap: Map<string, ReferenceUmapItem> | null; // Use specific type
  referenceData: ReferenceUmapItem[] | null;
  colorByOption: string;
  shapeByOption: string; // Needed for conditional map generation
  sizeByOption: string;
  hiddenColorLabels: Set<string>;
  hiddenShapeLabels: Set<string>;
  hiddenSizeLabels: Set<string>;
  goIdFilterList: string[];
  highlightMode: HighlightMode;
  selectedGoIdsSet: Set<string>;
  committedRankSliderValue: [number, number];
  bmdResultMap: Map<number, BMDResult>;
  rawCategoryAnalysisItems: Array<{ bmdResultRef: number | string; item: CategoryAnalysisItem }> | null;
  bmdRefToExperimentNameMap: Map<number, string> | null;
  // bmdRefShapeMap is removed from args, generated internally
}
// ---------------------------------------------

export interface UsePreparedPlotDataReturn {
  analysisPoints: UmapAnalysisDataValue[] | null;
  styledGroupedData: Map<string, UmapAnalysisDataValue[]> | null;
}

export const usePreparedPlotData = ({
  selectedBmdResultRefs,
  isLoadingDetails,
  detailsError,
  referenceDataMap,
  referenceData,
  colorByOption,
  shapeByOption, // <<< Destructure shapeByOption
  sizeByOption,
  hiddenColorLabels,
  hiddenShapeLabels,
  hiddenSizeLabels,
  goIdFilterList,
  highlightMode,
  selectedGoIdsSet,
  committedRankSliderValue,
  bmdResultMap,
  rawCategoryAnalysisItems,
  bmdRefToExperimentNameMap,
  // bmdRefShapeMap, // <<< REMOVED from destructuring
}: UsePreparedPlotDataArgs): UsePreparedPlotDataReturn => {
  const hookLogPrefix = '[usePreparedPlotData v6]'; // <<< Updated version prefix

  // --- Log received props ---
  console.log(`${hookLogPrefix} Hook rendered/re-rendered. Args received:`);
  console.log(`${hookLogPrefix} -> isLoadingDetails: ${isLoadingDetails}`);
  console.log(`${hookLogPrefix} -> detailsError: ${detailsError}`);
  console.log(`${hookLogPrefix} -> selectedBmdResultRefs: [${selectedBmdResultRefs?.join(', ')}]`);
  console.log(`${hookLogPrefix} -> bmdResultMap size: ${bmdResultMap?.size}`);
  const rawItemCount = Array.isArray(rawCategoryAnalysisItems) ? rawCategoryAnalysisItems.length : (rawCategoryAnalysisItems ? 1 : 0);
  console.log(`${hookLogPrefix} -> rawCategoryAnalysisItems: Type=${typeof rawCategoryAnalysisItems}, IsArray=${Array.isArray(rawCategoryAnalysisItems)}, Count=${rawItemCount}`);
  if (Array.isArray(rawCategoryAnalysisItems) && rawCategoryAnalysisItems.length > 0) {
    console.log(`${hookLogPrefix} -> First rawCategoryAnalysisItem object sample:`, rawCategoryAnalysisItems[0]);
  }
  console.log(`${hookLogPrefix} -> shapeByOption: ${shapeByOption}`); // Log shape option
  // --------------------------

  // 1) Determine if we can proceed
  const canProceed = useMemo(() => {
    const proceed =
      !isLoadingDetails &&
      !detailsError &&
      selectedBmdResultRefs.length > 0 &&
      bmdResultMap.size > 0 &&
      Array.isArray(rawCategoryAnalysisItems) && rawCategoryAnalysisItems.length > 0;
    console.log(`${hookLogPrefix} canProceed evaluated to: ${proceed}`);
    return proceed;
  }, [
    isLoadingDetails,
    detailsError,
    selectedBmdResultRefs,
    bmdResultMap,
    rawCategoryAnalysisItems,
  ]);

  // 2) Prepare baseGroupedData (Grouping logic implemented)
  const baseGroupedData = useMemo(() => {
    const logPrefix = '[usePreparedPlotData baseGroupedData v6]'; // <<< Updated version prefix
    if (!canProceed) {
      console.log(`${logPrefix} Skipping grouping: canProceed is false.`);
      return new Map<string, BaseCategoryAnalysisDataPoint[]>();
    }

    console.log(`${logPrefix} Grouping ${rawCategoryAnalysisItems?.length} raw items...`);
    const grouped = new Map<string, BaseCategoryAnalysisDataPoint[]>();

    rawCategoryAnalysisItems!.forEach(refItemPair => {
      const itemBmdRef = refItemPair?.bmdResultRef;
      const item = refItemPair?.item;

      if (itemBmdRef == null || !item) {
        console.warn(`${logPrefix} Skipping item with missing bmdResultRef or item data:`, refItemPair);
        return;
      }

      const numericBmdRef = Number(itemBmdRef);
      const refStringKey = String(itemBmdRef);
      const bmd = bmdResultMap.get(numericBmdRef);

      if (!bmd) {
        console.warn(`${logPrefix} Skipping item, BMD Result not found in map for ref ${numericBmdRef}`);
        return;
      }

      const goId = item?.categoryIdentifier?.id;
      const goTerm = item?.categoryIdentifier?.title;
      const direction = item?.overallDirection;
      const percentage = item?.percentage;
      const bmdFifthPercentileTotalGenes = item?.bmdFifthPercentileTotalGenes;
      const geneAllCount = item?.geneAllCount;
      const genesPassed = item?.genesThatPassedAllFilters;

      if (!goId) { return; }

      const basePoint: BaseCategoryAnalysisDataPoint = {
        go_id: goId,
        go_term: goTerm || 'Unknown Term',
        bmdResultRef: numericBmdRef,
        bmdResultName: bmd.name || 'Unnamed BMD Result',
        direction: direction,
        percentage: percentage,
        bmdFifthPercentileTotalGenes: bmdFifthPercentileTotalGenes,
        geneAllCount: geneAllCount,
        genesThatPassedAllFilters: genesPassed,
        finalColor: '', finalShape: '', finalSize: 0, finalOpacity: 0,
      };

      if (!grouped.has(refStringKey)) {
        grouped.set(refStringKey, []);
      }
      grouped.get(refStringKey)!.push(basePoint);
    });

    console.log(`${logPrefix} Finished grouping. Map size: ${grouped.size}. Keys: [${Array.from(grouped.keys()).join(', ')}]`);
    grouped.forEach((points, key) => {
      console.log(`${logPrefix} -> Group ${key} count: ${points.length}`);
    });

    return grouped;
  }, [canProceed, rawCategoryAnalysisItems, bmdResultMap]);

  // 3) build clusterColorMap from referenceData
  const clusterColorMap = useMemo(() => {
    const m = new Map<string, string>();
    const logPrefix = '[usePreparedPlotData clusterColorMap v6]'; // <<< Updated version prefix
    if (!canProceed || !referenceData) {
      console.log(`${logPrefix} Skipping map creation (canProceed=${canProceed}, hasReferenceData=${!!referenceData}).`);
      return m;
    }
    try {
      console.log(`${logPrefix} Generating map from ${referenceData.length} reference items.`);
      const clusterIds = Array.from(
        new Set(referenceData.map((r: ReferenceUmapItem) => String(r.cluster_id)))
      );
      console.log(`${logPrefix} Unique cluster IDs found:`, clusterIds);
      const colors = generateHaltonColors(clusterIds.length);
      clusterIds.forEach((cidString, i) => {
        m.set(cidString, colors[i % colors.length]);
      });
      console.log(`${logPrefix} Generated clusterColorMap. Map size: ${m.size}`);
    } catch (error) {
      console.error(`${logPrefix} Error during map generation:`, error);
    }
    return m;
  }, [canProceed, referenceData]);

  // --- NEW: Generate bmdRefShapeMap conditionally ---
  const bmdRefShapeMap = useMemo(() => {
    const logPrefix = '[usePreparedPlotData bmdRefShapeMap v6]';
    const shapeMap = new Map<number, string>();
    // Only generate if shapeBy is bmdResultName AND we can proceed
    if (!canProceed || shapeByOption !== 'bmdResultName') {
      console.log(`${logPrefix} Skipping shape map generation: canProceed=${canProceed}, shapeByOption=${shapeByOption}`);
      return shapeMap; // Return empty map if not needed
    }
    console.log(`${logPrefix} Generating shape map for ${selectedBmdResultRefs.length} selected refs (shapeBy=bmdResultName).`);

    // Define the desired order using indices from SHAPE_PALETTE
    const desiredShapeIndices = [0, 1, 8, 9, 2, 3]; // circle, square, triangle-up, triangle-down, diamond, cross

    selectedBmdResultRefs.forEach((refStr, index) => {
      const numericRef = Number(refStr);
      if (!isNaN(numericRef)) {
        const shapeOrderIndex = Math.min(index, desiredShapeIndices.length - 1);
        const paletteIndex = desiredShapeIndices[shapeOrderIndex];
        const shape = SHAPE_PALETTE[paletteIndex]; // Use the imported SHAPE_PALETTE

        shapeMap.set(numericRef, shape);
        console.log(`${logPrefix} -> Mapping Ref ${numericRef} to Shape '${shape}' (index ${index}, paletteIdx ${paletteIndex})`);
      } else {
        console.warn(`${logPrefix} Invalid numeric ref found: ${refStr}`);
      }
    });
    console.log(`${logPrefix} Finished shape map generation. Size: ${shapeMap.size}`);
    return shapeMap;
  }, [canProceed, selectedBmdResultRefs, shapeByOption]); // <<< ADD shapeByOption dependency
  // ------------------------------------

  // 4) style each overlay point
  const styledGroupedData = useMemo(() => {
    const logPrefix = '[usePreparedPlotData styledGroupedData v6]'; // <<< Updated version prefix
    if (!canProceed || baseGroupedData.size === 0 || !referenceDataMap) {
      console.log(`${logPrefix} Skipping styling: canProceed=${canProceed}, baseGroupedData size=${baseGroupedData.size}, hasRefMap=${!!referenceDataMap}`);
      return null;
    }
    console.log(`${logPrefix} Preparing to call calculateOverlayStyles with ${baseGroupedData.size} groups...`);
    return calculateOverlayStyles(
      baseGroupedData,
      { colorBy: colorByOption, shapeBy: shapeByOption, sizeBy: sizeByOption },
      hiddenColorLabels,
      hiddenShapeLabels,
      hiddenSizeLabels,
      goIdFilterList,
      highlightMode,
      bmdRefToExperimentNameMap,
      selectedGoIdsSet,
      referenceDataMap,
      clusterColorMap,
      bmdRefShapeMap, // <<< Pass the generated map
      committedRankSliderValue
    );
  }, [
    canProceed,
    baseGroupedData,
    referenceDataMap,
    clusterColorMap,
    colorByOption,
    shapeByOption, // Keep dependency
    sizeByOption,
    hiddenColorLabels,
    hiddenShapeLabels,
    hiddenSizeLabels,
    goIdFilterList,
    highlightMode,
    bmdRefToExperimentNameMap,
    selectedGoIdsSet,
    bmdRefShapeMap, // <<< Add generated map to dependencies
    committedRankSliderValue,
  ]);

  // 5) flatten into a single array
  const analysisPoints = useMemo(() => {
    const logPrefix = '[usePreparedPlotData analysisPoints v6]'; // <<< Updated version prefix
    if (!styledGroupedData) {
      console.log(`${logPrefix} No styledGroupedData to flatten.`);
      return null;
    }
    const flattened = Array.from(styledGroupedData.values()).flat();
    console.log(`${logPrefix} Flattened data. Point count: ${flattened.length}`);
    return flattened;
  }, [styledGroupedData]);

  if (isLoadingDetails || detailsError) {
    console.log(`${hookLogPrefix} Returning null due to loading/error state.`);
    return { analysisPoints: null, styledGroupedData: null };
  }
  console.log(`${hookLogPrefix} Returning analysisPoints (count: ${analysisPoints?.length ?? 0}) and styledGroupedData (size: ${styledGroupedData?.size ?? 0})`);
  return { analysisPoints, styledGroupedData };
};
