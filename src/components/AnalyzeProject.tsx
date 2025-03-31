// src/components/AnalyzeProject.tsx
import React, { useState, useMemo } from 'react'; // Removed useEffect
import { Spin, Select, Typography, Alert, Space, Empty } from 'antd';

// Import the detailed types needed
import {
  DoseResponseExperiment,
  ProjectData, // Needed for the type returned by useProjectData
  CategoryAnalysisResult, // Needed for ExperimentCard prop
  BMDResult, // Needed for ExperimentCard prop
  WilliamsTrendResult, // Needed for ExperimentCard prop
  // other needed types...
} from '../models/BMDxExported'; // Adjust path
import ExperimentsMultiSelect from './ExperimentsMultiSelect'; // Assuming this exists
import ExperimentCard from './ExperimentCard'; // Assuming this exists
// Import the GENERIC hook for fetching data for ONE project and its required input type
import { useProjectData, ProjectInfo, UseProjectDataResult } from '../hooks/useProjectData'; // Adjust path
// *** IMPORT THE REAL HOOK FOR THE PROJECT LIST ***
import { useAvailableProjectList } from '../hooks/useAvailableProjectsList'; // Adjust path

const { Title } = Typography;
const { Option } = Select;

// Helper to get error message string
const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
    return (error as { message: string }).message;
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    try {
      const dataString = typeof (error as any).data === 'string' ? (error as any).data : JSON.stringify((error as any).data);
      return `Error ${(error as any).status}: ${dataString}`;
    } catch { return `Error ${(error as any).status}: (Could not display error data)`; }
  }
  try { return JSON.stringify(error); } catch { return 'Could not display error details.'; }
  // Return added previously to satisfy TS, keep it
  return 'An unknown error occurred.';
};

// Define the structure for prefiltering data passed down
type PrefilteringDataType = {
  anova?: any[];
  williams?: WilliamsTrendResult[];
  curveFit?: any[];
  oriogen?: any[];
};

