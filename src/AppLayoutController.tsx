// src/AppLayoutController.tsx
import React, { useState, useCallback } from 'react';
import {
    Layout,
    Drawer,
    Button,
    Menu,
    Spin,
    Alert,
    Typography,
} from 'antd';
import {
    MenuOutlined,
    ExperimentOutlined,
    BarChartOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { useGetProjectsQuery } from './store/apis/projectsApi';
import { selectSelectedProjectName } from './store/selectors/projectSelectors';
import {
    selectCurrentView,
    setActiveView,
} from './store/slices/navigationSlice';
import PyodideErrorNotifier from './components/PyodideErrorNotifier';
import ExperimentListView from './components/views/ExperimentListView';
import GOUmapAnalysisUnit from './components/analysis/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from './components/analysis/GOClusteringAnalysisUnit';
import AppHeader from './components/layout/AppHeader';
// *** Import usePyodide hook HERE ***
import { usePyodide } from './contexts/PyodideProvider';

const { Content } = Layout;

// Define view keys type
type AppViewKey =
    | 'experiments'
    | 'categoryAnalysis'
    | 'goClustering'
    | 'settings'
    | string;

// Define the menu items
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

// --- AppContentInternal Component (Renders the specific view) ---
// This component assumes Pyodide loading is handled by the parent (AppLayoutController)
// but it can check for Pyodide errors itself if needed for specific view logic.
const AppContentInternal: React.FC = () => {
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
            // Handle potential unknown views explicitly if needed
            // case 'someOtherView': ...
        }
    } else {
        // Fallback loading state (e.g., project selected but name missing)
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin tip="Loading project content..." size="large" />
            </div>
        );
    }

    // Render the content area itself
    return (
        <Content
            style={{
                padding: '24px',
                margin: 0,
                minHeight: 280, // Example min height
                background: '#fff', // Or use Ant Design token
                overflow: 'auto', // Ensure content scrolls if needed
            }}
        >
            {mainContent}
        </Content>
    );
};

// --- Navigation Menu Component (Extracted for clarity) ---
// Receives disabled state based on project selection from parent
const NavigationMenu: React.FC<{
    currentViewKey: string | null;
    onClick: MenuProps['onClick'];
    disabled: boolean; // Is the menu generally disabled (e.g., no project)?
}> = ({ currentViewKey, onClick, disabled }) => {
    // Use hook here to get Pyodide error state specifically for this component
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
            // Final disabled state depends on parent AND Pyodide status
            disabled={disabled || !!pyodideError}
        />
    );
};

// --- AppLayoutController Component (Manages Layout, Consumes Pyodide Context) ---
const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering...'); // Log when this renders
    const dispatch = useAppDispatch();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // *** Consume Pyodide context HERE ***
    const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();

    // --- Global State Needed for Layout/Header ---
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const currentViewKey = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    // --- Fetch Project List ---
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

    // --- Callbacks ---
    const showDrawer = useCallback(() => {
        setIsDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setIsDrawerOpen(false);
    }, []);

    const handleMenuClick: MenuProps['onClick'] = useCallback(
        (e) => {
            console.log('Drawer menu clicked:', e.key);
            dispatch(setActiveView(e.key as AppViewKey));
            closeDrawer();
        },
        [dispatch, closeDrawer]
    );

    // --- Render Structure ---
    // This component now renders the main layout structure
    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* AppHeader receives disabled state based on Pyodide error */}
            <AppHeader
                projectList={projectsData}
                isLoading={isLoadingProjects}
                error={formattedProjectsError}
                // Pass Pyodide error status down to disable header controls if needed
                disabled={!!pyodideError}
                projectSelected={isProjectSelected}
                onMenuClick={showDrawer}
            />
            {/* Main Content Area Layout */}
            <Layout>
                {/* Conditionally render loading spinner OR the main content */}
                {pyodideLoading ? (
                    <Content style={{ padding: '50px', textAlign: 'center' }}>
                        <Spin tip="Initializing Pyodide Environment..." size="large" />
                    </Content>
                ) : (
                    // Render the internal content component once Pyodide is done loading (or failed)
                    <AppContentInternal />
                )}
            </Layout>

            {/* Navigation Drawer */}
            <Drawer
                title="Navigation"
                placement="left"
                onClose={closeDrawer}
                open={isDrawerOpen}
                bodyStyle={{ padding: 0 }}
            >
                {/* Render the extracted NavigationMenu component */}
                <NavigationMenu
                    currentViewKey={currentViewKey}
                    onClick={handleMenuClick}
                    // Disable menu if no project is selected
                    disabled={!isProjectSelected}
                // The menu component itself checks for pyodideError via context
                />
            </Drawer>

            {/* Pyodide Error Modal (Needs access to context, so rendered here) */}
            <PyodideErrorNotifier />
        </Layout>
    );
};

export default AppLayoutController;
