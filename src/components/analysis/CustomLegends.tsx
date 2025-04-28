// src/components/CustomLegends.tsx
import React from 'react';
import { Card, Typography, Tooltip } from 'antd';

const { Text } = Typography;

// --- Component Props Interface ---
interface CustomLegendsProps {
    // Legend items (arrays of [label, value])
    colorItems?: [string, string][];
    shapeItems?: [string, string][]; // Assuming value is string symbol like 'circle'
    sizeItems?: [string, number][]; // Assuming value is number for size

    // --- Use Set for multiple highlights ---
    highlightedLabelsSet?: Set<string>; // <<< Set of highlighted labels

    // Toggle visibility/highlight functions (still expect label)
    onToggleColorVisibility: (label: string) => void;
    onToggleShapeVisibility: (label: string) => void;
    onToggleSizeVisibility: (label: string) => void;

    // Flags to control which legends to show
    showColor?: boolean;
    showShape?: boolean;
    showSize?: boolean;

    // Title for the legend card
    cardTitle?: string;

    // Optional: Pass colorBy, shapeBy, sizeBy if needed for context/styling
    colorBy?: string;
    shapeBy?: string;
    sizeBy?: string;
}

export const CustomLegends: React.FC<CustomLegendsProps> = React.memo(
    ({
        colorItems = [],
        shapeItems = [],
        sizeItems = [],
        highlightedLabelsSet = new Set<string>(), // <<< Use Set prop
        onToggleColorVisibility,
        onToggleShapeVisibility,
        onToggleSizeVisibility,
        showColor = false,
        showShape = false,
        showSize = false,
        cardTitle = 'Legend',
    }) => {
        const logPrefix = '[CustomLegends v3 - Multi-Highlight]';
        console.log(`${logPrefix} Rendering. Highlighted count: ${highlightedLabelsSet.size}`);

        // --- Render Color Legend Items ---
        const renderColorItems = () => {
            if (!showColor || colorItems.length === 0) return null;
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Color</Text>
                    {colorItems.map(([label, colorValue]) => {
                        // Check if this item is highlighted using the Set
                        const isHighlighted = highlightedLabelsSet.has(label);
                        const itemStyle: React.CSSProperties = {
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: '4px',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontWeight: isHighlighted ? 'bold' : 'normal',
                            backgroundColor: isHighlighted ? '#e6f7ff' : 'transparent',
                        };

                        return (
                            <Tooltip title={label} key={`color-${label}`}>
                                <div
                                    onClick={() => onToggleColorVisibility(label)}
                                    style={itemStyle}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '14px',
                                            height: '14px',
                                            backgroundColor: colorValue,
                                            marginRight: '8px',
                                            border: '1px solid #ccc',
                                        }}
                                    ></span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>
                                        {label}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Render Shape Legend Items ---
        const renderShapeItems = () => {
            if (!showShape || shapeItems.length === 0) return null;
            const shapeSymbolMap: { [key: string]: string } = {
                circle: '●', square: '■', diamond: '♦', cross: '+', x: '✕',
                triangle_up: '▲', triangle_down: '▼',
            };
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Shape</Text>
                    {shapeItems.map(([label, shapeValue]) => {
                        const isHighlighted = highlightedLabelsSet.has(label);
                        const itemStyle: React.CSSProperties = {
                            display: 'flex', alignItems: 'center', cursor: 'pointer',
                            marginBottom: '4px', padding: '2px 4px', borderRadius: '3px',
                            fontWeight: isHighlighted ? 'bold' : 'normal',
                            backgroundColor: isHighlighted ? '#e6f7ff' : 'transparent',
                        };
                        const displaySymbol = shapeSymbolMap[shapeValue] || '?';
                        return (
                            <Tooltip title={label} key={`shape-${label}`}>
                                <div onClick={() => onToggleShapeVisibility(label)} style={itemStyle}>
                                    <span style={{ marginRight: '8px', width: '14px', textAlign: 'center', fontSize: '14px' }}>
                                        {displaySymbol}
                                    </span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>
                                        {label}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Render Size Legend Items ---
        const renderSizeItems = () => {
            if (!showSize || sizeItems.length === 0) return null;
            const sortedSizeItems = [...sizeItems].sort((a, b) => a[1] - b[1]);
            const sizeValues = sortedSizeItems.map(item => item[1]);
            const minSizeVal = Math.min(...sizeValues);
            const maxSizeVal = Math.max(...sizeValues);
            const range = maxSizeVal - minSizeVal;
            const minDisplaySize = 4;
            const maxDisplaySize = 14;

            return (
                <div>
                    <Text strong>Size</Text>
                    {sortedSizeItems.map(([label, sizeValue]) => {
                        const isHighlighted = highlightedLabelsSet.has(label);
                        const itemStyle: React.CSSProperties = {
                            display: 'flex', alignItems: 'center', cursor: 'pointer',
                            marginBottom: '4px', padding: '2px 4px', borderRadius: '3px',
                            fontWeight: isHighlighted ? 'bold' : 'normal',
                            backgroundColor: isHighlighted ? '#e6f7ff' : 'transparent',
                        };
                        let displaySize = minDisplaySize;
                        if (range > 0) {
                            displaySize = minDisplaySize + ((sizeValue - minSizeVal) / range) * (maxDisplaySize - minDisplaySize);
                        } else if (sizeItems.length === 1) {
                            displaySize = (minDisplaySize + maxDisplaySize) / 2;
                        }
                        displaySize = Math.max(minDisplaySize, Math.min(maxDisplaySize, Math.round(displaySize)));

                        return (
                            <Tooltip title={`${label} (${sizeValue.toFixed(2)})`} key={`size-${label}`}>
                                <div onClick={() => onToggleSizeVisibility(label)} style={itemStyle}>
                                    <span style={{
                                        marginRight: '8px', width: '14px', height: '14px',
                                        display: 'inline-flex', justifyContent: 'center', alignItems: 'center'
                                    }}>
                                        <span style={{
                                            display: 'inline-block', width: `${displaySize}px`, height: `${displaySize}px`,
                                            backgroundColor: '#888', borderRadius: '50%',
                                        }}></span>
                                    </span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>
                                        {label}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Conditional Rendering & Card Wrapper ---
        if (!showColor && !showShape && !showSize) {
            return null;
        }
        if ((showColor && colorItems.length === 0) &&
            (showShape && shapeItems.length === 0) &&
            (showSize && sizeItems.length === 0)) {
            return (
                <Card size="small" title={cardTitle} styles={{ body: { padding: '10px', maxHeight: '500px', overflowY: 'auto' } }}>
                    <Text type="secondary">No legend items to display.</Text>
                </Card>
            );
        }

        return (
            <Card size="small" title={cardTitle} styles={{ body: { padding: '10px', maxHeight: '500px', overflowY: 'auto' } }}>
                {renderColorItems()}
                {renderShapeItems()}
                {renderSizeItems()}
            </Card>
        );
    }
);

export default CustomLegends;
