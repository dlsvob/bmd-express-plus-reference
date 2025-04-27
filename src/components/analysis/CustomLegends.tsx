// src/components/CustomLegends.tsx
import React from 'react';
import { Card, Typography, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'; // Example icons

const { Text } = Typography;

// --- Component Props Interface ---
interface CustomLegendsProps {
    // Legend items (arrays of [label, value]) - Mark as optional
    colorItems?: [string, string][]; // [label, hexColor]
    shapeItems?: [string, string][]; // [label, shapeSymbolString] - Adapt value type if needed
    sizeItems?: [string, number][];  // [label, sizeValue] - Adapt value type if needed

    // Hidden item labels - Mark as optional
    hiddenColorLabels?: string[];
    hiddenShapeLabels?: string[];
    hiddenSizeLabels?: string[];

    // Toggle visibility functions
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

/**
 * CustomLegends Component
 *
 * Displays interactive legends for color, shape, and size categories.
 * Allows users to click items to toggle their visibility on associated plots.
 */
export const CustomLegends: React.FC<CustomLegendsProps> = React.memo(
    ({
        // Provide default empty arrays during destructuring to prevent errors
        colorItems = [],
        shapeItems = [],
        sizeItems = [],
        hiddenColorLabels = [],
        hiddenShapeLabels = [],
        hiddenSizeLabels = [],
        onToggleColorVisibility,
        onToggleShapeVisibility,
        onToggleSizeVisibility,
        showColor = false, // Default to false if not provided
        showShape = false,
        showSize = false,
        cardTitle = "Legend",
        // colorBy, shapeBy, sizeBy // Destructure if needed
    }) => {

        console.log('[CustomLegends] Rendering. ColorItems:', colorItems.length, 'ShapeItems:', shapeItems.length, 'SizeItems:', sizeItems.length);

        // ---> ADD THIS LOG <---
        console.log(
            `[CustomLegends Render] Title: ${cardTitle}, showC: ${showColor}, showSh: ${showShape}, showSz: ${showSize}`
        );
        console.log(
            `  >> hiddenColorLabels prop:`, JSON.stringify(hiddenColorLabels)
        );
        console.log(
            `  >> hiddenShapeLabels prop:`, JSON.stringify(hiddenShapeLabels)
        );
        console.log(
            `  >> hiddenSizeLabels prop:`, JSON.stringify(hiddenSizeLabels)
        );
        console.log(
            `  >> colorItems count: ${colorItems.length}`
        );
        // ---> END LOG <---

        // Helper to check if a label is hidden
        const isHidden = (label: string, hiddenLabels: string[]) => hiddenLabels.includes(label);

        // --- Render Color Legend Items ---
        const renderColorItems = () => {
            // Safe check: Only render if showColor is true AND there are items
            if (!showColor || colorItems.length === 0) {
                return null;
            }
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Color</Text>
                    {colorItems.map(([label, colorValue]) => {
                        const hidden = isHidden(label, hiddenColorLabels);
                        return (
                            <Tooltip title={label} key={`color-${label}`}>
                                <div
                                    onClick={() => onToggleColorVisibility(label)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        marginBottom: '4px',
                                        opacity: hidden ? 0.5 : 1, // Dim if hidden
                                        textDecoration: hidden ? 'line-through' : 'none',
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: '14px',
                                        height: '14px',
                                        backgroundColor: colorValue,
                                        marginRight: '8px',
                                        border: '1px solid #ccc', // Add border for light colors
                                    }}></span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>{label}</Text>
                                    {/* Optional: Add eye icon */}
                                    {/* {hidden ? <EyeInvisibleOutlined style={{ marginLeft: 'auto', color: '#888' }}/> : <EyeOutlined style={{ marginLeft: 'auto', color: '#888' }}/>} */}
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Render Shape Legend Items ---
        const renderShapeItems = () => {
            // Safe check
            if (!showShape || shapeItems.length === 0) {
                return null;
            }
            return (
                <div style={{ marginBottom: '10px' }}>
                    <Text strong>Shape</Text>
                    {shapeItems.map(([label, shapeValue]) => {
                        const hidden = isHidden(label, hiddenShapeLabels);
                        // Note: Rendering actual Plotly shapes here is complex.
                        // Displaying the symbol name or a simplified visual is more practical.
                        return (
                            <Tooltip title={label} key={`shape-${label}`}>
                                <div
                                    onClick={() => onToggleShapeVisibility(label)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        marginBottom: '4px',
                                        opacity: hidden ? 0.5 : 1,
                                        textDecoration: hidden ? 'line-through' : 'none',
                                    }}
                                >
                                    {/* Example: Display shape name or simple icon */}
                                    <span style={{ marginRight: '8px', width: '14px', textAlign: 'center' }}>
                                        {shapeValue === 'circle' ? '●' : shapeValue === 'square' ? '■' : shapeValue === 'diamond' ? '♦' : '?'}
                                    </span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>{label}</Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // --- Render Size Legend Items ---
        const renderSizeItems = () => {
            // Safe check
            if (!showSize || sizeItems.length === 0) {
                return null;
            }
            // Sort sizes numerically if needed (assuming item[1] is the numeric size)
            const sortedSizeItems = [...sizeItems].sort((a, b) => a[1] - b[1]);

            return (
                <div>
                    <Text strong>Size</Text>
                    {sortedSizeItems.map(([label, sizeValue]) => {
                        const hidden = isHidden(label, hiddenSizeLabels);
                        // Example: Show label and maybe a circle scaled roughly
                        const displaySize = Math.max(4, Math.min(14, sizeValue)); // Clamp size for display
                        return (
                            <Tooltip title={`${label} (${sizeValue})`} key={`size-${label}`}>
                                <div
                                    onClick={() => onToggleSizeVisibility(label)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        marginBottom: '4px',
                                        opacity: hidden ? 0.5 : 1,
                                        textDecoration: hidden ? 'line-through' : 'none',
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: '14px', // Keep container consistent
                                        height: '14px',
                                        marginRight: '8px',
                                        textAlign: 'center',
                                        position: 'relative', // For centering circle
                                    }}>
                                        <span style={{ // The circle itself
                                            display: 'inline-block',
                                            width: `${displaySize}px`,
                                            height: `${displaySize}px`,
                                            backgroundColor: '#888', // Example color
                                            borderRadius: '50%',
                                            position: 'absolute', // Center it
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                        }}></span>
                                    </span>
                                    <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: label }}>{label}</Text>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            );
        };

        // Only render the card if there's at least one legend to show
        if (!showColor && !showShape && !showSize) {
            return null;
        }
        // Only render if there are items to display for the enabled legends
        if ((showColor && colorItems.length === 0) &&
            (showShape && shapeItems.length === 0) &&
            (showSize && sizeItems.length === 0)) {
            // Optionally return null or a placeholder message
            return (
                <Card size="small" title={cardTitle} styles={{ body: { padding: '10px', maxHeight: '500px', overflowY: 'auto'} }}>
                    <Text type="secondary">No legend items to display.</Text>
                </Card>
            );
        }


        return (
            <Card size="small" title={cardTitle} styles={{ body: { padding: '10px', maxHeight: '500px', overflowY: 'auto'} }}>
                {renderColorItems()}
                {renderShapeItems()}
                {renderSizeItems()}
            </Card>
        );
    }
);

export default CustomLegends; // If using default export
