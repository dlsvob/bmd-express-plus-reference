// src/components/layout/AppLayoutController.tsx
import React, { useState, useCallback } from 'react';
import { Layout, Drawer, Menu, Spin, Alert, Typography, Button, Space } from 'antd'; // Added Space
import {
    ExperimentOutlined,
    BarChartOutlined, // Icon for UMAP
    SettingOutlined,
    DeploymentUnitOutlined, // <<< Icon for Clustering button
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
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import PyodideErrorNotifier from '../shared/PyodideErrorNotifier';
import ExperimentListView from '../views/ExperimentListView';
import GOUmapAnalysisUnit from '../analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from '../analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit';
import AppHeader from './AppHeader';
import { usePyodide } from '../../contexts/PyodideProvider';
import styles from './AppLayoutController.module.css';

const { Content, Header } = Layout;

// --- Menu Items Configuration ---
const menuItems: MenuProps['items'] = [
    { key: 'experiments', icon: <ExperimentOutlined />, label: 'Experiments' },
    {
        key: 'analysis',
        label: 'Analysis',
        icon: <BarChartOutlined />, // Generic Analysis Icon
        children: [
            { key: 'categoryAnalysis', label: 'Category Analysis (UMAP)' }, // Key for UMAP view
            { key: 'goClustering', label: 'GO Clustering' }, // Key for clustering view
        ],
    },
    { key: 'settings', icon: <SettingOutlined />, label: 'Project Settings' },
];

// --- Internal Component for Main Content Area (Handles view rendering and sticky buttons) ---
const AppContentInternal: React.FC = () => {
    const { error: pyodideError } = usePyodide();
    const dispatch = useAppDispatch();
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView);
    const selectedRefs = useAppSelector(selectSelectedAnalysisRefs);
    const isProjectSelected = !!selectedProjectName;

    // Handler for UMAP Analysis Button
    const handleRunUmapAnalysis = useCallback(() => {
        if (!selectedRefs || selectedRefs.length === 0) return;
        console.log('[AppContentInternal] Run UMAP Analysis clicked.');
        dispatch(setActiveView('categoryAnalysis')); // Navigate to UMAP view
    }, [dispatch, selectedRefs]);

    // Handler for Clustering Button
    const handleRunClustering = useCallback(() => {
        if (!selectedRefs || selectedRefs.length === 0) return;
        console.log('[AppContentInternal] Run Clustering clicked.');
        dispatch(setActiveView('goClustering')); // Navigate to Clustering view
    }, [dispatch, selectedRefs]);

    // Shared disabled state for both buttons (enabled if > 0 refs selected)
    const isRunAnalysisDisabled = selectedRefs.length === 0;
    // Shared visibility condition (only show in experiments view with a project)
    const showRunAnalysisButtons = activeView === 'experiments' && isProjectSelected;

    // Determine which view component to render
    let viewContent: React.ReactNode;
    if (isProjectSelected && selectedProjectName) {
        switch (activeView) {
            case 'experiments':
            default:
                viewContent = <ExperimentListView projectName={selectedProjectName} />;
                break;
            case 'categoryAnalysis': // Key matching UMAP view
                viewContent = <GOUmapAnalysisUnit />;
                break;
            case 'goClustering': // Key matching Clustering view
                viewContent = <GOClusteringAnalysisUnit />;
                break;
            case 'settings':
                viewContent = (
                    <Alert message="Project Settings View (Not Implemented)" type="info" />
                );
                break;
        }
    } else if (pyodideError) {
        // Handle Pyodide error state
        viewContent = (
            <Alert
                message="Pyodide Initialization Failed"
                description="Core Python features may be unavailable. Please see the error modal for details or try reloading."
                type="error"
                showIcon
            />
        );
    } else if (!isProjectSelected) {
        // Handle no project selected state
        viewContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    } else {
        // Default loading state
        viewContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    // Render the sticky button container (if applicable) + the current view
    return (
        <>
            {/* Conditionally render the container for BOTH buttons */}
            {showRunAnalysisButtons && (
                <div className={styles.stickyExperimentButtonContainer}>
                    {/* Use Ant Design Space for layout */}
                    <Space wrap size="large" align="center" style={{ justifyContent: 'center', width: '100%' }}>
                        {/* UMAP Button */}
                        <Button
                            type="primary"
                            icon={<BarChartOutlined />} // Icon for UMAP
                            onClick={handleRunUmapAnalysis}
                            disabled={isRunAnalysisDisabled}
                            style={{ minWidth: '200px' }} // Give buttons some minimum width
                        >
                            Run UMAP Analysis{' '}
                            {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}
                        </Button>

                        {/* Clustering Button */}
                        <Button
                            type="primary"
                            icon={<DeploymentUnitOutlined />} // Icon for Clustering
                            onClick={handleRunClustering}
                            disabled={isRunAnalysisDisabled}
                            style={{ minWidth: '200px' }} // Give buttons some minimum width
                        >
                            Run Clustering{' '}
                            {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}
                        </Button>
                    </Space>
                </div>
            )}
            {/* Render the selected view content below the buttons */}
            {viewContent}
        </>
    );
};


// --- Navigation Menu Component ---
const NavigationMenu: React.FC<{
    currentViewKey: string | null;
    onClick: MenuProps['onClick'];
    disabled: boolean;
}> = ({ currentViewKey, onClick, disabled }) => {
    return (
        <Menu
            mode="inline"
            // Open the 'Analysis' submenu if the current view is one of its children
            defaultOpenKeys={
                currentViewKey &&
                    ['categoryAnalysis', 'goClustering'].includes(currentViewKey)
                    ? ['analysis']
                    : []
            }
            selectedKeys={currentViewKey ? [currentViewKey] : []}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems} // Use the defined menu structure
            onClick={onClick}
            disabled={disabled} // Disable menu if no project selected
        />
    );
};

