// src/config/umapAnalysisLayoutConfig.ts
import React from 'react';
import { OverlayPlotPoint } from '../models/applicationModel'; // Adjust path
import { ReferenceUmapItem } from '../data/referenceUmapData'; // Adjust path
import { HighlightMode } from '../store/slices/analysisUISlice'; // Adjust path
import type { RadioChangeEvent } from 'antd';

// Import the components
import GoIdFilterUI from '../components/GoIdFilterUI'; // New wrapper
import UmapRankSlider from '../components/UmapRankSlider';
import StylingSelectors from '../components/analysis/controls/StylingSelectors';
import CustomLegends from '../components/CustomLegends';
import SharedPlotDisplay from '../components/SharedPlotDisplay';
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from './analysisConstants'; // Import constants

// Define the context available *within* UmapAnalysis for its children
export interface UmapAnalysisInternalContext {
    // Data (Passed down from AnalyzeProject)
    referenceData: ReferenceUmapItem[] | null;
    styledGroupedData: Map<number, OverlayPlotPoint[]> | null;
    allStyledPointsForLegend: OverlayPlotPoint[];
    bmdRefToExperimentNameMap: Map<number, string>;

    // Global Styling/Highlight State (Passed down)
    colorByOption: string;
    shapeByOption: string;
    sizeByOption: string;
    hiddenColorLabels: string[];
    hiddenShapeLabels: string[];
    hiddenSizeLabels: string[];
    goIdInputString: string;
    highlightMode: HighlightMode;
    goIdFilterList: string[];

    // Slider State/Callbacks (Passed down)
    rankSliderValue: [number, number]; // Assume defined when needed
    onRankSliderChange: (value: [number, number]) => void;
    onRankSliderAfterChange: (value: [number, number]) => void;
    minRank: number;
    maxRank: number;
    isRankSliderDisabled: boolean;

    // Global Control Callbacks (Passed down)
    onColorByChange: (value: string) => void;
    onShapeByChange: (value: string) => void;
    onSizeByChange: (value: string) => void;
    onToggleColorVisibility: (label: string) => void;
    onToggleShapeVisibility: (label: string) => void;
    onToggleSizeVisibility: (label: string) => void;
    onGoIdInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onHighlightModeChange: (e: RadioChangeEvent) => void;
}

// Define the structure for each internal component configuration
export interface UmapComponentConfig {
    id: string; // Unique ID for key
    component: React.ComponentType<any>; // The actual component
    // Function to map the internal context to props for this specific component
    propsMapping: (context: UmapAnalysisInternalContext) => Record<string, any>;
    // Optional condition function
    condition?: (context: UmapAnalysisInternalContext) => boolean;
    // Optional: Hint for layout placement (can be refined later)
    layoutArea?: 'filter' | 'controlsLeft' | 'controlsRight' | 'plot' | 'legendLeft' | 'legendRight';
}

