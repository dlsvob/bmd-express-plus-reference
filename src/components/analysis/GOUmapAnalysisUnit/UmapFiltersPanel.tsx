// src/components/analysis/GOUmapAnalysisUnit/UmapFiltersPanel.tsx

import React, { forwardRef } from 'react';
import { Row, Col, Space, Typography, Button, Switch, RadioChangeEvent } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import GoIdFilterUI from '../controls/GoUIdFilterUI';
import SlidingWindowFilter from '../controls/SlidingWindowFilter';
import StylingSelectors from '../controls/StylingSelectors';
import { HighlightMode } from '../../../store/slices/analysisUISlice';
import {
    COLOR_BY_OPTIONS,
    SHAPE_BY_OPTIONS,
    SIZE_BY_OPTIONS,
} from '../../../config/analysisConstants';
import styles from './GOUmapAnalysisUnit.module.css';

const { Text, Title } = Typography;

type UmapViewMode = 'single' | 'multiple';

export interface UmapFiltersPanelProps {
    // Collapse state
    isCollapsed: boolean;
    onToggleCollapse: () => void;

    // Data state
    hasSelection: boolean;
    minRank: number;
    maxRank: number;

    // Filter values
    goIdInputString: string;
    highlightMode: HighlightMode;
    committedRankValue: [number, number];

    // Styling values
    colorByOption: string;
    shapeByOption: string;
    sizeByOption: string;

    // View mode
    umapViewMode: UmapViewMode;

    // Callbacks
    onGoIdInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onHighlightModeChange: (e: RadioChangeEvent) => void;
    onRankChange: (value: [number, number]) => void;
    onColorByChange: (value: string) => void;
    onShapeByChange: (value: string) => void;
    onSizeByChange: (value: string) => void;
    onViewModeChange: (checked: boolean) => void;

    // Style
    style?: React.CSSProperties;
}

const UmapFiltersPanel = forwardRef<HTMLDivElement, UmapFiltersPanelProps>(({
    isCollapsed,
    onToggleCollapse,
    hasSelection,
    minRank,
    maxRank,
    goIdInputString,
    highlightMode,
    committedRankValue,
    colorByOption,
    shapeByOption,
    sizeByOption,
    umapViewMode,
    onGoIdInputChange,
    onHighlightModeChange,
    onRankChange,
    onColorByChange,
    onShapeByChange,
    onSizeByChange,
    onViewModeChange,
    style
}, ref) => {
    return (
        <div
            ref={ref}
            className={`${styles.filterHeader} ${isCollapsed ? styles.collapsed : styles.expanded}`}
            style={style}
        >
            <div className={styles.filterHeaderToolbar} onClick={onToggleCollapse}>
                <Title level={5} style={{ margin: 0, flexGrow: 1 }}>
                    Filters & Styling
                </Title>
                <Button
                    type="text"
                    icon={isCollapsed ? <DownOutlined /> : <UpOutlined />}
                    aria-label={isCollapsed ? 'Expand Filters' : 'Collapse Filters'}
                />
            </div>

            <div className={styles.filterHeaderControls}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12} lg={8}>
                        <GoIdFilterUI
                            goIdInputString={goIdInputString}
                            highlightMode={highlightMode}
                            onGoIdInputChange={onGoIdInputChange}
                            onHighlightModeChange={onHighlightModeChange}
                        />
                    </Col>

                    <Col xs={24} md={12} lg={8}>
                        <SlidingWindowFilter
                            min={minRank}
                            max={maxRank}
                            value={committedRankValue}
                            onAfterChange={onRankChange}
                            disabled={!hasSelection || maxRank <= 0 || minRank >= maxRank}
                            label="Filter by Rank"
                            analysisName="GOUmapRankFilter"
                        />
                    </Col>

                    <Col xs={24} md={24} lg={8}>
                        <StylingSelectors
                            colorByOption={colorByOption}
                            shapeByOption={shapeByOption}
                            sizeByOption={sizeByOption}
                            onColorByChange={onColorByChange}
                            onShapeByChange={onShapeByChange}
                            onSizeByChange={onSizeByChange}
                            colorOptions={COLOR_BY_OPTIONS}
                            shapeOptions={SHAPE_BY_OPTIONS}
                            sizeOptions={SIZE_BY_OPTIONS}
                            disabled={!hasSelection}
                        />
                    </Col>

                    <Col xs={24}>
                        <Space style={{ marginTop: '10px' }}>
                            <Text strong>UMAP View:</Text>
                            <Switch
                                checkedChildren="Multiple"
                                unCheckedChildren="Single"
                                checked={umapViewMode === 'multiple'}
                                onChange={onViewModeChange}
                                disabled={!hasSelection}
                            />
                        </Space>
                    </Col>
                </Row>
            </div>
        </div>
    );
});

UmapFiltersPanel.displayName = 'UmapFiltersPanel';

export default UmapFiltersPanel;