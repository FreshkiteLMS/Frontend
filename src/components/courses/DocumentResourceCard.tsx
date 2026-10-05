"use client";

import { FileText, ExternalLink } from 'lucide-react';
import { documentUrlHost, safeDocumentUrl } from '@/lib/document-url';

interface DocumentResourceCardProps {
    /** Stored document URL. Anything unsafe, empty, or malformed renders nothing. */
    url?: string | null;
    /** Card heading, e.g. "Original Course Document" or "Course Reference Document". */
    title?: string;
    /** Short line explaining what the document is. */
    description?: string;
    /** Action label. Must be descriptive — never "Click here". */
    actionLabel?: string;
    className?: string;
}

/**
 * The **source material** half of a course page: a prominent, deliberately
 * link-shaped card pointing at the original document an administrator provided.
 *
 * Visually distinct from the processed notes (which are a collapsible panel), so
 * students can tell the admin's source document apart from LMS-generated content.
 *
 * Behaviour notes:
 *  - Opens in a new tab with `rel="noopener noreferrer"`, and says so, so it is
 *    clear the student is leaving the LMS.
 *  - The browser navigates straight to the stored URL. Nothing is fetched,
 *    downloaded, previewed, or re-processed, and no iframe is used — many
 *    document hosts refuse framing.
 *  - Returns `null` when there is no usable URL, so a course without a document
 *    shows no empty card at all.
 */
export function DocumentResourceCard({
    url,
    title = 'Original Course Document',
    description = 'View the source document this course was built from.',
    actionLabel = 'Open Document',
    className = '',
}: DocumentResourceCardProps) {
    const href = safeDocumentUrl(url);
    if (!href) return null;

    const host = documentUrlHost(href);

    return (
        <section
            aria-label={title}
            className={`rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/50 dark:bg-blue-950/30 ${className}`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                            {description}
                        </p>
                        {host && (
                            <p className="mt-1 truncate text-[11px] font-medium text-gray-500 dark:text-gray-500">
                                Opens {host} in a new tab
                            </p>
                        )}
                    </div>
                </div>

                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
                >
                    {actionLabel}
                    {/* Decorative — the label already names the action, and
                        "(opens in a new tab)" below carries it to screen readers. */}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>
            </div>
        </section>
    );
}
