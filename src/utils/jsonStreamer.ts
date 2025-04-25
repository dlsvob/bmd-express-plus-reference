// src/utils/jsonStreamer.ts
import oboe from 'oboe';
import { IDBPDatabase, IDBPTransaction } from 'idb';
import {
    ProjectDB, // Import the schema type from myIDB.ts
    // NO MAPPED_KEY_PATH needed for out-of-line keys
    EXP_STORE,
    CAT_ANALYSIS_STORE,
    BMD_RESULT_STORE,
    WILLIAMS_STORE,
    ANOVA_STORE,
    CURVE_FIT_STORE,
    ORIOGEN_STORE
} from './myIDB'; // Adjust path

// Define the stores we'll be writing to
const ALL_PROJECT_STORE_NAMES_TUPLE = [
    EXP_STORE, CAT_ANALYSIS_STORE, BMD_RESULT_STORE, WILLIAMS_STORE,
    ANOVA_STORE, CURVE_FIT_STORE, ORIOGEN_STORE
] as const;
type ProjectStoreTuple = typeof ALL_PROJECT_STORE_NAMES_TUPLE;

// --- Batching Logic ---
const BATCH_SIZE = 100; // How many items per store before flushing?

// Interface for batch storage using out-of-line keys
interface StoreBatches {
    [EXP_STORE]: { key: number; value: any }[];
    [CAT_ANALYSIS_STORE]: { key: number; value: any }[];
    [BMD_RESULT_STORE]: { key: number; value: any }[];
    [WILLIAMS_STORE]: { key: number; value: any }[];
    [ANOVA_STORE]: any[]; // Only values for autoIncrement stores
    [CURVE_FIT_STORE]: any[];
    [ORIOGEN_STORE]: any[];
}

