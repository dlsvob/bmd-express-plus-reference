// src/components/StylingSelectors.tsx
import React from 'react';
import { Select, Space } from 'antd';

interface SelectorOption { value: string; label: string; }

interface StylingSelectorsProps {
    colorByOption: string;
    shapeByOption: string;
    sizeByOption: string;
    onColorByChange: (value: string) => void;
    onShapeByChange: (value: string) => void;
    onSizeByChange: (value: string) => void;
    colorOptions: SelectorOption[];
    shapeOptions: SelectorOption[];
    sizeOptions: SelectorOption[];
    disabled: boolean; // e.g., disable if no analysis selected
}

const StylingSelectors: React.FC<StylingSelectorsProps> = React.memo(({
    colorByOption, shapeByOption, sizeByOption,
    onColorByChange, onShapeByChange, onSizeByChange,
    colorOptions, shapeOptions, sizeOptions,
    disabled
}) => {
    console.log("[StylingSelectors] Rendering with props:", { colorByOption, shapeByOption, sizeByOption, disabled });
    return (
        <Space wrap style={{ marginTop: '1rem', marginBottom: '1rem', padding: '10px', background: '#f0f2f5', borderRadius: '4px' }}>
            <span>Color By:</span>
            <Select value={colorByOption} onChange={onColorByChange} options={colorOptions} style={{ width: 200 }} disabled={disabled} />
            <span>Shape By:</span>
            <Select value={shapeByOption} onChange={onShapeByChange} options={shapeOptions} style={{ width: 200 }} disabled={disabled} />
            <span>Size By:</span>
            <Select value={sizeByOption} onChange={onSizeByChange} options={sizeOptions} style={{ width: 200 }} disabled={disabled} />
        </Space>
    );
});

export default StylingSelectors;
