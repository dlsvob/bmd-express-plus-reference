[file: src / App.tsx]
// src/App.tsx
import React from 'react'; // Removed unused { useContext }
import { Layout, Typography, Spin, Alert } from 'antd';

// Import Providers and Hooks/Context
import { PyodideProvider, usePyodide } from './contexts/PyodideProvider'; // Adjust path if needed
import { useAppSelector } from './store/hooks'; // Adjust path if needed
import { useGetProjectsQuery } from './store/apis/projectsApi'; // Adjust path if needed

// Import necessary selectors
import { selectSelectedProjectName } from './store/selectors/projectSelectors'; // Adjust path if needed
import { selectCurrentView } from './store/slices/navigationSlice'; // Adjust path if needed

// Import components
import AppHeader from './components/layout/AppHeader'; // Adjust path if needed
import AppSidebar from './components/layout/AppSidebar'; // Adjust path if needed
import ErrorBoundary from './components/ErrorBoundary'; // Adjust path if needed
import PyodideErrorNotifier from './components/PyodideErrorNotifier'; // Adjust path if needed
import ExperimentListView from './components/views/ExperimentListView'; // Adjust path if needed
// --- REMOVE Import for the old view ---
// import GOUmapAnalysisView from './components/views/GOUmapAnalysisView'; // Adjust path if needed
// --- ADD Import for the new container ---
import AnalysisViewContainer from './components/views/AnalysisViewContainer'; // Adjust path if needed


const { Title, Paragraph } = Typography;

// Main app content rendering logic
const AppContent: React.FC = () => {

  // Use custom hook which handles undefined check
  const { isLoading: pyodideLoading, error: pyodideError } = usePyodide();

  // --- RTK Query hook for projects ---
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError, // Keep original error object here
    isSuccess: projectsLoadSuccess
  } = useGetProjectsQuery();

  // --- Other Redux State ---
  const selectedProjectName = useAppSelector(selectSelectedProjectName);
  const activeView = useAppSelector(selectCurrentView); // Ensure variable is used
  const isProjectSelected = !!selectedProjectName;

  // Log for debugging (Optional: remove when stable)
  console.log(
    `Rendering AppContent: selectedProjectName = "${selectedProjectName}", isProjectSelected = ${isProjectSelected}, activeView = "${activeView}"`
  );

  // Format error for passing as prop
  const formattedProjectsError = projectsError ?
    (
      (typeof projectsError === 'object' && projectsError !== null && 'message' in projectsError)
        ? String(projectsError.message)
        : String(projectsError)
    ) : null;

  // --- Content Rendering Logic ---
  let mainContent: React.ReactNode;

  if (pyodideLoading) {
    mainContent = (
      <Spin tip="Initializing Pyodide..." size="large" spinning={true}>
        <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.02)', minHeight: '200px', borderRadius: '4px' }} />
      </Spin>
    );
  } else if (pyodideError) {
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
        <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.02)', minHeight: '200px', borderRadius: '4px' }} />
      </Spin>
    );
  } else if (projectsError) {
    const errorMessage = formattedProjectsError || "An unknown error occurred loading projects.";
    mainContent = <Alert message={`Error loading projects: ${errorMessage}`} type="error" showIcon />;
  } else if (!isProjectSelected && projectsLoadSuccess) {
    mainContent = (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <Title level={3}>Welcome to BMDx Plus</Title>
        <Paragraph>Project list loaded ({projectsData?.length || 0} found). Please select a project or add a new one using the header.</Paragraph>
      </div>
    );
  } else if (isProjectSelected && selectedProjectName) { // Ensure selectedProjectName is truthy
    // --- Project is selected - Render based on activeView ---
    mainContent = (
      <div>
        <Title level={4} style={{ marginBottom: '20px' }}>Project: {selectedProjectName}</Title>

        {/* Render Component based on activeView state */}
        {(!activeView || activeView === 'experiments') && <ExperimentListView projectName={selectedProjectName} />}

        {/* **** MODIFICATION START: Use AnalysisViewContainer **** */}
        {activeView === 'categoryAnalysis' && <AnalysisViewContainer projectName={selectedProjectName} />}
        {/* **** MODIFICATION END **** */}

        {/* Placeholder for other potential views */}
        {/* {activeView === 'settings' && <ProjectSettingsView projectName={selectedProjectName} />} */}

        {/* Fallback for unknown/unexpected view key */}
        {activeView && !['experiments', 'categoryAnalysis', 'settings' /* add other known keys */].includes(activeView) && (
          <Alert message={`Error: Unknown view requested (${activeView})`} type="warning" showIcon />
        )}
      </div>
    );
  } else {
    // Fallback (e.g. projects loaded but somehow selection state is invalid)
    mainContent = (
      <Spin tip="Loading..." size="large" spinning={true}>
        <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.02)', minHeight: '200px', borderRadius: '4px' }} />
      </Spin>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        projectList={projectsData}
        isLoading={isLoadingProjects}
        error={formattedProjectsError} // Pass formatted error
        disabled={!!pyodideError}
      />
      <Layout>
        {/* Render sidebar only if a project is selected AND Pyodide is working */}
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
      {/* <PyodideProvider> */}
        <AppContent />
        {/* <PyodideErrorNotifier /> */}
      {/* </PyodideProvider> */}
    </ErrorBoundary>
  );
};

export default App;