// src/components/layout/AppLayoutController.tsx
import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
} from 'react';
import {
    Layout,
    Drawer,
    Menu,
    Spin,
    Alert,
    Typography,
} from 'antd';
import {
    ExperimentOutlined,
    BarChartOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface'; // Ensure this path is correct for your setup
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
import { usePyodide } from '../../contexts/PyodideProvider'; // Make sure this import is present
import styles from './AppLayoutController.module.css';

const { Content } = Layout;

// Define menu items
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

// --- Internal Component for Content Area ---
const AppContentInternal: React.FC = () => {
    const contentRef = useRef<HTMLElement>(null);
    const { error: pyodideError } = usePyodide(); // Get error state here too

    useEffect(() => {
        // ... (logging code remains the same) ...
        if (contentRef.current) {
            const rect = contentRef.current.getBoundingClientRect();
            const scrollHeight = contentRef.current.scrollHeight;
            console.log(
                `[AppContentInternal Dimensions] Client Height: ${rect.height.toFixed(
                    2
                )}px, Scroll Height: ${scrollHeight.toFixed(2)}px`
            );
            const spinContainer = contentRef.current.closest(
                `.${styles.spinWrapperFullHeight} > .ant-spin-container`
            );
            if (spinContainer) {
                console.log(
                    `[AppContentInternal Dimensions] Parent (.ant-spin-container) Client Height: ${spinContainer
                        .getBoundingClientRect()
                        .height.toFixed(2)}px`
                );
            }
            const analysisUnitContainer = contentRef.current.closest(
                `.${styles.analysisUnitContainer}`
            );
            if (analysisUnitContainer) {
                console.log(
                    `[AppContentInternal Dimensions] Parent (.analysisUnitContainer) Client Height: ${analysisUnitContainer
                        .getBoundingClientRect()
                        .height.toFixed(2)}px`
                );
            }
        }
    }, []);

    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const activeView = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;
    let mainContent: React.ReactNode;

    // Render based on Pyodide error, project selection, and active view
    if (pyodideError) {
        mainContent = (<Alert message="Pyodide Initialization Failed" description="Core Python features may be unavailable..." type="error" showIcon style={{ margin: '24px' }} />);
    } else if (!isProjectSelected) {
        mainContent = (<div style={{ textAlign: 'center', marginTop: '50px', padding: '24px' }}> <Typography.Title level={3}>BMD Express...Plus!</Typography.Title> <Typography.Paragraph> Select a project...</Typography.Paragraph> </div>);
    } else if (isProjectSelected && selectedProjectName) {
        switch (activeView) {
            case 'experiments': default: mainContent = <ExperimentListView projectName={selectedProjectName} />; break;
            case 'categoryAnalysis': mainContent = <GOUmapAnalysisUnit />; break;
            case 'goClustering': mainContent = <GOClusteringAnalysisUnit />; break;
            case 'settings': mainContent = (<Alert message="Project Settings View (Not Implemented)" type="info" />); break;
        }
    } else {
        mainContent = (<div style={{ textAlign: 'center', marginTop: '50px' }}> <Spin size="large" /> </div>);
    }

    return (
        <Content ref={contentRef} className={styles.scrollableContent}>
            {mainContent}
        </Content>
    );
};

// --- Internal Component for Navigation Menu ---
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

// --- Main AppLayoutController Component ---
const AppLayoutController: React.FC = () => {
    console.log('[AppLayoutController] Rendering...');
    const dispatch = useAppDispatch();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // --- ADD THIS LINE BACK ---
    const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();
    // --------------------------

    const selectedProjectName = useAppSelector(selectSelectedProjectName);
    const currentViewKey = useAppSelector(selectCurrentView);
    const isProjectSelected = !!selectedProjectName;

    const {
        data: projectsData,
        isLoading: isLoadingProjects,
        error: projectsError,
    } = useGetProjectsQuery();

    const contentLayoutRef = useRef<HTMLElement>(null); // Ref for the layout below header
    const analysisUnitContainerRef = useRef<HTMLDivElement>(null); // Ref for the bordered div

    useEffect(() => {
        // ... (logging code remains the same) ...
        if (contentLayoutRef.current) { console.log(`[AppLayoutController Dimensions] .contentLayout Height: ${contentLayoutRef.current.getBoundingClientRect().height.toFixed(2)}px`); }
        if (analysisUnitContainerRef.current) { console.log(`[AppLayoutController Dimensions] .analysisUnitContainer Height: ${analysisUnitContainerRef.current.getBoundingClientRect().height.toFixed(2)}px`); }
    }, []);

    const formattedProjectsError = projectsError ? (typeof projectsError === 'object' && projectsError !== null && 'message' in projectsError ? String(projectsError.message) : String(projectsError)) : null;
    const showDrawer = useCallback(() => { setIsDrawerOpen(true); }, []);
    const closeDrawer = useCallback(() => { setIsDrawerOpen(false); }, []);
    const handleMenuClick: MenuProps['onClick'] = useCallback((e: MenuInfo) => { console.log('Drawer menu clicked:', e.key); dispatch(setActiveView(e.key)); closeDrawer(); }, [dispatch, closeDrawer]);

    // This should now work as pyodideLoading is defined
    const pyodideSpinTip = pyodideLoading ? <>Initializing Pyodide Environment...</> : undefined;

    const HEADER_HEIGHT = 64;
    const CONTAINER_MARGIN = 24;

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            {/* Fixed Header */}
            <div
                className={styles.fixedHeader}
                style={{ height: `${HEADER_HEIGHT}px` }}
            >
                <AppHeader
                    projectList={projectsData}
                    isLoading={isLoadingProjects}
                    error={formattedProjectsError}
                    disabled={!!pyodideError} // Use pyodideError here
                    projectSelected={isProjectSelected}
                    onMenuClick={showDrawer}
                />
            </div>

            {/* Fixed Analysis Container */}
            <div
                ref={analysisUnitContainerRef}
                className={styles.analysisUnitContainer}
                style={{
                    top: `${HEADER_HEIGHT + CONTAINER_MARGIN}px`,
                    left: `${CONTAINER_MARGIN}px`,
                    right: `${CONTAINER_MARGIN}px`,
                    bottom: `${CONTAINER_MARGIN}px`,
                }}
            >
                {/* Spin is INSIDE the fixed container */}
                <Spin
                    spinning={pyodideLoading} // Use pyodideLoading here
                    tip={pyodideSpinTip}
                    size="large"
                    wrapperClassName={styles.spinWrapperFullHeight}
                    style={{ height: '100%' }}
                >
                    <AppContentInternal />
                </Spin>
            </div>

            {/* Drawer */}
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

            {/* Pyodide Error Notifier */}
            <PyodideErrorNotifier />
        </Layout>
    );
};

export default AppLayoutController;
