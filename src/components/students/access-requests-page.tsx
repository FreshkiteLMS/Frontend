"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Crown, KeyRound, ShieldCheck, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AccessRequestControl } from '@/components/courses/access-request-control';
import { useCourseAccess } from '@/hooks/use-course-access';
import { useMyAccessRequests } from '@/hooks/use-my-access-requests';
import { ACCESS_UPDATED_WINDOW_EVENT } from '@/hooks/use-chat-socket';
import { accessRequestApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { MyAccessRequest, MyEnrollment } from '@/types/enrollment';
import { daysUntil, fmtDate, fmtDateTime } from '@/lib/access-window';
import {
    EmptyBox, EnrollmentStatusBadge, ErrorBox, LoadingRows, RESOURCE_LABEL, RequestStatusBadge, ResourceIcon, cardCls, th,
} from '@/components/admin/enrollments/shared';

const SOURCE: Record<string, string> = { ADMIN_GRANT: 'Granted by admin', STUDENT_REQUEST: 'Your approved request', PROMOTIONAL: 'Promotional access', PAYMENT: 'Purchase' };

/** Student → Access Requests: request status, granted access with expiry, Master Subscription. */
export function AccessRequestsPage() {
    const access = useCourseAccess();
    const requests = useMyAccessRequests();
    const [enrollments, setEnrollments] = useState<MyEnrollment[] | null>(null);
    const [enrollError, setEnrollError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<MyAccessRequest | null>(null);
    const [busy, setBusy] = useState(false);

    const loadEnrollments = useCallback(async () => {
        setEnrollError(null);
        try {
            setEnrollments(await accessRequestApi.myEnrollments());
        } catch (e) {
            setEnrollError(apiErrorMessage(e, 'Could not load your access'));
        }
    }, []);
    useEffect(() => {
        loadEnrollments();
        const refresh = () => { loadEnrollments(); };
        window.addEventListener(ACCESS_UPDATED_WINDOW_EVENT, refresh);
        return () => window.removeEventListener(ACCESS_UPDATED_WINDOW_EVENT, refresh);
    }, [loadEnrollments]);

    const cancel = async () => {
        if (!cancelling) return;
        setBusy(true);
        try {
            await accessRequestApi.cancel(cancelling.id);
            toast.success('Request cancelled');
            setCancelling(null);
            await requests.refresh();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'Could not cancel the request'));
            await requests.refresh();
        } finally {
            setBusy(false);
        }
    };

    const live = (enrollments ?? []).filter(e => e.status === 'ACTIVE' || e.status === 'PENDING');
    const past = (enrollments ?? []).filter(e => e.status !== 'ACTIVE' && e.status !== 'PENDING');

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><KeyRound className="w-6 h-6 text-blue-600" aria-hidden="true" /> Access Requests</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ask for access to a course, bundle or the Master Subscription, and track what you’ve been granted.</p>
                </div>
                <Link href="/student/courses?tab=bundles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                    Browse courses & bundles to request <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
            </div>

            {/* Subscription */}
            <section className={`${cardCls} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`} aria-labelledby="sub-h">
                <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0"><Crown className="w-5 h-5" aria-hidden="true" /></span>
                    <div>
                        <h2 id="sub-h" className="font-bold text-gray-900 dark:text-white">My Subscription</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                            {!access.ready ? 'Checking…' : access.fullAccess
                                ? `Master Subscription active — every course is unlocked${access.fullAccessExpiresAt ? ` until ${fmtDate(access.fullAccessExpiresAt)}` : ''}.`
                                : 'No Master Subscription. It unlocks every course, including new ones.'}
                        </p>
                    </div>
                </div>
                {access.ready && !access.fullAccess && (
                    <div className="sm:w-64 shrink-0"><AccessRequestControl type="ALL_IN_ONE" id="ALL_IN_ONE" name="Master Subscription" /></div>
                )}
            </section>

            {/* Granted access */}
            <section aria-labelledby="granted-h">
                <h2 id="granted-h" className="font-bold text-gray-900 dark:text-white mb-3">Access granted to you</h2>
                {enrollError ? <ErrorBox message={enrollError} onRetry={loadEnrollments} /> : !enrollments ? <LoadingRows rows={2} /> : live.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nothing granted by an admin right now. Courses you bought appear on your dashboard as usual.</p>
                ) : (
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {live.map(e => {
                            const left = e.expires_at ? daysUntil(e.expires_at) : null;
                            return (
                                <li key={e.id} className={`${cardCls} p-4`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-white min-w-0"><ResourceIcon type={e.resource_type} className="w-4 h-4 text-gray-400 shrink-0" /> <span className="truncate">{e.resource_name}</span></span>
                                        <EnrollmentStatusBadge status={e.status} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{RESOURCE_LABEL[e.resource_type]} · {SOURCE[e.access_source] ?? e.access_source}</p>
                                    <p className={`text-sm mt-3 ${left !== null && left <= 7 ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {e.status === 'PENDING' ? `Starts ${fmtDate(e.starts_at)}` : e.expires_at ? `Until ${fmtDate(e.expires_at)}${left !== null && left >= 0 ? ` · ${left} day${left === 1 ? '' : 's'} left` : ''}` : 'Lifetime access'}
                                    </p>
                                    {e.resource_type === 'COURSE' && e.status === 'ACTIVE' && (
                                        <Link href={`/student/courses/${e.resource_id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">Open course <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
                                    )}
                                    {e.resource_type !== 'COURSE' && e.status === 'ACTIVE' && (
                                        <Link href="/student" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">Go to my courses <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {past.length > 0 && (
                    <details className="mt-3">
                        <summary className="text-sm text-gray-500 cursor-pointer">Ended access ({past.length})</summary>
                        <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl">
                            {past.map(e => (
                                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                    <span className="truncate text-gray-700 dark:text-gray-300">{e.resource_name}</span>
                                    <span className="flex items-center gap-2 shrink-0 text-xs text-gray-500">{e.status === 'REVOKED' ? fmtDate(e.revoked_at) : fmtDate(e.expires_at)} <EnrollmentStatusBadge status={e.status} /></span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </section>

            {/* Requests */}
            <section aria-labelledby="req-h">
                <h2 id="req-h" className="font-bold text-gray-900 dark:text-white mb-3">My requests</h2>
                {!requests.ready ? <LoadingRows rows={3} /> : requests.failed && !requests.rows.length ? <ErrorBox message="Could not load your requests." onRetry={() => requests.refresh()} /> : requests.rows.length === 0 ? (
                    <EmptyBox
                        title="You haven’t requested access yet"
                        hint="Open a course or bundle in the store and choose Request Access."
                        action={<Link href="/student/courses" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"><ShieldCheck className="w-4 h-4" /> Browse the store</Link>}
                    />
                ) : (
                    <div className={`${cardCls} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>{['Request ID', 'Course / bundle', 'Requested', 'Your reason', 'Status', 'Admin response', 'Last updated'].map(h => th(h))}<th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {requests.rows.map(r => (
                                        <tr key={r.id}>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.reference}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 text-gray-900 dark:text-white"><ResourceIcon type={r.product_type} className="w-4 h-4 text-gray-400" /> {r.product_name}</span>
                                                <span className="block text-[11px] uppercase tracking-wide text-gray-400 mt-0.5">{RESOURCE_LABEL[r.product_type]}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDate(r.created_at)}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[14rem] truncate" title={r.notes || undefined}>{r.notes || '—'}</td>
                                            <td className="px-4 py-3"><RequestStatusBadge status={r.status} /></td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[16rem]">{r.admin_response || '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtDateTime(r.updated_at)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {r.status === 'PENDING' && (
                                                    <button type="button" onClick={() => setCancelling(r)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                                                        <X className="w-3.5 h-3.5" /> Cancel
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={!!cancelling}
                title="Cancel this request?"
                message={cancelling ? <>Your request for <strong>{cancelling.product_name}</strong> will be withdrawn. You can request it again later.</> : ''}
                confirmLabel="Cancel request"
                cancelLabel="Keep it"
                busy={busy}
                onConfirm={cancel}
                onCancel={() => setCancelling(null)}
            />
        </div>
    );
}
