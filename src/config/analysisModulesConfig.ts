// src/config/analysisModulesConfig.ts
import React from 'react';
import { DetailedAnalysisData, UmapAnalysisDataValue } from '../models/ApplicationModel'; // Use correct type
import { ReferenceUmapItem } from '../data/referenceUmapData';
import { HighlightMode } from '../store/slices/analysisUISlice';
import type { RadioChangeEvent } from 'antd';
import CategoryAnalysisContainer from '../components/analysis_modules/CategoryAnalysisContainer'; // Adjust path

// Defines the context object created in AnalyzeProject and passed down
export interface AnalysisContext {
  // --- Core Data & Accessors ---
  referenceData: ReferenceUmapItem[] | null;
  referenceDataMap: Map<string, ReferenceUmapItem> | null;
  styledGroupedData: Map<number, UmapAnalysisDataValue[]> | null; // Grouped version (optional)
  analysisPoints: UmapAnalysisDataValue[]; // Renamed flattened array
  bmdRefToExperimentNameMap: Map<number, string>;
  getAnalysisDetails: (ref: number) => DetailedAnalysisData | null;
  selectedRefs: number[];
  loading?: boolean; // Pass down loading state

  // --- Global UI State ---
  colorByOption: string;
  shapeByOption: string;
  sizeByOption: string;
  hiddenColorLabels: string[];
  hiddenShapeLabels: string[];
  hiddenSizeLabels: string[];
  goIdInputString: string;
  highlightMode: HighlightMode;
  goIdFilterList: string[];

  // --- UMAP Rank Slider State ---
  committedRankSliderValue: [number, number];
  minRank: number;
  maxRank: number;
  isRankSliderDisabled: boolean;

  // --- Callbacks / Dispatchers ---
  onColorByChange: (value: string) => void;
  onShapeByChange: (value: string) => void;
  onSizeByChange: (value: string) => void;
  onToggleColorVisibility: (label: string) => void;
  onToggleShapeVisibility: (label: string) => void;
  onToggleSizeVisibility: (label: string) => void;
  onGoIdInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onHighlightModeChange: (e: RadioChangeEvent) => void;
  onRankSliderAfterChange: (value: [number, number]) => void;
}

// Config for top-level modules rendered by AnalyzeProject
export interface AnalysisModuleConfig {
  id: string;
  title: string;
  component: React.ElementType; // Use ElementType for flexibility
  // propsMapping takes the full context from AnalyzeProject
  propsMapping: (context: AnalysisContext) => Record<string, unknown>;
  condition?: (context: AnalysisContext) => boolean;
}

export const analysisModulesConfig: AnalysisModuleConfig[] = [
  {
    id: 'categoryAnalysis', // This module renders CategoryAnalysisContainer
    title: 'Category Analysis & Projection',
    component: CategoryAnalysisContainer,
    // Render this container only when analyses are selected
    condition: (context) => context.selectedRefs.length > 0,
    // This maps the AnalysisContext to the props received by CategoryAnalysisContainer
    // Pass down the full context for simplicity, or cherry-pick needed props
    propsMapping: (context) => ({ ...context }), // Pass everything down
    /* Alternative: Cherry-pick if preferred
    propsMapping: (context) => ({
        referenceData: context.referenceData,
        referenceDataMap: context.referenceDataMap,
        styledGroupedData: context.styledGroupedData,
        analysisPoints: context.analysisPoints,
        bmdRefToExperimentNameMap: context.bmdRefToExperimentNameMap,
        getAnalysisDetails: context.getAnalysisDetails,
        selectedRefs: context.selectedRefs,
        loading: context.loading,
        colorByOption: context.colorByOption,
        // ... include all other context properties needed downstream ...
        onRankSliderAfterChange: context.onRankSliderAfterChange,
    }),
    */
  },
  // Add entries for other major analysis modules here (like ActiveGeneProfileAnalysisContainer)
];
