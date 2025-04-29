// src/hooks/useEnrichrAnalysis.ts
import { useState, useEffect, useRef } from 'react';
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

export const useEnrichrAnalysis = ({
    geneList,
    description,
    backgroundType,
    shouldRun,
}: UseEnrichrAnalysisArgs): UseEnrichrAnalysisReturn => {
    const hookInstanceId = useRef(++hookInstanceCounter).current;
    // Simple log function with instance ID prefix
    const log = (...args: any[]) =>
        console.log(`[EnrichrHook #${hookInstanceId}]`, ...args);

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
    // Ref to track if the API call has been *successfully* initiated in this cycle
    // This helps prevent double calls in StrictMode
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
            // Reset only if the call *was* initiated in the previous cycle
            // This prevents resetting state during StrictMode's unmount/remount phase
            // if the call wasn't actually made yet.
            if (callInitiatedThisCycle.current) {
                log('Effect 1: Resetting state because shouldRun became false.');
                setUserListId(null);
                setEnrichmentResults(null);
                setCombinedError(null);
                setHasEncounteredError(false);
                resetAddList();
                callInitiatedThisCycle.current = false; // Reset the flag for the next trigger
            } else {
                log('Effect 1: shouldRun is false, already reset or never ran. Skipping reset.');
            }
            return; // Stop processing if trigger is off
        }

        // --- Execution logic when shouldRun is true ---

        // Reset state only on the *very first* execution *attempt* after shouldRun becomes true
        // Use the callInitiated flag to know if we already reset for this trigger cycle
        if (!callInitiatedThisCycle.current) {
            log('Effect 1: Initial run for this trigger cycle, resetting state.');
            setUserListId(null);
            setEnrichmentResults(null);
            setCombinedError(null);
            setHasEncounteredError(false);
            resetAddList();
            // Don't set callInitiatedThisCycle here yet, set it right before the API call
        }

        // --- Protection Checks ---
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
        // --- StrictMode/Double Call Protection ---
        if (callInitiatedThisCycle.current) {
            log('Effect 1: Skipping addList call: Already initiated in this effect cycle.');
            return;
        }
        // --------------------------------------

        // --- Proceed with checks and API call ---
        if (geneList && geneList.length > 0 && description) {
            log(`Effect 1: Conditions met. Setting initiated flag and calling addList mutation...`);
            callInitiatedThisCycle.current = true; // Set flag *before* calling API
            addList({ geneList, description });
        } else {
            log('Effect 1: Skipping addList call: Invalid geneList or description.');
            if (!hasEncounteredError) { // Avoid overwriting specific API errors
                setCombinedError('Gene list cannot be empty.');
                log('Effect 1: Setting error state: Gene list empty.');
                setHasEncounteredError(true); // Mark error encountered for this cycle
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
        // callInitiatedThisCycle is a ref, not needed in deps
    ]);

    // --- Effect to handle addList response and trigger getResults ---
    useEffect(() => {
        log('Effect 2 (getResults Trigger) running. Dependencies:', {
            addListResponse: !!addListResponse,
            userListIdFromState: userListId, // Log the state variable
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
            // Check if results are already loading/fetched for this userListId to prevent re-triggering
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
            // Update state *before* triggering query if needed
            if (userListId !== currentListId) {
                log(`Effect 2: Updating userListId state to ${currentListId}`);
                setUserListId(currentListId);
            }
            triggerGetResults({
                userListId: currentListId,
                backgroundType,
            });
        } else if (addListResponse && !backgroundType) {
            log('Effect 2: addList successful, but no backgroundType selected.');
            if (!hasEncounteredError) {
                setCombinedError('Please select a background gene set.');
                log('Effect 2: Setting error state: No background selected.');
                setHasEncounteredError(true); // Mark error encountered for this cycle
            }
        } else {
            log('Effect 2: Conditions not met for triggering getResults.');
        }
    }, [
        addListResponse,
        userListId, // Include state userListId
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
            // Don't clear error here, let the error effect handle it
        }
    }, [resultsData, log]);

    // --- Effect to handle errors and set error flag ---
    useEffect(() => {
        log('Effect 4 (Error Handling) running. Errors:', { addListError: !!addListError, resultsError: !!resultsError });
        let errorFound = false;
        let errorMessage = '';
        let isCriticalError = false; // Flag for 429 or 5xx

        // Check addListError
        if (addListError) {
            const status = (addListError as any)?.status;
            errorMessage = `Failed to submit gene list: ${(addListError as any)?.data?.error ||
                (addListError as any)?.message ||
                status ||
                'Unknown error'
                }`;
            log(`Effect 4: addList error detected. Message: ${errorMessage}, Status: ${status}`);
            errorFound = true;
            if (status === 429 || (typeof status === 'number' && status >= 500)) {
                isCriticalError = true;
                log(`Effect 4: addList error is critical (status ${status}).`);
            }
        }

        // Check resultsError (only if addList didn't already error critically)
        if (!errorFound && resultsError) {
            const status = (resultsError as any)?.status;
            errorMessage = `Failed to fetch enrichment results: ${(resultsError as any)?.data?.error ||
                (resultsError as any)?.message ||
                status ||
                'Unknown error'
                }`;
            log(`Effect 4: resultsError detected. Message: ${errorMessage}, Status: ${status}`);
            errorFound = true;
            if (status === 429 || (typeof status === 'number' && status >= 500)) {
                isCriticalError = true;
                log(`Effect 4: resultsError is critical (status ${status}).`);
            }
        }

        // Update combinedError state and error flag if an error was found
        if (errorFound) {
            setCombinedError(errorMessage);
            // Set the persistent error flag only for critical errors
            if (isCriticalError && !hasEncounteredError) { // Only set if not already set
                setHasEncounteredError(true);
                log('Effect 4: Setting hasEncounteredError = true due to critical API error.');
            }
            // Reset results if any error occurred
            setUserListId(null);
            setEnrichmentResults(null);
        } else {
            // If no current errors, clear the combinedError state *unless* a critical error previously occurred
            if (!hasEncounteredError && combinedError !== null) {
                log('Effect 4: No current errors detected, clearing combinedError state.');
                setCombinedError(null);
            }
        }

    }, [addListError, resultsError, hasEncounteredError, combinedError, log]);

    // --- Combined Loading State ---
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
