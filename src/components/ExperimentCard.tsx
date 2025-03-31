// src/components/ExperimentCard.tsx
import React from 'react';
import { Card, Typography } from 'antd';
import {
    DoseResponseExperiment,
    CategoryAnalysisResult,
    BMDResult,
    WilliamsTrendResult,
    // Import other result types as needed
} from '../models/BMDxExported'; // Adjust path
import DomainHost from './DomainHost'; // Use the renamed component
import { getDomainComponent, DomainComponentProps } from './domainMapping'; // Adjust path

const { Title } = Typography;

// Define the structure for prefiltering data passed down
type PrefilteringDataType = {
    anova?: any[]; // Replace 'any' with specific type if available
    williams?: WilliamsTrendResult[];
    curveFit?: any[]; // Replace 'any' with specific type if available
    oriogen?: any[]; // Replace 'any' with specific type if available
};

interface ExperimentCardProps {
    experiment: DoseResponseExperiment;
    categoryAnalysisData?: CategoryAnalysisResult[];
    bmdResultsData?: BMDResult[];
    prefilteringData?: PrefilteringDataType;
}

const ExperimentCard: React.FC<ExperimentCardProps> = ({
    experiment,
    categoryAnalysisData,
    bmdResultsData,
    prefilteringData,
}) => {
    const experimentName = experiment.name;
    const experimentRefId = experiment['@ref'];

    // Determine which domains have data to render
    const domainsToRender: { name: string; data: any }[] = [];

    // Prefiltering: Check if any sub-type array exists and has length > 0
    // FIX: Implement the check for sub-types
    if (prefilteringData && (
        (prefilteringData.anova && prefilteringData.anova.length > 0) ||
        (prefilteringData.williams && prefilteringData.williams.length > 0) ||
        (prefilteringData.curveFit && prefilteringData.curveFit.length > 0) ||
        (prefilteringData.oriogen && prefilteringData.oriogen.length > 0)
    )) {
        domainsToRender.push({ name: "Prefiltering", data: prefilteringData });
    }

    // BMD Results
    if (bmdResultsData && bmdResultsData.length > 0) {
        domainsToRender.push({ name: "BMD Results", data: bmdResultsData });
    }
    // Category Analysis
    if (categoryAnalysisData && categoryAnalysisData.length > 0) {
        domainsToRender.push({ name: "Category Analysis", data: categoryAnalysisData });
    }
    // Add Primary Data if you want an explicit section for it
    // domainsToRender.push({ name: "Primary Data", data: experiment });


    return (
        <Card title={<Title level={4} style={{ marginBottom: 0 }}>{experimentName}</Title>} style={{ marginBottom: '2rem' }}>
            {domainsToRender.length > 0 ? (
                domainsToRender.map(domain => {
                    const SpecificDomainComponent = getDomainComponent(domain.name);
                    const componentProps: DomainComponentProps = {
                        experimentName: experimentName,
                        experimentRefId: experimentRefId,
                        domainData: domain.data,
                    };

                    return (
                        <DomainHost // Use the renamed component
                            key={domain.name}
                            DomainComponent={SpecificDomainComponent}
                            componentProps={componentProps}
                        />
                    );
                })
            ) : (
                <Typography.Text type="secondary" style={{ padding: '0 16px 16px' }}> {/* Add padding if inside Card */}
                    No analysis data available for this experiment.
                </Typography.Text>
            )}
        </Card>
    );
};

export default ExperimentCard;
