// src/components/AnalyzeProject.tsx
import React, { useState, useEffect } from 'react';
import { Spin, Select, Typography } from 'antd';
import { useGetProjectsQuery } from '../store/api/projectsApi';
import { useGetExperimentsQuery } from '../store/api/experimentsApi';
import { Project } from '../models/Project';
import ExperimentsMultiSelect from './ExperimentsMultiSelect';
import ExperimentCard from './ExperimentCard';
import { LoadingSpinner } from './Common/LoadingSpinner';
import { openProjectDB } from '../utils/myIDB';

const { Title } = Typography;
const { Option } = Select;

const AnalyzeProject: React.FC = () => {
    const { data: projects, error: projectsError, isLoading: projectsLoading } = useGetProjectsQuery();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedExperimentNames, setSelectedExperimentNames] = useState<string[]>([]);
    const [dbInstance, setDbInstance] = useState<any>(null);

    // When a project is selected, fetch its experiments.
    const { data: experiments, error: experimentsError, isLoading: experimentsLoading } = useGetExperimentsQuery(
        { projectName: selectedProject?.name || '' },
        { skip: !selectedProject }
    );

    // When the selected project changes, open the corresponding database.
    useEffect(() => {
        if (selectedProject) {
            console.log("Opening DB for project:", selectedProject.name);
            openProjectDB(selectedProject.name)
                .then((db) => {
                    console.log("DB opened for project:", selectedProject.name, db);
                    setDbInstance(db);
                })
                .catch((err) => {
                    console.error("Error opening DB for project:", selectedProject.name, err);
                    setDbInstance(null);
                });
        } else {
            setDbInstance(null);
        }
    }, [selectedProject]);

    // Filter experiments based on the selected experiment names.
    const filteredExperiments = experiments?.filter(exp => selectedExperimentNames.includes(exp.name)) || [];

    return (
        <div style={{ padding: '1rem' }}>
            <Title level={2}>Analyze Project</Title>

            {projectsLoading ? (
                <Spin tip="Loading projects..." />
            ) : projectsError ? (
                <p>Error loading projects: {typeof projectsError === 'string' ? projectsError : projectsError.toString()}</p>
            ) : (
                <Select
                    placeholder="Select a project"
                    onChange={(value: string) => {
                        const project = projects?.find(p => p.name === value) || null;
                        setSelectedProject(project);
                        // Clear previous experiment selections and DB instance.
                        setSelectedExperimentNames([]);
                        setDbInstance(null);
                    }}
                    style={{ width: 300 }}
                >
                    {projects?.map(project => (
                        <Option key={project.name} value={project.name}>
                            {project.name}
                        </Option>
                    ))}
                </Select>
            )}

            {selectedProject && (
                <div style={{ marginTop: '2rem' }}>
                    <Title level={3}>Experiments for {selectedProject.name}</Title>
                    {experimentsLoading ? (
                        <LoadingSpinner />
                    ) : experimentsError ? (
                        <p>Error loading experiments: {typeof experimentsError === 'string' ? experimentsError : experimentsError.toString()}</p>
                    ) : experiments && experiments.length > 0 ? (
                        <>
                            <ExperimentsMultiSelect
                                experiments={experiments}
                                onSelectionChange={setSelectedExperimentNames}
                            />
                            {selectedExperimentNames.length > 0 ? (
                                filteredExperiments.map(exp => (
                                    <ExperimentCard key={exp.name} experiment={exp} db={dbInstance} />
                                ))
                            ) : (
                                <p>No experiments selected.</p>
                            )}
                        </>
                    ) : (
                        <p>No experiments found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyzeProject;