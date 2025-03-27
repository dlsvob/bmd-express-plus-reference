import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { Experiment } from '../../models/Experiment';
import { openProjectDB } from '../../utils/myIDB';

export interface GetExperimentsArgs {
    projectName: string;
}

const experimentsBaseQuery: BaseQueryFn<GetExperimentsArgs, Experiment[], string> = async (
    args,
    _api,
    _extraOptions
) => {
    try {
        const db = await openProjectDB(args.projectName);
        const experimentsRaw = await db.getAll("doseResponseExperiments");
        // Provide a type for each experiment in the mapping.
        const experiments: Experiment[] = experimentsRaw.map((exp: any): Experiment => ({
            "@ref": exp.ref, // Using 'ref' as stored key.
            name: exp.name,
            ...exp // optionally copy all other properties.
        }));
        return { data: experiments };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const experimentsApi = createApi({
    reducerPath: 'experimentsApi',
    baseQuery: experimentsBaseQuery,
    tagTypes: ['Experiments'],
    endpoints: (builder) => ({
        getExperiments: builder.query<Experiment[], GetExperimentsArgs>({
            query: (args) => args,
            providesTags: (result) =>
                result && result.length > 0
                    ? result.map(exp => ({ type: 'Experiments', id: String(exp["@ref"]) }))
                    : [{ type: 'Experiments', id: 'LIST' }],
        }),
    }),
});

export const { useGetExperimentsQuery } = experimentsApi;