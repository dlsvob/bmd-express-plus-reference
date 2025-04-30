// src/utils/jsonStreamer.ts
import oboe from 'oboe';
import { IDBPDatabase, IDBPTransaction } from 'idb';
import {
    ProjectDB,
    EXP_STORE,
    CAT_ANALYSIS_STORE,
    BMD_RESULT_STORE,
    WILLIAMS_STORE,
    ANOVA_STORE,
    CURVE_FIT_STORE,
    ORIOGEN_STORE
} from './myIDB';

// Define the stores we'll be writing to
const ALL_PROJECT_STORE_NAMES_TUPLE = [
    EXP_STORE, CAT_ANALYSIS_STORE, BMD_RESULT_STORE, WILLIAMS_STORE,
    ANOVA_STORE, CURVE_FIT_STORE, ORIOGEN_STORE
] as const;
type ProjectStoreTuple = typeof ALL_PROJECT_STORE_NAMES_TUPLE;

// Batching Logic
const BATCH_SIZE = 100;

interface StoreBatches {
    [EXP_STORE]: { key: number; value: unknown }[];
    [CAT_ANALYSIS_STORE]: { key: number; value: unknown }[];
    [BMD_RESULT_STORE]: { key: number; value: unknown }[];
    [WILLIAMS_STORE]: { key: number; value: unknown }[];
    [ANOVA_STORE]: unknown[];
    [CURVE_FIT_STORE]: unknown[];
    [ORIOGEN_STORE]: unknown[];
}

async function flushBatches(db: IDBPDatabase<ProjectDB>, batches: StoreBatches): Promise<number> {
    let itemsFlushed = 0;
    const storesWithData = Object.keys(batches).filter(key => batches[key as keyof StoreBatches].length > 0) as (keyof StoreBatches)[];

    if (storesWithData.length === 0) return 0;

    console.log(`[JsonStreamer-idb] Flushing batches for stores: ${storesWithData.join(', ')}`);
    let tx: IDBPTransaction<ProjectDB, ProjectStoreTuple, "readwrite"> | undefined;
    try {
        tx = db.transaction(ALL_PROJECT_STORE_NAMES_TUPLE, 'readwrite');
        const putPromises: Promise<unknown>[] = [];

        storesWithData.forEach(storeName => {
            // --- Null check for tx ---
            if (!tx) {
                console.error("[JsonStreamer-idb] Transaction became undefined unexpectedly inside loop.");
                return; // Skip this store if tx is somehow undefined
            }

            const batch = batches[storeName];
            itemsFlushed += batch.length;
            const store = tx.objectStore(storeName); // Now tx is guaranteed to be defined here

            if (storeName === ANOVA_STORE || storeName === CURVE_FIT_STORE || storeName === ORIOGEN_STORE) {
                batch.forEach(itemValue => {
                    putPromises.push(store.put(itemValue));
                });
            } else {
                (batch as { key: number; value: unknown }[]).forEach(itemPair => {
                    putPromises.push(store.put(itemPair.value, itemPair.key));
                });
            }
            (batches[storeName] as unknown[]) = [];
        });

        await Promise.all(putPromises);
        // --- Null check for tx before accessing done ---
        if (tx) {
            await tx.done;
        }
        // ------------------------------------------------------
        console.log(`[JsonStreamer-idb] Flushed ${itemsFlushed} items successfully.`);
        return itemsFlushed;
    } catch (err) {
        console.error("[JsonStreamer-idb] Error during batch flush:", err);
        if (tx && !tx.done) {
            try { await tx.abort(); } catch { /* ignore */ }
        }
        throw new Error(`Batch flush failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

export async function streamJsonToStores(
    file: File,
    db: IDBPDatabase<ProjectDB>,
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

        const handleNode = (storeName: keyof StoreBatches, node: unknown) => {
            if (storeName !== ANOVA_STORE && storeName !== CURVE_FIT_STORE && storeName !== ORIOGEN_STORE) {
                if (!node || typeof node !== 'object' || !('@ref' in node) || node['@ref'] == null) {
                    console.warn(`[JsonStreamer-idb] Skipping node for store ${storeName} due to missing or invalid @ref:`, node);
                    return oboe.drop;
                }
                (batches[storeName] as { key: number; value: unknown }[]).push({ key: node['@ref'] as number, value: node });
            } else {
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

        parser.node(EXP_STORE + '[*]', (node) => handleNode(EXP_STORE, node));
        parser.node(CAT_ANALYSIS_STORE + '[*]', (node) => handleNode(CAT_ANALYSIS_STORE, node));
        parser.node(BMD_RESULT_STORE + '[*]', (node) => handleNode(BMD_RESULT_STORE, node));
        parser.node(WILLIAMS_STORE + '[*]', (node) => handleNode(WILLIAMS_STORE, node));
        parser.node(ANOVA_STORE + '[*]', (node) => handleNode(ANOVA_STORE, node));
        parser.node(CURVE_FIT_STORE + '[*]', (node) => handleNode(CURVE_FIT_STORE, node));
        parser.node(ORIOGEN_STORE + '[*]', (node) => handleNode(ORIOGEN_STORE, node));

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
            reject(new Error(`JSON parsing failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`));
        });

        const reader = file.stream().getReader();
        const decoder = new TextDecoder('utf-8');
        function pump(): void {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('[JsonStreamer-idb] File reading finished. Signaling done to Oboe.');
                    // --- Disable eslint rule for this line ---
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (parser as any).emit('done');
                    // ---------------------------------------------
                    return;
                }
                const chunkText = decoder.decode(value, { stream: true });
                // --- Disable eslint rule for this line ---
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (parser as any).emit('data', chunkText);
                // ---------------------------------------------
                pump();
            }).catch((error) => {
                console.error('[JsonStreamer-idb] File reading error:', error);
                // --- Disable eslint rule for this line ---
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (parser as any).emit('fail', error);
                // ---------------------------------------------
            });
        }
        console.log('[JsonStreamer-idb] Starting file reading pump...');
        pump();
    });
}
