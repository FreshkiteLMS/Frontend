"use client";

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
    '2xl': 'sm:max-w-4xl',
} as const;

/**
 * A dialog rendered into <body>. Rendering in place is not safe here: chat
 * message rows use `content-visibility: auto` (which implies paint/layout
 * containment), and any `transform`/`filter`/`contain` ancestor turns a
 * `position: fixed` child into one positioned — and clipped — by that
 * ancestor. Portaling escapes all of them.
 *
 * Mobile: a bottom sheet; ≥ sm: a centred card. The body scrolls internally
 * so header and footer stay visible at any viewport height. Escape and the
 * backdrop close it; focus moves into the dialog and returns afterwards.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    icon,
    size = 'md',
    footer,
    children,
    closeOnBackdrop = true,
    initialFocusRef,
    bodyClassName = 'p-5',
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    size?: keyof typeof SIZES;
    footer?: ReactNode;
    children?: ReactNode;
    closeOnBackdrop?: boolean;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    bodyClassName?: string;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descId = useId();
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const focusTarget = initialFocusRef?.current
            ?? panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button:not([data-modal-close])')
            ?? panelRef.current;
        window.setTimeout(() => focusTarget?.focus(), 0);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            // Keep Tab inside the dialog.
            if (e.key === 'Tab' && panelRef.current) {
                const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.offsetParent !== null);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = overflow;
            previouslyFocused?.focus?.();
        };
    }, [open, initialFocusRef]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" role="presentation">
            <div
                className="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px] ui-fade-in"
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={`relative w-full ${SIZES[size]} max-h-[92dvh] sm:max-h-[min(88dvh,820px)] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 outline-none ui-pop-in`}
            >
                <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-base font-bold text-gray-900 dark:text-white leading-6">{title}</h2>
                        {description && <p id={descId} className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
                    </div>
                    <button
                        type="button"
                        data-modal-close
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 -mr-1.5 -mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
                {footer && (
                    <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 rounded-b-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Render children into <body> (for overlays that bring their own chrome). */
export function Portal({ children }: { children: ReactNode }) {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}
