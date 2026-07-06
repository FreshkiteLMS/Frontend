import { useEffect, useState, useCallback, RefObject } from 'react';

export interface WindowVirtualResult {
    /** Index of the first row to render (with overscan applied). */
    start: number;
    /** Index one-past the last row to render. */
    end: number;
    /** Total scroll height the list should reserve (rows * rowHeight). */
    totalHeight: number;
    /** Top offset for the rendered slice so it sits at the right scroll position. */
    offsetY: number;
}

/**
 * Window-scroll virtualization for a fixed-row-height list that lives in the
 * normal document flow (no inner scroll container).
 *
 * It watches the page scroll/resize and returns only the slice of rows that
 * intersect the viewport (+ overscan), so a section with hundreds of problems
 * keeps a tiny DOM. Rows must be a constant `rowHeight`.
 */
export function useWindowVirtual(
    containerRef: RefObject<HTMLElement | null>,
    count: number,
    rowHeight: number,
    overscan = 8
): WindowVirtualResult {
    const [range, setRange] = useState<{ start: number; end: number }>({
        start: 0,
        end: Math.min(count, overscan * 3),
    });

    const recompute = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        // Container's absolute top within the document.
        const rect = el.getBoundingClientRect();
        const containerTop = rect.top + window.scrollY;
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + window.innerHeight;

        const startPx = viewportTop - containerTop;
        const endPx = viewportBottom - containerTop;

        const start = Math.max(0, Math.floor(startPx / rowHeight) - overscan);
        const end = Math.min(count, Math.ceil(endPx / rowHeight) + overscan);

        setRange(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
    }, [containerRef, count, rowHeight, overscan]);

    useEffect(() => {
        recompute();
        window.addEventListener('scroll', recompute, { passive: true });
        window.addEventListener('resize', recompute);
        return () => {
            window.removeEventListener('scroll', recompute);
            window.removeEventListener('resize', recompute);
        };
    }, [recompute]);

    // Re-clamp if the list shrinks (e.g. filtering) so we never render past the end.
    const start = Math.min(range.start, Math.max(0, count));
    const end = Math.min(range.end, count);

    return {
        start,
        end,
        totalHeight: count * rowHeight,
        offsetY: start * rowHeight,
    };
}