// --- Configuration Array ---
export const umapAnalysisLayoutConfig: UmapComponentConfig[] = [
    {
        id: 'goFilter',
        component: GoIdFilterUI,
        layoutArea: 'filter', // Add layout hint
        propsMapping: (context) => ({
            goIdInputString: context.goIdInputString,
            highlightMode: context.highlightMode,
            onGoIdInputChange: context.onGoIdInputChange,
            onHighlightModeChange: context.onHighlightModeChange,
        }),
    },
    {
        id: 'rankSlider',
        component: UmapRankSlider,
        layoutArea: 'controlsLeft', // Add layout hint
        propsMapping: (context) => ({
            minRank: context.minRank,
            maxRank: context.maxRank,
            value: context.rankSliderValue,
            onChange: context.onRankSliderChange,
            onAfterChange: context.onRankSliderAfterChange,
            disabled: context.isRankSliderDisabled,
            analysisName: 'UMAPRankSlider', // Can be hardcoded or passed
        }),
    },
    {
        id: 'stylingSelectors',
        component: StylingSelectors,
        layoutArea: 'controlsRight', // Add layout hint
        propsMapping: (context) => ({
            colorByOption: context.colorByOption,
            shapeByOption: context.shapeByOption,
            sizeByOption: context.sizeByOption,
            onColorByChange: context.onColorByChange,
            onShapeByChange: context.onShapeByChange,
            onSizeByChange: context.onSizeByChange,
            colorOptions: COLOR_BY_OPTIONS, // Use imported constants
            shapeOptions: SHAPE_BY_OPTIONS,
            sizeOptions: SIZE_BY_OPTIONS,
            disabled: context.isRankSliderDisabled, // Example dependency
        }),
    },
    {
        id: 'colorLegend',
        component: CustomLegends,
        layoutArea: 'legendLeft', // Add layout hint
        // Condition: Only show if there's data to display in the legend
        condition: (context) => context.allStyledPointsForLegend.length > 0,
        propsMapping: (context) => ({
            // Common props
            colorBy: context.colorByOption,
            shapeBy: context.shapeByOption,
            sizeBy: context.sizeByOption,
            // Derive legend items (this logic might move to context creation later)
            colorItems: deriveLegendItems(context).colorItems,
            shapeItems: deriveLegendItems(context).shapeItems,
            sizeItems: deriveLegendItems(context).sizeItems,
            hiddenColorLabels: context.hiddenColorLabels,
            hiddenShapeLabels: context.hiddenShapeLabels,
            hiddenSizeLabels: context.hiddenSizeLabels,
            onToggleColorVisibility: context.onToggleColorVisibility,
            onToggleShapeVisibility: context.onToggleShapeVisibility,
            onToggleSizeVisibility: context.onToggleSizeVisibility,
            // Specific props for this instance
            showColor: true,
            showShape: false,
            showSize: false,
            cardTitle: 'Color',
        }),
    },
    {
        id: 'plot',
        component: SharedPlotDisplay,
        layoutArea: 'plot', // Add layout hint
        // Condition: Only show if there's data to plot
        condition: (context) => !!context.styledGroupedData,
        propsMapping: (context) => ({
            referenceData: context.referenceData,
            styledGroupedData: context.styledGroupedData,
            colorBy: context.colorByOption, // Pass these down if needed by SharedPlotDisplay internally
            shapeBy: context.shapeByOption,
            sizeBy: context.sizeByOption,
        }),
    },
    {
        id: 'shapeSizeLegend',
        component: CustomLegends,
        layoutArea: 'legendRight', // Add layout hint
        condition: (context) => context.allStyledPointsForLegend.length > 0,
        propsMapping: (context) => ({
            // Common props (same derivation as colorLegend)
            colorBy: context.colorByOption,
            shapeBy: context.shapeByOption,
            sizeBy: context.sizeByOption,
            colorItems: deriveLegendItems(context).colorItems,
            shapeItems: deriveLegendItems(context).shapeItems,
            sizeItems: deriveLegendItems(context).sizeItems,
            hiddenColorLabels: context.hiddenColorLabels,
            hiddenShapeLabels: context.hiddenShapeLabels,
            hiddenSizeLabels: context.hiddenSizeLabels,
            onToggleColorVisibility: context.onToggleColorVisibility,
            onToggleShapeVisibility: context.onToggleShapeVisibility,
            onToggleSizeVisibility: context.onToggleSizeVisibility,
            // Specific props for this instance
            showColor: false,
            showShape: true,
            showSize: true,
            cardTitle: 'Shape & Size',
        }),
    },
];

