"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type MenuAnchor =
    /** Open next to an element's box (button / message bubble). */
    | { kind: 'rect'; rect: DOMRect; align: 'start' | 'end' }
    /** Open at a pointer position (right-click). */
    | { kind: 'point'; x: number; y: number };

const GAP = 6;
const MARGIN = 8;

/**
 * A menu rendered into <body> with fixed positioning, so no scrolling or
 * `overflow: hidden` ancestor can clip it. It measures itself and opens below
 * the anchor when there is room, otherwise above, and is always clamped inside
 * the viewport (scrolling internally if the screen is shorter than the menu).
 * Closes on Escape, window resize, or any scroll.
 */
export function FloatingMenu({
    anchor,
    onClose,
    className = '',
    children,
}: {
    anchor: MenuAnchor;
    onClose: () => void;
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = el.offsetWidth;
        const h = el.scrollHeight;

        let top: number;
        let left: number;
        if (anchor.kind === 'point') {
            top = anchor.y + h + MARGIN <= vh ? anchor.y : anchor.y - h;
            left = anchor.x + w + MARGIN <= vw ? anchor.x : anchor.x - w;
        } else {
            const r = anchor.rect;
            const below = r.bottom + GAP;
            const above = r.top - GAP - h;
            top = below + h + MARGIN <= vh ? below : above >= MARGIN ? above : Math.max(MARGIN, vh - h - MARGIN);
            left = anchor.align === 'end' ? r.right - w : r.left;
        }
        left = Math.min(Math.max(MARGIN, left), vw - w - MARGIN);
        top = Math.max(MARGIN, top);
        setPos({ top, left, maxHeight: vh - top - MARGIN });
    }, [anchor]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        // A fixed menu would drift away from its message while scrolling.
        const onScroll = (e: Event) => {
            if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
            onClose();
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onClose);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onClose);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div
            ref={ref}
            role="menu"
            className={`fixed z-[95] overflow-y-auto ${className}`}
            style={{
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                maxHeight: pos?.maxHeight,
                visibility: pos ? 'visible' : 'hidden',
            }}
        >
            {children}
        </div>,
        document.body,
    );
}
