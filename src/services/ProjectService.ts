import { Project, Experiment } from '../models';
import { IRtxDataSource } from '../data/IRtxDataSource';

export class ProjectService {
    constructor(private dataSource: IRtxDataSource) { }

    async getProjects(): Promise<Project[]> {
        // This endpoint might return projects with their experiments included.
        return this.dataSource.getProjects();
    }

    async getExperiments(projectId: number): Promise<Experiment[]> {
        // Alternatively, if experiments are fetched separately:
        return this.dataSource.getExperiments(projectId);
    }
}