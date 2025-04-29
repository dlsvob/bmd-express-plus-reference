// src/components/analysis/placeholders/AccumulationPlot.tsx
import React from 'react';
import { Card } from 'antd';

interface AccumulationPlotProps {
    analysisName?: string; // Optional name prop
}

const AccumulationPlot: React.FC<AccumulationPlotProps> = ({ analysisName }) => (
    <Card size="small" title={`Accumulation Plot: ${analysisName || 'Selected'}`}>
        (Placeholder: Accumulation Plot Visualization)
    </Card>
);
export default AccumulationPlot;