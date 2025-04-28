// src/App.tsx
import React from 'react';
import { Layout, Typography, Spin, Alert } from 'antd';
import { useAppSelector } from './store/hooks';
import { useGetProjectsQuery } from './store/apis/projectsApi';
import { selectSelectedProjectName } from './store/selectors/projectSelectors';
import { selectCurrentView } from './store/slices/navigationSlice';
// --- Import Siders and other components ---
import ProjectSelectionSider from './components/layout/ProjectSelectionSider';
import AppSidebar from './components/layout/AppSidebar'; // Left Sider content
import ErrorBoundary from './components/ErrorBoundary';
import PyodideErrorNotifier from './components/PyodideErrorNotifier';
import ExperimentListView from './components/views/ExperimentListView';
import GOUmapAnalysisUnit from './components/analysis/GOUmapAnalysisUnit';

// Use Title and Paragraph from Ant Design
const { Title, Paragraph } = Typography;
// Use Content from Ant Design Layout
const { Content } = Layout;

const AppContent: React.FC = () => {
  // --- State and Data Fetching ---
  // Assuming temporary Pyodide state for now
  const pyodideLoading = false;
  const pyodideError = null;

  // Fetch project list using RTK Query
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
    isSuccess: projectsLoadSuccess,
  } = useGetProjectsQuery();

  // Get relevant state from Redux
  const selectedProjectName = useAppSelector(selectSelectedProjectName);
  const activeView = useAppSelector(selectCurrentView);
  const isProjectSelected = !!selectedProjectName; // Boolean flag

  // Format potential project loading error
  const formattedProjectsError = projectsError
    ? typeof projectsError === 'object' &&
      projectsError !== null &&
      'message' in projectsError
      ? String(projectsError.message)
      : String(projectsError)
    : null;

  // Variables to hold the main content view and the header within the content area
  let mainContent: React.ReactNode;
  let contentHeader: React.ReactNode = null;

  // --- Determine Content Header (Project Title) ---
  // Display the title only if a project is selected
  if (isProjectSelected && selectedProjectName) {
    contentHeader = (
      <Title
        level={2} // Prominent title size
        style={{
          marginBottom: '24px', // Space below title
          marginTop: '0px', // Adjust as needed
          textAlign: 'left', // Align with content
          padding: 0,
        }}
      >
        {selectedProjectName}
      </Title>
    );
  }

  // --- Determine Main Content View based on application state ---
  if (pyodideLoading) {
    // Display spinner if Pyodide is initializing
    mainContent = (
      <Spin tip="Initializing Pyodide..." size="large" spinning={true}>
        <div
          style={{
            padding: '50px',
            background: 'rgba(0, 0, 0, 0.02)',
            minHeight: '200px',
            borderRadius: '4px',
          }}
        />
      </Spin>
    );
  } else if (pyodideError) {
    // Display error if Pyodide failed (Error Notifier modal will also show)
    mainContent = (
      <Alert
        message="Pyodide Initialization Failed"
        description="The core Python environment failed to load. Some application features will be unavailable. Please try refreshing the page."
        type="error"
        showIcon
      />
    );
  } else if (isLoadingProjects && !projectsData) {
    // Display spinner if project list is loading for the first time
    mainContent = (
      <Spin tip="Loading project list..." size="large" spinning={true}>
        <div
          style={{
            padding: '50px',
            background: 'rgba(0, 0, 0, 0.02)',
            minHeight: '200px',
            borderRadius: '4px',
          }}
        />
      </Spin>
    );
  } else if (projectsError && !isLoadingProjects) {
    // Display error if project list failed to load
    const errorMessage =
      formattedProjectsError || 'An unknown error occurred loading projects.';
    mainContent = (
      <Alert
        message={`Error loading projects: ${errorMessage}`}
        type="error"
        showIcon
      />
    );
  } else if (!isProjectSelected && projectsLoadSuccess) {
    // Display welcome message if projects loaded but none selected
    mainContent = (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Title level={3}>Welcome to BMDx Plus</Title>
        <Paragraph>
          Project list loaded ({projectsData?.length || 0} found). Please select
          a project using the panel on the right.
        </Paragraph>
      </div>
    );
  } else if (isProjectSelected && selectedProjectName) {
    // Render the appropriate view based on navigation state if a project is selected
    mainContent = (
      <>
        {/* Default view or Experiment List view */}
        {(!activeView || activeView === 'experiments') && (
          <ExperimentListView projectName={selectedProjectName} />
        )}
        {/* Analysis View */}
        {activeView === 'categoryAnalysis' && <GOUmapAnalysisUnit />}
        {/* Handle unknown views */}
        {activeView &&
          !['experiments', 'categoryAnalysis', 'settings'].includes(
            activeView
          ) && (
            <Alert
              message={`Error: Unknown view requested (${activeView})`}
              type="warning"
              showIcon
            />
          )}
      </>
    );
  } else {
    // Fallback loading state (should ideally not be reached often with above logic)
    mainContent = (
      <Spin tip="Loading..." size="large" spinning={true}>
        <div
          style={{
            padding: '50px',
            background: 'rgba(0, 0, 0, 0.02)',
            minHeight: '200px',
            borderRadius: '4px',
          }}
        />
      </Spin>
    );
  }

  // --- Render the Layout Structure ---
  return (
    // Outermost Layout is now horizontal
    <Layout style={{ minHeight: '100vh', flexDirection: 'row' }}>
      {/* Left Sider (Navigation) - Always Rendered if Pyodide is OK */}
      {!pyodideError && <AppSidebar projectSelected={isProjectSelected} />}

      {/* Center Content Area - Takes remaining space */}
      <Layout style={{ flexGrow: 1 }}>
        <Content style={{ padding: '24px', margin: '16px', overflow: 'initial' }}>
          {contentHeader} {/* Render the project title (if any) */}
          {mainContent} {/* Render the main view */}
        </Content>
      </Layout>

      {/* Right Sider (Project Selection) - Always Rendered */}
      <ProjectSelectionSider
        projectList={projectsData}
        isLoading={isLoadingProjects}
        error={formattedProjectsError}
        disabled={!!pyodideError}
        width={220} // Adjust width as needed
      />

      {/* Pyodide Error Modal (rendered outside main layout flow) */}
      <PyodideErrorNotifier />
    </Layout>
  );
};

// App component wraps everything in an Error Boundary
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      {/* PyodideProvider would wrap AppContent if used */}
      {/* <PyodideProvider> */}
      <AppContent />
      {/* </PyodideProvider> */}
    </ErrorBoundary>
  );
};

export default App;
