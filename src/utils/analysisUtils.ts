// src/utils/analysisUtils.ts

import { BMDResult, CategoryAnalysisItem } from '../models/BMDxExported'
// *** USE CORRECT TYPE ***
import { BaseCategoryAnalysisDataPoint } from '../models/applicationModel' // Adjusted path/type

/**
 * Groups raw category‐analysis items into the basic overlay points,
 * keyed by BMDResult.ref (as string).
 */
export function prepareGroupedOverlayData(
  bmdResultMap: Map<number, BMDResult>,
  // *** USE CORRECT TYPE FOR INPUT MAP VALUE ***
  categoryItemsMap: Map<string, CategoryAnalysisItem[]>
  // *** USE CORRECT TYPE FOR RETURN MAP VALUE ***
): Map<string, BaseCategoryAnalysisDataPoint[]> {
  // *** USE CORRECT TYPE FOR OUTPUT MAP ***
  const out = new Map<string, BaseCategoryAnalysisDataPoint[]>()

  console.log('[prepareGroupedOverlayData v2] Input:', {
    bmdKeys: Array.from(bmdResultMap.keys()),
    categoryKeys: Array.from(categoryItemsMap.keys()),
  })

  // Iterate over the keys provided by the correctly structured categoryItemsMap
  for (const refStr of categoryItemsMap.keys()) {
    console.log(`  [prepareGroupedOverlayData v2] trying ref: ${refStr}`)
    const bmd = bmdResultMap.get(Number(refStr)) // Get corresponding BMDResult
    const items = categoryItemsMap.get(refStr) // Get the array of items for this ref

    if (!bmd) {
      console.warn(`   🌶️ no BMD for ref ${refStr}`)
      continue
    }
    if (!items || items.length === 0) {
      console.warn(`   🌶️ no category items for ref ${refStr}`)
      continue
    }

    // Build the BaseCategoryAnalysisDataPoint[] for this ref
    // *** FIX POINT A & B ***
    const basePoints: BaseCategoryAnalysisDataPoint[] = items
      .map((item) => {
        // --- FIX A: Use categoryIdentifier.id for goId ---
        const goId = item?.categoryIdentifier?.id
        const goTerm = item?.categoryIdentifier?.title
        // --- Map other relevant fields from CategoryAnalysisItem ---
        const direction = item?.overallDirection
        const percentage = item?.percentage
        // Use the field specified for ranking/accumulation plot
        const bmdFifthPercentileTotalGenes = item?.bmdFifthPercentileTotalGenes
        const geneAllCount = item?.geneAllCount
        const genesPassed = item?.genesThatPassedAllFilters

        // Basic validation: Ensure goId exists
        if (!goId) {
          console.warn(
            `   🌶️ Skipping item due to missing goId:`,
            item?.categoryIdentifier
          )
          return null // Skip items without a GO ID
        }

        // Create the base point object
        return {
          // Identifiers
          go_id: goId, // Keep snake_case for consistency with reference data? Or switch to goId? Let's use go_id for now.
          go_term: goTerm || 'Unknown Term',

          // Source Info (Use number for ref consistency internally if possible, but map key is string)
          bmdResultRef: bmd['@ref'], // Store the original numeric ref
          bmdResultName: bmd.name || 'Unnamed BMD Result',

          // Data Fields (ensure names match applicationModel)
          direction: direction,
          percentage: percentage,
          bmdFifthPercentileTotalGenes: bmdFifthPercentileTotalGenes, // Field for ranking/accumulation
          geneAllCount: geneAllCount,
          genesThatPassedAllFilters: genesPassed,

          // Placeholder for calculated styles - will be added by styleUtils
          finalColor: '',
          finalShape: '',
          finalSize: 0,
          finalOpacity: 0,
        }
      })
      .filter((p): p is BaseCategoryAnalysisDataPoint => p !== null) // Filter out nulls

    console.log(
      `   → [prepareGroupedOverlayData v2] built ${basePoints.length} base points for ref ${refStr}`
    )
    // Use the string ref as the key for the output map
    out.set(refStr, basePoints)
  }

  console.log(
    '[prepareGroupedOverlayData v2] Output map keys:',
    Array.from(out.keys())
  )
  return out
}
