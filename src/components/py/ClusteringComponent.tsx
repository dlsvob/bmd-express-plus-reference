// ClusteringComponent.tsx
import React from 'react';
import { useClusteringStore } from './clusteringStore';

interface ClusteringComponentProps {
    rowData: any; // JSON object expected by your clustering function
}

export const ClusteringComponent: React.FC<ClusteringComponentProps> = ({ rowData }) => {
    const { isClustering, result, error, runClustering } = useClusteringStore();

    const handleCluster = async () => {
        await runClustering(rowData, "average", 0);
    };

    return (
        <div>
            <button onClick={handleCluster} disabled={isClustering}>
                {isClustering ? "Clustering..." : "Run Clustering"}
            </button>
            {error && <div style={{ color: "red" }}>Error: {error}</div>}
            {result && (
                <div>
                    <h3>Clustering Result:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};