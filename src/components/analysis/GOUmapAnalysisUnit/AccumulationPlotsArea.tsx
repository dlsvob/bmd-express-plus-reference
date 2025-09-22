// src/components/analysis/GOUmapAnalysisUnit/AccumulationPlotsArea.tsx

import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import AccumulationPlot from './AccumulationPlot';
import type { AnalysisTableRow } from '../../../models/applicationModel';

const { Title } = Typography;

type UmapViewMode = 'single' | 'multiple';

export interface AccumulationPlotsAreaProps {
    viewMode: UmapViewMode;
    selectedRefs: string[];
    bmdRefToNameMap: Map<number, string>;
    allStyledPoints: AnalysisTableRow[] | null;
    plotHeight: string | null;
    defaultPlotHeight: string;

    // Styling
    horizontalScrollRowStyle: React.CSSProperties;
    accumTitleStyle: React.CSSProperties;

    // Optional style overrides
    style?: React.CSSProperties;
}

const AccumulationPlotsArea: React.FC<AccumulationPlotsAreaProps> = ({
    viewMode,
    selectedRefs,
    bmdRefToNameMap,
    allStyledPoints,
    plotHeight,
    defaultPlotHeight,
    horizontalScrollRowStyle,
    accumTitleStyle,
    style
}) => {
    // Don't render if no refs selected
    if (!selectedRefs || selectedRefs.length === 0) {
        return null;
    }

    // For single view mode, render as a separate card
    if (viewMode === 'single') {
        return (
            <Card
                size="small"
                title="Individual Accumulation Plots"
                bordered={false}
                style={{
                    width: '100%',
                    marginBottom: '16px',
                    ...style
                }}
            >
                <Row
                    gutter={[16, 0]}
                    style={horizontalScrollRowStyle}
                    align="top"
                >
                    {selectedRefs.map((refStr) => {
                        const numericRef = Number(refStr);
                        if (isNaN(numericRef)) return null;

                        const analysisNameForPlot = bmdRefToNameMap.get(numericRef) || `Analysis ${numericRef}`;
                        const pointsForThisAccumPlot = allStyledPoints?.filter(
                            (p) => p.bmdResultRef === numericRef
                        ) || null;

                        // Skip if no points
                        if (!pointsForThisAccumPlot || pointsForThisAccumPlot.length === 0) return null;

                        return (
                            <Col
                                key={`single-accum-${refStr}`}
                                style={{
                                    width: '350px',
                                    flexShrink: 0,
                                    paddingBottom: '16px',
                                }}
                            >
                                <Title level={5} style={accumTitleStyle} title={analysisNameForPlot}>
                                    {analysisNameForPlot}
                                </Title>
                                <AccumulationPlot
                                    analysisName={analysisNameForPlot}
                                    styledPointsForPlot={pointsForThisAccumPlot}
                                    bmdResultRef={numericRef}
                                    height={plotHeight ?? defaultPlotHeight}
                                />
                            </Col>
                        );
                    })}
                </Row>
            </Card>
        );
    }

    // For multiple view mode, this component isn't used directly
    // (accumulation plots are rendered within each analysis card)
    return null;
};

export default AccumulationPlotsArea;