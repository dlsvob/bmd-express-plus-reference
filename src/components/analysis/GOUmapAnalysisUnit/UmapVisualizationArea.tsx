// src/components/analysis/GOUmapAnalysisUnit/UmapVisualizationArea.tsx

import React, { forwardRef } from 'react';
import { Row, Col, Card } from 'antd';
import UmapPlotComponent from './UmapPlotComponent';
import type { AnalysisTableRow } from '../../../models/applicationModel';

export interface UmapVisualizationAreaProps {
    allStyledPoints: AnalysisTableRow[] | null;
    referenceData: any;

    // Optional style overrides
    style?: React.CSSProperties;
}

const UmapVisualizationArea = forwardRef<HTMLDivElement, UmapVisualizationAreaProps>(({
    allStyledPoints,
    referenceData,
    style
}, ref) => {
    return (
        <Card
            size="small"
            title="Combined UMAP Plot"
            bordered={false}
            style={{
                width: '100%',
                ...style
            }}
        >
            <Row justify="center">
                <Col
                    xs={24}
                    lg={16}
                    xl={12}
                    ref={ref}
                >
                    <UmapPlotComponent
                        data={allStyledPoints}
                        referenceData={referenceData}
                    />
                </Col>
            </Row>
        </Card>
    );
});

UmapVisualizationArea.displayName = 'UmapVisualizationArea';

export default UmapVisualizationArea;