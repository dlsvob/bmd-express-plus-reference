// src/config/categoryAnalysisLayoutConfig.ts
import React from 'react';
// Import the components to be rendered by CategoryAnalysisContainer
import { GOUmapAnalysis, GOUmapAnalysisProps } from '../components/GOUmapAnalysis'; // Adjust path
import AnalysisDetailsList, { AnalysisDetailsListProps } from '../components/AnalysisDetailsList'; // Adjust path
// Import the context type provided by the parent (AnalyzeProject -> CategoryAnalysisContainer)
import { AnalysisContext as CategoryAnalysisInternalContext } from './analysisModulesConfig'; // Adjust path

export type { CategoryAnalysisInternalContext };

// Config for components rendered *within* CategoryAnalysisContainer
export interface CategoryAnalysisLayoutComponentConfig {
  id: string;
  component: React.ElementType; // Use ElementType
  // propsMapping takes the context received by CategoryAnalysisContainer
  propsMapping: (context: CategoryAnalysisInternalContext) => Record<string, unknown>;
  condition?: (context: CategoryAnalysisInternalContext) => boolean;
}

export const categoryAnalysisLayoutConfig: CategoryAnalysisLayoutComponentConfig[] = [
  {
    // Renders the main UMAP analysis view container
    id: 'umap', // Changed ID to reflect component name
    component: GOUmapAnalysis,
    // Maps context received by CategoryAnalysisContainer to GOUmapAnalysisProps
    // Pass down the necessary parts of the context
    propsMapping: (context: CategoryAnalysisInternalContext): Partial<GOUmapAnalysisProps> => ({
      analysisPoints: context.analysisPoints,
      bmdRefToExperimentNameMap: context.bmdRefToExperimentNameMap,
      loading: context.loading,
      referenceData: context.referenceData,
      styledGroupedData: context.styledGroupedData,
      colorByOption: context.colorByOption,
      shapeByOption: context.shapeByOption,
      sizeByOption: context.sizeByOption,
      hiddenColorLabels: context.hiddenColorLabels,
      hiddenShapeLabels: context.hiddenShapeLabels,
      hiddenSizeLabels: context.hiddenSizeLabels,
      goIdInputString: context.goIdInputString,
      highlightMode: context.highlightMode,
      goIdFilterList: context.goIdFilterList,
      committedRankSliderValue: context.committedRankSliderValue,
      minRank: context.minRank,
      maxRank: context.maxRank,
      isRankSliderDisabled: context.isRankSliderDisabled,
      onColorByChange: context.onColorByChange,
      onShapeByChange: context.onShapeByChange,
      onSizeByChange: context.onSizeByChange,
      onToggleColorVisibility: context.onToggleColorVisibility,
      onToggleShapeVisibility: context.onToggleShapeVisibility,
      onToggleSizeVisibility: context.onToggleSizeVisibility,
      onGoIdInputChange: context.onGoIdInputChange,
      onHighlightModeChange: context.onHighlightModeChange,
      onRankSliderAfterChange: context.onRankSliderAfterChange,
      // Pass props needed by GOUmapAnalysis to render multiple Accumulation Plots
      selectedRefs: context.selectedRefs,
      getAnalysisDetails: context.getAnalysisDetails,
      referenceDataMap: context.referenceDataMap,
    }),
  },
  {
    // Renders the details list (as a sibling to the main GOUmapAnalysis view)
    id: 'detailsList',
    component: AnalysisDetailsList,
    condition: (context) => context.selectedRefs.length > 0,
    propsMapping: (context: CategoryAnalysisInternalContext): AnalysisDetailsListProps => ({
      selectedRefs: context.selectedRefs,
      getAnalysisDetails: context.getAnalysisDetails,
    }),
  },
  // Remove entries for GOUmapAnalysisTable and AccumulationPlot here,
  // as they are now rendered *inside* GOUmapAnalysis.
];
