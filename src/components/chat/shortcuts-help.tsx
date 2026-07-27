"use client";

import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { CHAT_SHORTCUTS } from '@/hooks/use-chat-shortcuts';

/**
 * Keyboard-shortcuts cheatsheet (§29). Opened with "?" and closed with Escape,
 * the X button, or a backdrop click.
 */
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                        <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Keyboard shortcuts
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <ul className="p-5 space-y-2.5">
                    {CHAT_SHORTCUTS.map((s) => (
                        <li key={`${s.keys}-${s.label}`} className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md whitespace-nowrap">
                                {s.keys}
                            </kbd>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
