// src/utils/analysisUtils.ts

import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported';
import { BaseCategoryAnalysisDataPoint } from '../models/applicationModel';

/**
 * Groups raw category‐analysis items into the basic overlay points,
 * keyed by BMDResult.ref (as string).
 * **Crucially, assigns the value used for ranking to the `rankValue` property.**
 */
export function prepareGroupedOverlayData(
  bmdResultMap: Map<number, BMDResult>,
  categoryItemsMap: Map<string, CategoryAnalysisItem[]>
): Map<string, BaseCategoryAnalysisDataPoint[]> { // Return type is correct
  const out = new Map<string, BaseCategoryAnalysisDataPoint[]>();

  console.log('[prepareGroupedOverlayData v4 - Type Fix] Input:', { // Version Bump
    bmdKeys: Array.from(bmdResultMap.keys()),
    categoryKeys: Array.from(categoryItemsMap.keys()),
  });

  for (const refStr of categoryItemsMap.keys()) {
    console.log(
      `  [prepareGroupedOverlayData v4] trying ref: ${refStr}`
    );
    const bmd = bmdResultMap.get(Number(refStr));
    const items = categoryItemsMap.get(refStr);

    if (!bmd) {
      console.warn(`   🌶️ no BMD for ref ${refStr}`);
      continue;
    }
    if (!items || items.length === 0) {
      console.warn(`   🌶️ no category items for ref ${refStr}`);
      continue;
    }

    // --- FIX: Type the result of map correctly, then filter ---
    const mappedPoints: (BaseCategoryAnalysisDataPoint | null)[] = items // Map returns potentially null items
      .map((item) => {
        const goId = item?.categoryIdentifier?.id;
        const goTerm = item?.categoryIdentifier?.title;
        const direction = item?.overallDirection;
        const percentage = item?.percentage;
        const bmdFifthPercentileTotalGenes = item?.bmdFifthPercentileTotalGenes;
        const geneAllCount = item?.geneAllCount;
        const genesPassed = item?.genesThatPassedAllFilters;

        if (!goId) {
          console.warn(
            `   🌶️ Skipping item due to missing goId:`,
            item?.categoryIdentifier
          );
          return null;
        }

        const rankValue = bmdFifthPercentileTotalGenes;

        // Create the base point object - properties match BaseCategoryAnalysisDataPoint
        // Optional properties like finalColor etc. are not included here yet.
        return {
          go_id: goId,
          go_term: goTerm || 'Unknown Term',
          bmdResultRef: bmd['@ref'],
          bmdResultName: bmd.name || 'Unnamed BMD Result',
          direction: direction,
          percentage: percentage,
          bmdFifthPercentileTotalGenes: bmdFifthPercentileTotalGenes,
          geneAllCount: geneAllCount,
          genesThatPassedAllFilters: genesPassed,
          rankValue: rankValue,
          // rank is added later
        };
      });

    // Filter out the nulls using a simpler type predicate
    const basePoints: BaseCategoryAnalysisDataPoint[] = mappedPoints
      .filter((p): p is BaseCategoryAnalysisDataPoint => p !== null);
    // -------------------------------------------------------

    console.log(
      `   → [prepareGroupedOverlayData v4] built ${basePoints.length} base points for ref ${refStr}`
    );
    out.set(refStr, basePoints);
  }

  console.log(
    '[prepareGroupedOverlayData v4] Output map keys:',
    Array.from(out.keys())
  );
  return out;
}
