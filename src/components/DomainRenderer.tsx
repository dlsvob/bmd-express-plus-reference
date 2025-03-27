// src/components/DomainRenderer.tsx
import React from 'react';
// Import specific detail components as they are created/renamed
import CategoryAnalysisDetails from './CategoryAnalysisDetails';
import PrefilteringContainer from './PrefilteringContainer';
// import PrimaryDataDetails from './PrimaryDataDetails';
// import BmdResultsDetails from './BmdResultsDetails';

// Import necessary types from BMDxExported
import {
    DoseResponseExperiment,
    CategoryAnalysisResult,
    BMDResult,
    WilliamsTrendResult,
    // other types...
} from '../models/BMDxExported'; // Adjust path

interface DomainRendererProps {
    domainName: string;
    experimentName: string; // Keep if needed by children
    experimentRefId: number; // Keep if needed by children
    domainData: any; // Use a more specific union type if possible later
    // db?: IDBPDatabase<ProjectDB> | null; // Only if needed
}

const DomainRenderer: React.FC<DomainRendererProps> = ({
    domainName,
    experimentName,
    experimentRefId,
    domainData,
    // db
}) => {
    // Render specific components based on the domain name
    switch (domainName) {
        case "Category Analysis":
            // Pass the specific data slice, correctly typed
            return <CategoryAnalysisDetails
                        experimentName={experimentName}
                        // Pass data, ensure CategoryAnalysisDetails expects this prop
                        categoryAnalysisData={domainData as CategoryAnalysisResult[]}
                        // db={db} // Pass db only if needed by CategoryAnalysisDetails
                   />;
        case "Prefiltering":
             // Pass the object containing different prefiltering results
            return <PrefilteringContainer
                        experimentName={experimentName}
                        prefilteringData={domainData as { anova?: any[], williams?: WilliamsTrendResult[], /*...*/ }}
                        // db={db}
                   />;
        case "Primary Data":
            // Primary data is the DoseResponseExperiment itself
            // You might create a simple component to display basic experiment info
            // Or maybe this domain isn't explicitly rendered as a separate card section
            return <div style={{ padding: '1rem', border: '1px dashed #ccc', margin: '1rem 0' }}>
                       Primary Data for {experimentName} (Display TBD)
                       {/* Example: <PrimaryDataDetails experiment={domainData as DoseResponseExperiment} /> */}
                   </div>;
        case "BMD Results":
            // Placeholder - Replace with actual component
             return <div style={{ padding: '1rem', border: '1px dashed #ccc', margin: '1rem 0' }}>
                        BMD Results for {experimentName} (Component TBD)
                        {/* Example: <BmdResultsDetails bmdResults={domainData as BMDResult[]} /> */}
                    </div>;
        default:
            console.warn(`Unknown domain encountered in DomainRenderer: ${domainName}`);
            return <div style={{ padding: '1rem', border: '1px dashed red', margin: '1rem 0' }}>
                       Unknown Domain: {domainName}
                   </div>;
    }
};

export default DomainRenderer;
