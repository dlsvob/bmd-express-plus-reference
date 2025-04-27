// src/components/AccumulationPlotAnalysis.tsx
import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Config, PlotMouseEvent, PlotSelectionEvent } from 'plotly.js';

interface AccumulationPlotAnalysisProps {
  plotId: string;
  data: Data[] | null;
  layoutProp: Partial<Layout> | null;
  config?: Partial<Config>;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (event: Readonly<PlotMouseEvent>) => void;
  onSelected?: (event: Readonly<PlotSelectionEvent> | undefined) => void;
  onDeselect?: () => void;
  onDoubleClick?: () => void;
}

// Define the base functional component first
const AccumulationPlotAnalysisComponent: React.FC<AccumulationPlotAnalysisProps> = ({
  plotId,
  data,
  layoutProp,
  config,
  style,
  className,
  onClick,
  onSelected,
  onDeselect,
  onDoubleClick,
}) => {

  console.log(`[PlotDisplay ${plotId}] Rendering check. Has data: ${!!data}, Has layout: ${!!layoutProp}`);

  if (!data || !layoutProp) {
    return (
      <div
                style= {{
      height: '100%',
        width: '100%',
          display: 'flex',
            alignItems: 'center',
              justifyContent: 'center',
                border: '1px dashed lightgrey',
                  color: 'grey',
                    minHeight: '100px',
                    ...(style || {})
                }}
className = { className }
  >
  Plot data / layout missing.
            </div>
        );
    }

const plotConfig: Partial<Config> = {
  responsive: true,
  displayModeBar: false,
  ...(config || {})
};

return (
  <Plot
            data= { data }
layout = { layoutProp }
useResizeHandler = { true}
style = {{ width: '100%', height: '100%', ...(style || {}) }}
className = { className }
config = { plotConfig }
onClick = { onClick }
onSelected = { onSelected }
onDeselect = { onDeselect }
onDoubleClick = { onDoubleClick }
  />
    );
};

// Apply React.memo to the base component
const MemoizedAccumulationPlotAnalysis = React.memo(AccumulationPlotAnalysisComponent);

// Export the memoized component using a named export, aliased to the original name
export { MemoizedAccumulationPlotAnalysis as AccumulationPlotAnalysis };
