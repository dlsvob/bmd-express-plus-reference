// src/components/AnalyzeProject.tsx
import React, { useState, useMemo } from 'react';
import { Spin, Select, Typography, Alert, Space } from 'antd';
import { useGetProjectsQuery } from '../store/api/projectsApi';
import { useGetExperimentsQuery } from '../store/api/experimentsApi';
// Remove the simpler Project/Experiment import if it exists
// import { Project } from '../models/Project';
// Import the detailed types
import { DoseResponseExperiment, ProjectData /* other needed types */ } from '../models/BMDxExported';
import ExperimentsMultiSelect from './ExperimentsMultiSelect';
import ExperimentCard from './ExperimentCard';
import { useProjectDatabase } from '../hooks/useProjectDatabase';
import { IDBPDatabase } from 'idb';
import { ProjectDB } from '../utils/myIDB';

const { Title } = Typography;
const { Option } = Select;

// Helper to get error message string
const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
    return (error as { message: string }).message;
  }
  // Add more specific checks for RTK Query errors if needed
  if (typeof error === 'object' && error !== null && 'status' in error) {
     return `Error ${ (error as any).status }: ${ JSON.stringify((error as any).data) }`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Could not display error details.';
  }
};

const AnalyzeProject: React.FC = () => {
  // --- State ---
  // Assuming useGetProjectsQuery returns something with a 'name'
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [selectedExperimentNames, setSelectedExperimentNames] = useState<string[]>([]);

  // --- API Queries ---
  const {
    data: projects, // Type depends on useGetProjectsQuery definition
    error: projectsError,
    isLoading: projectsLoading,
  } = useGetProjectsQuery();

  const {
    data: experiments, // <<< ENSURE THIS IS TYPED AS DoseResponseExperiment[]
    error: experimentsError,
    isLoading: experimentsLoading,
  } = useGetExperimentsQuery(
    { projectName: selectedProjectName || '' },
    { skip: !selectedProjectName },
  );

  // --- Custom Hook for DB Connection ---
  const { db, isLoading: dbLoading, error: dbError } = useProjectDatabase(selectedProjectName);

  // --- Data Filtering/Loading Logic (NEEDS IMPLEMENTATION) ---
  // Placeholder: This is where you'd load the full ProjectData for the selected project
  // and then filter the relevant slices based on the selected experiments.
  // This logic might involve another useEffect or hook depending on how ProjectData is stored/retrieved.
  const [projectData, setProjectData] = useState<ProjectData | null>(null); // Example state
  const [isProjectDataLoading, setIsProjectDataLoading] = useState(false);
  // TODO: Implement logic to load ProjectData from 'db' when selectedProjectName changes
  // and filter categoryAnalysisResults, bmdResultsData etc. based on selectedExperimentNames

  // --- Derived State ---
  // Filter the *selected* experiments based on names
  const selectedExperiments = useMemo(
    () => experiments?.filter((exp) => selectedExperimentNames.includes(exp.name)) || [],
    [experiments, selectedExperimentNames],
  );

  // Combined loading state (adjust based on ProjectData loading)
  const isLoading = projectsLoading || isProjectDataLoading || (!!selectedProjectName && (experimentsLoading || dbLoading));

  // --- Handlers ---
  const handleProjectChange = (value: string) => {
    setSelectedProjectName(value);
    setSelectedExperimentNames([]);
    setProjectData(null); // Clear old project data
  };


  // --- Render Logic ---
  return (
    <div style={{ padding: '1rem' }}>
      <Title level={2}>Analyze Project</Title>

      {/* Loading Indicator */}
      {isLoading && <Spin tip="Loading data..." style={{ marginBottom: '1rem', display: 'block' }} />}

      {/* Error Display Area */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: '1rem' }}>
        {projectsError && (
          <Alert message="Error Loading Projects" description={getErrorMessage(projectsError)} type="error" showIcon />
        )}
        {experimentsError && (
          <Alert message="Error Loading Experiments" description={getErrorMessage(experimentsError)} type="error" showIcon />
        )}
        {dbError && (
          <Alert message="Database Connection Error" description={getErrorMessage(dbError)} type="error" showIcon />
        )}
      </Space>

      {/* Project Selection */}
      {!projectsLoading && projects && (
        <Select
          placeholder="Select a project"
          value={selectedProjectName}
          onChange={handleProjectChange}
          style={{ width: 300, marginBottom: '2rem' }}
          disabled={isLoading}
        >
          {projects?.map((project: { name: string }) => ( // Assuming project has at least a name
            <Option key={project.name} value={project.name}>
              {project.name}
            </Option>
          ))}
        </Select>
      )}

      {/* Experiments Section */}
      {selectedProjectName && !projectsError && (
        <div>
          <Title level={3}>Experiments for {selectedProjectName}</Title>

          {/* Experiment Selector */}
          {!experimentsLoading && experiments && experiments.length > 0 && !experimentsError && (
            <ExperimentsMultiSelect
              // Pass DoseResponseExperiment[] to the multi-select
              experiments={experiments}
              onSelectionChange={setSelectedExperimentNames}
            />
          )}
          {/* ... (No experiments found message) ... */}

          {/* Display message if no experiments found */}
          {!experimentsLoading && experiments?.length === 0 && !experimentsError && (
            <p>No experiments found for this project.</p>
          )}

          {/* Render Experiment Cards */}
          {db && selectedExperiments.length > 0 && !dbError && projectData /* Check if projectData is loaded */ ? (
            <div style={{ marginTop: '2rem' }}>
              {selectedExperiments.map((exp) => { // <<< exp is now DoseResponseExperiment
                // TODO: Filter data slices from projectData based on exp['@ref']
                const categoryAnalysisDataForExp = projectData.categoryAnalysisResults?.filter(
                  // Example filtering logic - adjust based on actual references
                  (catRes) => catRes.bmdResult === exp['@ref'] || catRes.name.startsWith(exp.name)
                );
                const bmdResultsDataForExp = projectData.bMDResult?.filter(
                  (bmdRes) => bmdRes.doseResponseExperiment === exp['@ref']
                );
                // ... filter other data slices (williams, anova, etc.) ...

                return (
                  <ExperimentCard
                    key={exp.name}
                    experiment={exp} // <<< Passing DoseResponseExperiment - Correct
                    // Pass the filtered data slices
                    categoryAnalysisData={categoryAnalysisDataForExp}
                    bmdResultsData={bmdResultsDataForExp}
                    // ... pass other filtered data ...
                    // db={db} // Pass db only if absolutely necessary downstream
                  />
                );
              })}
            </div>
          ) : /* ... (other conditional messages) ... */ null}
        </div>
      )}
    </div>
  );
};

export default AnalyzeProject;
