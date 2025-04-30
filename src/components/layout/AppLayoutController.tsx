// src/AppLayoutController.tsx
import React, { useState, useCallback } from 'react';
import { Layout, Drawer, Menu, Spin, Alert, Typography } from 'antd';
import { ExperimentOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';

import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';

import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useGetProjectsQuery } from '../../store/apis/projectsApi';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import { selectCurrentView, setActiveView } from '../../store/slices/navigationSlice';
import PyodideErrorNotifier from '../shared/PyodideErrorNotifier';
import ExperimentListView from '../views/ExperimentListView';
import GOUmapAnalysisUnit from '../analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from '../analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit';
import AppHeader from './AppHeader';
import { usePyodide } from '../../contexts/PyodideProvider';

const { Content } = Layout;

const menuItems: MenuProps['items'] = [
    { key: 'experiments', icon: <ExperimentOutlined />, label: 'Experiments' },
    {
        key: 'analysis',
        label: 'Analysis',
        icon: <BarChartOutlined />,
        children: [
            { key: 'categoryAnalysis', label: 'Category Analysis (UMAP)' },
            { key: 'goClustering', label: 'GO Clustering' },
        ],
    },
    { key: 'settings', icon: <SettingOutlined />, label: 'Project Settings' },
];

const AppContentInternal: React.FC = () => {
    // ... (content remains the same) ...
    const { error: pyodideError } = usePyodide(); // Check error state

    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    let mainContent: React.ReactNode;

    // Render based on Pyodide error, project selection, and active view
    if (pyodideError) {
        mainContent = (
            <Alert
                message="Pyodide Initialization Failed"
                description="Core Python features may be unavailable. Please see the error modal for details or try reloading."
                type="error"
                showIcon
                style={{ margin: '24px' }}
            />
        );
    } else if (!isProjectSelected) {
        // Pyodide is OK, but no project selected
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px', padding: '24px' }}>
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    } else if (isProjectSelected && selectedProjectName) {
        // Project selected, Pyodide OK - render based on activeView
        switch (activeView) {
            case 'experiments':
            default: // Default to experiment list
                mainContent = <ExperimentListView projectName={selectedProjectName} />;
                break;
            case 'categoryAnalysis':
                mainContent = <GOUmapAnalysisUnit />;
                break;
            case 'goClustering':
                mainContent = <GOClusteringAnalysisUnit />;
                break;
            case 'settings':
                mainContent = (
                    <Alert message="Project Settings View (Not Implemented)" type="info" />
                );
                break;
        }
    } else {
        // Fallback loading state
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    // Render the content area itself
    return (
        <Content
            style={{
                padding: '24px',
                margin: 0,
                minHeight: 280,
                background: '#fff',
                overflow: 'auto',
            }}
        >
            {mainContent}
        </Content>
    );
};

const NavigationMenu: React.FC<{
    currentViewKey: string | null;
    onClick: MenuProps['onClick'];
    disabled: boolean;
}> = ({ currentViewKey, onClick, disabled }) => {
    const { error: pyodideError } = usePyodide();

    return (
        <Menu
            mode="inline"
            defaultOpenKeys={
                currentViewKey &&
                    ['categoryAnalysis', 'goClustering'].includes(currentViewKey)
                    ? ['analysis']
                    : []
            }
            selectedKeys={currentViewKey ? [currentViewKey] : []}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={onClick}
            disabled={disabled || !!pyodideError}
        />
    );
};

const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering...');
    const dispatch = useAppDispatch();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();

    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const currentViewKey = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    const {
        data: projectsData,
        isLoading: isLoadingProjects,
        error: projectsError,
    } = useGetProjectsQuery();

    const formattedProjectsError = projectsError
        ? typeof projectsError === 'object' &&
            projectsError !== null &&
            'message' in projectsError
            ? String(projectsError.message)
            : String(projectsError)
        : null;

    const showDrawer = useCallback(() => {
        setIsDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setIsDrawerOpen(false);
    }, []);

    const handleMenuClick: MenuProps['onClick'] = useCallback(
        (e: MenuInfo) => { // <-- Add type annotation
            console.log('Drawer menu clicked:', e.key);
            dispatch(setActiveView(e.key));
            closeDrawer();
        },
        [dispatch, closeDrawer]
    );

    const pyodideSpinTip = pyodideLoading ? <>Initializing Pyodide Environment...</> : undefined;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <AppHeader
                projectList={projectsData}
                isLoading={isLoadingProjects}
                error={formattedProjectsError}
                disabled={!!pyodideError}
                projectSelected={isProjectSelected}
                onMenuClick={showDrawer}
            />
            <Layout>
                <Spin spinning={pyodideLoading} tip={pyodideSpinTip} size="large">
                    <AppContentInternal />
                </Spin>
            </Layout>
            <Drawer
                title="Navigation"
                placement="left"
                onClose={closeDrawer}
                open={isDrawerOpen}
                styles={{ body: { padding: 0 } }}
            >
                <NavigationMenu
                    currentViewKey={currentViewKey}
                    onClick={handleMenuClick}
                    disabled={!isProjectSelected}
                />
            </Drawer>
            <PyodideErrorNotifier />
        </Layout>
    );
};

export default AppLayoutController;
