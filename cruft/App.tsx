// src/App.tsx
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
import ErrorBoundary from './components/ErrorBoundary';
import PyodideErrorNotifier from './components/PyodideErrorNotifier';
import ExperimentListView from './components/views/ExperimentListView';
import GOUmapAnalysisUnit from './components/analysis/GOUmapAnalysisUnit';
import GOClusteringAnalysisUnit from './components/analysis/GOClusteringAnalysisUnit';
import AppHeader from './components/layout/AppHeader';
import { PyodideProvider, usePyodide } from './contexts/PyodideProvider'; // Import Provider and hook

const { Content } = Layout;

// Define view keys type
type AppViewKey =
  | 'experiments'
  | 'categoryAnalysis'
  | 'goClustering'
  | 'settings'
  | string;

// Define the menu items (can be moved to a config file later)
const menuItems: MenuProps['items'] = [
  {
    key: 'experiments',
    icon: <ExperimentOutlined />,
    label: 'Experiments',
  },
  {
    key: 'analysis',
    label: 'Analysis',
    icon: <BarChartOutlined />,
    children: [
      {
        key: 'categoryAnalysis',
        label: 'Category Analysis (UMAP)',
      },
      {
        key: 'goClustering',
        label: 'GO Clustering',
      },
      // Add other analysis types here if needed
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Project Settings',
  },
];

// --- AppContent Component (Renders the main view based on state) ---
// This component assumes Pyodide is ready and a project might be selected.
// It uses the usePyodide hook to check for Pyodide errors specifically.
const AppContentInternal: React.FC = () => {
  const { error: pyodideError } = usePyodide(); // Get Pyodide error state

  // Get project and navigation state
  const selectedProjectName = useAppSelector(selectSelectedProjectName);
  const activeView = useAppSelector(selectCurrentView);
  const isProjectSelected = !!selectedProjectName;

  // Variables to hold the main content view
  let mainContent: React.ReactNode;

  // Determine Main Content View
  if (pyodideError) {
    // If Pyodide failed, show an alert in the content area as well.
    // The main error handling is via the modal, but this provides context.
    mainContent = (
      <Alert
        message="Pyodide Initialization Failed"
        description="The core Python environment failed to load. Some features are unavailable. See modal for details."
        type="error"
        showIcon
        style={{ margin: '24px' }}
      />
    );
  } else if (!isProjectSelected) {
    // Pyodide is OK, but no project selected
    mainContent = (
      <div style={{ textAlign: 'center', marginTop: '50px', padding: '24px' }}>
        <Typography.Title level={3}>Welcome to BMDx Plus</Typography.Title>
        <Typography.Paragraph>
          Please select or create a project using the controls in the header.
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
    // Fallback loading state (should be less common now)
    mainContent = (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Spin tip="Loading..." size="large" />
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
        background: '#fff', // Or Ant Design token: colorBgContainer
        // Add overflow handling if content might exceed viewport height
        overflow: 'auto',
      }}
    >
      {mainContent}
    </Content>
  );
};

// --- Main App Component (Handles Layout, Header, Drawer, Provider) ---
const App: React.FC = () => {
  console.log('[App.tsx] App component rendering...');
  const dispatch = useAppDispatch();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // --- Global State Needed for Layout/Header ---
  // We need Pyodide state here primarily to show the global loading spinner
  const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();
  const selectedProjectName = useAppSelector(selectSelectedProjectName);
  const currentViewKey = useAppSelector(selectCurrentView);
  const isProjectSelected = !!selectedProjectName;

  // --- Fetch Project List (for Header Controls) ---
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useGetProjectsQuery(); // Use the existing RTK Query hook

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
      closeDrawer(); // Close drawer after selection
    },
    [dispatch, closeDrawer]
  );

  // --- Render Structure ---
  return (
    <ErrorBoundary>
      {/* PyodideProvider wraps the entire application */}
      <PyodideProvider>
        <Layout style={{ minHeight: '100vh' }}>
          {/* AppHeader includes project selection and hamburger */}
          <AppHeader
            projectList={projectsData}
            isLoading={isLoadingProjects}
            error={formattedProjectsError}
            // Disable header controls if Pyodide is broken
            disabled={!!pyodideError}
            projectSelected={isProjectSelected}
            onMenuClick={showDrawer}
          />
          {/* Main Content Area Layout */}
          <Layout>
            {/* Conditionally render loading spinner or the main content */}
            {pyodideLoading ? (
              <Content style={{ padding: '50px', textAlign: 'center' }}>
                <Spin tip="Initializing Pyodide..." size="large" />
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
            bodyStyle={{ padding: 0 }} // Remove body padding for Menu
          >
            <Menu
              mode="inline"
              // Determine default open keys based on the current view if it's nested
              // This ensures the 'Analysis' submenu is open if 'categoryAnalysis' is selected
              defaultOpenKeys={
                currentViewKey &&
                  ['categoryAnalysis', 'goClustering'].includes(currentViewKey)
                  ? ['analysis']
                  : []
              }
              selectedKeys={currentViewKey ? [currentViewKey] : []}
              style={{ height: '100%', borderRight: 0 }}
              items={menuItems}
              onClick={handleMenuClick}
              // Disable menu if no project is selected OR Pyodide failed
              disabled={!isProjectSelected || !!pyodideError}
            />
          </Drawer>

          {/* Pyodide Error Modal (rendered outside main layout flow) */}
          <PyodideErrorNotifier />
        </Layout>
      </PyodideProvider>
    </ErrorBoundary>
  );
};

export default App;
