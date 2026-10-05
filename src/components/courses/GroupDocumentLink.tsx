"use client";

import { FileText, ExternalLink } from 'lucide-react';
import { safeDocumentUrl } from '@/lib/document-url';

interface GroupDocumentLinkProps {
    /** Stored group document URL. Unsafe, empty, or malformed renders nothing. */
    url?: string | null;
    label?: string;
    className?: string;
}

/**
 * Compact variant of {@link DocumentResourceCard} for the dense bundle cards on
 * the student dashboard, where the full card would crowd the grid.
 *
 * Same contract: an external link straight to the stored URL, opened in a new tab
 * with `rel="noopener noreferrer"`, no fetching, downloading, or processing of the
 * document. Renders nothing when there is no usable URL.
 */
export function GroupDocumentLink({
    url,
    label = 'Open Reference Document',
    className = '',
}: GroupDocumentLinkProps) {
    const href = safeDocumentUrl(url);
    if (!href) return null;

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            // stopPropagation: these cards sit inside clickable containers, and
            // opening the document must not also navigate within the LMS.
            onClick={e => e.stopPropagation()}
            className={`inline-flex max-w-full items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40 dark:focus-visible:ring-offset-gray-900 ${className}`}
        >
            <FileText className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
        </a>
    );
}
