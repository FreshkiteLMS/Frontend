"use client";

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown by the root layout itself. It
 * replaces the whole document, so it carries its own <html>/<body> and only
 * inline styles (the app stylesheet may be what failed).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('[global error]', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1120', color: '#e5e7eb' }}>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ maxWidth: 420, textAlign: 'center' }}>
                        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
                        <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20 }}>
                            The app could not load. Please try again in a moment.
                        </p>
                        {error.digest && <p style={{ fontSize: 12, color: '#6b7280' }}>Reference: {error.digest}</p>}
                        <button
                            onClick={reset}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#2563eb', color: '#fff', fontSize: 14, cursor: 'pointer' }}
                        >
                            Reload
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
