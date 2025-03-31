// src/utils/clusteringUtils.ts

// -----------------------------------------------------------------------------
// INTERFACES and TYPES
// -----------------------------------------------------------------------------

/**
 * Defines the detailed structure of a single category row after all
 * initial processing (parsing labels, associating with cluster, etc.).
 */
interface CategoryRowStructure {
    /** Required by React/AntD, usually same as categoryId. */
    key: string;

    /** Unique identifier, category ID (e.g. 'GO:1903047'). */
    categoryId: string;

    /** The descriptive title of the category (e.g., "ncRNA metabolic process"). */
    categoryTitle: string;

    /**
     * The Cluster BMD value associated with this specific category.
     * String representation, needs conversion for calculations.
     */
    clusterBMD: string;

    /** Semicolon-separated string of 'Up' gene IDs. */
    upGenes: string;

    /** Semicolon-separated string of 'Down' gene IDs. */
    downGenes: string;

    /** Semicolon-separated string of 'All' gene IDs for the category. */
    allGenes: string;

    /** The identifier (string) of the cluster this category belongs to. */
    cluster: string;

    /** The numeric value of the cluster identifier, for sorting. */
    clusterValue: number; // Added based on previous discussion

    /** The count of gene IDs in the 'allGenes' string. */
    allGenesSize: number;

    /** The count of gene IDs in the 'upGenes' string. */
    upGenesSize: number;

    /** The count of gene IDs in the 'downGenes' string. */
    downGenesSize: number;

    // Add groupSize back if you need the count of categories per cluster
    groupSize?: number;
}

/**
 * Represents a single processed category row after parsing and grouping,
 * ready for display in the detailed table or for summary calculations.
 * (Type Alias for the detailed structure)
 */
export type CategoryRow = CategoryRowStructure;

/**
 * Represents a single row in the summary table, providing statistics for a cluster.
 * (Dedicated Interface for the summary structure)
 */
export interface SummaryRow {
    /** Unique key for the row, typically the cluster identifier. */
    key: string;

    /** The identifier of the cluster being summarized (string). */
    cluster: string;

    /** The calculated minimum Cluster BMD among all categories in this cluster. */
    minClusterBMD: number; // Can be NaN if calculation failed

    /** The total number of distinct category IDs within this cluster. */
    numCategoryIDs: number;

    /** Optional ranking number assigned during the final sorting step. */
    sort?: number;
}

/**
 * Defines the structure of the raw input data *before* it's transformed
 * by `transformDataForClustering`. Adjust based on actual source.
 * This example assumes the relevant data is nested under a 'value' property.
 */
export interface SourceDataForClustering {
    value: Partial<CategoryRow>; // Use Partial if source fields might be missing
    // Add other potential properties of the source object if necessary
}

/**
 * Defines the structure expected by the external clustering API.
 * Keys are specific strings required by that API.
 */
export interface ApiClusteringInputItem {
    'Category ID': string;
    'Category Title': string;
    'Cluster BMD': string;
    'Up Genes': string;
    'Down Genes': string;
    'All Genes': string;
    // Add/remove/adjust keys based on the exact API specification
}

// -----------------------------------------------------------------------------
// FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Helper function to count non-empty gene IDs in a semicolon-separated string.
 * @param geneString - The string containing gene IDs separated by semicolons.
 * @returns The count of valid gene IDs.
 */
const countGenes = (geneString: string | undefined | null): number => {
  if (!geneString) {
    return 0;
  }
  // Split by semicolon, filter out any resulting empty strings (e.g., from trailing ';'), then count
  return geneString.split(';').filter((geneId) => geneId.trim() !== '').length;
};

/**
 * Takes a CategoryRow object, calculates the sizes of the gene lists
 * based on the semicolon-separated gene strings, and returns the
 * object with these sizes populated.
 * Assumes the input might not have the size fields yet.
 *
 * @param categoryRow - A CategoryRow object, potentially without size fields calculated.
 * @returns The CategoryRow object with allGenesSize, upGenesSize, and downGenesSize populated.
 */
export function prepareClusteringDetails(
    // Input could be partial if sizes are guaranteed to be missing
    categoryRow: Omit<CategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize'> & Partial<Pick<CategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize'>>
): CategoryRow {

    // Calculate sizes using the helper function
    const allGenesSize = countGenes(categoryRow.allGenes);
    const upGenesSize = countGenes(categoryRow.upGenes);
    const downGenesSize = countGenes(categoryRow.downGenes);

    // Return a new object or mutate, depending on preference. Returning new is safer.
    // Ensure all original properties are included.
    const completeRow: CategoryRow = {
        ...categoryRow, // Spread all properties from the input
        allGenesSize,   // Add/overwrite calculated size
        upGenesSize,    // Add/overwrite calculated size
        downGenesSize,  // Add/overwrite calculated size
    };

    return completeRow;
}

// --- Example Usage (Conceptual - likely inside useProcessedClusteringData hook) ---
/*
// Inside the loop/map where CategoryRow objects are created from parsed API data + labels

let partialRow: Omit<CategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize'> = {
    key: parsedLabelData['Category ID'],
    categoryId: parsedLabelData['Category ID'],
    categoryTitle: parsedLabelData['Category Title'],
    clusterBMD: parsedLabelData['Cluster BMD'],
    upGenes: parsedLabelData['Up Genes'],
    downGenes: parsedLabelData['Down Genes'],
    allGenes: parsedLabelData['All Genes'],
    cluster: clusterInfo.cluster,
    clusterValue: clusterInfo.clusterValue,
    // Sizes are missing here
};

// Call prepareClusteringDetails to calculate and add the sizes
const finalCategoryRow = prepareClusteringDetails(partialRow);

// Now finalCategoryRow can be added to the list used for grouping/tables
allCategoryRows.push(finalCategoryRow);

*/


