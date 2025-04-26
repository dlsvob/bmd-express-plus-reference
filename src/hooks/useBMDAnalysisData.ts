// src/hooks/useBMDAnalysisData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectDatabase } from './useProjectDatabase';
import {
    DoseResponseExperiment,
    BMDResult,
    CategoryAnalysisResult,
} from '../models/BMDxExported';
import {
    BMDAnalysisHookData,
    SelectableAnalysisInfo,
    DetailedAnalysisData,
} from '../models/applicationModel';
import {
    EXP_STORE,
    BMD_RESULT_STORE,
    CAT_ANALYSIS_STORE,
} from '../utils/myIDB';

export interface UseBMDAnalysisDataReturn extends BMDAnalysisHookData {
    experimentMap: Map<string, DoseResponseExperiment>;
    bmdResultMap: Map<string, BMDResult>;
    categoryAnalysisByBmdResultMap: Map<string, CategoryAnalysisResult>;
}

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
        // (Effect logic for fetching data remains the same as your last version)
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

    // --- Memoized Maps (Use STRING keys, depend on raw data) ---
    const experimentMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating experimentMap...');
        const map = new Map<string, DoseResponseExperiment>();
        if (!rawExperiments) return map;
        rawExperiments.forEach((exp) => {
            if (exp && exp['@ref'] != null) map.set(String(exp['@ref']), exp);
        });
        console.log(`[useBMDAnalysisData useMemo] Finished experimentMap. Size: ${map.size}`);
        return map;
    }, [rawExperiments]);

    const bmdResultMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating bmdResultMap...');
        const map = new Map<string, BMDResult>();
        if (!rawBmdResults) return map;
        rawBmdResults.forEach((res) => {
            if (res && res['@ref'] != null) {
                map.set(String(res['@ref']), res);
            }
        });
        console.log(`[useBMDAnalysisData useMemo] Finished bmdResultMap. Size: ${map.size}`);
        return map;
    }, [rawBmdResults]);

    const categoryAnalysisByBmdResultMap = useMemo(() => {
        console.log('[useBMDAnalysisData useMemo] Creating/Updating categoryAnalysisByBmdResultMap...');
        const map = new Map<string, CategoryAnalysisResult>();
        if (!rawCategoryAnalyses) return map;
        rawCategoryAnalyses.forEach((cat) => {
            if (cat && cat.bmdResult != null) {
                map.set(String(cat.bmdResult), cat);
            }
        });
        console.log(`[useBMDAnalysisData useMemo] Finished categoryAnalysisByBmdResultMap. Size: ${map.size}`);
        return map;
    }, [rawCategoryAnalyses]);

    // --- Selectable Analyses List (Use STRING refs) ---
    const selectableAnalyses = useMemo<SelectableAnalysisInfo[] | null>(() => {
        // Add check for map readiness here too for safety
        if (!rawBmdResults || !experimentMap || experimentMap.size === 0) {
            console.log('[useBMDAnalysisData selectableAnalyses] Prerequisites not met (rawBmdResults or experimentMap).');
            return null;
        }
        console.log('[useBMDAnalysisData] Recalculating selectableAnalyses...');
        const selectable: SelectableAnalysisInfo[] = [];
        rawBmdResults.forEach((bmdRes) => {
            const bmdKey = String(bmdRes?.['@ref']);
            const expLinkKey = String(bmdRes?.doseResponseExperiment);
            if (bmdRes?.['@ref'] == null || bmdRes?.doseResponseExperiment == null) return;

            const sourceExperiment = experimentMap.get(expLinkKey);
            if (!sourceExperiment) return;
            const sourceExpKey = String(sourceExperiment['@ref']);
            if (sourceExperiment['@ref'] == null) return;

            selectable.push({
                bmdResultRef: bmdKey, // Store as string
                bmdResultName: bmdRes.name || 'Unnamed BMD Result',
                doseResponseExperimentRef: sourceExpKey, // Store as string
                doseResponseExperimentName: sourceExperiment.name || 'Unnamed Experiment',
            });
        });
        selectable.sort((a, b) => a.bmdResultName.localeCompare(b.bmdResultName));
        console.log('[useBMDAnalysisData] Finished calculating selectableAnalyses:', selectable.length);
        return selectable;
    }, [rawBmdResults, experimentMap]);


    // --- getAnalysisDetails Function: REMOVE the premature map size check ---
    const getAnalysisDetails = useCallback(
        (bmdResultRef: string): DetailedAnalysisData | null => {
            console.log(`[useBMDAnalysisData useCallback] getAnalysisDetails called with ref: ${bmdResultRef}`);

            // *** REMOVED GUARD CLAUSE CHECKING MAP SIZE ***

            const bmdResult = bmdResultMap.get(bmdResultRef);
            if (!bmdResult) {
                // This log is fine, indicates data for *this specific ref* wasn't found or maps aren't ready yet
                console.warn(`[useBMDAnalysisData useCallback] BMD Result not found in map for ref ${bmdResultRef}. Map size: ${bmdResultMap.size}`);
                return null;
            }

            const categoryAnalysis = categoryAnalysisByBmdResultMap.get(bmdResultRef);
            if (!categoryAnalysis) {
                console.warn(`[useBMDAnalysisData useCallback] Category Analysis not found for ref ${bmdResultRef}.`);
            }

            const doseResponseExperiment = bmdResult.doseResponseExperiment != null
                ? experimentMap.get(String(bmdResult.doseResponseExperiment))
                : null;

            if (!doseResponseExperiment) {
                console.error(`[useBMDAnalysisData useCallback] CRITICAL - Source Experiment (${bmdResult.doseResponseExperiment}) not found for BMD Result ref ${bmdResultRef}.`);
                return null;
            }

            const details: DetailedAnalysisData = {
                bmdResult,
                categoryAnalysis: categoryAnalysis ?? null,
                doseResponseExperiment,
            };
            return details;
        },
        // Dependencies remain the maps. Callback updates when maps update.
        [bmdResultMap, categoryAnalysisByBmdResultMap, experimentMap]
    );

    const combinedIsLoading = isDbLoading || isLoading;
    const combinedError = dbError || error;

    return {
        selectableAnalyses,
        getAnalysisDetails,
        isLoading: combinedIsLoading,
        error: combinedError,
        // --- Export Maps ---
        experimentMap,
        bmdResultMap,
        categoryAnalysisByBmdResultMap,
    };
}