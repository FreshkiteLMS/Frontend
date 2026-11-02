"use client";

import { useRef, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './modal';

/** Confirmation for destructive or consequential actions. */
export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'danger',
    busy = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmClass = tone === 'danger'
        ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
        : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500';
    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onCancel}
            title={title}
            size="sm"
            initialFocusRef={cancelRef}
            icon={
                <span className={`flex w-9 h-9 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    <AlertTriangle className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
            }
            footer={
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${confirmClass}`}
                    >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {confirmLabel}
                    </button>
                </div>
            }
        >
            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{message}</div>
        </Modal>
    );
}
