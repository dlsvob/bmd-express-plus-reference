// Define your data models
import { Project, Experiment } from '../models/index';

// Generic API interface
export interface IApiService {
    get<T>(url: string, options?: RequestInit): Promise<T>;
    // Additional methods (post, put, delete) can be added here as needed.
}

// A simple implementation using fetch
export class ApiService implements IApiService {
    async get<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
    }
}

// Service to fetch projects and experiments
export class ProjectService {
    constructor(private apiService: IApiService) { }

    // Get all projects
    async getProjects(): Promise<Project[]> {
        // Assuming your API endpoint returns an array of projects,
        // and each project might include its experiments.
        return this.apiService.get<Project[]>('/api/projects');
    }

    // Get experiments for a specific project
    async getExperiments(projectId: number): Promise<Experiment[]> {
        // Alternatively, if experiments are not nested, you can fetch them separately.
        return this.apiService.get<Experiment[]>(`/api/projects/${projectId}/experiments`);
    }
}

// Example usage:
(async () => {
    const apiService = new ApiService();
    const projectService = new ProjectService(apiService);

    try {
        const projects = await projectService.getProjects();
        console.log('Projects:', projects);

        if (projects.length > 0) {
            // Fetch experiments for the first project
            const experiments = await projectService.getExperiments(projects[0].id);
            console.log(`Experiments for project ${projects[0].id}:`, experiments);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
})();