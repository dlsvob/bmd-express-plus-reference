// src/hooks/useUmapLayout.ts

import { useState, useEffect, useRef } from 'react';
import type { AnalysisTableRow } from '../models/applicationModel';

type UmapViewMode = 'single' | 'multiple';

export interface UseUmapLayoutProps {
    umapViewMode: UmapViewMode;
    allStyledPoints: AnalysisTableRow[] | null;
    isFilterHeaderCollapsed: boolean;
}

export interface UseUmapLayoutReturn {
    umapRenderedWidth: number | null;
    accumulationPlotHeight: string | null;
    legendTopOffset: number;
    umapContainerRef: React.RefObject<HTMLDivElement>;
    filterHeaderRef: React.RefObject<HTMLDivElement>;
}

export const useUmapLayout = ({
    umapViewMode,
    allStyledPoints,
    isFilterHeaderCollapsed
}: UseUmapLayoutProps): UseUmapLayoutReturn => {
    // Layout state
    const [umapRenderedWidth, setUmapRenderedWidth] = useState<number | null>(null);
    const [accumulationPlotHeight, setAccumulationPlotHeight] = useState<string | null>(null);
    const [legendTopOffset, setLegendTopOffset] = useState<number>(50);

    // Refs for measuring elements
    const umapContainerRef = useRef<HTMLDivElement>(null);
    const filterHeaderRef = useRef<HTMLDivElement>(null);

    // Effect to measure UMAP plot width
    useEffect(() => {
        const targetElement = umapContainerRef.current;

        // Only measure in single view when data is available
        if (umapViewMode !== 'single' || !targetElement || !allStyledPoints) {
            if (umapRenderedWidth !== null) setUmapRenderedWidth(null);
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const width = entry.contentRect?.width;
                if (width !== undefined && width > 0) {
                    const roundedWidth = Math.round(width);
                    setUmapRenderedWidth(prevWidth =>
                        prevWidth !== roundedWidth ? roundedWidth : prevWidth
                    );
                }
            }
        });

        resizeObserver.observe(targetElement);

        // Measure initial size
        const initialWidth = targetElement.offsetWidth;
        if (initialWidth > 0) setUmapRenderedWidth(initialWidth);

        return () => {
            resizeObserver.disconnect();
        };
    }, [umapViewMode, allStyledPoints, umapRenderedWidth]);

    // Effect to measure filter header height for legend offset
    useEffect(() => {
        const headerElement = filterHeaderRef.current;
        if (headerElement) {
            const measureHeight = () => {
                const height = headerElement.getBoundingClientRect().height;
                if (height > 0) {
                    const newOffset = Math.round(height);
                    setLegendTopOffset(prevOffset =>
                        prevOffset !== newOffset ? newOffset : prevOffset
                    );
                }
            };

            const resizeObserver = new ResizeObserver(measureHeight);
            resizeObserver.observe(headerElement);
            measureHeight(); // Initial measurement

            return () => resizeObserver.disconnect();
        }
    }, [isFilterHeaderCollapsed]);

    // Effect to calculate Accumulation Plot height based on UMAP height
    useEffect(() => {
        if (umapViewMode !== 'single') {
            if (accumulationPlotHeight !== null) setAccumulationPlotHeight(null);
            return;
        }

        const targetElement = umapContainerRef.current;
        if (!targetElement) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { height } = entry.contentRect;
                if (height > 0) {
                    const newHeight = Math.round(height / 2); // Half of UMAP height
                    const heightString = `${newHeight}px`;
                    setAccumulationPlotHeight(prevHeight =>
                        prevHeight !== heightString ? heightString : prevHeight
                    );
                }
            }
        });

        resizeObserver.observe(targetElement);

        // Initial measurement
        const initialHeight = targetElement.offsetHeight;
        if (initialHeight > 0) {
            const heightString = `${Math.round(initialHeight / 2)}px`;
            setAccumulationPlotHeight(heightString);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [umapViewMode, accumulationPlotHeight]);

    return {
        umapRenderedWidth,
        accumulationPlotHeight,
        legendTopOffset,
        umapContainerRef,
        filterHeaderRef,
    };
};