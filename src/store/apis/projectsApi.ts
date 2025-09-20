// src/store/apis/projectsApi.ts
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';

export interface Project {
    name: string;
}

const projectsBaseQuery: BaseQueryFn<void, Project[], string> = async () => {
    try {
        // Return hard-coded DuckDB project instead of scanning IndexedDB
        console.log('[projectsApi] Returning hard-coded DuckDB project');
        const projects: Project[] = [
            {
                name: 'Test BMD Analysis (DuckDB)',
            }
        ];

        // Add a small delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 100));

        return { data: projects };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { error: message };
    }
};

export const projectsApi = createApi({
    reducerPath: 'projectsApi',
    baseQuery: projectsBaseQuery,
    endpoints: (builder) => ({
        getProjects: builder.query<Project[], void>({
            query: () => undefined,
        }),
    }),
});

export const { useGetProjectsQuery } = projectsApi;
