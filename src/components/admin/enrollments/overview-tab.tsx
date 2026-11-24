"use client";

import { useCallback, useEffect, useState } from 'react';
import { CalendarX2, Clock, Crown, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { enrollmentAdminApi, apiErrorMessage } from '@/services/api/enrollment-management.api';
import type { EnrollmentOverview } from '@/types/enrollment';
import { fmtDate } from '@/lib/access-window';
import { EmptyBox, EnrollmentStatusBadge, ErrorBox, LoadingRows, RESOURCE_LABEL, ResourceIcon, StudentCell, cardCls, th } from './shared';
import { EnrollmentDetailModal } from './enrollments-tab';

export function OverviewTab({ refreshKey, onGoto, onChanged }: { refreshKey: number; onGoto: (tab: 'grant' | 'requests' | 'enrollments') => void; onChanged: () => void }) {
    const [data, setData] = useState<EnrollmentOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setData(await enrollmentAdminApi.overview());
        } catch (e) {
            setError(apiErrorMessage(e, 'Could not load the overview'));
        }
    }, []);
    useEffect(() => { load(); }, [load, refreshKey]);

    if (error) return <ErrorBox message={error} onRetry={load} />;
    if (!data) return <LoadingRows rows={4} />;

    const c = data.cards;
    const cards = [
        { label: 'Total active enrollments', value: c.totalActiveEnrollments, icon: ShieldCheck, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', hint: `${c.activeBreakdown.managed} managed · ${c.activeBreakdown.paidOrders} paid orders · ${c.activeBreakdown.legacyApprovals} earlier approvals` },
        { label: 'Manually granted (active)', value: c.manuallyGranted, icon: Gift, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', hint: 'Admin grants and promotional access' },
        { label: 'Pending access requests', value: c.pendingRequests, icon: Clock, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', onClick: () => onGoto('requests'), hint: c.pendingRequests ? 'Review now →' : 'All caught up' },
        { label: 'Active Master Subscriptions', value: c.activeMasterSubscriptions, icon: Crown, tone: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', hint: 'Students with All-In-One access' },
        { label: 'Expired enrollments', value: c.expiredEnrollments, icon: CalendarX2, tone: 'text-gray-600 bg-gray-100 dark:bg-gray-800', hint: 'Time-limited access that ended' },
        { label: 'Granted in the last 7 days', value: c.recentlyGranted, icon: Sparkles, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', hint: 'New managed enrollments' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {cards.map(card => {
                    const body = (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.label}</p>
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.tone}`}><card.icon className="w-5 h-5" aria-hidden="true" /></span>
                            </div>
                            <p className="text-3xl font-black tabular-nums text-gray-900 dark:text-white mt-2">{card.value.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.hint}</p>
                        </>
                    );
                    return card.onClick ? (
                        <button key={card.label} type="button" onClick={card.onClick} className={`${cardCls} p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors`}>{body}</button>
                    ) : (
                        <div key={card.label} className={`${cardCls} p-5`}>{body}</div>
                    );
                })}
            </div>

            <section className={`${cardCls} overflow-hidden`} aria-labelledby="recent-h">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 id="recent-h" className="font-bold text-gray-900 dark:text-white">Recent activity</h3>
                    <button type="button" onClick={() => onGoto('enrollments')} className="text-sm text-blue-600 hover:underline">View all</button>
                </div>
                {data.recent.length === 0 ? (
                    <div className="p-5"><EmptyBox title="No enrollments yet" action={<button type="button" onClick={() => onGoto('grant')} className="text-sm text-blue-600 hover:underline">Grant access to a student</button>} /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>{['Student', 'Access type', 'Course / bundle', 'Granted by', 'Grant date', 'Expiry', 'Status'].map(h => th(h))}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data.recent.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer" onClick={() => setOpenId(e.id)}>
                                        <td className="px-4 py-3 max-w-[16rem]"><StudentCell name={e.student_name} email={e.student_email} /></td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300"><span className="inline-flex items-center gap-1.5"><ResourceIcon type={e.resource_type} className="w-4 h-4 text-gray-400" /> {RESOURCE_LABEL[e.resource_type]}</span></td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                                            <button type="button" className="text-left hover:underline" onClick={ev => { ev.stopPropagation(); setOpenId(e.id); }}>{e.resource_name}</button>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{e.granted_by_name || '—'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDate(e.created_at)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{e.expires_at ? fmtDate(e.expires_at) : 'Lifetime'}</td>
                                        <td className="px-4 py-3"><EnrollmentStatusBadge status={e.effective_status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {openId && <EnrollmentDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged(); }} />}
        </div>
    );
}
