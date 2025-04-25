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
    level1: 'red', level2: 'orange', level3: 'black', level4: 'green',
    level5: 'blue', level6: 'indigo', level7: 'violet',
};
const borderStyle = (color: string, level: number = 1) => ({
    border: `${level * 3}px solid ${color}`,
    padding: `${level * 6}px`,
    marginBottom: '24px',
    borderRadius: '8px',
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
    // ONLY create bmdResultMap for now. Log the raw category items.
    const { bmdResultMap } = useMemo<{ // <<< Only return bmdResultMap
        bmdResultMap: Map<number, BMDResult>;
    }>(() => {
        const logPrefix = '[GOUmapAnalysisUnit useMemo Maps v2]'; // <<< New log prefix
        const tempBmdResultMap = new Map<number, BMDResult>();

        // --- Log the raw category items received ---
        const rawItems = rawData?.rawCategoryAnalysisItems;
        const rawItemCount = Array.isArray(rawItems) ? rawItems.length : (rawItems ? 1 : 0);
        console.log(`${logPrefix} Received rawData.rawCategoryAnalysisItems: Type=${typeof rawItems}, IsArray=${Array.isArray(rawItems)}, Count=${rawItemCount}`);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
            console.log(`${logPrefix} First rawCategoryAnalysisItem sample:`, rawItems[0]); // Log first item
        }
        // -------------------------------------------

        if (rawSuccess && rawData) {
            // Logic for tempBmdResultMap (keep as is)
            rawData.rawBmdResults?.forEach((r) => {
                if (r && r['@ref'] != null) {
                    tempBmdResultMap.set(Number(r['@ref']), r);
                }
            });
            console.log(`${logPrefix} Created tempBmdResultMap with size: ${tempBmdResultMap.size}`);
        } else {
            console.log(`${logPrefix} Skipping map creation (rawSuccess=${rawSuccess}, rawData=${!!rawData})`);
        }

        // --- Return ONLY the bmdResultMap ---
        return { bmdResultMap: tempBmdResultMap };
        // ------------------------------------

    }, [rawSuccess, rawData]); // <<< Remove selectedBmdResultRefs dependency if only used for old map logic

    // --- REMOVE the dummy categoryItemsMap ---
    // const categoryItemsMap = useMemo(() => new Map<string, CategoryAnalysisItem[]>(), []);
    // ----------------------------------------

    // === Prepare Plot Data ===
    const { analysisPoints } = usePreparedPlotData({ // <<< Make sure args match new signature
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        isLoadingDetails: isLoading,
        detailsError: queryError ? new Error(String(queryError)) : null,
        referenceDataMap: referenceDataMap,
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
        bmdResultMap, // Pass the map created above
        // --- REMOVE categoryItemsMap argument ---
        // categoryItemsMap,
        // --- ADD rawCategoryAnalysisItems argument ---
        rawCategoryAnalysisItems: rawData?.rawCategoryAnalysisItems || null, // <<< ADDED
        bmdRefToExperimentNameMap: null, // Keep placeholders for now
        bmdRefShapeMap: null, // Keep placeholders for now
    });

    // Log analysisPoints when it changes
    // Log arguments before calling the hook
    useEffect(() => {
        // --- Log the actual raw items being passed ---
        const rawItems = rawData?.rawCategoryAnalysisItems;
        const rawItemCount = Array.isArray(rawItems) ? rawItems.length : (rawItems ? 1 : 0);
        // -------------------------------------------
        console.log('[GOUmapAnalysisUnit] Preparing arguments for usePreparedPlotData:', { // <<< CORRECTED LOG OBJECT
            selectedBmdResultRefs, isLoading, hasError: !!queryError,
            referenceDataExists: !!referenceData, referenceDataMapExists: !!referenceDataMap,
            colorByOption, shapeByOption, sizeByOption,
            hiddenColorLabelsSize: hiddenColorLabels?.size,
            hiddenShapeLabelsSize: hiddenShapeLabels?.size,
            hiddenSizeLabelsSize: hiddenSizeLabels?.size,
            goIdFilterList, highlightMode, selectedGoIdsSetSize: selectedGoIdsSet?.size,
            bmdResultMapSize: bmdResultMap?.size,
            rawCategoryAnalysisItemsCount: rawItemCount, // Log the count instead
        });
    }, [ // <<< CORRECTED DEPENDENCY ARRAY
        selectedBmdResultRefs, isLoading, queryError, referenceData, referenceDataMap,
        colorByOption, shapeByOption, sizeByOption, hiddenColorLabels, hiddenShapeLabels,
        hiddenSizeLabels, goIdFilterList, highlightMode, selectedGoIdsSet,
        bmdResultMap,
        rawData?.rawCategoryAnalysisItems // Depend on the raw data itself
    ]);


    // === Render Logic ===
    if (!projectName) { /* ... */ }
    if (isLoading) { /* ... */ }
    if (queryError) { /* ... */ }
    if (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { /* ... */ }
    // Check if data fetching succeeded but resulted in empty relevant data
    if (rawSuccess && (bmdResultMap.size === 0 || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0)) {
        console.warn('[GOUmapAnalysisUnit] Render check: rawSuccess is true, but bmdResultMap or rawCategoryAnalysisItems are empty.');
        return <Alert message="No Data Found" description="Successfully queried the project, but no matching BMD results or category analysis items were found for the selection." type="warning" showIcon />;
    }

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
