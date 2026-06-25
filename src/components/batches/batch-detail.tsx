"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Users, Video, BarChart3, Plus, ChevronRight,
    Calendar, TrendingUp, BookOpen, CheckCircle, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { batchService, BatchStudentRow } from '@/services/api/batch.api';
import { meetingService } from '@/services/api/meeting.api';
import { Meeting, MeetingFeed } from '@/types/meeting';
import { MeetingCard } from '@/components/meetings/meeting-card';
import { MeetingForm } from '@/components/meetings/meeting-form';

type Tab = 'students' | 'meetings' | 'analytics';

export function BatchDetail({ batchId }: { batchId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as Tab) || 'students';
    const [tab, setTab] = useState<Tab>(
        ['students', 'meetings', 'analytics'].includes(initialTab) ? initialTab : 'students'
    );
    const [batch, setBatch] = useState<any>(null);
    const [students, setStudents] = useState<BatchStudentRow[]>([]);
    const [feed, setFeed] = useState<MeetingFeed>({ upcoming: [], past: [] });
    const [rawMeetings, setRawMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Meeting | null>(null);

    const loadMeetings = useCallback(async () => {
        const [f, raw] = await Promise.all([
            meetingService.getBatchMeetingFeed(batchId).catch(() => ({ upcoming: [], past: [] })),
            meetingService.getBatchMeetings(batchId).catch(() => []),
        ]);
        setFeed(f);
        setRawMeetings(raw);
    }, [batchId]);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const [b, s] = await Promise.all([
                batchService.getById(batchId).catch(() => null),
                batchService.getStudents(batchId).catch(() => []),
            ]);
            setBatch(b);
            setStudents(s);
            await loadMeetings();
        } catch (err) {
            console.error('Failed to load batch detail', err);
        } finally {
            setLoading(false);
        }
    }, [batchId, loadMeetings]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleEdit = (meetingId: string) => {
        const m = rawMeetings.find(r => r.id === meetingId) || null;
        setEditing(m);
        setShowForm(true);
    };

    const handleCancel = async (meetingId: string) => {
        if (!confirm('Cancel this meeting? Students will be notified.')) return;
        try {
            await meetingService.cancel(meetingId);
            toast.success('Meeting cancelled');
            loadMeetings();
        } catch { toast.error('Failed to cancel meeting'); }
    };

    const handleDelete = async (meetingId: string) => {
        if (!confirm('Delete this meeting permanently? Students will be notified.')) return;
        try {
            await meetingService.remove(meetingId);
            toast.success('Meeting deleted');
            loadMeetings();
        } catch { toast.error('Failed to delete meeting'); }
    };

    // Derived analytics (client-side, no extra endpoint).
    const avgProgress = students.length
        ? Math.round(students.reduce((s, x) => s + x.progress, 0) / students.length)
        : 0;
    const completed = students.filter(s => s.progress === 100).length;
    const active = students.filter(s => s.progress > 0 && s.progress < 100).length;
    const notStarted = students.filter(s => s.progress === 0).length;

    const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
        { id: 'students', label: 'Students', icon: Users, count: students.length },
        { id: 'meetings', label: 'Meetings', icon: Video, count: rawMeetings.length },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => router.push('/admin/batches')} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Batches
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{batch?.name || (loading ? 'Loading…' : 'Batch')}</h1>
                    {batch && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                            <span>{batch.batch_number}</span>
                            {batch.start_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(batch.start_date).toLocaleDateString()}</span>}
                        </p>
                    )}
                </div>
                {tab === 'meetings' && (
                    <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                        <Plus className="w-4 h-4" /> Schedule Meeting
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                        {t.count !== undefined && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{t.count}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <>
                    {/* STUDENTS */}
                    {tab === 'students' && (
                        students.length === 0 ? (
                            <EmptyState icon={<Users className="w-10 h-10" />} title="No students yet" subtitle="Assign students from Batch Management." />
                        ) : (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Courses</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
                                                <th className="px-4 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {students.map(s => (
                                                <tr key={s.id} onClick={() => router.push(`/admin/students/${s.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">{s.name.charAt(0).toUpperCase()}</div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{s.email}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{s.coursesAssigned}</td>
                                                    <td className="px-4 py-3 w-44">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden min-w-[60px]">
                                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${s.progress}%` }} />
                                                            </div>
                                                            <span className="text-xs text-gray-500 w-9 text-right">{s.progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-gray-300 inline" /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                    {/* MEETINGS */}
                    {tab === 'meetings' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Upcoming</h3>
                                {feed.upcoming.length === 0 ? (
                                    <EmptyState icon={<Video className="w-10 h-10" />} title="No upcoming meetings" subtitle="Schedule a one-time or recurring meeting for this batch." />
                                ) : (
                                    <div className="space-y-3">
                                        {feed.upcoming.map((m, i) => (
                                            <MeetingCard key={`${m.id}-${i}`} occ={m} variant="upcoming" showBatch={false}
                                                onEdit={handleEdit} onCancel={handleCancel} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {feed.past.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Past</h3>
                                    <div className="space-y-3">
                                        {feed.past.slice(0, 10).map((m, i) => (
                                            <MeetingCard key={`${m.id}-${i}`} occ={m} variant="past" showBatch={false} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANALYTICS */}
                    {tab === 'analytics' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <AnalyticCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Total Students" value={students.length} />
                                <AnalyticCard icon={<TrendingUp className="w-5 h-5 text-purple-500" />} label="Avg Progress" value={`${avgProgress}%`} />
                                <AnalyticCard icon={<Video className="w-5 h-5 text-indigo-500" />} label="Meetings" value={rawMeetings.length} />
                                <AnalyticCard icon={<CheckCircle className="w-5 h-5 text-green-500" />} label="Completed" value={completed} />
                            </div>

                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Progress Distribution</h3>
                                <div className="space-y-4">
                                    <DistRow label="Completed" value={completed} total={students.length} color="bg-green-500" icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
                                    <DistRow label="In Progress" value={active} total={students.length} color="bg-blue-500" icon={<Clock className="w-4 h-4 text-blue-500" />} />
                                    <DistRow label="Not Started" value={notStarted} total={students.length} color="bg-gray-400" icon={<BookOpen className="w-4 h-4 text-gray-400" />} />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Meeting Cadence</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {feed.upcoming.length} upcoming · {feed.past.length} held in the last 60 days ·{' '}
                                    {rawMeetings.filter(m => m.type === 'recurring').length} recurring series
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {showForm && (
                <MeetingForm batchId={batchId} existing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={loadMeetings} />
            )}
        </div>
    );
}

function AnalyticCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="mb-2">{icon}</div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
    );
}

function DistRow({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon: React.ReactNode }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">{icon}{label}</span>
                <span className="text-gray-500">{value} ({pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="text-gray-200 dark:text-gray-700 flex justify-center mb-3">{icon}</div>
            <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
}
