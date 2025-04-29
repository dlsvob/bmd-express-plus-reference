// src/components/views/AnalysisViewContainer.tsx
import React from 'react';
import { Typography, Alert } from 'antd';
// Import the view component that is currently rendered directly by App.tsx
import GOUmapAnalysisView from './GOUmapAnalysisView'; // Adjust path if needed
import { useAppSelector } from '../../store/hooks'; // Required for selecting refs later
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice'; // To check selection

const { Title, Paragraph } = Typography;

interface AnalysisViewContainerProps {
    projectName: string; // Receives project name from App.tsx
}

const AnalysisViewContainer: React.FC<AnalysisViewContainerProps> = ({ projectName }) => {
    console.log(`[AnalysisViewContainer] Rendering for project: ${projectName}`);

    // Example: Add a check here eventually to decide which analysis unit to show,
    // or to fetch data common to all analysis units.
    // For now, we just pass control to the existing GOUmapAnalysisView.

    // Added check: Ensure analyses are selected before rendering the view that depends on them
    const selectedRefs = useAppSelector(selectSelectedAnalysisRefs);
    if (!selectedRefs || selectedRefs.length === 0) {
        return (
            <Alert
                message="No Analysis Selected"
                description="Please go back and select one or more analysis results to view."
                type="info"
                showIcon
            />
        );
    }


    return (
        <div>
            {/* Optional: Add a Title or other container elements here later */}
            {/* <Title level={4}>Analysis Dashboard for {projectName}</Title> */}

            {/* --- Initially, just render the existing view --- */}
            {/* This ensures functionality doesn't break while we refactor */}
            <GOUmapAnalysisView projectName={projectName} />
            {/* ----------------------------------------------- */}

        </div>
    );
};

export default AnalysisViewContainer;