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
import styles from './AppLayoutController.module.css';

const { Content, Header } = Layout;

// --- Menu Items Configuration (Unchanged) ---
const menuItems: MenuProps['items'] = [ /* ... */];

// --- Internal Component for Main Content Area (Unchanged) ---
const AppContentInternal: React.FC = () => {
    const { error: pyodideError } = usePyodide();
    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    let mainContent: React.ReactNode;

    if (pyodideError) {
        mainContent = (
            <Alert
                message="Pyodide Initialization Failed"
                description="Core Python features may be unavailable. Please see the error modal for details or try reloading."
                type="error"
                showIcon
            />
        );
    } else if (!isProjectSelected) {
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Typography.Title level={3}>BMD Express...Plus!</Typography.Title>
                <Typography.Paragraph>
                    Select a project for analysis, or create one.
                </Typography.Paragraph>
            </div>
        );
    } else if (isProjectSelected && selectedProjectName) {
        switch (activeView) {
            case 'experiments':
            default:
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
        // Should not be reached if pyodideLoading is handled by Spin
        mainContent = (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }
    // No wrapper needed here
    return <>{mainContent}</>;
};


// --- Navigation Menu Component (Unchanged) ---
const NavigationMenu: React.FC<{ /* ... */ }> = ({ /* ... */ }) => { /* ... */ };

// --- Main Layout Controller Component (Updated) ---
const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering with Outer Padding v9 - Centering Spin STYLE...'); // Updated log
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

    // --- Define header height (Unchanged) ---
    const HEADER_HEIGHT = 64;

    // --- Determine styles for Spin (Centering and Base) ---
    const showCentering = !isProjectSelected || pyodideLoading;

    // Base style for Spin (padding, height, flex)
    const baseSpinStyle: React.CSSProperties = {
        height: '100%', // Spin container should fill its parent
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        minHeight: 0,
        flexGrow: 1,
        padding: '24px', // <<< INNER PADDING (Inside Border)
    };

    // Conditional style for centering
    const centeringStyle: React.CSSProperties = showCentering
        ? {
            justifyContent: 'center', // Center vertically
            alignItems: 'center', // Center horizontally
        }
        : {
            // When not centering, use defaults to allow content alignment
            justifyContent: 'flex-start',
            alignItems: 'stretch',
        };

    // Combine base and conditional styles for the Spin component
    const spinStyle: React.CSSProperties = {
        ...baseSpinStyle,
        ...centeringStyle, // <<< Apply centering styles HERE
    };
    // --- End style determination ---

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
                    backgroundColor: '#e2f2ff',
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

            {/* --- Outer Content Area (Provides Padding/Margin) --- */}
            <Content className={styles.outerContentArea}>
                {/* --- Inner Bordered Scrollable Div --- */}
                {/* No conditional style needed here */}
                <div className={styles.innerBorderedScrollable}>
                    {/* --- Spin: Applies INNER padding and CONDITIONAL centering via style --- */}
                    <Spin
                        spinning={pyodideLoading}
                        tip={pyodideSpinTip}
                        size="large"
                        style={spinStyle} // <<< Apply combined style HERE
                    // Removed wrapperClassName
                    >
                        {/* <<< ALWAYS render AppContentInternal >>> */}
                        <AppContentInternal />
                    </Spin>
                </div>
            </Content>

            {/* --- Drawer etc. --- */}
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
