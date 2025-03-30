import { Project, Experiment } from '../models';

export interface IRtxDataSource {
    getProjects(): Promise<Project[]>;
    getExperiments(projectId: string): Promise<Experiment[]>;
}