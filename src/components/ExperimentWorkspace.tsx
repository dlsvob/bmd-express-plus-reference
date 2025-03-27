// src/components/ExperimentWorkspace.tsx
import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

interface ExperimentWorkspaceProps {
    selectedExperiments: number[];
}

const ExperimentWorkspace: React.FC<ExperimentWorkspaceProps> = ({ selectedExperiments }) => {
    return (
        <div>
            <Paragraph>
                Selected Experiments: {selectedExperiments.length > 0 ? selectedExperiments.join(', ') : 'None'}
            </Paragraph>
            {/* Future implementation of experiment cards will go here */}
        </div>
    );
};

export default ExperimentWorkspace;