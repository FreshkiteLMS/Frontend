"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/* Small building blocks shared by every Settings section. */

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
            </span>
            {children}
            {error && <span className="block text-xs text-red-600 dark:text-red-400 mt-1" role="alert">{error}</span>}
        </label>
    );
}

const inputCls = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';

export function TextInput({
    value, onChange, onEnter, ...rest
}: { value: string; onChange: (v: string) => void; onEnter?: () => void; type?: string; placeholder?: string; maxLength?: number; disabled?: boolean; autoComplete?: string; invalid?: boolean }) {
    const { invalid, ...inputProps } = rest;
    return (
        <input
            {...inputProps}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && onEnter) {
                    e.preventDefault();
                    onEnter();
                }
            }}
            aria-invalid={invalid || undefined}
            className={`${inputCls} ${invalid ? 'border-red-400 focus:ring-red-500' : ''}`}
        />
    );
}

export function TextArea({ value, onChange, rows = 3, maxLength }: { value: string; onChange: (v: string) => void; rows?: number; maxLength?: number }) {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={maxLength} className={`${inputCls} resize-y`} />;
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}

export function Button({ children, onClick, variant = 'primary', busy, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean; type?: 'button' | 'submit' }) {
    const styles = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
    }[variant];
    return (
        <button type={type} onClick={onClick} disabled={disabled || busy} className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${styles}`}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}

/** Sticky footer with Save / Discard while a form has unsaved changes. */
export function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
    return (
        <div className={`sticky bottom-0 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 flex items-center justify-end gap-3 transition-opacity ${dirty ? 'opacity-100' : 'opacity-60'}`}>
            {dirty && <span className="mr-auto text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            <Button variant="secondary" onClick={onReset} disabled={!dirty || saving}>Discard</Button>
            <Button onClick={onSave} busy={saving} disabled={!dirty}>Save changes</Button>
        </div>
    );
}

/** Warn before leaving the page with unsaved edits; exposes a shared flag for in-app navigation. */
let unsavedFlag = false;
export function hasUnsavedChanges(): boolean {
    return unsavedFlag;
}
export function useUnsavedGuard(dirty: boolean) {
    useEffect(() => {
        unsavedFlag = dirty;
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            unsavedFlag = false;
        };
    }, [dirty]);
}

/** Confirmation for sensitive actions; optional typed/password confirmation. */
export function ConfirmDialog({
    title, body, confirmLabel, danger, requirePassword, onConfirm, onClose,
}: {
    title: string;
    body: ReactNode;
    confirmLabel: string;
    danger?: boolean;
    requirePassword?: boolean;
    onConfirm: (password: string) => Promise<void>;
    onClose: () => void;
}) {
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await onConfirm(password);
        } catch (e) {
            setError((e as Error).message);
            setBusy(false);
        }
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-6 space-y-4">
                <div className="flex gap-3">
                    {danger && <span className="w-10 h-10 shrink-0 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></span>}
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{body}</div>
                    </div>
                </div>
                {requirePassword && (
                    <Field label="Confirm with your password" error={error}>
                        <TextInput type="password" value={password} onChange={setPassword} autoComplete="current-password" onEnter={() => password && void submit()} />
                    </Field>
                )}
                {!requirePassword && error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant={danger ? 'danger' : 'primary'} onClick={() => void submit()} busy={busy} disabled={requirePassword && !password}>{confirmLabel}</Button>
                </div>
            </div>
        </div>
    );
}
