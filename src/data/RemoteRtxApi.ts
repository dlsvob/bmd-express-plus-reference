// src/data/RemoteRtxApi.ts
import { IRtxDataSource } from './IRtxDataSource';
import { Project, Experiment } from '../models';
import { ApiService } from '../services/ApiService';

export class RemoteRtxApi implements IRtxDataSource {
    constructor(private apiService: ApiService) { }

    async getProjects(): Promise<Project[]> {
        return this.apiService.get<Project[]>('/projects');
    }

    async getExperiments(projectName: string): Promise<Experiment[]> {
        // Using projectName in the URL; adjust as needed for your API
        return this.apiService.get<Experiment[]>(`/projects/${projectName}/experiments`);
    }
}