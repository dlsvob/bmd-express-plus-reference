// src/utils/analysisUtils.ts

import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported';
// *** USE CORRECT TYPE ***
import { BaseCategoryAnalysisDataPoint } from '../models/applicationModel'; // Adjusted path/type

/**
 * Groups raw category‐analysis items into the basic overlay points,
 * keyed by BMDResult.ref (as string).
 * **Crucially, assigns the value used for ranking to the `rankValue` property.**
 */
export function prepareGroupedOverlayData(
  bmdResultMap: Map<number, BMDResult>,
  // *** USE CORRECT TYPE FOR INPUT MAP VALUE ***
  categoryItemsMap: Map<string, CategoryAnalysisItem[]>
  // *** USE CORRECT TYPE FOR RETURN MAP VALUE ***
): Map<string, BaseCategoryAnalysisDataPoint[]> {
  // *** USE CORRECT TYPE FOR OUTPUT MAP ***
  const out = new Map<string, BaseCategoryAnalysisDataPoint[]>();

  console.log('[prepareGroupedOverlayData v3 - RankValue Fix] Input:', { // Version Bump
    bmdKeys: Array.from(bmdResultMap.keys()),
    categoryKeys: Array.from(categoryItemsMap.keys()),
  });

  // Iterate over the keys provided by the correctly structured categoryItemsMap
  for (const refStr of categoryItemsMap.keys()) {
    console.log(
      `  [prepareGroupedOverlayData v3] trying ref: ${refStr}`
    );
    const bmd = bmdResultMap.get(Number(refStr)); // Get corresponding BMDResult
    const items = categoryItemsMap.get(refStr); // Get the array of items for this ref

    if (!bmd) {
      console.warn(`   🌶️ no BMD for ref ${refStr}`);
      continue;
    }
    if (!items || items.length === 0) {
      console.warn(`   🌶️ no category items for ref ${refStr}`);
      continue;
    }

    // Build the BaseCategoryAnalysisDataPoint[] for this ref
    const basePoints: BaseCategoryAnalysisDataPoint[] = items
      .map((item) => {
        // --- Use categoryIdentifier.id for goId ---
        const goId = item?.categoryIdentifier?.id;
        const goTerm = item?.categoryIdentifier?.title;
        // --- Map other relevant fields from CategoryAnalysisItem ---
        const direction = item?.overallDirection;
        const percentage = item?.percentage;
        // Use the field specified for ranking/accumulation plot
        const bmdFifthPercentileTotalGenes = item?.bmdFifthPercentileTotalGenes;
        const geneAllCount = item?.geneAllCount;
        const genesPassed = item?.genesThatPassedAllFilters;

        // Basic validation: Ensure goId exists
        if (!goId) {
          console.warn(
            `   🌶️ Skipping item due to missing goId:`,
            item?.categoryIdentifier
          );
          return null; // Skip items without a GO ID
        }

        // --- FIX: Assign the ranking value to rankValue ---
        const rankValue = bmdFifthPercentileTotalGenes;
        // --------------------------------------------------

        // Create the base point object
        return {
          // Identifiers
          go_id: goId,
          go_term: goTerm || 'Unknown Term',

          // Source Info
          bmdResultRef: bmd['@ref'],
          bmdResultName: bmd.name || 'Unnamed BMD Result',

          // Data Fields
          direction: direction,
          percentage: percentage,
          bmdFifthPercentileTotalGenes: bmdFifthPercentileTotalGenes,
          geneAllCount: geneAllCount,
          genesThatPassedAllFilters: genesPassed,

          // --- ADD rankValue ---
          rankValue: rankValue, // Assign the value used for ranking
          // -------------------

          // Placeholder for calculated styles - will be added by styleUtils
          // rank and final* properties are added later
        };
      })
      .filter((p): p is BaseCategoryAnalysisDataPoint => p !== null); // Filter out nulls

    console.log(
      `   → [prepareGroupedOverlayData v3] built ${basePoints.length} base points for ref ${refStr}`
    );
    // Use the string ref as the key for the output map
    out.set(refStr, basePoints);
  }

  console.log(
    '[prepareGroupedOverlayData v3] Output map keys:',
    Array.from(out.keys())
  );
  return out;
}
