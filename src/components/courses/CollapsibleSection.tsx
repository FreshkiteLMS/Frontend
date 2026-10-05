"use client";

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: ReactNode;
    /** Expanded on first render. Defaults to true — notes are the primary content. */
    defaultOpen?: boolean;
    /** Optional right-aligned hint in the header, e.g. a lesson count. */
    meta?: ReactNode;
    className?: string;
}

/**
 * Accessible disclosure panel used to make a course's processed notes
 * minimizable, following the same header-button + rotating-chevron pattern as
 * the problem-tracker's SectionCard.
 *
 * Accessibility:
 *  - A real `<button>` header, so keyboard (Enter/Space) and screen readers work
 *    with no extra handlers, and focus is visible via `focus-visible:ring`.
 *  - `aria-expanded` and `aria-controls` point at the panel, which carries a
 *    matching `id` and `role="region"` labelled by the header.
 *  - State is conveyed by the label ("Hide"/"Show" in the accessible name) and
 *    the chevron's rotation, not by color alone.
 *
 * Performance: children stay mounted and are hidden with the `hidden` attribute
 * rather than unmounted, so collapsing and expanding never re-renders, re-fetches,
 * or re-processes the notes — toggling costs one class change.
 */
export function CollapsibleSection({
    title,
    children,
    defaultOpen = true,
    meta,
    className = '',
}: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const panelId = useId();
    const headerId = useId();

    return (
        <section
            className={`overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40 ${className}`}
        >
            <h2 id={headerId} className="m-0">
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-gray-800/50"
                >
                    <span className="flex-1 text-sm font-bold text-gray-900 dark:text-white">
                        {title}
                        {/* Spoken state for assistive tech; aria-expanded covers
                            most readers, this keeps the intent unambiguous. */}
                        <span className="sr-only">{open ? ' (expanded)' : ' (collapsed)'}</span>
                    </span>
                    {meta && (
                        <span className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{meta}</span>
                    )}
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </button>
            </h2>

            <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                hidden={!open}
                className="border-t border-gray-100 px-5 py-6 dark:border-gray-800"
            >
                {children}
            </div>
        </section>
    );
}
