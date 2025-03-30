import Dexie from 'dexie';
import oboe from 'oboe';

// Dexie database class – using a natural key for experiments.
export class MyDatabase extends Dexie {
    // Define tables for each domain.
    doseResponseExperiments: Dexie.Table<any, number>;
    curveFitPrefilterResults: Dexie.Table<any, number>;
    oneWayANOVAResults: Dexie.Table<any, number>;
    oriogenResults: Dexie.Table<any, number>;
    williamsTrendResults: Dexie.Table<any, number>;
    bMDResult: Dexie.Table<any, number>;
    categoryAnalysisResults: Dexie.Table<any, number>;

    constructor(dbName: string) {
        super(dbName);
        // Instead of using an auto-increment key ('++id'), use '&ref' to enforce uniqueness
        this.version(1).stores({
            doseResponseExperiments: '&ref', // using the property "ref" for the unique key
            curveFitPrefilterResults: '++id',
            oneWayANOVAResults: '++id',
            oriogenResults: '++id',
            williamsTrendResults: '++id',
            bMDResult: '++id',
            categoryAnalysisResults: '++id',
        });
        this.doseResponseExperiments = this.table('doseResponseExperiments');
        this.curveFitPrefilterResults = this.table('curveFitPrefilterResults');
        this.oneWayANOVAResults = this.table('oneWayANOVAResults');
        this.oriogenResults = this.table('oriogenResults');
        this.williamsTrendResults = this.table('williamsTrendResults');
        this.bMDResult = this.table('bMDResult');
        this.categoryAnalysisResults = this.table('categoryAnalysisResults');
    }
}

// Global variable to hold the current database instance.
export let currentDB: MyDatabase | null = null;
export const setCurrentDB = (db: MyDatabase) => {
    currentDB = db;
};

// Extract the project name from the first 10KB of the file.
export function getProjectNameFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const blob = file.slice(0, 10240);
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result as string;
                const match = text.match(/"name"\s*:\s*"([^"]+)"/);
                if (match && match[1]) {
                    resolve(match[1]);
                } else {
                    reject("Project name not found in JSON file.");
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(blob);
    });
}

// Define message types for logging progress.
export type LoadingMessage =
    | { type: 'log'; message: string }
    | { type: 'update'; table: string; count: number }
    | { type: 'updateLog'; table: string; message: string };

// Ingest the JSON file into IndexedDB using Oboe for streaming.
export function loadJsonFileToIndexedDB(
    file: File,
    db: MyDatabase,
    onMessage: (msg: LoadingMessage) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const decoder = new TextDecoder('utf-8');
        const reader = file.stream().getReader();

        onMessage({ type: 'log', message: "Initializing parser..." });

        const domainKeys = [
            'doseResponseExperiments',
            'oneWayANOVAResults',
            'williamsTrendResults',
            'curveFitPrefilterResults',
            'categoryAnalysisResults',
            'bMDResult'
        ];
        const counts: Record<string, number> = {};
        domainKeys.forEach(key => (counts[key] = 0));

        const friendlyNames: Record<string, string> = {
            doseResponseExperiments: "Primary Data",
            oneWayANOVAResults: "ANOVA Prefilter",
            williamsTrendResults: "Williams Prefilter",
            curveFitPrefilterResults: "Curvefit Prefilter",
            categoryAnalysisResults: "Category Analysis",
            bMDResult: "Benchmark Dose"
        };

        const parser = oboe()
            .node('bMDResult[*]', function (node: any) {
                const currentCount = ++counts['bMDResult'];
                db.table('bMDResult').put(node);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'bMDResult', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'bMDResult', message: `Loading ${friendlyNames['bMDResult']}: element #${currentCount}` });
                }, 100);
            })
            .node('doseResponseExperiments[*]', function (node: any) {
                const currentCount = ++counts['doseResponseExperiments'];
                // Map "@ref" to "ref" so that duplicates overwrite
                const nodeWithRef = { ...node, ref: node["@ref"] };
                db.table('doseResponseExperiments').put(nodeWithRef);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'doseResponseExperiments', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'doseResponseExperiments', message: `Loading ${friendlyNames['doseResponseExperiments']}: element #${currentCount}` });
                }, 100);
            })
            .node('oneWayANOVAResults[*]', function (node: any) {
                const currentCount = ++counts['oneWayANOVAResults'];
                db.table('oneWayANOVAResults').put(node);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'oneWayANOVAResults', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'oneWayANOVAResults', message: `Loading ${friendlyNames['oneWayANOVAResults']}: element #${currentCount}` });
                }, 100);
            })
            .node('williamsTrendResults', function (node: any) {
                const currentCount = ++counts['williamsTrendResults'];
                db.table('williamsTrendResults').put(node);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'williamsTrendResults', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'williamsTrendResults', message: `Loading ${friendlyNames['williamsTrendResults']}: element #${currentCount}` });
                }, 100);
                return oboe.drop;
            })
            .node('curveFitPrefilterResults[*]', function (node: any) {
                const currentCount = ++counts['curveFitPrefilterResults'];
                db.table('curveFitPrefilterResults').put(node);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'curveFitPrefilterResults', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'curveFitPrefilterResults', message: `Loading ${friendlyNames['curveFitPrefilterResults']}: element #${currentCount}` });
                }, 100);
            })
            .node('categoryAnalysisResults[*]', function (node: any) {
                const currentCount = ++counts['categoryAnalysisResults'];
                db.table('categoryAnalysisResults').put(node);
                setTimeout(() => {
                    onMessage({ type: 'update', table: 'categoryAnalysisResults', count: currentCount });
                    onMessage({ type: 'updateLog', table: 'categoryAnalysisResults', message: `Loading ${friendlyNames['categoryAnalysisResults']}: element #${currentCount}` });
                }, 100);
            })
            .done(() => {
                onMessage({ type: 'log', message: "Parsing completed." });
                resolve();
            })
            .fail((err: any) => {
                onMessage({ type: 'log', message: "Parsing failed: " + err });
                reject(err);
            });

        const pump = () => {
            reader.read().then(({ done, value }) => {
                if (done) {
                    (parser as any).emit('done');
                    return;
                }
                const chunkText = decoder.decode(value, { stream: true });
                (parser as any).emit('data', chunkText);
                pump();
            }).catch((error) => {
                onMessage({ type: 'log', message: "Reading error: " + error });
                (parser as any).emit('fail', error);
            });
        };

        pump();
    });
}