// Function to write batches to DB in a new transaction using 'idb'
async function flushBatches(db: IDBPDatabase<ProjectDB>, batches: StoreBatches): Promise<number> {
    let itemsFlushed = 0;
    const storesWithData = Object.keys(batches).filter(key => batches[key as keyof StoreBatches].length > 0) as (keyof StoreBatches)[];

    if (storesWithData.length === 0) return 0;

    console.log(`[JsonStreamer-idb] Flushing batches for stores: ${storesWithData.join(', ')}`);
    let tx: IDBPTransaction<ProjectDB, ProjectStoreTuple, "readwrite"> | undefined;
    try {
        tx = db.transaction(ALL_PROJECT_STORE_NAMES_TUPLE, 'readwrite');
        const putPromises: Promise<any>[] = [];

        storesWithData.forEach(storeName => {
            const batch = batches[storeName];
            itemsFlushed += batch.length;
            const store = tx.objectStore(storeName);

            // Use put(value, key) for stores needing out-of-line keys
            if (storeName === ANOVA_STORE || storeName === CURVE_FIT_STORE || storeName === ORIOGEN_STORE) {
                batch.forEach(itemValue => {
                    putPromises.push(store.put(itemValue)); // Key is auto-generated
                });
            } else {
                (batch as { key: number; value: any }[]).forEach(itemPair => {
                    putPromises.push(store.put(itemPair.value, itemPair.key)); // Provide key explicitly
                });
            }
            batches[storeName] = []; // Clear the batch
        });

        await Promise.all(putPromises);
        await tx.done;
        console.log(`[JsonStreamer-idb] Flushed ${itemsFlushed} items successfully.`);
        return itemsFlushed;
    } catch (err) {
        console.error("[JsonStreamer-idb] Error during batch flush:", err);
        if (tx && !tx.done) {
            try { await tx.abort(); } catch (abortErr) { /* ignore */ }
        }
        throw new Error(`Batch flush failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Streams a large JSON file and inserts data into corresponding IndexedDB object stores
 * using Oboe.js and the 'idb' library with batching and out-of-line keys.
 * Assumes the database and stores have already been created/prepared via openAndPrepareProjectDB.
 */
export async function streamJsonToStores(
    file: File,
    db: IDBPDatabase<ProjectDB>, // Expects 'idb' database instance
    onProgress?: (tableName: string, totalCount: number) => void
): Promise<void> {
    console.log('[JsonStreamer-idb] Starting stream processing with batching...');

    const batches: StoreBatches = {
        [EXP_STORE]: [], [CAT_ANALYSIS_STORE]: [], [BMD_RESULT_STORE]: [],
        [WILLIAMS_STORE]: [], [ANOVA_STORE]: [], [CURVE_FIT_STORE]: [],
        [ORIOGEN_STORE]: []
    };
    const totalCounts: Record<string, number> = {};
    let itemsInCurrentBatches = 0;
    let flushPromise: Promise<number> = Promise.resolve(0);

    return new Promise((resolve, reject) => {
        const parser = oboe();

        // Generic node handler function
        const handleNode = (storeName: keyof StoreBatches, node: any) => {
            // Handle out-of-line key stores
            if (storeName !== ANOVA_STORE && storeName !== CURVE_FIT_STORE && storeName !== ORIOGEN_STORE) {
                if (!node || typeof node !== 'object' || node['@ref'] == null) {
                    console.warn(`[JsonStreamer-idb] Skipping node for store ${storeName} due to missing or invalid @ref:`, node);
                    return oboe.drop;
                }
                // Store {key, value} pair in batch
                (batches[storeName] as { key: number; value: any }[]).push({ key: node['@ref'], value: node });
            } else {
                // Store only value for autoIncrement stores
                batches[storeName].push(node);
            }

            totalCounts[storeName] = (totalCounts[storeName] || 0) + 1;
            itemsInCurrentBatches++;

            if (onProgress) {
                onProgress(storeName, totalCounts[storeName]);
            }

            if (itemsInCurrentBatches >= BATCH_SIZE) {
                console.log(`[JsonStreamer-idb] Batch size reached (${itemsInCurrentBatches}), queueing flush.`);
                flushPromise = flushPromise.then(() => flushBatches(db, batches));
                itemsInCurrentBatches = 0;
                flushPromise.catch(reject);
            }
            return oboe.drop;
        };

        // Define listeners using the generic handler
        parser.node(EXP_STORE + '[*]', (node) => handleNode(EXP_STORE, node));
        parser.node(CAT_ANALYSIS_STORE + '[*]', (node) => handleNode(CAT_ANALYSIS_STORE, node));
        parser.node(BMD_RESULT_STORE + '[*]', (node) => handleNode(BMD_RESULT_STORE, node));
        parser.node(WILLIAMS_STORE + '[*]', (node) => handleNode(WILLIAMS_STORE, node));
        parser.node(ANOVA_STORE + '[*]', (node) => handleNode(ANOVA_STORE, node));
        parser.node(CURVE_FIT_STORE + '[*]', (node) => handleNode(CURVE_FIT_STORE, node));
        parser.node(ORIOGEN_STORE + '[*]', (node) => handleNode(ORIOGEN_STORE, node));

        // --- Oboe Stream Handling ---
        parser.done(async () => {
            console.log('[JsonStreamer-idb] Parsing completed.');
            console.log('[JsonStreamer-idb] Final Total Counts:', totalCounts);
            try {
                console.log('[JsonStreamer-idb] Waiting for pending flushes before final flush...');
                await flushPromise;
                console.log('[JsonStreamer-idb] Flushing remaining items...');
                await flushBatches(db, batches);
                console.log('[JsonStreamer-idb] All batches flushed successfully.');
                resolve();
            } catch (err) {
                console.error('[JsonStreamer-idb] Error during final flush:', err);
                reject(err);
            }
        });

        parser.fail(({ thrown }) => {
            console.error('[JsonStreamer-idb] Parsing failed:', thrown);
            reject(new Error(`JSON parsing failed: ${thrown?.message || String(thrown)}`));
        });

        // --- File Reading Logic ---
        const reader = file.stream().getReader();
        const decoder = new TextDecoder('utf-8');
        function pump(): void {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('[JsonStreamer-idb] File reading finished. Signaling done to Oboe.');
                    (parser as any).emit('done');
                    return;
                }
                const chunkText = decoder.decode(value, { stream: true });
                (parser as any).emit('data', chunkText);
                pump();
            }).catch((error) => {
                console.error('[JsonStreamer-idb] File reading error:', error);
                (parser as any).emit('fail', error);
            });
        }
        console.log('[JsonStreamer-idb] Starting file reading pump...');
        pump();
    });
}
