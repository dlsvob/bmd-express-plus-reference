import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { Project } from '../../models/Project';

const projectsBaseQuery: BaseQueryFn<void, Project[], string> = async (_arg, _api, _extraOptions) => {
    try {
        let dbList: { name?: string; version?: number }[] = [];
        if (indexedDB.databases) {
            dbList = await indexedDB.databases();
        } else {
            return { error: 'Browser does not support indexedDB.databases()' };
        }
        const projects: Project[] = dbList
            .filter((db) => !!db.name)
            .map((db) => ({
                name: db.name!,
                experiments: []  // Provide the required field.
            }));
        return { data: projects };
    } catch (error: any) {
        return { error: error.message };
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