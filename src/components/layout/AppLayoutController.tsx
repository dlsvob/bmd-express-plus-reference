import React, { useState, useCallback } from 'react';
// Import Button and Icon
import { Layout, Drawer, Menu, Spin, Alert, Typography, Button } from 'antd';
import {
    ExperimentOutlined,
    BarChartOutlined, // Keep this icon
    SettingOutlined,
} from '@ant-design/icons';

import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';

import { useAppSelector, useAppDispatch } from '../../store/hooks'; // Keep hooks
import { useGetProjectsQuery } from '../../store/apis/projectsApi';
import { selectSelectedProjectName } from '../../store/selectors/projectSelectors';
import {
    selectCurrentView,
    setActiveView, // Keep action
} from '../../store/slices/navigationSlice';
// Import selector for button state
import { selectSelectedAnalysisRefs } from '../../store/slices/selectedAnalysisSlice';
import PyodideErrorNotifier from '../shared/PyodideErrorNotifier';
import ExperimentListView from '../views/ExperimentListView'; // Keep view import
import GOUmapAnalysisUnit from '../analysis/GOUmapAnalysisUnit/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from '../analysis/GOClusteringAnalysisUnit/GOClusteringAnalysisUnit';
import AppHeader from './AppHeader';
import { usePyodide } from '../../contexts/PyodideProvider';
import styles from './AppLayoutController.module.css'; // Keep styles import

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

// --- Internal Component for Main Content Area (MODIFIED) ---
const AppContentInternal: React.FC = () => {
    const { error: pyodideError } = usePyodide();
    const dispatch = useAppDispatch(); // Get dispatch
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView); // Get active view
    const selectedRefs = useAppSelector(selectSelectedAnalysisRefs); // Get selected refs for button
    const isProjectSelected = !!selectedProjectName;

    // --- Define the submission handler HERE ---
    const handleRunAnalysis = useCallback(() => {
        if (!selectedRefs || selectedRefs.length === 0) return;
        console.log('[AppContentInternal] Run Analysis clicked, dispatching setActiveView.');
        dispatch(setActiveView('categoryAnalysis'));
    }, [dispatch, selectedRefs]); // Add dependencies

    const isRunAnalysisDisabled = selectedRefs.length === 0;
    const showRunAnalysisButton = activeView === 'experiments' && isProjectSelected; // Show only in experiments view when project selected

    let viewContent: React.ReactNode;

    // Determine the main view content based on activeView
    if (isProjectSelected && selectedProjectName) {
        switch (activeView) {
            case 'experiments':
            default:
                viewContent = <ExperimentListView projectName={selectedProjectName} />;
                break;
            case 'categoryAnalysis':
                viewContent = <GOUmapAnalysisUnit />;
                break;
            case 'goClustering':
                viewContent = <GOClusteringAnalysisUnit />;
                break;
            case 'settings':
                viewContent = (
                    <Alert message="Project Settings View (Not Implemented)" type="info" />
                );
                break;
        }
    } else if (pyodideError) {
        viewContent = (
            <Alert
                message="Pyodide Initialization Failed"
                description="Core Python features may be unavailable. Please see the error modal for details or try reloading."
                type="error"
                showIcon
            />
        );
    } else if (!isProjectSelected) {
        viewContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    } else {
        viewContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    // Render the sticky button container *before* the main view content
    // ONLY if the conditions are met
    return (
        <>
            {showRunAnalysisButton && (
                <div className={styles.stickyExperimentButtonContainer}>
                    <Button
                        type="primary"
                        icon={<BarChartOutlined />}
                        onClick={handleRunAnalysis}
                        disabled={isRunAnalysisDisabled}
                        style={{ width: '90%', maxWidth: '400px' }} // Adjust width as needed
                    >
                        Run Category Analysis{' '}
                        {selectedRefs.length > 0 ? `(${selectedRefs.length})` : ''}
                    </Button>
                </div>
            )}
            {/* Render the selected view content below the button */}
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
            disabled={disabled}
        />
    );
};

// --- Main Layout Controller Component ---
const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering with Nested Scroll/Mask...');
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

    const showDrawer = useCallback(() => { setIsDrawerOpen(true); }, []);
    const closeDrawer = useCallback(() => { setIsDrawerOpen(false); }, []);

    const handleMenuClick: MenuProps['onClick'] = useCallback(
        (e: MenuInfo) => {
            console.log('Drawer menu clicked:', e.key);
            dispatch(setActiveView(e.key));
            closeDrawer();
        },
        [dispatch, closeDrawer]
    );

    const pyodideSpinTip = pyodideLoading ? (
        <>Initializing Pyodide Environment...</>
    ) : undefined;

    const HEADER_HEIGHT = 64;
    const showCentering = !isProjectSelected || pyodideLoading;

    // --- Style for the Spin component itself ---
    const baseSpinStyle: React.CSSProperties = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        minHeight: 0,
        flexGrow: 1,
    };

    const centeringStyle: React.CSSProperties = showCentering
        ? { justifyContent: 'center', alignItems: 'center' }
        : { justifyContent: 'flex-start', alignItems: 'stretch' };

    const spinStyle: React.CSSProperties = { ...baseSpinStyle, ...centeringStyle };

    return (
        <Layout
            style={{
                height: '100vh',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#e2f2ff',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Header
                className={styles.fixedHeader}
                style={{
                    height: `${HEADER_HEIGHT}px`,
                    padding: '0 16px',
                    backgroundColor: '#e2f2ff', // Match layout background
                    flexShrink: 0,
                }}
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

            <Content className={styles.outerContentArea}>
                <div className={styles.innerBorderedContainer}>
                    {/* scrollMaskContainer handles scrolling and padding-top */}
                    <div className={styles.scrollMaskContainer}>
                        {/* Spin component */}
                        <Spin
                            spinning={pyodideLoading}
                            tip={pyodideSpinTip}
                            size="large"
                            style={spinStyle} // Style applied to Spin wrapper
                        // No wrapper class needed if padding is on parent
                        >
                            {/* AppContentInternal renders sticky button + view */}
                            <AppContentInternal />
                        </Spin>
                    </div>
                </div>
            </Content>

            {/* --- Drawer etc. --- */}
            <Drawer
                title="Navigation"
                placement="left"
                onClose={closeDrawer}
                open={isDrawerOpen}
                styles={{ body: { padding: 0 } }} // Remove body padding for menu
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
