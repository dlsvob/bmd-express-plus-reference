// src/components/analysis/GOUmapAnalysisUnit.tsx

import React, { useMemo, useEffect } from 'react';
import { Row, Col, Spin, Alert, Space } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector } from '../../store/hooks';
import { usePreparedPlotData } from '../../hooks/usePreparedPlotData';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap, // Keep this import
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
import {
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    selectHiddenColorLabelsSet,
    selectHiddenShapeLabelsSet,
    selectHiddenSizeLabelsSet,
    selectGoIdFilterList,
    selectHighlightMode,
    selectAccumulationPlotSelectedGoIdsSet,
} from '../../store/slices/analysisUISlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { BMDResult, CategoryAnalysisItem } from '../../models/BMDxExported';
import {
    useGetRawAnalysisDataQuery,
} from '../../store/apis/experimentsApi';

// --- Import Placeholders ---
import GoIdFilterUI from './placeholders/GoIdFilterUI';
import RankSliderUI from './placeholders/RankSliderUI';
import AccumulationPlot from './placeholders/AccumulationPlot';
import ColorLegend from './placeholders/ColorLegend';
import ShapeSizeLegend from './placeholders/ShapeSizeLegend';
import AnalysisDataTable from './placeholders/AnalysisDataTable';
// -----------------------------

// --- Border Colors & Helper ---
const BORDER_COLORS = {
    level1: 'red', level2: 'orange', level3: 'yellow', level4: 'green',
    level5: 'blue', level6: 'indigo', level7: 'violet',
};
const borderStyle = (color: string, level: number = 1) => ({
    border: `${level * 2}px solid ${color}`,
    padding: `${level * 4}px`,
    marginBottom: '10px',
});
// --------------------------