// --- Component ---
const AnalyzeProject: React.FC = () => {
  // --- State ---
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [selectedExperimentNames, setSelectedExperimentNames] = useState<string[]>([]);

  // --- Hook to get list of available projects ---
  // NOTE: This hook currently only fetches projects stored locally via IndexedDB metadata.
  // A separate mechanism (e.g., another hook using RTK Query) would be needed
  // to fetch and potentially merge lists from remote sources if required later.
  const {
    projects, // List of ProjectInfo { name, source }
    isLoading: projectsLoading, // Loading state for the list
    error: projectsError // Error state for the list
  } = useAvailableProjectList(); // <<< USE THE REAL, IMPORTED HOOK (takes no arguments)

  // --- Custom Hook for fetching data of the ONE selected project ---
  const {
    projectData, // Type: ProjectData | null
    isLoading: isProjectDataLoading, // Loading state for the selected project's data
    error: projectDataError, // Error state for the selected project's data
  }: UseProjectDataResult = useProjectData(selectedProject); // Call generic hook

  // --- Derived State ---
  // Get experiments *from the loaded projectData*
  const experiments: DoseResponseExperiment[] | undefined = useMemo(
    () => projectData?.doseResponseExperiments,
    [projectData] // Recalculate when projectData changes
  );

  // Filter the experiments based on selection
  const selectedExperiments: DoseResponseExperiment[] = useMemo(
    () => experiments?.filter((exp) => exp && selectedExperimentNames.includes(exp.name)) || [], // Added null check for exp
    [experiments, selectedExperimentNames],
  );

  // Combined loading state
  const isLoading = projectsLoading || isProjectDataLoading;
  // Combined error state
  const hasCriticalError = !!(projectsError || projectDataError);

  // --- Handlers ---
  const handleProjectChange = (value: string) => {
    // Find project object from the available list
    const project = projects?.find((p) => p.name === value) || null;
    setSelectedProject(project);
    setSelectedExperimentNames([]); // Reset experiment selection
  };

  // --- Render Logic ---
  return (
    <div style={{ padding: '1rem' }}>
      <Title level={2}>Analyze Project</Title>

      {/* Loading Indicator */}
      {isLoading && <Spin tip="Loading data..." style={{ marginBottom: '1rem', display: 'block' }} />}

      {/* Error Display Area */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: '1rem' }}>
        {projectsError && <Alert message="Error Loading Project List" description={getErrorMessage(projectsError)} type="error" showIcon />}
        {projectDataError && <Alert message="Error Loading Selected Project Data" description={getErrorMessage(projectDataError)} type="error" showIcon />}
      </Space>

      {/* Project Selection */}
      {!projectsLoading && projects && (
        <Select
          placeholder="Select a project"
          value={selectedProject?.name}
          onChange={handleProjectChange}
          style={{ width: 300, marginBottom: '2rem' }}
          disabled={isLoading || projectsLoading}
          loading={projectsLoading}
        >
          {projects.map((project) => (
            <Option key={project.name} value={project.name}>
              {project.name} {project.source !== 'indexeddb' ? `(${project.source})` : ''}
            </Option>
          ))}
        </Select>
      )}
      {!projectsLoading && !projectsError && (!projects || projects.length === 0) && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No projects available." />
      )}

      {/* Experiments Section (only if a project is selected AND its data has loaded without critical errors) */}
      {selectedProject && projectData && !hasCriticalError && (
        <div style={{ marginTop: '1rem' }}> {/* Added margin */}
          <Title level={4} style={{ marginBottom: '1rem' }}>Experiments for {selectedProject.name}</Title> {/* Changed level */}

          {/* Experiment Selector (use 'experiments' derived from projectData) */}
          {experiments && experiments.length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}> {/* Added margin */}
              <ExperimentsMultiSelect
                experiments={experiments} // Pass DoseResponseExperiment[]
                onSelectionChange={setSelectedExperimentNames}
              />
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No experiments found in this project's data." style={{ marginTop: '1rem' }} />
          )}

          {/* Render Experiment Cards (only if experiments are selected) */}
          {selectedExperiments.length > 0 ? (
            <div style={{ marginTop: '1rem' }}> {/* Adjusted margin */}
              {selectedExperiments.map((exp) => {
                // Filter data slices directly from the loaded projectData
                const categoryAnalysisDataForExp = projectData.categoryAnalysisResults?.filter(
                  (catRes) => catRes && catRes.bmdResult === exp['@ref']
                );
                const bmdResultsDataForExp = projectData.bMDResult?.filter(
                  (bmdRes) => bmdRes && bmdRes.doseResponseExperiment === exp['@ref']
                );
                const prefilteringDataForExp: PrefilteringDataType = {
                  anova: projectData.oneWayANOVAResults?.filter(
                    (res: any) => res && res.doseResponseExperiement === exp['@ref'] // Adjust property name if needed
                  ),
                  williams: projectData.williamsTrendResults?.filter(
                    (res) => res && res.doseResponseExperiement === exp['@ref'] // Adjust property name if needed
                  ),
                  curveFit: projectData.curveFitPrefilterResults?.filter(
                    (res: any) => res && res.doseResponseExperiement === exp['@ref'] // Adjust property name if needed
                  ),
                  oriogen: projectData.oriogenResults?.filter(
                    (res: any) => res && res.doseResponseExperiement === exp['@ref'] // Adjust property name if needed
                  ),
                };

                return (
                  <ExperimentCard
                    key={exp['@ref']}
                    experiment={exp} // Pass DoseResponseExperiment
                    categoryAnalysisData={categoryAnalysisDataForExp}
                    bmdResultsData={bmdResultsDataForExp}
                    prefilteringData={prefilteringDataForExp}
                  />
                );
              })}
            </div>
          ) : selectedProject && !isLoading && !hasCriticalError ? ( // Show prompt if project loaded but no experiments selected
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: '1rem' }}>
              Select one or more experiments to analyze.
            </Typography.Text>
          ) : null}
        </div>
      )}
      {/* Show message if project selected but data is still loading */}
      {selectedProject && isProjectDataLoading && !projectDataError && (
        <div style={{ marginTop: '1rem' }}><Spin tip={`Loading data for ${selectedProject.name}...`} /></div>
      )}

    </div>
  );
};

export default AnalyzeProject;
