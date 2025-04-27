// src/components/analysis/GOUmapAnalysisUnit.tsx

import React, { useMemo, useEffect, useCallback } from 'react';
import { Row, Col, Spin, Alert, Space } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { usePreparedPlotData } from '../../hooks/usePreparedPlotData';
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import {
    selectReferenceDataMap,
    selectReferenceData,
} from '../../store/selectors/referenceDataSelector';
import {
    selectColorBy,
    selectShapeBy,
    selectSizeBy,
    // --- Selectors for ARRAYS (for CustomLegends props) ---
    selectHiddenColorLabels,
    selectHiddenShapeLabels,
    selectHiddenSizeLabels,
    // --- Selectors for SETS (for usePreparedPlotData hook) ---
    selectHiddenColorLabelsSet, // <<< IMPORTED
    selectHiddenShapeLabelsSet, // <<< IMPORTED
    selectHiddenSizeLabelsSet,  // <<< IMPORTED
    // -------------------------------------------------------
    selectGoIdFilterList,
    selectHighlightMode,
    selectAccumulationPlotSelectedGoIdsSet,
    toggleColorLabelVisibility,
    toggleShapeLabelVisibility,
    toggleSizeLabelVisibility,
} from '../../store/slices/analysisUISlice';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { BMDResult, CategoryAnalysisItem } from '../../models/BMDxExported';
import { useGetRawAnalysisDataQuery } from '../../store/apis/experimentsApi';

// --- Import Placeholders (Legends Removed) ---
import GoIdFilterUI from './placeholders/GoIdFilterUI';
import RankSliderUI from './placeholders/RankSliderUI';
import AccumulationPlot from './placeholders/AccumulationPlot';
import AnalysisDataTable from './placeholders/AnalysisDataTable';
// --- Import the REAL Legend Component ---
import CustomLegends from '../analysis/CustomLegends'; // Adjust path if needed
// --------------------------------------

// --- Border Colors & Helper (Unchanged) ---
const BORDER_COLORS = { /* ... */ };
const borderStyle = (color: string, level: number = 1) => ({ /* ... */ });
// ------------------------------------------

