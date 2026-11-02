"use client";

import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';

export interface SortableCourse {
    _id: string;
    title: string;
    status?: string;
}

/**
 * Reorderable course list. Pointer events (not HTML5 drag-and-drop) so it
 * works with mouse, pen and touch. Accessible alternatives:
 *   - the grip is a button: focus it and press ↑/↓ to move the course,
 *   - explicit move-up / move-down buttons on every row.
 * Moves are announced through a polite live region.
 */
export function SortableCourseList({
    items,
    onChange,
    onRemove,
    disabled = false,
}: {
    items: SortableCourse[];
    onChange: (next: SortableCourse[]) => void;
    onRemove: (id: string) => void;
    disabled?: boolean;
}) {
    const rowRefs = useRef(new Map<string, HTMLLIElement>());
    const [drag, setDrag] = useState<{ id: string; from: number; to: number; dy: number; startY: number; heights: number[]; tops: number[] } | null>(null);
    const [announcement, setAnnouncement] = useState('');

    const move = (from: number, to: number, announce = true) => {
        if (to < 0 || to >= items.length || from === to) return;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange(next);
        if (announce) setAnnouncement(`${moved.title} moved to position ${to + 1} of ${items.length}.`);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
        if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const rects = items.map((it) => rowRefs.current.get(it._id)?.getBoundingClientRect());
        setDrag({
            id: items[index]._id,
            from: index,
            to: index,
            dy: 0,
            startY: e.clientY,
            heights: rects.map((r) => r?.height ?? 0),
            tops: rects.map((r) => r?.top ?? 0),
        });
    };

    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!drag) return;
        const dy = e.clientY - drag.startY;
        // New index = how many of the other rows sit above the dragged row's centre.
        const centre = drag.tops[drag.from] + drag.heights[drag.from] / 2 + dy;
        let to = 0;
        for (let i = 0; i < items.length; i++) {
            if (i !== drag.from && drag.tops[i] + drag.heights[i] / 2 < centre) to++;
        }
        setDrag({ ...drag, dy, to });
    };

    const endDrag = () => {
        if (!drag) return;
        const { from, to } = drag;
        setDrag(null);
        move(from, to);
    };

    /** Visual offset for non-dragged rows while dragging (they slide out of the way). */
    const shiftFor = (index: number) => {
        if (!drag || index === drag.from) return 0;
        const h = drag.heights[drag.from] + 8; // row + gap
        if (drag.from < drag.to && index > drag.from && index <= drag.to) return -h;
        if (drag.from > drag.to && index < drag.from && index >= drag.to) return h;
        return 0;
    };

    return (
        <>
            <ol className="space-y-2" aria-label="Courses in this bundle, in the order students see them">
                {items.map((c, index) => {
                    const dragging = drag?.id === c._id;
                    const offset = dragging ? drag!.dy : shiftFor(index);
                    return (
                        <li
                            key={c._id}
                            ref={(el) => { if (el) rowRefs.current.set(c._id, el); else rowRefs.current.delete(c._id); }}
                            style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
                            className={`relative flex items-center gap-2 sm:gap-3 rounded-xl border bg-white dark:bg-gray-900 px-2 sm:px-3 py-2.5 select-none ${
                                dragging
                                    ? 'z-10 border-blue-400 shadow-xl ring-2 ring-blue-500/20 scale-[1.01]'
                                    : `border-gray-200 dark:border-gray-700 ${drag ? 'transition-transform duration-150' : 'transition-shadow hover:border-gray-300 dark:hover:border-gray-600'}`
                            }`}
                        >
                            <button
                                type="button"
                                aria-label={`Reorder ${c.title}. Position ${index + 1} of ${items.length}. Use arrow keys to move.`}
                                disabled={disabled}
                                onPointerDown={(e) => onPointerDown(e, index)}
                                onPointerMove={onPointerMove}
                                onPointerUp={endDrag}
                                onPointerCancel={() => setDrag(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') { e.preventDefault(); move(index, index - 1); }
                                    if (e.key === 'ArrowDown') { e.preventDefault(); move(index, index + 1); }
                                }}
                                className={`shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} disabled:cursor-not-allowed`}
                            >
                                <GripVertical className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center tabular-nums" aria-hidden="true">
                                {index + 1}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                                {c.status && c.status !== 'active' && (
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                        {c.status === 'inactive' ? 'Draft — hidden from students' : c.status}
                                    </span>
                                )}
                            </span>
                            <span className="flex items-center gap-0.5 shrink-0">
                                <button type="button" onClick={() => move(index, index - 1)} disabled={disabled || index === 0} aria-label={`Move ${c.title} up`} className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => move(index, index + 1)} disabled={disabled || index === items.length - 1} aria-label={`Move ${c.title} down`} className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => { onRemove(c._id); setAnnouncement(`${c.title} removed.`); }} disabled={disabled} aria-label={`Remove ${c.title} from the bundle`} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </span>
                        </li>
                    );
                })}
            </ol>
            <p className="sr-only" aria-live="polite">{announcement}</p>
        </>
    );
}
