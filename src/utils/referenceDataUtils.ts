// src/utils/referenceDataUtils.ts
import { ReferenceUmapItem, hardcodedReferenceData } from '../data/referenceUmapData';
export type ReferenceDataMap = Map<string, ReferenceUmapItem>;

let referenceMapCache: ReferenceDataMap | null = null;
// let loggedKeys = false; // Flag to log only once - can be removed if not needed

/**
 * Creates a Map for efficient lookup of reference UMAP data by GO ID.
 * Keys are normalized (trimmed, uppercase).
 * @param referenceData - The array of ReferenceUmapItem objects. Defaults to hardcoded data.
 * @returns A Map where keys are normalized GO IDs and values are the corresponding ReferenceUmapItem objects.
 */
export function createReferenceDataMap(
    referenceData: ReferenceUmapItem[] = hardcodedReferenceData // Use default parameter
): ReferenceDataMap {
    // --- Return cache if already built ---
    if (referenceMapCache) {
        // console.log("[createReferenceDataMap] Returning cached map.");
        return referenceMapCache;
    }

    console.log(`[createReferenceDataMap] Creating new reference map from ${referenceData?.length || 0} items.`);
    const map: ReferenceDataMap = new Map();

    if (!referenceData) {
        console.warn("[createReferenceDataMap] Input referenceData is null or undefined.");
        return map; // Return empty map
    }

    referenceData.forEach(item => {
        // --- Key Normalization Logic (Matches Fix C expectation) ---
        const keySource = item?.go_id; // Use optional chaining
        if (typeof keySource === 'string') {
            const finalKey = keySource.trim().toUpperCase(); // Trim and uppercase
            if (finalKey) { // Ensure key is not empty after trimming
                // Check for duplicates (optional but good practice)
                // if (map.has(finalKey)) {
                //     console.warn(`[createReferenceDataMap] Duplicate GO ID key found after normalization: '${finalKey}'`);
                // }
                map.set(finalKey, item);
            } else {
                // console.warn(`[createReferenceDataMap] Skipping item with empty GO ID after trimming:`, item);
            }
        } else {
            // console.warn(`[createReferenceDataMap] Skipping item with missing or non-string GO ID:`, item);
        }
    });

    console.log(`[createReferenceDataMap] Finished creating map. Size: ${map.size}`);
    referenceMapCache = map; // Cache the newly created map
    return map;
}

// Function to get the map (ensures creation logic runs if not cached)
export function getReferenceDataMap(): ReferenceDataMap {
    // console.log("[getReferenceDataMap] Accessing reference map...");
    return createReferenceDataMap(); // This will either create or return cache
}
