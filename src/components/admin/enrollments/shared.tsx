"use client";

import type { ReactNode } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Crown, Inbox, Package } from 'lucide-react';
import type { ApprovalStatus } from '@/types/enrollment-request';
import type { AccessSource, EnrollmentStatus, PageMeta, ResourceType } from '@/types/enrollment';
import { DURATION_OPTIONS, draftToDuration, fmtDate, type DurationDraft } from '@/lib/access-window';

export const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';
export const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';
export const primaryBtn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';
export const secondaryBtn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors disabled:opacity-50';
export const dangerBtn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50';
export const cardCls = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl';

export const RESOURCE_LABEL: Record<ResourceType, string> = { COURSE: 'Course', BUNDLE: 'Bundle', ALL_IN_ONE: 'Master Subscription' };
export const SOURCE_LABEL: Record<AccessSource, string> = {
    PAYMENT: 'Payment', ADMIN_GRANT: 'Admin grant', STUDENT_REQUEST: 'Request approval', PROMOTIONAL: 'Promotional',
};

export function ResourceIcon({ type, className = 'w-4 h-4' }: { type: ResourceType | string; className?: string }) {
    if (type === 'ALL_IN_ONE') return <Crown className={className} aria-hidden="true" />;
    if (type === 'BUNDLE') return <Package className={className} aria-hidden="true" />;
    return <BookOpen className={className} aria-hidden="true" />;
}

const badge = 'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset whitespace-nowrap';
const ENROLLMENT_BADGE: Record<EnrollmentStatus, { label: string; cls: string }> = {
    ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-500/30' },
    PENDING: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30' },
    EXPIRED: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30' },
    REVOKED: { label: 'Revoked', cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/40' },
};
const REQUEST_BADGE: Record<ApprovalStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30' },
    APPROVED: { label: 'Approved', cls: ENROLLMENT_BADGE.ACTIVE.cls },
    REJECTED: { label: 'Rejected', cls: ENROLLMENT_BADGE.REVOKED.cls },
    CANCELLED: { label: 'Cancelled', cls: ENROLLMENT_BADGE.CANCELLED.cls },
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
    const b = ENROLLMENT_BADGE[status] ?? ENROLLMENT_BADGE.CANCELLED;
    return <span className={`${badge} ${b.cls}`}>{b.label}</span>;
}
export function RequestStatusBadge({ status }: { status: ApprovalStatus }) {
    const b = REQUEST_BADGE[status] ?? REQUEST_BADGE.CANCELLED;
    return <span className={`${badge} ${b.cls}`}>{b.label}</span>;
}

/** Preset buttons + optional start date + custom expiry, with a live "ends on" preview. */
export function DurationPicker({ value, onChange, disabled, allowStart = true, baseStart }: {
    value: DurationDraft;
    onChange: (next: DurationDraft) => void;
    disabled?: boolean;
    allowStart?: boolean;
    /** Editing: the start kept when no new start date is chosen. */
    baseStart?: Date;
}) {
    const preview = draftToDuration(value, new Date(), baseStart);
    return (
        <div className="space-y-3">
            <div role="radiogroup" aria-label="Access duration" className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_OPTIONS.map(o => {
                    const on = value.preset === o.value;
                    return (
                        <button
                            key={o.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={disabled}
                            onClick={() => onChange({ ...value, preset: o.value })}
                            className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${on
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
                {allowStart && (
                    <label className="block">
                        <span className={labelCls}>Start date <span className="font-normal text-gray-400">({baseStart ? 'empty = keep current' : 'empty = now'})</span></span>
                        <input type="date" className={inputCls} disabled={disabled} value={value.startDate} onChange={e => onChange({ ...value, startDate: e.target.value })} />
                    </label>
                )}
                {value.preset === 'CUSTOM' && (
                    <label className="block">
                        <span className={labelCls}>Expiry date</span>
                        <input type="date" className={inputCls} disabled={disabled} value={value.expiryDate} onChange={e => onChange({ ...value, expiryDate: e.target.value })} />
                    </label>
                )}
            </div>
            <p className={`text-xs ${preview.error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} aria-live="polite">
                {preview.error
                    ? preview.error
                    : <>Starts {value.startDate || baseStart ? fmtDate(preview.startsAt) : 'immediately'} · {preview.expiresAt ? `ends ${fmtDate(preview.expiresAt)}` : 'never expires'}</>}
            </p>
        </div>
    );
}

export function Pagination({ meta, onPage }: { meta: PageMeta | null; onPage: (p: number) => void }) {
    if (!meta || meta.totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500">Page {meta.page} of {meta.totalPages} · {meta.total.toLocaleString('en-IN')} total</span>
            <div className="flex gap-2">
                <button type="button" onClick={() => onPage(meta.page - 1)} disabled={meta.page <= 1} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800" aria-label="Previous page">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => onPage(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800" aria-label="Next page">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-2" role="status" aria-label="Loading">
            {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-xl animate-pulse" />)}
        </div>
    );
}

export function EmptyBox({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
    return (
        <div className="p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
            {hint && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="p-8 text-center border border-red-200 dark:border-red-900/40 rounded-2xl bg-red-50/40 dark:bg-red-900/10" role="alert">
            <p className="text-red-700 dark:text-red-400 font-medium">{message}</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-3 text-sm text-blue-600 hover:underline">Try again</button>}
        </div>
    );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white text-right min-w-0 break-words">{children || '—'}</dd>
        </div>
    );
}

export function StudentCell({ name, email, code }: { name: string; email: string; code?: string | null }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0" aria-hidden="true">
                {(name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name || 'Student'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {code && <span className="font-mono mr-1.5">{code}</span>}{email}
                </p>
            </div>
        </div>
    );
}

export function th(label: string, align: 'left' | 'right' = 'left') {
    return <th key={label} scope="col" className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap`}>{label}</th>;
}