const GOUmapAnalysisUnit: React.FC = () => {
    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    const hiddenColorLabels = useAppSelector(selectHiddenColorLabelsSet);
    const hiddenShapeLabels = useAppSelector(selectHiddenShapeLabelsSet);
    const hiddenSizeLabels = useAppSelector(selectHiddenSizeLabelsSet);
    const goIdFilterList = useAppSelector(selectGoIdFilterList);
    const highlightMode = useAppSelector(selectHighlightMode);
    const selectedGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
    const referenceData = useAppSelector(selectReferenceData);
    const referenceDataMap = useAppSelector(selectReferenceDataMap); // Keep this selector

    // --- Data Fetching ---
    const {
        data: rawData,
        isLoading: isLoadingRaw,
        error: rawError,
        isSuccess: rawSuccess,
    } = useGetRawAnalysisDataQuery(
        { projectName, selectedBmdResultRefs },
        { skip: !projectName || !selectedBmdResultRefs || selectedBmdResultRefs.length === 0 }
    );

    const isLoading = isLoadingRaw;
    const queryError = rawError;

    // === Memoize Maps from Raw Data ===
    // Destructure the results directly into bmdResultMap and categoryItemsMap
    const { bmdResultMap, categoryItemsMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
        categoryItemsMap: Map<string, CategoryAnalysisItem[]>;
    }>(() => {
        const logPrefix = '[GOUmapAnalysisUnit useMemo Maps]';
        // Define temporary maps inside the memo callback
        const tempBmdResultMap = new Map<number, BMDResult>();
        const tempCategoryItemsMap = new Map<string, CategoryAnalysisItem[]>();

        if (rawSuccess && rawData) {
            rawData.rawBmdResults?.forEach((r) => {
                if (r && r['@ref'] != null) {
                    tempBmdResultMap.set(Number(r['@ref']), r);
                }
            });

            if (selectedBmdResultRefs?.length === 1 && rawData.rawCategoryAnalysisItems) {
                const singleRefKey = selectedBmdResultRefs[0];
                tempCategoryItemsMap.set(singleRefKey, rawData.rawCategoryAnalysisItems);
            }
        }
        // Return the populated temporary maps
        return { bmdResultMap: tempBmdResultMap, categoryItemsMap: tempCategoryItemsMap };
    }, [rawSuccess, rawData, selectedBmdResultRefs]); // Correct dependencies

    // Log arguments before calling the hook
    useEffect(() => {
        console.log('[GOUmapAnalysisUnit] Preparing arguments for usePreparedPlotData:', {
            selectedBmdResultRefs, isLoading, hasError: !!queryError,
            referenceDataExists: !!referenceData, referenceDataMapExists: !!referenceDataMap,
            colorByOption, shapeByOption, sizeByOption,
            hiddenColorLabelsSize: hiddenColorLabels?.size,
            hiddenShapeLabelsSize: hiddenShapeLabels?.size,
            hiddenSizeLabelsSize: hiddenSizeLabels?.size,
            goIdFilterList, highlightMode, selectedGoIdsSetSize: selectedGoIdsSet?.size,
            bmdResultMapSize: bmdResultMap?.size, // Use the destructured map
            categoryItemsMapSize: categoryItemsMap?.size, // Use the destructured map
        });
    }, [
        selectedBmdResultRefs, isLoading, queryError, referenceData, referenceDataMap,
        colorByOption, shapeByOption, sizeByOption, hiddenColorLabels, hiddenShapeLabels,
        hiddenSizeLabels, goIdFilterList, highlightMode, selectedGoIdsSet,
        bmdResultMap, categoryItemsMap // Add maps to dependency array
    ]);


    // === Prepare Plot Data ===
    const { analysisPoints } = usePreparedPlotData({
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        isLoadingDetails: isLoading,
        detailsError: queryError ? new Error(String(queryError)) : null,
        referenceDataMap: referenceDataMap, // Pass the selected map
        referenceData: referenceData,
        colorByOption,
        shapeByOption,
        sizeByOption,
        hiddenColorLabels,
        hiddenShapeLabels,
        hiddenSizeLabels,
        goIdFilterList,
        highlightMode,
        selectedGoIdsSet,
        committedRankSliderValue: [1, 100], // Use default/state
        bmdResultMap, // Pass the destructured map
        categoryItemsMap, // Pass the destructured map
        bmdRefToExperimentNameMap: null,
        bmdRefShapeMap: null,
    });

    // Log analysisPoints when it changes
    useEffect(() => {
        console.log('[GOUmapAnalysisUnit] analysisPoints updated:', analysisPoints ? `Array(${analysisPoints.length})` : analysisPoints);
    }, [analysisPoints]);


    // === Render Logic ===
    if (!projectName) { /* ... */ }
    if (isLoading) { /* ... */ }
    if (queryError) { /* ... */ }
    if (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { /* ... */ }
    if (rawSuccess && (bmdResultMap.size === 0 || categoryItemsMap.size === 0)) { /* ... */ }
    if (!isLoading && (!analysisPoints || analysisPoints.length === 0)) {
        if (rawSuccess) {
            console.warn('[GOUmapAnalysisUnit] Render check: rawSuccess is true, but analysisPoints is null or empty.');
            return <Alert message="No Points to Display" description="Data loaded, but no points matched the current filter or visibility criteria." type="info" showIcon />;
        } else {
            return <Alert message="Plot Preparation Error" description="Failed to prepare data points for visualization." type="error" showIcon />;
        }
    }

    // --- Render New Layout ---
    return (
        <div style={borderStyle(BORDER_COLORS.level1)}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Filters Row */}
                <div style={borderStyle(BORDER_COLORS.level2)}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}> <GoIdFilterUI /> </Col>
                        <Col span={24}> <RankSliderUI /> </Col>
                    </Row>
                </div>
                {/* Plots/Legends Row */}
                <div style={borderStyle(BORDER_COLORS.level3)}>
                    <Row gutter={[16, 16]} wrap={false}>
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}> <ColorLegend /> </Col>
                        <Col flex="auto" style={borderStyle(BORDER_COLORS.level5)}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div style={borderStyle(BORDER_COLORS.level6)}>
                                    <Row gutter={[16, 16]}>
                                        {selectedBmdResultRefs?.map((ref) => {
                                            // *** CORRECTED VARIABLE NAME HERE ***
                                            const bmdInfo = bmdResultMap.get(Number(ref));
                                            // **********************************
                                            return (
                                                <Col key={ref} xs={24} sm={12} md={8} lg={6}>
                                                    <AccumulationPlot analysisName={bmdInfo?.name || `Analysis ${ref}`} />
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </div>
                                <div style={borderStyle(BORDER_COLORS.level7)}>
                                    <UmapPlotComponent
                                        data={analysisPoints || []}
                                        referenceData={referenceData}
                                    />
                                </div>
                            </Space>
                        </Col>
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}> <ShapeSizeLegend /> </Col>
                    </Row>
                </div>
                {/* Table Row */}
                <div style={borderStyle(BORDER_COLORS.level2)}>
                    <Row>
                        <Col span={24}> <AnalysisDataTable /> </Col>
                    </Row>
                </div>
            </Space>
        </div>
    );
};

export default GOUmapAnalysisUnit;
