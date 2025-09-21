// src/components/routing/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectSelectedProjectName } from '../../store/slices/projectSlice';
import { Alert, Typography } from 'antd';

// Import view components
import ExperimentListView from '../views/ExperimentListView';
import GOUmapAnalysisUnit from '../analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from '../analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit';

const AppRoutes: React.FC = () => {
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const isProjectSelected = !!selectedProjectName;


    // If no project is selected, show project selection prompt
    if (!isProjectSelected) {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    }

    return (
        <Routes>
            {/* Default route redirects to experiments */}
            <Route path="/" element={<Navigate to="/experiments" replace />} />

            {/* Experiments view */}
            <Route
                path="/experiments"
                element={<ExperimentListView projectName={selectedProjectName} />}
            />

            {/* Analysis routes */}
            <Route path="/analysis">
                <Route path="umap" element={<GOUmapAnalysisUnit />} />
                <Route path="clustering" element={<GOClusteringAnalysisUnit />} />
                <Route index element={<Navigate to="/experiments" replace />} />
            </Route>

            {/* Settings route */}
            <Route
                path="/settings"
                element={
                    <Alert
                        message="Project Settings View (Not Implemented)"
                        type="info"
                    />
                }
            />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/experiments" replace />} />
        </Routes>
    );
};

export default AppRoutes;