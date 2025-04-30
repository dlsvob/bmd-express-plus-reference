// src/store/apis/projectsApi.ts
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';

export interface Project {
    name: string;
}

const projectsBaseQuery: BaseQueryFn<void, Project[], string> = async () => {
    try {
        let dbList: { name?: string; version?: number }[] = [];
        if (indexedDB.databases) {
            dbList = await indexedDB.databases();
        } else {
            return { error: 'Browser does not support indexedDB.databases()' };
        }
        const projects: Project[] = dbList
            .filter((db) => !!db.name && !db.name.startsWith('_'))
            .map((db) => ({
                name: db.name!,
            }));
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
