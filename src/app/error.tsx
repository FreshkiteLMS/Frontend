"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Route-level error boundary: a rendering error in any page shows this
 * recoverable screen inside the normal layout instead of a blank page.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Visible in the browser console and in any attached error monitoring.
        console.error('[route error]', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    This page hit an unexpected problem. Your data is safe — try again, or head back to your dashboard.
                </p>
                {error.digest && <p className="text-xs text-gray-400">Reference: {error.digest}</p>}
                <div className="flex justify-center gap-2 pt-2">
                    <button
                        onClick={reset}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                    >
                        <RotateCcw className="w-4 h-4" /> Try again
                    </button>
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
