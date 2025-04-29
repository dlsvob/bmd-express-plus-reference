// src/components/analysis/CustomLegends.tsx
import React from 'react';
import { Card, Typography, Tooltip } from 'antd';

const { Text } = Typography;

// --- Update Props Interface ---
interface CustomLegendsProps {
    colorItems?: [string, string][];
    shapeItems?: [string, string][];
    sizeItems?: [string, number][];
    highlightedLabelsSet?: Set<string>;
    presentClusterIds?: Set<string>; // <<< ADDED: Set of IDs present in current data
    onToggleColorVisibility: (label: string) => void;
    onToggleShapeVisibility: (label: string) => void;
    onToggleSizeVisibility: (label: string) => void;
    showColor?: boolean;
    showShape?: boolean;
    showSize?: boolean;
    cardTitle?: string;
    colorBy?: string;
    shapeBy?: string;
    sizeBy?: string;
}
// --------------------------

export const CustomLegends: React.FC<CustomLegendsProps> = React.memo(
    ({
        colorItems = [],
        shapeItems = [],
        sizeItems = [],
        highlightedLabelsSet = new Set<string>(),
        presentClusterIds = new Set<string>(), // <<< Default to empty set if not provided
        onToggleColorVisibility,
        onToggleShapeVisibility,
        onToggleSizeVisibility,
        showColor = false,
        showShape = false,
        showSize = false,
        cardTitle = 'Legend',
    }) => {
        const logPrefix = '[CustomLegends v4 - Dimming]'; // Version Bump
        console.log(
            `${logPrefix} Rendering. Highlighted: ${highlightedLabelsSet.size}, Present: ${presentClusterIds.size}`
        );

        // --- Render Color Legend Items ---
        const renderColorItems = () => {
            if (!showColor || colorItems.length === 0) return null;
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Color</Text>
                    {colorItems.map(([label, colorValue]) => {
                        // Determine states
                        const isHighlighted = highlightedLabelsSet.has(label);
                        const isPresent = presentClusterIds.has(label); // <<< Check if present

                        // Define base style
                        const itemStyle: React.CSSProperties = {
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '4px',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out', // Added transition
                        };

                        // Apply styles based on state
                        if (!isPresent) {
                            itemStyle.opacity = 0.4; // Dim inactive items
                            itemStyle.cursor = 'default'; // Indicate non-clickable
                            itemStyle.color = '#888'; // Dim text color
                        } else {
                            itemStyle.cursor = 'pointer'; // Active items are clickable
                            if (isHighlighted) {
                                itemStyle.fontWeight = 'bold';
                                itemStyle.backgroundColor = '#e6f7ff'; // Highlight background
                            } else {
                                itemStyle.fontWeight = 'normal';
                                itemStyle.backgroundColor = 'transparent';
                            }
                        }

                        // Define click handler
                        const handleClick = () => {
                            if (isPresent) { // <<< Only toggle if present
                                onToggleColorVisibility(label);
                            }
                        };

                        return (
                            <Tooltip title={label} key={`color-${label}`}>
                                <div onClick={handleClick} style={itemStyle}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '14px',
                                            height: '14px',
                                            backgroundColor: colorValue,
                                            marginRight: '8px',
                                            border: '1px solid #ccc',
                                            opacity: isPresent ? 1 : 0.6, // Slightly dim swatch too if inactive
                                        }}
                                    ></span>
                                    <Text
                                        style={{ fontSize: '12px' }}
                                        ellipsis={{ tooltip: label }}
                                    // Apply dimmed style directly to Text if needed, though parent opacity might suffice
                                    // type={!isPresent ? 'secondary' : undefined}
                                    >
                                        {label}
                                    </Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Render Shape Legend Items (Apply similar logic if needed) ---
        const renderShapeItems = () => {
            if (!showShape || shapeItems.length === 0) return null;
            // ... (similar logic as renderColorItems: check isPresent, adjust style/onClick) ...
            const shapeSymbolMap: { [key: string]: string } = {
                circle: '●', square: '■', diamond: '♦', cross: '+', x: '✕',
                triangle_up: '▲', triangle_down: '▼',
            };
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Shape</Text>
                    {shapeItems.map(([label, shapeValue]) => {
                        const isHighlighted = highlightedLabelsSet.has(label);
                        const isPresent = presentClusterIds.has(label); // Check presence
                        const itemStyle: React.CSSProperties = {
                            display: 'flex', alignItems: 'center',
                            marginBottom: '4px', padding: '2px 4px', borderRadius: '3px',
                            transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out',
                        };
                        if (!isPresent) {
                            itemStyle.opacity = 0.4;
                            itemStyle.cursor = 'default';
                            itemStyle.color = '#888';
                        } else {
                            itemStyle.cursor = 'pointer';
                            if (isHighlighted) {
                                itemStyle.fontWeight = 'bold';
                                itemStyle.backgroundColor = '#e6f7ff';
                            } else {
                                itemStyle.fontWeight = 'normal';
                                itemStyle.backgroundColor = 'transparent';
                            }
                        }
                        const displaySymbol = shapeSymbolMap[shapeValue] || '?';
                        const handleClick = () => { if (isPresent) onToggleShapeVisibility(label); };
                        return (
                            <Tooltip title={label} key={`shape-${label}`}>
                                <div onClick={handleClick} style={itemStyle}>
                                    <span style={{ marginRight: '8px', width: '14px', textAlign: 'center', fontSize: '14px', opacity: isPresent ? 1 : 0.6 }}>
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

        // --- Render Size Legend Items (Apply similar logic if needed) ---
        const renderSizeItems = () => {
            if (!showSize || sizeItems.length === 0) return null;
            // ... (similar logic as renderColorItems: check isPresent, adjust style/onClick) ...
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
                        const isPresent = presentClusterIds.has(label); // Check presence
                        const itemStyle: React.CSSProperties = {
                            display: 'flex', alignItems: 'center',
                            marginBottom: '4px', padding: '2px 4px', borderRadius: '3px',
                            transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out',
                        };
                        if (!isPresent) {
                            itemStyle.opacity = 0.4;
                            itemStyle.cursor = 'default';
                            itemStyle.color = '#888';
                        } else {
                            itemStyle.cursor = 'pointer';
                            if (isHighlighted) {
                                itemStyle.fontWeight = 'bold';
                                itemStyle.backgroundColor = '#e6f7ff';
                            } else {
                                itemStyle.fontWeight = 'normal';
                                itemStyle.backgroundColor = 'transparent';
                            }
                        }
                        let displaySize = minDisplaySize;
                        if (range > 0) {
                            displaySize = minDisplaySize + ((sizeValue - minSizeVal) / range) * (maxDisplaySize - minDisplaySize);
                        } else if (sizeItems.length === 1) {
                            displaySize = (minDisplaySize + maxDisplaySize) / 2;
                        }
                        displaySize = Math.max(minDisplaySize, Math.min(maxDisplaySize, Math.round(displaySize)));
                        const handleClick = () => { if (isPresent) onToggleSizeVisibility(label); };

                        return (
                            <Tooltip title={`${label} (${sizeValue.toFixed(2)})`} key={`size-${label}`}>
                                <div onClick={handleClick} style={itemStyle}>
                                    <span style={{
                                        marginRight: '8px', width: '14px', height: '14px',
                                        display: 'inline-flex', justifyContent: 'center', alignItems: 'center'
                                    }}>
                                        <span style={{
                                            display: 'inline-block', width: `${displaySize}px`, height: `${displaySize}px`,
                                            backgroundColor: '#888', borderRadius: '50%',
                                            opacity: isPresent ? 1 : 0.6,
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

        // --- Conditional Rendering & Card Wrapper (Keep as is) ---
        if (!showColor && !showShape && !showSize) {
            return null;
        }
        if (
            (showColor && colorItems.length === 0) &&
            (showShape && shapeItems.length === 0) &&
            (showSize && sizeItems.length === 0)
        ) {
            return (
                <Card
                    size="small"
                    title={cardTitle}
                    styles={{
                        body: {
                            padding: '10px',
                            maxHeight: '500px',
                            overflowY: 'auto',
                        },
                    }}
                >
                    <Text type="secondary">No legend items to display.</Text>
                </Card>
            );
        }

        return (
            <Card
                size="small"
                title={cardTitle}
                styles={{
                    body: { padding: '10px', maxHeight: '500px', overflowY: 'auto' },
                }}
            >
                {renderColorItems()}
                {renderShapeItems()}
                {renderSizeItems()}
            </Card>
        );
    }
);

export default CustomLegends;
