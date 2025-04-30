// src/components/analysis/shared/CustomLegends.tsx
import React from 'react';
import { Card, Typography, Tooltip } from 'antd';
import styles from './CustomLegends.module.css';

const { Text } = Typography;

interface CustomLegendsProps {
    colorItems?: [string, string][];
    shapeItems?: [string, string][];
    sizeItems?: [string, number][];
    hiddenColorLabelsSet?: Set<string>;
    hiddenShapeLabelsSet?: Set<string>;
    hiddenSizeLabelsSet?: Set<string>;
    presentClusterIds?: Set<string>;
    onToggleColorVisibility: (label: string) => void;
    onToggleShapeVisibility: (label: string) => void;
    onToggleSizeVisibility: (label: string) => void;
    showColor?: boolean;
    showShape?: boolean;
    showSize?: boolean;
    cardTitle?: string;
    highlightedLabelsSet?: Set<string>;
}

// Define the core component function WITH A NAME
// Do NOT wrap this definition in React.memo()
const CustomLegendsComponent: React.FC<CustomLegendsProps> = ({
    colorItems = [],
    shapeItems = [],
    sizeItems = [],
    hiddenColorLabelsSet = new Set<string>(),
    hiddenShapeLabelsSet = new Set<string>(),
    hiddenSizeLabelsSet = new Set<string>(),
    presentClusterIds,
    onToggleColorVisibility,
    onToggleShapeVisibility,
    onToggleSizeVisibility,
    showColor = false,
    showShape = false,
    showSize = false,
    highlightedLabelsSet,
}) => {
    const logPrefix = '[CustomLegends]';
    console.log(`${logPrefix} Rendering. Received hiddenColorLabelsSet:`, hiddenColorLabelsSet);

    const renderColorItems = () => {
        if (!showColor || colorItems.length === 0) return null;
        return (
            <div className={styles.legendSection}>
                <Text strong>Color</Text>
                {colorItems.map(([label, colorValue]) => {
                    const isHighlighted = highlightedLabelsSet?.has(label);
                    const isHidden = hiddenColorLabelsSet.has(label);
                    const isPresent = presentClusterIds ? presentClusterIds.has(label) : true;
                    const itemClassName = `${styles.legendItem} ${isHidden || !isPresent ? styles.hidden : ''} ${isHighlighted ? styles.highlighted : ''}`;
                    const handleToggle = () => { if (isPresent) { onToggleColorVisibility(label); } };
                    return (
                        <Tooltip title={label} key={`color-${label}`}>
                            <div className={itemClassName} onClick={handleToggle}>
                                <span className={styles.visualCue}>
                                    <span className={styles.colorSwatch} style={{ backgroundColor: colorValue }}></span>
                                </span>
                                <Text className={styles.label} ellipsis={{ tooltip: label }}>{label}</Text>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>
        );
    };

    const renderShapeItems = () => {
        if (!showShape || shapeItems.length === 0) return null;
        const shapeSymbolMap: { [key: string]: string } = { /* ... map ... */ };
        shapeSymbolMap['circle'] = '●'; shapeSymbolMap['square'] = '■'; shapeSymbolMap['diamond'] = '♦'; shapeSymbolMap['cross'] = '+'; shapeSymbolMap['x'] = '✕';
        shapeSymbolMap['triangle-up'] = '▲'; shapeSymbolMap['triangle-down'] = '▼'; shapeSymbolMap['star'] = '★'; shapeSymbolMap['pentagon'] = '⬟'; shapeSymbolMap['hexagon'] = '⬢';
        return (
            <div className={styles.legendSection}>
                <Text strong>Shape</Text>
                {shapeItems.map(([label, shapeValue]) => {
                    const isHidden = hiddenShapeLabelsSet.has(label);
                    const isPresent = true;
                    const itemClassName = `${styles.legendItem} ${isHidden || !isPresent ? styles.hidden : ''}`;
                    const displaySymbol = shapeSymbolMap[shapeValue] || '?';
                    const handleToggle = () => { if (isPresent) { onToggleShapeVisibility(label); } };
                    return (
                        <Tooltip title={label} key={`shape-${label}`}>
                            <div className={itemClassName} onClick={handleToggle}>
                                <span className={styles.visualCue}>
                                    <span className={styles.shapeText}>{displaySymbol}</span>
                                </span>
                                <Text className={styles.label} ellipsis={{ tooltip: label }}>{label}</Text>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>
        );
    };

    const renderSizeItems = () => {
        if (!showSize || sizeItems.length === 0) return null;
        const sortedSizeItems = [...sizeItems].sort((a, b) => a[1] - b[1]);
        const sizeValues = sortedSizeItems.map(item => item[1]);
        const minSizeVal = Math.min(...sizeValues, 4);
        const maxSizeVal = Math.max(...sizeValues, 14);
        const range = maxSizeVal - minSizeVal;
        const minDisplaySize = 4;
        const maxDisplaySize = 14;
        return (
            <div className={styles.legendSection}>
                <Text strong>Size</Text>
                {sortedSizeItems.map(([label, sizeValue]) => {
                    const isHidden = hiddenSizeLabelsSet.has(label);
                    const isPresent = true;
                    const itemClassName = `${styles.legendItem} ${isHidden || !isPresent ? styles.hidden : ''}`;
                    let displaySize = minDisplaySize;
                    if (range > 0) { displaySize = minDisplaySize + ((sizeValue - minSizeVal) / range) * (maxDisplaySize - minDisplaySize); }
                    else if (sizeItems.length === 1) { displaySize = (minDisplaySize + maxDisplaySize) / 2; }
                    displaySize = Math.max(minDisplaySize, Math.min(maxDisplaySize, Math.round(displaySize)));
                    const handleToggle = () => { if (isPresent) { onToggleSizeVisibility(label); } };
                    return (
                        <Tooltip title={`${label} (${sizeValue.toFixed(0)})`} key={`size-${label}`}>
                            <div className={itemClassName} onClick={handleToggle}>
                                <span className={styles.visualCue} style={{ width: `${maxDisplaySize}px`, height: `${maxDisplaySize}px`, justifyContent: 'center', alignItems: 'center', display: 'inline-flex', }}>
                                    <span className={styles.sizeCircle} style={{ width: `${displaySize}px`, height: `${displaySize}px`, }}></span>
                                </span>
                                <Text className={styles.label} ellipsis={{ tooltip: label }}>{label}</Text>
                            </div>
                        </Tooltip>
                    );
                })}
            </div>
        );
    };

    // --- Conditional Rendering & Card Wrapper ---
    const shouldRenderColor = showColor && colorItems.length > 0;
    const shouldRenderShape = showShape && shapeItems.length > 0;
    const shouldRenderSize = showSize && sizeItems.length > 0;

    if (!shouldRenderColor && !shouldRenderShape && !shouldRenderSize) {
        return (
            <Card size="small" className={styles.legendCard}>
                <Text type="secondary" className={styles.noItems}>No legend items to display.</Text>
            </Card>
        );
    }

    return (
        <Card size="small" className={styles.legendCard}>
            {shouldRenderColor && renderColorItems()}
            {shouldRenderShape && renderShapeItems()}
            {shouldRenderSize && renderSizeItems()}
        </Card>
    );
};

// --- Wrap the NAMED component in React.memo() for the main export ---
export const CustomLegends = React.memo(CustomLegendsComponent);

export default CustomLegends;
