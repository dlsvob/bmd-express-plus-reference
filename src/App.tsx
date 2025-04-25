// src/App.tsx
import React from 'react';
import { Layout, Typography, Spin, Alert } from 'antd';
//import { PyodideProvider, usePyodide } from './contexts/PyodideProvider'; // Keep this import for usePyodide hook
import { useAppSelector } from './store/hooks';
import { useGetProjectsQuery } from './store/apis/projectsApi';
import { selectSelectedProjectName } from './store/selectors/projectSelectors';
import { selectCurrentView } from './store/slices/navigationSlice';
import AppHeader from './components/layout/AppHeader';
import AppSidebar from './components/layout/AppSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import PyodideErrorNotifier from './components/PyodideErrorNotifier';
import ExperimentListView from './components/views/ExperimentListView';
import GOUmapAnalysisUnit from './components/analysis/GOUmapAnalysisUnit';

const { Title, Paragraph } = Typography;

const AppContent: React.FC = () => {
  // --- usePyodide hook will now throw an error because provider is missing ---
  // --- You might need to conditionally use this or provide a mock context ---
  // const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();
  // --- TEMPORARY FIX: Assume Pyodide is not loading and has no error ---
  const pyodideLoading = false;
  const pyodideError = null;
  // ---------------------------------------------------------------------

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
    isSuccess: projectsLoadSuccess,
  } = useGetProjectsQuery();

  const selectedProjectName = useAppSelector(selectSelectedProjectName);
  const activeView = useAppSelector(selectCurrentView);
  const isProjectSelected = !!selectedProjectName;

  console.log(
    `Rendering AppContent: selectedProjectName = "${selectedProjectName}", isProjectSelected = ${isProjectSelected}, activeView = "${activeView}"`
  );

  const formattedProjectsError = projectsError
    ? typeof projectsError === 'object' &&
      projectsError !== null &&
      'message' in projectsError
      ? String(projectsError.message)
      : String(projectsError)
    : null;

  let mainContent: React.ReactNode;

  if (pyodideLoading) {
    // This block might not be reached now
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
    // This block might not be reached now
    mainContent = (
      <Alert
        message="Pyodide Initialization Failed"
        description="The core Python environment failed to load. Some application features will be unavailable. Please try refreshing the page."
        type="error"
        showIcon
      />
    );
  } else if (isLoadingProjects) {
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
  } else if (projectsError) {
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
    mainContent = (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Title level={3}>Welcome to BMDx Plus</Title>
        <Paragraph>
          Project list loaded ({projectsData?.length || 0} found). Please select
          a project or add a new one using the header.
        </Paragraph>
      </div>
    );
  } else if (isProjectSelected && selectedProjectName) {
    mainContent = (
      <div>
        <Title level={4} style={{ marginBottom: '20px' }}>
          Project: {selectedProjectName}
        </Title>
        {(!activeView || activeView === 'experiments') && (
          <ExperimentListView projectName={selectedProjectName} />
        )}
        {/* Pass projectName if GOUmapAnalysisUnit needs it */}
        {activeView === 'categoryAnalysis' && <GOUmapAnalysisUnit />}
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
      </div>
    );
  } else {
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        projectList={projectsData}
        isLoading={isLoadingProjects}
        error={formattedProjectsError}
        disabled={!!pyodideError} // Still uses pyodideError state
      />
      <Layout>
        {isProjectSelected && !pyodideError && <AppSidebar />}
        <Layout.Content style={{ padding: '24px', margin: '16px' }}>
          {mainContent}
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

// App component wraps everything
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      {/* --- PyodideProvider still needed here if AppContent uses usePyodide --- */}
      {/* --- Or provide a mock context / handle the error --- */}
      {/* <PyodideProvider> */}
      <AppContent />
      <PyodideErrorNotifier />
      {/* </PyodideProvider> */}
      {/* ----------------------------- */}
      {/* -------------------------------------------------------------------- */}
    </ErrorBoundary>
  );
};

export default App;
