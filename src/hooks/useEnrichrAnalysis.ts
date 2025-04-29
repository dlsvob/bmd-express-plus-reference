// src/hooks/useEnrichrAnalysis.ts
import { useState, useEffect, useRef } from 'react';
// --- FIX: Import RTK Query error types ---
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';
// ---------------------------------------
import {
    useAddListMutation,
    useLazyGetEnrichmentResultsQuery,
    EnrichrResultsResponse,
} from '../store/apis/enrichrApi'; // Adjust path as needed

interface UseEnrichrAnalysisArgs {
    geneList: string[] | null;
    description: string;
    backgroundType: string | null;
    shouldRun: boolean; // Flag to trigger the analysis
}

interface UseEnrichrAnalysisReturn {
    results: EnrichrResultsResponse | null;
    isLoading: boolean;
    error: string | null;
    userListId: number | null;
}

let hookInstanceCounter = 0;

// --- FIX: Add Type Guards ---
function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
    return typeof error === 'object' && error != null && 'status' in error
}
function isSerializedError(error: unknown): error is SerializedError {
    return typeof error === 'object' && error != null && 'message' in error
}
// ---------------------------

export const useEnrichrAnalysis = ({
    geneList,
    description,
    backgroundType,
    shouldRun,
}: UseEnrichrAnalysisArgs): UseEnrichrAnalysisReturn => {
    const hookInstanceId = useRef(++hookInstanceCounter).current;
    // --- FIX: Replace 'any[]' with 'unknown[]' ---
    const log = (...args: unknown[]) =>
        console.log(`[EnrichrHook #${hookInstanceId}]`, ...args);
    // -------------------------------------------

    log('Hook rendering/re-rendering. Props:', {
        shouldRun,
        geneListLength: geneList?.length,
        description,
        backgroundType,
    });

    const [userListId, setUserListId] = useState<number | null>(null);
    const [enrichmentResults, setEnrichmentResults] =
        useState<EnrichrResultsResponse | null>(null);
    const [combinedError, setCombinedError] = useState<string | null>(null);
    const [hasEncounteredError, setHasEncounteredError] = useState<boolean>(false);
    const callInitiatedThisCycle = useRef(false);

    const [
        addList,
        {
            data: addListResponse,
            isLoading: isAddingList,
            error: addListError,
            reset: resetAddList,
            isSuccess: isAddListSuccess,
        },
    ] = useAddListMutation();

    const [
        triggerGetResults,
        {
            data: resultsData,
            isLoading: isLoadingResults,
            error: resultsError,
            isFetching: isFetchingResults,
        },
    ] = useLazyGetEnrichmentResultsQuery();

    // --- Effect to trigger addList (Revised StrictMode protection) ---
    useEffect(() => {
        log('Effect 1 (addList Trigger) running. State:', {
            shouldRun,
            geneListLength: geneList?.length,
            description,
            hasEncounteredError,
            isAddingList,
            userListId,
            isAddListSuccess,
            callInitiatedThisCycle: callInitiatedThisCycle.current,
        });

        if (!shouldRun) {
            if (callInitiatedThisCycle.current) {
                log('Effect 1: Resetting state because shouldRun became false.');
                setUserListId(null);
                setEnrichmentResults(null);
                setCombinedError(null);
                setHasEncounteredError(false);
                resetAddList();
                callInitiatedThisCycle.current = false;
            } else {
                log('Effect 1: shouldRun is false, already reset or never ran. Skipping reset.');
            }
            return;
        }

        if (!callInitiatedThisCycle.current) {
            log('Effect 1: Initial run for this trigger cycle, resetting state.');
            setUserListId(null);
            setEnrichmentResults(null);
            setCombinedError(null);
            setHasEncounteredError(false);
            resetAddList();
        }

        if (hasEncounteredError) {
            log('Effect 1: Skipping addList call: Error encountered previously in this cycle.');
            return;
        }
        if (userListId !== null || isAddListSuccess) {
            log('Effect 1: Skipping addList call: Already have userListId or addList succeeded in this cycle.');
            return;
        }
        if (isAddingList) {
            log('Effect 1: Skipping addList call: Mutation already in progress.');
            return;
        }
        if (callInitiatedThisCycle.current) {
            log('Effect 1: Skipping addList call: Already initiated in this effect cycle.');
            return;
        }

        if (geneList && geneList.length > 0 && description) {
            log(`Effect 1: Conditions met. Setting initiated flag and calling addList mutation...`);
            callInitiatedThisCycle.current = true;
            addList({ geneList, description }).catch(err => {
                log('Effect 1: addList mutation promise rejected (error handled by listener):', err);
            });
        } else {
            log('Effect 1: Skipping addList call: Invalid geneList or description.');
            if (!hasEncounteredError) {
                setCombinedError('Gene list cannot be empty.');
                log('Effect 1: Setting error state: Gene list empty.');
                setHasEncounteredError(true);
            }
        }
    }, [
        shouldRun,
        geneList,
        description,
        addList,
        resetAddList,
        hasEncounteredError,
        isAddingList,
        userListId,
        isAddListSuccess,
        log,
    ]);

    // --- Effect to handle addList response and trigger getResults ---
    useEffect(() => {
        log('Effect 2 (getResults Trigger) running. Dependencies:', {
            addListResponse: !!addListResponse,
            userListIdFromState: userListId,
            backgroundType,
            hasEncounteredError,
            isLoadingResults,
            isFetchingResults,
            enrichmentResults: !!enrichmentResults,
        });

        if (hasEncounteredError) {
            log('Effect 2: Skipping getResults trigger: Error encountered.');
            return;
        }

        const currentListId = addListResponse?.userListId;
        if (currentListId && backgroundType) {
            if (isLoadingResults || isFetchingResults) {
                log('Effect 2: Skipping getResults trigger: Query already loading/fetching.');
                return;
            }
            if (enrichmentResults) {
                log('Effect 2: Skipping getResults trigger: Results already exist for this cycle.');
                return;
            }

            log(
                `Effect 2: addList successful (userListId: ${currentListId}). Triggering getResults query for background: ${backgroundType}.`
            );
            if (userListId !== currentListId) {
                log(`Effect 2: Updating userListId state to ${currentListId}`);
                setUserListId(currentListId);
            }
            triggerGetResults({
                userListId: currentListId,
                backgroundType,
            }).unwrap().catch(err => {
                log('Effect 2: triggerGetResults query promise rejected (error handled by listener):', err);
            });
        } else if (addListResponse && !backgroundType) {
            log('Effect 2: addList successful, but no backgroundType selected.');
            if (!hasEncounteredError) {
                setCombinedError('Please select a background gene set.');
                log('Effect 2: Setting error state: No background selected.');
                setHasEncounteredError(true);
            }
        } else {
            log('Effect 2: Conditions not met for triggering getResults.');
        }
    }, [
        addListResponse,
        userListId,
        backgroundType,
        triggerGetResults,
        hasEncounteredError,
        isLoadingResults,
        isFetchingResults,
        enrichmentResults,
        log,
    ]);

    // --- Effect to store results ---
    useEffect(() => {
        if (resultsData) {
            log('Effect 3 (Store Results) running. Received resultsData.');
            setEnrichmentResults(resultsData);
        }
    }, [resultsData, log]);

    // --- Effect to handle errors and set error flag ---
    useEffect(() => {
        log('Effect 4 (Error Handling) running. Errors:', { addListError: !!addListError, resultsError: !!resultsError });
        let errorFound = false;
        let errorMessage = '';
        let isCriticalError = false;

        // --- FIX: Use Type Guards for Error Handling ---
        const processError = (error: unknown): { message: string; status: string | number | undefined; isCritical: boolean } => {
            let msg = 'Unknown error';
            let stat: string | number | undefined = undefined;
            let critical = false;

            if (isFetchBaseQueryError(error)) {
                stat = error.status;
                msg = `API Error (${stat}): ${JSON.stringify(error.data)}`;
                if (stat === 429 || (typeof stat === 'number' && stat >= 500)) {
                    critical = true;
                }
            } else if (isSerializedError(error)) {
                msg = error.message ?? 'Serialized error message missing';
            } else if (error instanceof Error) {
                msg = error.message;
            }
            return { message: msg, status: stat, isCritical: critical };
        }

        if (addListError) {
            const processed = processError(addListError);
            errorMessage = `Failed to submit gene list: ${processed.message}`;
            log(`Effect 4: addList error detected. Message: ${errorMessage}, Status: ${processed.status}`);
            errorFound = true;
            isCriticalError = processed.isCritical;
            if (isCriticalError) {
                log(`Effect 4: addList error is critical (status ${processed.status}).`);
            }
        }

        if (!errorFound && resultsError) {
            const processed = processError(resultsError);
            errorMessage = `Failed to fetch enrichment results: ${processed.message}`;
            log(`Effect 4: resultsError detected. Message: ${errorMessage}, Status: ${processed.status}`);
            errorFound = true;
            isCriticalError = processed.isCritical;
            if (isCriticalError) {
                log(`Effect 4: resultsError is critical (status ${processed.status}).`);
            }
        }
        // ------------------------------------------------

        if (errorFound) {
            setCombinedError(errorMessage);
            if (isCriticalError && !hasEncounteredError) {
                setHasEncounteredError(true);
                log('Effect 4: Setting hasEncounteredError = true due to critical API error.');
            }
            setUserListId(null);
            setEnrichmentResults(null);
        } else {
            if (!hasEncounteredError && combinedError !== null) {
                log('Effect 4: No current errors detected, clearing combinedError state.');
                setCombinedError(null);
            }
        }

    }, [addListError, resultsError, hasEncounteredError, combinedError, log]);

    const isLoading = isAddingList || isLoadingResults || isFetchingResults;
    log('Calculating isLoading:', { isAddingList, isLoadingResults, isFetchingResults, combined: isLoading });

    log('Hook returning state:', { isLoading, error: combinedError, hasResults: !!enrichmentResults, userListId });
    return {
        results: enrichmentResults,
        isLoading,
        error: combinedError,
        userListId,
    };
};