// --- Helper to derive legend items (similar to original UmapAnalysis useMemo) ---
// NOTE: This logic might be better placed within the context creation in UmapAnalysis
//       or potentially moved to a dedicated selector/hook if it gets complex.
//       For now, keep it here for simplicity in the config step.
type LegendItems = {
    colorItems: [string, string][];
    shapeItems: [string, string][];
    sizeItems: [string, number][];
}
const deriveLegendItems = (context: UmapAnalysisInternalContext): LegendItems => {
    // Placeholder: Copy the logic from the original UmapAnalysis useMemo here,
    // using context.allStyledPointsForLegend, context.colorByOption, etc.
    // This is a temporary location for the logic.
    const uniqueLabelsAndColors = new Map<string, string>();
    const uniqueLabelsAndShapes = new Map<string, string>();
    const uniqueLabelsAndSizes = new Map<string, number>();

    // Constants needed for derivation (can be imported or defined here)
    const DEFAULT_SHAPE_LABEL = "Circle";
    const DEFAULT_SIZE_LABEL = "Fixed Size";
    const SIZE_BIN_LABELS: Record<number, string> = {}; // Populate as before
    [6, 8, 10, 12, 14, 16, 18, 20, 22, 24].forEach((size, i) => {
        const bins = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const lower = i === 0 ? 0 : bins[i - 1];
        const upper = bins[i];
        SIZE_BIN_LABELS[size] = `${lower} < % <= ${upper}`;
    });
    const DIRECTION_LABELS: Record<string, string> = {
        'triangle-up': 'Up', 'triangle-down': 'Down', 'cross': 'Conflict', 'circle': 'None/Other',
    };
    const getDirectionLegendName = (shapeSymbol: string): string => DIRECTION_LABELS[shapeSymbol] || shapeSymbol;


    context.allStyledPointsForLegend.forEach((point) => {
        // Color
        let colorLabel: string;
        switch (context.colorByOption) {
            case 'bmdResultName':
                colorLabel = context.bmdRefToExperimentNameMap.get(point.bmdResultRef) || point.bmdResultName;
                break;
            case 'direction':
                colorLabel = getDirectionLegendName(point.finalShape);
                break;
            case 'cluster_id':
                colorLabel = `Cluster ${point.cluster_id}`;
                break;
            default:
                colorLabel = context.bmdRefToExperimentNameMap.get(point.bmdResultRef) || point.bmdResultName;
                break;
        }
        if (colorLabel && !uniqueLabelsAndColors.has(colorLabel)) {
            uniqueLabelsAndColors.set(colorLabel, point.finalColor);
        }
        // Shape
        let shapeLabel: string;
        switch (context.shapeByOption) {
            case 'bmdResultName':
                shapeLabel = context.bmdRefToExperimentNameMap.get(point.bmdResultRef) || point.bmdResultName;
                break;
            case 'direction':
                shapeLabel = getDirectionLegendName(point.finalShape);
                break;
            case 'none': default: shapeLabel = DEFAULT_SHAPE_LABEL; break;
        }
        if (context.shapeByOption !== 'none' || !uniqueLabelsAndShapes.has(shapeLabel)) {
            if (shapeLabel && !uniqueLabelsAndShapes.has(shapeLabel)) {
                uniqueLabelsAndShapes.set(shapeLabel, point.finalShape);
            }
        }
        // Size
        let sizeLabel: string;
        switch (context.sizeByOption) {
            case 'percentage': sizeLabel = SIZE_BIN_LABELS[point.finalSize] || `${point.finalSize} px`; break;
            case 'none': default: sizeLabel = DEFAULT_SIZE_LABEL; break;
        }
        if (context.sizeByOption !== 'none' || !uniqueLabelsAndSizes.has(sizeLabel)) {
            if (sizeLabel && !uniqueLabelsAndSizes.has(sizeLabel)) {
                uniqueLabelsAndSizes.set(sizeLabel, point.finalSize);
            }
        }
    });

    // Sorting logic (same as before)
    const sortedColorItems: [string, string][] = Array.from(uniqueLabelsAndColors.entries()).sort(/*...*/);
    const sortedShapeItems: [string, string][] = Array.from(uniqueLabelsAndShapes.entries()).sort(/*...*/);
    const sortedSizeItems: [string, number][] = Array.from(uniqueLabelsAndSizes.entries()).sort(/*...*/);

    return { colorItems: sortedColorItems, shapeItems: sortedShapeItems, sizeItems: sortedSizeItems };
};