const GOUmapAnalysisUnit: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- Selectors ---
    const projectName = useAppSelector(selectSelectedProjectName);
    const selectedBmdResultRefs = useAppSelector(selectSelectedAnalysisRefs);
    const colorByOption = useAppSelector(selectColorBy);
    const shapeByOption = useAppSelector(selectShapeBy);
    const sizeByOption = useAppSelector(selectSizeBy);
    // --- Select ARRAYS for CustomLegends props ---
    const hiddenColorLabelsArray = useAppSelector(selectHiddenColorLabels);
    const hiddenShapeLabelsArray = useAppSelector(selectHiddenShapeLabels);
    const hiddenSizeLabelsArray = useAppSelector(selectHiddenSizeLabels);
    // --- Select SETS for usePreparedPlotData hook ---
    const hiddenColorLabelsSet = useAppSelector(selectHiddenColorLabelsSet); // <<< DEFINED
    const hiddenShapeLabelsSet = useAppSelector(selectHiddenShapeLabelsSet); // <<< DEFINED
    const hiddenSizeLabelsSet = useAppSelector(selectHiddenSizeLabelsSet);   // <<< DEFINED
    // -------------------------------------------------
    const goIdFilterList = useAppSelector(selectGoIdFilterList);
    const highlightMode = useAppSelector(selectHighlightMode);
    const selectedGoIdsSet = useAppSelector(selectAccumulationPlotSelectedGoIdsSet);
    const referenceData = useAppSelector(selectReferenceData);
    const referenceDataMap = useAppSelector(selectReferenceDataMap);

    // --- Data Fetching (Unchanged) ---
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

    // === Memoize Maps from Raw Data (Unchanged) ===
    const { bmdResultMap } = useMemo<{
        bmdResultMap: Map<number, BMDResult>;
    }>(() => { /* ... */
        const tempBmdResultMap = new Map<number, BMDResult>();
        if (rawSuccess && rawData) {
            rawData.rawBmdResults?.forEach((r) => {
                if (r && r['@ref'] != null) tempBmdResultMap.set(Number(r['@ref']), r);
            });
        }
        return { bmdResultMap: tempBmdResultMap };
    }, [rawSuccess, rawData]);

    // === Prepare Plot Data (Pass Sets to hook) ===
    const {
        analysisPoints,
        colorItems,
        shapeItems,
        sizeItems,
    } = usePreparedPlotData({ // No change needed here, already passing Set versions
        selectedBmdResultRefs: selectedBmdResultRefs || [],
        isLoadingDetails: isLoading,
        detailsError: queryError ? new Error(String(queryError)) : null,
        referenceDataMap: referenceDataMap,
        referenceData: referenceData,
        colorByOption,
        shapeByOption,
        sizeByOption,
        hiddenColorLabels: hiddenColorLabelsSet, // Pass Set
        hiddenShapeLabels: hiddenShapeLabelsSet, // Pass Set
        hiddenSizeLabels: hiddenSizeLabelsSet,   // Pass Set
        goIdFilterList,
        highlightMode,
        selectedGoIdsSet,
        committedRankSliderValue: [1, 100],
        bmdResultMap,
        rawCategoryAnalysisItems: rawData?.rawCategoryAnalysisItems || null,
        bmdRefToExperimentNameMap: null,
    });

    // --- Log arguments (Unchanged) ---
    useEffect(() => { /* ... */ }, [ /* ... */]);

    // --- Define Legend Toggle Callbacks (Unchanged) ---
    const handleToggleColorVisibility = useCallback((label: string) => {
        dispatch(toggleColorLabelVisibility(label));
    }, [dispatch]);
    const handleToggleShapeVisibility = useCallback((label: string) => {
        dispatch(toggleShapeLabelVisibility(label));
    }, [dispatch]);
    const handleToggleSizeVisibility = useCallback((label: string) => {
        dispatch(toggleSizeLabelVisibility(label));
    }, [dispatch]);
    // -------------------------------------------

    // === Render Logic (Unchanged checks) ===
    if (!projectName) { /* ... */ }
    if (isLoading) { /* ... */ }
    if (queryError) { /* ... */ }
    if (!selectedBmdResultRefs || selectedBmdResultRefs.length === 0) { /* ... */ }
    if (rawSuccess && (bmdResultMap.size === 0 || !rawData?.rawCategoryAnalysisItems || rawData.rawCategoryAnalysisItems.length === 0)) { /* ... */ }
    if (!isLoading && (!analysisPoints || analysisPoints.length === 0)) { /* ... */ }

    // --- Render Layout with REAL Legends (Pass Arrays to component) ---
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
                        {/* --- Pass ARRAYS to CustomLegends --- */}
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}>
                            <CustomLegends
                                cardTitle="Color"
                                colorItems={colorItems}
                                hiddenColorLabels={hiddenColorLabelsArray} // Pass ARRAY
                                onToggleColorVisibility={handleToggleColorVisibility}
                                showColor={true}
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                            />
                        </Col>
                        {/* ----------------------------------------- */}
                        <Col flex="auto" style={borderStyle(BORDER_COLORS.level5)}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div style={borderStyle(BORDER_COLORS.level6)}>
                                    <Row gutter={[16, 16]}>
                                        {selectedBmdResultRefs?.map((ref) => {
                                            const bmdInfo = bmdResultMap.get(Number(ref));
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
                        {/* --- Pass ARRAYS to CustomLegends --- */}
                        <Col flex="200px" style={borderStyle(BORDER_COLORS.level4)}>
                            <CustomLegends
                                cardTitle="Shape & Size"
                                shapeItems={shapeItems}
                                sizeItems={sizeItems}
                                hiddenShapeLabels={hiddenShapeLabelsArray} // Pass ARRAY
                                hiddenSizeLabels={hiddenSizeLabelsArray}   // Pass ARRAY
                                onToggleShapeVisibility={handleToggleShapeVisibility}
                                onToggleSizeVisibility={handleToggleSizeVisibility}
                                showShape={true}
                                showSize={true}
                                onToggleColorVisibility={handleToggleColorVisibility}
                            />
                        </Col>
                        {/* ------------------------------------------- */}
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
