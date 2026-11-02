"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, Loader2, Lock, Send, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { attemptsService, type AttemptItemRef } from '@/services/api/assessment-attempts.api';
import { apiErrorMessage } from '@/services/api/discount.api';
import type { AttemptAllowance } from '@/types/assessment-attempts';

/**
 * Remaining attempts for one recorded assessment (course audio question or
 * problem logic explanation), and — once they are used up — the request for
 * more. Purely informational: the server enforces every limit.
 */
export function AttemptAllowanceBanner({
    allowance,
    item,
    itemTitle,
    onRequested,
}: {
    allowance: AttemptAllowance | null | undefined;
    item: AttemptItemRef;
    itemTitle: string;
    onRequested: () => void;
}) {
    const [open, setOpen] = useState(false);
    if (!allowance || allowance.exempt) return null;
    const { used, allowed, remaining, limitReached, pendingRequest, latestRequest } = allowance;
    const lastDecision = !pendingRequest && latestRequest && latestRequest.status !== 'PENDING' ? latestRequest : null;

    if (!limitReached) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm" role="status">
                <span className="text-gray-600 dark:text-gray-300">
                    Attempts remaining: <strong className="tabular-nums text-gray-900 dark:text-white">{remaining} / {allowed}</strong>
                </span>
                <span className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: Math.min(allowed, 12) }, (_, i) => (
                        <span key={i} className={`h-1.5 w-5 rounded-full ${i < used ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-500'}`} />
                    ))}
                </span>
                {lastDecision?.status === 'APPROVED' && (
                    <span className="w-full text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                        Your request was approved: {lastDecision.approvedCount} extra attempt{lastDecision.approvedCount === 1 ? '' : 's'}.
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4" role="alert">
            <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                <Lock className="h-4 w-4" aria-hidden="true" /> You have reached your maximum of {allowed} attempts.
            </p>
            {pendingRequest ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Request for {pendingRequest.requestedCount} more attempt{pendingRequest.requestedCount === 1 ? '' : 's'} — <strong>Pending approval</strong>
                </p>
            ) : (
                <>
                    {lastDecision?.status === 'REJECTED' && (
                        <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
                            <XCircle className="mr-1 inline h-4 w-4 text-red-600" aria-hidden="true" />
                            Your last request was <strong>rejected</strong>{lastDecision.rejectionReason ? `: “${lastDecision.rejectionReason}”` : '.'}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" /> Request Additional Attempts
                    </button>
                </>
            )}
            <RequestAttemptsModal open={open} onClose={() => setOpen(false)} item={item} itemTitle={itemTitle} onDone={() => { setOpen(false); onRequested(); }} />
        </div>
    );
}

function RequestAttemptsModal({ open, onClose, item, itemTitle, onDone }: {
    open: boolean;
    onClose: () => void;
    item: AttemptItemRef;
    itemTitle: string;
    onDone: () => void;
}) {
    const [reason, setReason] = useState('');
    const [count, setCount] = useState(1);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim().length < 5) { setError('Please tell us briefly why you need more attempts (at least 5 characters).'); return; }
        setSending(true);
        setError(null);
        try {
            await attemptsService.request(item, { reason: reason.trim(), requestedCount: count });
            toast.success('Request sent. You will be able to record again once it is approved.');
            setReason('');
            setCount(1);
            onDone();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not send your request.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={sending ? () => undefined : onClose}
            title="Request additional attempts"
            description={itemTitle}
            size="md"
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={sending} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button type="submit" form="attempt-request-form" disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send request
                    </button>
                </div>
            }
        >
            <form id="attempt-request-form" onSubmit={send} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="ar-count" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Additional attempts</label>
                    <select id="ar-count" value={count} onChange={e => setCount(Number(e.target.value))} className="w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">An administrator decides how many to grant.</p>
                </div>
                <div>
                    <label htmlFor="ar-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reason</label>
                    <textarea
                        id="ar-reason"
                        data-autofocus
                        value={reason}
                        onChange={e => { setReason(e.target.value); if (error) setError(null); }}
                        rows={4}
                        maxLength={1000}
                        placeholder="For example: my microphone stopped working during my last attempt."
                        aria-invalid={!!error}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <p className="mt-1 text-right text-[11px] text-gray-400">{reason.length}/1000</p>
                </div>
                {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </form>
        </Modal>
    );
}