// --- Example Usage (Conceptual - likely inside useProcessedClusteringData hook) ---
/*
// Inside the loop/map where CategoryRow objects are created from parsed API data + labels

let partialRow: Omit<CategoryRow, 'allGenesSize' | 'upGenesSize' | 'downGenesSize'> = {
    key: parsedLabelData['Category ID'],
    categoryId: parsedLabelData['Category ID'],
    categoryTitle: parsedLabelData['Category Title'],
    clusterBMD: parsedLabelData['Cluster BMD'],
    upGenes: parsedLabelData['Up Genes'],
    downGenes: parsedLabelData['Down Genes'],
    allGenes: parsedLabelData['All Genes'],
    cluster: clusterInfo.cluster,
    clusterValue: clusterInfo.clusterValue,
    // Sizes are missing here
};

// Call prepareClusteringDetails to calculate and add the sizes
const finalCategoryRow = prepareClusteringDetails(partialRow);

// Now finalCategoryRow can be added to the list used for grouping/tables
allCategoryRows.push(finalCategoryRow);

*/


/**
 * Parses a structured label string into an object with key-value pairs.
 * Expected label format: "Key1: Value1 | Key2: Value2 | ..."
 * (Implementation assumed correct from previous steps)
 */
export function parseLabelToObject(label: string): { [key: string]: string } {
    const obj: { [key: string]: string } = {};
    if (!label) { return obj; }
    label.split(" | ").forEach((part) => {
        const parts = part.split(": ");
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(": ").trim();
            if (key) { obj[key] = value; }
        }
    });
    return obj;
}

/**
 * Calculates summary statistics for each cluster based on grouped category rows
 * and sorts the results according to the specified logic (max group size last).
 * (Implementation assumed correct from previous steps, using the CORRECTED SummaryRow interface)
 *
 * @param groupedData - An object where keys are cluster identifiers (strings)
 *                      and values are arrays of CategoryRow objects belonging
 *                      to that cluster.
 * @returns An array of SummaryRow objects, sorted.
 */
export function calculateSummaries(
    groupedData: { [clusterKey: string]: CategoryRow[] } | null | undefined,
): SummaryRow[] { // Return type now correctly matches the dedicated SummaryRow interface
    if (!groupedData || Object.keys(groupedData).length === 0) {
        return [];
    }

    const preliminarySummaries: SummaryRow[] = Object.entries(groupedData).map(
        ([clusterKey, rows]) => {
            const numCategoryIDs = rows.length;
            const minBMD = Math.min(
                ...rows.map((row) => {
                    const bmd = parseFloat(row.clusterBMD);
                    return isNaN(bmd) ? Infinity : bmd;
                }),
            );

            // This object now correctly matches the dedicated SummaryRow interface
            return {
                key: clusterKey,
                cluster: clusterKey,
                minClusterBMD: minBMD === Infinity ? NaN : minBMD,
                numCategoryIDs: numCategoryIDs,
            };
        },
    );

    if (preliminarySummaries.length <= 1) {
        if (preliminarySummaries.length === 1) {
            preliminarySummaries[0].sort = 1;
        }
        return preliminarySummaries;
    }

    const maxRow = preliminarySummaries.reduce((max, row) =>
        row.numCategoryIDs >= max.numCategoryIDs ? row : max,
    );

    const sortedOtherRows = preliminarySummaries
        .filter((row) => row.key !== maxRow.key)
        .sort((a, b) => {
            const aVal = isNaN(a.minClusterBMD) ? Infinity : a.minClusterBMD;
            const bVal = isNaN(b.minClusterBMD) ? Infinity : b.minClusterBMD;
            return aVal - bVal;
        });

    const finalSortedSummaries = [...sortedOtherRows, maxRow];

    finalSortedSummaries.forEach((row, index) => {
        row.sort = index + 1;
    });

    return finalSortedSummaries;
}

/**
 * Transforms raw row data into the specific format required by the clustering API.
 *
 * @param rowData - An array of source data objects.
 * @returns An array of objects formatted for the clustering API.
 */
export function transformDataForClustering(
    rowData: SourceDataForClustering[], // INPUT type is correct
): ApiClusteringInputItem[] { // CORRECTED: Declare the actual OUTPUT type
    // Use .map to create a new array with transformed objects
    const transformedData: ApiClusteringInputItem[] = rowData.map((row) => { // CORRECTED: Type annotation matches output
        // Safely access nested properties using optional chaining (?.)
        // Provide default empty strings using nullish coalescing (??)
        const categoryId = row.value?.categoryId ?? '';
        const categoryTitle = row.value?.categoryTitle ?? '';
        // Ensure Cluster BMD is a string, handle potential number input
        const clusterBMD = String(row.value?.clusterBMD ?? '');
        const upGenes = row.value?.upGenes ?? '';
        const downGenes = row.value?.downGenes ?? '';
        const allGenes = row.value?.allGenes ?? '';

        // Return the object in the target ApiClusteringInputItem format
        // This object structure now matches the ApiClusteringInputItem interface
        return {
            'Category ID': categoryId,
            'Category Title': categoryTitle,
            'Cluster BMD': clusterBMD,
            'Up Genes': upGenes,
            'Down Genes': downGenes,
            'All Genes': allGenes,
        };
    });

    // Return the newly created array
    return transformedData;
}
