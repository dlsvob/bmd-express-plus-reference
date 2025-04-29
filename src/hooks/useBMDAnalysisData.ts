// src/hooks/useBMDAnalysisData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectDatabase } from './useProjectDatabase';
import {
    DoseResponseExperiment,
    BMDResult,
    CategoryAnalysisResult,
} from '../models/BMDxExported';
// --- These types expect number for bmdResultRef ---
import {
    BMDAnalysisHookData,
    SelectableAnalysisInfo,
    DetailedAnalysisData,
} from '../models/applicationModel';
// -------------------------------------------------
import {
    EXP_STORE,
    BMD_RESULT_STORE,
    CAT_ANALYSIS_STORE,
} from '../utils/myIDB';

// --- FIX: Update return type to use number keys for maps ---
export interface UseBMDAnalysisDataReturn extends BMDAnalysisHookData {
    experimentMap: Map<number, DoseResponseExperiment>; // Use number key
    bmdResultMap: Map<number, BMDResult>; // Use number key
    categoryAnalysisByBmdResultMap: Map<number, CategoryAnalysisResult>; // Use number key
}
// ---------------------------------------------------------

export function useBMDAnalysisData(
    projectName: string | null
): UseBMDAnalysisDataReturn {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [rawExperiments, setRawExperiments] = useState<DoseResponseExperiment[] | null>(null);
    const [rawBmdResults, setRawBmdResults] = useState<BMDResult[] | null>(null);
    const [rawCategoryAnalyses, setRawCategoryAnalyses] = useState<CategoryAnalysisResult[] | null>(null);
    const { db, isLoading: isDbLoading, error: dbError } = useProjectDatabase(projectName);

    useEffect(() => {
        // ... (fetch logic remains the same) ...
        console.log('[useBMDAnalysisData useEffect] Clearing raw data.');
        setRawExperiments(null);
        setRawBmdResults(null);
        setRawCategoryAnalyses(null);
        setError(null);

        if (projectName && db) {
            console.log(`[useBMDAnalysisData useEffect] Project (${projectName}) and DB available. Starting fetch.`);
            setIsLoading(true);
            setError(null);

            (async () => {
                try {
                    const requiredStores = [EXP_STORE, BMD_RESULT_STORE, CAT_ANALYSIS_STORE];
                    if (requiredStores.some(storeName => !db.objectStoreNames.contains(storeName))) {
                        throw new Error(`Required stores missing in DB: ${projectName}`);
                    }
                    console.log(`[useBMDAnalysisData useEffect] Fetching all data for ${projectName}...`);
                    const tx = db.transaction(requiredStores, 'readonly');
                    const [experiments, bmdResults, categoryAnalyses] = await Promise.all([
                        tx.objectStore(EXP_STORE).getAll(),
                        tx.objectStore(BMD_RESULT_STORE).getAll(),
                        tx.objectStore(CAT_ANALYSIS_STORE).getAll(),
                    ]);
                    await tx.done;
                    console.log(`[useBMDAnalysisData useEffect] Fetched: Exp=${experiments?.length}, BMD=${bmdResults?.length}, Cat=${categoryAnalyses?.length}`);
                    setRawExperiments(experiments as DoseResponseExperiment[]);
                    setRawBmdResults(bmdResults as BMDResult[]);
                    setRawCategoryAnalyses(categoryAnalyses as CategoryAnalysisResult[]);
                    setError(null);
                    console.log(`[useBMDAnalysisData useEffect] Successfully fetched data for ${projectName}`);
                } catch (err) {
                    console.error(`[useBMDAnalysisData useEffect] Error fetching data for ${projectName}:`, err);
                    setError(err instanceof Error ? err : new Error('Failed to fetch project data'));
                    setRawExperiments(null);
                    setRawBmdResults(null);
                    setRawCategoryAnalyses(null);
                } finally {
                    console.log('[useBMDAnalysisData useEffect] Fetch attempt finished, setting loading to false.');
                    setIsLoading(false);
                }
            })();
        } else {
            console.log(`[useBMDAnalysisData useEffect] Skipping fetch (Project: ${projectName}, DB: ${db ? 'Exists' : 'null'})`);
            setIsLoading(isDbLoading);
        }
    }, [projectName, db, isDbLoading]);

    // --- FIX: Use number keys for maps ---
    const experimentMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating experimentMap...');
        const map = new Map<number, DoseResponseExperiment>(); // number key
        if (!rawExperiments) return map;
        rawExperiments.forEach((exp) => {
            const key = exp?.['@ref'];
            if (key != null && typeof key === 'number' && !isNaN(key)) { // Check type and NaN
                map.set(key, exp);
            }
        });
        console.log(`[useBMDAnalysisData useMemo] Finished experimentMap. Size: ${map.size}`);
        return map;
    }, [rawExperiments]);

    const bmdResultMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating bmdResultMap...');
        const map = new Map<number, BMDResult>(); // number key
        if (!rawBmdResults) return map;
        rawBmdResults.forEach((res) => {
            const key = res?.['@ref'];
            if (key != null && typeof key === 'number' && !isNaN(key)) { // Check type and NaN
                map.set(key, res);
            }
        });
        console.log(`[useBMDAnalysisData useMemo] Finished bmdResultMap. Size: ${map.size}`);
        return map;
    }, [rawBmdResults]);

    const categoryAnalysisByBmdResultMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating categoryAnalysisByBmdResultMap...');
        const map = new Map<number, CategoryAnalysisResult>(); // number key
        if (!rawCategoryAnalyses) return map;
        rawCategoryAnalyses.forEach((cat) => {
            const key = cat?.bmdResult;
            if (key != null && typeof key === 'number' && !isNaN(key)) { // Check type and NaN
                map.set(key, cat);
            }
        });
        console.log(`[useBMDAnalysisData useMemo] Finished categoryAnalysisByBmdResultMap. Size: ${map.size}`);
        return map;
    }, [rawCategoryAnalyses]);
    // ------------------------------------

    const selectableAnalyses = useMemo<SelectableAnalysisInfo[] | null>(() => {
        if (!rawBmdResults || !experimentMap || experimentMap.size === 0) {
            return null;
        }
        const selectable: SelectableAnalysisInfo[] = [];
        rawBmdResults.forEach((bmdRes) => {
            // --- FIX: Use number for bmdResultRef ---
            const bmdRefNum = bmdRes?.['@ref'];
            const expLinkNum = bmdRes?.doseResponseExperiment; // This should be number
            if (bmdRefNum == null || typeof bmdRefNum !== 'number' || isNaN(bmdRefNum) ||
                expLinkNum == null || typeof expLinkNum !== 'number' || isNaN(expLinkNum)) {
                return;
            }
            // ---------------------------------------

            const sourceExperiment = experimentMap.get(expLinkNum); // Use number key
            if (!sourceExperiment) return;
            // const sourceExpKey = sourceExperiment['@ref']; // This is number
            // if (sourceExpKey == null || typeof sourceExpKey !== 'number' || isNaN(sourceExpKey)) return;

            selectable.push({
                bmdResultRef: bmdRefNum, // <-- Assign number
                bmdResultName: bmdRes.name || 'Unnamed BMD Result',
                doseResponseExperimentRef: String(expLinkNum), // Keep as string if model needs it
                doseResponseExperimentName: sourceExperiment.name || 'Unnamed Experiment',
            });
        });
        selectable.sort((a, b) => a.bmdResultName.localeCompare(b.bmdResultName));
        return selectable;
    }, [rawBmdResults, experimentMap]);

    // --- FIX: getAnalysisDetails accepts number ---
    const getAnalysisDetails = useCallback(
        (bmdResultRef: number): DetailedAnalysisData | null => { // <-- Accepts number
            console.log(`[useBMDAnalysisData useCallback] getAnalysisDetails called with ref: ${bmdResultRef}`);

            const bmdResult = bmdResultMap.get(bmdResultRef); // Use number key
            if (!bmdResult) {
                console.warn(`[useBMDAnalysisData useCallback] BMD Result not found in map for ref ${bmdResultRef}. Map size: ${bmdResultMap.size}`);
                return null;
            }

            const categoryAnalysis = categoryAnalysisByBmdResultMap.get(bmdResultRef); // Use number key
            if (!categoryAnalysis) {
                console.warn(`[useBMDAnalysisData useCallback] Category Analysis not found for ref ${bmdResultRef}.`);
            }

            // bmdResult.doseResponseExperiment should be number
            const doseExpRef = bmdResult.doseResponseExperiment;
            const doseResponseExperiment = (doseExpRef != null && typeof doseExpRef === 'number' && !isNaN(doseExpRef))
                ? experimentMap.get(doseExpRef) // Use number key
                : null;

            if (!doseResponseExperiment) {
                console.error(`[useBMDAnalysisData useCallback] CRITICAL - Source Experiment (${doseExpRef}) not found for BMD Result ref ${bmdResultRef}.`);
                return null;
            }

            const details: DetailedAnalysisData = {
                bmdResult,
                categoryAnalysis: categoryAnalysis ?? null,
                doseResponseExperiment,
            };
            return details;
        },
        [bmdResultMap, categoryAnalysisByBmdResultMap, experimentMap] // Dependencies are the maps
    );
    // ------------------------------------------

    const combinedIsLoading = isDbLoading || isLoading;
    const combinedError = dbError || error;

    return {
        selectableAnalyses,
        getAnalysisDetails, // Function signature now matches model
        isLoading: combinedIsLoading,
        error: combinedError,
        experimentMap,
        bmdResultMap,
        categoryAnalysisByBmdResultMap,
    };
}