// --- Main Layout Controller Component ---
const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering...');
    const dispatch = useAppDispatch();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Hooks for state and data
    const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const currentViewKey = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;
    const {
        data: projectsData,
        isLoading: isLoadingProjects,
        error: projectsError,
    } = useGetProjectsQuery();

    // Format potential error object for display
    const formattedProjectsError = projectsError
        ? typeof projectsError === 'object' &&
            projectsError !== null &&
            'message' in projectsError
            ? String(projectsError.message)
            : String(projectsError)
        : null;

    // Drawer callbacks
    const showDrawer = useCallback(() => { setIsDrawerOpen(true); }, []);
    const closeDrawer = useCallback(() => { setIsDrawerOpen(false); }, []);

    // Menu click handler
    const handleMenuClick: MenuProps['onClick'] = useCallback(
        (e: MenuInfo) => {
            console.log('Drawer menu clicked:', e.key);
            dispatch(setActiveView(e.key)); // Set the active view based on menu key
            closeDrawer(); // Close the drawer after selection
        },
        [dispatch, closeDrawer] // Dependencies for useCallback
    );

    // Loading indicator text
    const pyodideSpinTip = pyodideLoading ? (
        <>Initializing Pyodide Environment...</>
    ) : undefined;

    // Constants for layout
    const HEADER_HEIGHT = 64;
    // Determine if content should be centered (loading or no project)
    const showCentering = !isProjectSelected || pyodideLoading;

    // Styles for the Spin container based on centering need
    const baseSpinStyle: React.CSSProperties = {
        height: '100%', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', minHeight: 0, flexGrow: 1,
    };
    const centeringStyle: React.CSSProperties = showCentering
        ? { justifyContent: 'center', alignItems: 'center' }
        : { justifyContent: 'flex-start', alignItems: 'stretch' };
    const spinStyle: React.CSSProperties = { ...baseSpinStyle, ...centeringStyle };

    // Main component render
    return (
        <Layout
            style={{
                height: '100vh', overflow: 'hidden', position: 'relative',
                backgroundColor: '#e2f2ff', // Light blue background for the whole layout
                display: 'flex', flexDirection: 'column',
            }}
        >
            {/* Fixed Header */}
            <Header
                className={styles.fixedHeader}
                style={{
                    height: `${HEADER_HEIGHT}px`, padding: '0 16px',
                    backgroundColor: '#e2f2ff', // Match layout background
                    flexShrink: 0, // Prevent header from shrinking
                }}
            >
                <AppHeader
                    projectList={projectsData}
                    isLoading={isLoadingProjects}
                    error={formattedProjectsError}
                    disabled={!!pyodideError} // Disable header controls if Pyodide fails
                    projectSelected={isProjectSelected}
                    onMenuClick={showDrawer} // Pass handler to open drawer
                />
            </Header>

            {/* Main Content Area */}
            <Content className={styles.outerContentArea}>
                {/* Bordered Container */}
                <div className={styles.innerBorderedContainer}>
                    {/* Scrolling Container */}
                    <div className={styles.scrollMaskContainer}>
                        {/* Loading Spinner Wrapper */}
                        <Spin
                            spinning={pyodideLoading} // Show spinner while Pyodide loads
                            tip={pyodideSpinTip}
                            size="large"
                            style={spinStyle} // Apply dynamic centering style
                        >
                            {/* Render the internal content (buttons + current view) */}
                            <AppContentInternal />
                        </Spin>
                    </div>
                </div>
            </Content>

            {/* Navigation Drawer */}
            <Drawer
                title="Navigation"
                placement="left"
                onClose={closeDrawer}
                open={isDrawerOpen}
                styles={{ body: { padding: 0 } }} // Remove padding for Menu component
            >
                <NavigationMenu
                    currentViewKey={currentViewKey} // Highlight the active view
                    onClick={handleMenuClick} // Handle menu item clicks
                    disabled={!isProjectSelected} // Disable if no project is loaded
                />
            </Drawer>

            {/* Global Pyodide Error Modal */}
            <PyodideErrorNotifier />
        </Layout>
    );
};

export default AppLayoutController;