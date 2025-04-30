import React, { useState, useCallback } from 'react';
import { Layout, Drawer, Menu, Spin, Alert, Typography } from 'antd';
import {
    ExperimentOutlined,
    BarChartOutlined,
    SettingOutlined,
} from '@ant-design/icons';

import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';

import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useGetProjectsQuery } from '../../store/apis/projectsApi';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import {
    selectCurrentView,
    setActiveView,
} from '../../store/slices/navigationSlice';
import PyodideErrorNotifier from '../shared/PyodideErrorNotifier';
import ExperimentListView from '../views/ExperimentListView';
import GOUmapAnalysisUnit from '../analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from '../analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit';
import AppHeader from './AppHeader';
import { usePyodide } from '../../contexts/PyodideProvider';
import styles from './AppLayoutController.module.css'; // Keep using the CSS module

// --- Use Layout components ---
const { Content, Header } = Layout;

// --- Menu Items Configuration ---
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

// --- Internal Component for Main Content Area ---
// --- REMOVED the extra wrapper div ---
const AppContentInternal: React.FC = () => {
    const { error: pyodideError } = usePyodide();
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    let mainContent: React.ReactNode;

    // --- Render based on Pyodide error, project selection, and active view ---
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
        // --- Pyodide is OK, but no project selected ---
        mainContent = (
            <div
                style={{
                    textAlign: 'center',
                    marginTop: '50px',
                    padding: '24px',
                }}
            >
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    } else if (isProjectSelected && selectedProjectName) {
        // --- Project selected, Pyodide OK - render based on activeView ---
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
                    <Alert
                        message="Project Settings View (Not Implemented)"
                        type="info"
                    />
                );
                break;
        }
    } else {
        // --- Fallback loading state ---
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    // --- Render the view component directly ---
    return <>{mainContent}</>;
};

// --- Navigation Menu Component ---
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

// --- Main Layout Controller Component ---
const AppLayoutController: React.FC = () => {
    console.log(
        '[AppLayoutController] Rendering with scroll on Spin container...'
    );
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
        (e: MenuInfo) => {
            console.log('Drawer menu clicked:', e.key);
            dispatch(setActiveView(e.key));
            closeDrawer();
        },
        [dispatch, closeDrawer]
    );

    const pyodideSpinTip = pyodideLoading
        ? <>Initializing Pyodide Environment...</>
        : undefined;

    // --- Define header height ---
    const HEADER_HEIGHT = 64; // Standard Ant Design header height

    return (
        // --- Outer Layout: Full viewport height, NO SCROLL ---
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
            {/* --- Fixed Header --- */}
            <Header
                className={styles.fixedHeader} // Use CSS module class
                style={{ height: `${HEADER_HEIGHT}px`, padding: '0 16px' }} // Ensure padding is set
            >
                <AppHeader
                    projectList={projectsData}
                    isLoading={isLoadingProjects}
                    error={formattedProjectsError}
                    disabled={!!pyodideError}
                    projectSelected={isProjectSelected}
                    onMenuClick={showDrawer}
                />
            </Header>

            {/* --- Content defines the space, does NOT scroll --- */}
            <Content
                className={styles.mainContentArea}
                style={{
                    marginTop: `${HEADER_HEIGHT}px`,
                    flexGrow: 1,
                    overflow: 'hidden', // <<< NO SCROLL HERE >>>
                    minHeight: 0,
                    display: 'flex', // Keep as flex container for Spin
                    flexDirection: 'column',
                    padding: '0', // No padding here
                    boxSizing: 'border-box',
                }}
            >
                {/* --- Spin fills Content AND handles scrolling --- */}
                <Spin
                    spinning={pyodideLoading}
                    tip={pyodideSpinTip}
                    size="large"
                    // Apply styles directly to the Spin wrapper via CSS class
                    wrapperClassName={styles.spinWrapperScrollable}
                    style={{
                        flexGrow: 1, // Fill Content
                        display: 'flex', // Keep flex for AppContentInternal
                        flexDirection: 'column',
                        minHeight: 0,
                        // overflow: 'auto', // <<< SCROLL HANDLED BY CLASS >>>
                    }}
                >
                    {/* --- AppContentInternal renders view directly --- */}
                    <AppContentInternal />
                </Spin>
            </Content>

            {/* --- Drawer --- */}
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
