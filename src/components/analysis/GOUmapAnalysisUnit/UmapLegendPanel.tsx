// src/components/analysis/GOUmapAnalysisUnit/UmapLegendPanel.tsx

import React from 'react';
import { Col } from 'antd';
import CustomLegends from '../shared/CustomLegends';

export interface UmapLegendPanelProps {
    position: 'left' | 'right';

    // Legend data
    colorItems?: [string, string][];
    shapeItems?: [string, string][];
    sizeItems?: [string, number][];

    // Hidden sets
    hiddenColorLabelsSet?: Set<string>;
    hiddenShapeLabelsSet?: Set<string>;
    hiddenSizeLabelsSet?: Set<string>;

    // Callbacks
    onToggleColorVisibility: (label: string) => void;
    onToggleShapeVisibility: (label: string) => void;
    onToggleSizeVisibility: (label: string) => void;

    // Style
    stickyStyle: React.CSSProperties;
}

const UmapLegendPanel: React.FC<UmapLegendPanelProps> = ({
    position,
    colorItems,
    shapeItems,
    sizeItems,
    hiddenColorLabelsSet,
    hiddenShapeLabelsSet,
    hiddenSizeLabelsSet,
    onToggleColorVisibility,
    onToggleShapeVisibility,
    onToggleSizeVisibility,
    stickyStyle
}) => {
    // Left panel shows colors, right panel shows shapes and sizes
    const showColor = position === 'left';
    const showShape = position === 'right';
    const showSize = position === 'right';

    return (
        <Col flex="0 0 200px" style={{ alignSelf: 'stretch' }}>
            <div style={stickyStyle}>
                <CustomLegends
                    // Data props - pass the relevant ones based on position
                    colorItems={showColor ? colorItems : undefined}
                    shapeItems={showShape ? shapeItems : undefined}
                    sizeItems={showSize ? sizeItems : undefined}

                    // Hidden sets - pass the relevant ones
                    hiddenColorLabelsSet={showColor ? hiddenColorLabelsSet : undefined}
                    hiddenShapeLabelsSet={showShape ? hiddenShapeLabelsSet : undefined}
                    hiddenSizeLabelsSet={showSize ? hiddenSizeLabelsSet : undefined}

                    // Callbacks
                    onToggleColorVisibility={onToggleColorVisibility}
                    onToggleShapeVisibility={onToggleShapeVisibility}
                    onToggleSizeVisibility={onToggleSizeVisibility}

                    // Display flags
                    showColor={showColor}
                    showShape={showShape}
                    showSize={showSize}
                />
            </div>
        </Col>
    );
};

export default UmapLegendPanel;