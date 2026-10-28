import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
    page,
    totalPages,
    total,
    onPage,
    noun = 'items',
}: {
    page: number;
    totalPages: number;
    total: number;
    onPage: (page: number) => void;
    noun?: string;
}) {
    if (total === 0) return null;
    return (
        <nav className="flex items-center justify-between gap-3 pt-4 text-sm" aria-label="Pagination">
            <span className="text-gray-500 dark:text-gray-400">
                {total} {noun} · page {page} of {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                </button>
                <button
                    type="button"
                    onClick={() => onPage(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </nav>
    );
}
