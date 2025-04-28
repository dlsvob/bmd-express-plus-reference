// src/components/GoIdFilterUI.tsx (New File)
import React from 'react';
import { Typography, Input, Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { HighlightMode } from '../store/slices/analysisUISlice'; // Adjust path

const { Paragraph } = Typography;
const { TextArea } = Input;

interface GoIdFilterUIProps {
    goIdInputString: string;
    highlightMode: HighlightMode;
    onGoIdInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onHighlightModeChange: (e: RadioChangeEvent) => void;
}

const GoIdFilterUI: React.FC<GoIdFilterUIProps> = React.memo(({
    goIdInputString,
    highlightMode,
    onGoIdInputChange,
    onHighlightModeChange,
}) => {
    return (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '1rem' }}>
            <div style={{ flexBasis: '33%', flexShrink: 0 }}>
                <Paragraph strong style={{ marginBottom: '0.5rem' }}>
                    Highlight GO IDs:
                </Paragraph>
                <TextArea
                    rows={4}
                    placeholder="Paste GO IDs..."
                    value={goIdInputString}
                    onChange={onGoIdInputChange}
                />
            </div>
            <div style={{ flexGrow: 1 }}>
                <Paragraph strong style={{ marginBottom: '0.5rem' }}>
                    Highlight Mode:
                </Paragraph>
                <Radio.Group onChange={onHighlightModeChange} value={highlightMode}>
                    <Radio value="none">Off</Radio>
                    <Radio value="exact">Exact Match</Radio>
                    <Radio value="cluster">Cluster Match</Radio>
                </Radio.Group>
                <Paragraph type="secondary" style={{ marginTop: '0.5rem' }}>
                    Exact: Increase size of matching GO IDs. <br />
                    Cluster: Increase size of exact matches, decrease size & dim others
                    in the same cluster(s).
                </Paragraph>
            </div>
        </div>
    );
});

export default GoIdFilterUI;
