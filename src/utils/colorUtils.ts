// src/utils/colorUtils.ts

/**
 * Generates a single point in the Halton sequence for a given index and base.
 */
function haltonSequencePoint(index: number, base: number): number {
    let f = 1;
    let r = 0;
    let i = index; // Use a mutable copy
    while (i > 0) {
        f = f / base;
        r += f * (i % base);
        i = Math.floor(i / base); // Ensure integer division
    }
    return r;
}

/**
 * Generates n quasi-random RGB colors using the Halton sequence.
 * Uses primes 2, 3, 5 for R, G, B dimensions.
 * @param n Number of colors to generate.
 * @returns Array of RGB color strings (e.g., "#RRGGBB").
 */
export function generateHaltonColors(n: number): string[] {
    if (n <= 0) return [];

    const colors: string[] = [];
    const primes = [2, 3, 5]; // Bases for R, G, B

    for (let i = 1; i <= n; i++) {
        const r = Math.floor(haltonSequencePoint(i, primes[0]) * 256);
        const g = Math.floor(haltonSequencePoint(i, primes[1]) * 256);
        const b = Math.floor(haltonSequencePoint(i, primes[2]) * 256);

        // Convert RGB to hex string #RRGGBB
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colors.push(hex);
    }
    console.log(`[colorUtils] Generated ${colors.length} Halton colors.`);
    return colors;
}

// You can add other color utility functions here if needed
