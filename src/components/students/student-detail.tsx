"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Mail, Phone, Calendar, BookOpen, Layers, CheckCircle,
    TrendingUp, Clock, User as UserIcon, GraduationCap, Video,
} from 'lucide-react';
import { studentService } from '@/services/api/student.api';
import { meetingService } from '@/services/api/meeting.api';
import { StudentDetails } from '@/types/student';
import { MeetingFeed } from '@/types/meeting';
import { MeetingCard } from '@/components/meetings/meeting-card';

export function StudentDetail({ studentId }: { studentId: string }) {
    const router = useRouter();
    const [details, setDetails] = useState<StudentDetails | null>(null);
    const [meetings, setMeetings] = useState<MeetingFeed>({ upcoming: [], past: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoading(true);
                const [d, m] = await Promise.all([
                    studentService.getDetails(studentId),
                    meetingService.getStudentMeetings(studentId).catch(() => ({ upcoming: [], past: [] })),
                ]);
                if (!active) return;
                setDetails(d);
                setMeetings(m);
            } catch (err) {
                console.error('Failed to load student details', err);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [studentId]);

    if (loading) return <DetailSkeleton onBack={() => router.push('/admin/students')} />;

    if (!details) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400">Student not found.</p>
                <button onClick={() => router.push('/admin/students')} className="mt-4 text-blue-600 hover:underline text-sm">Back to students</button>
            </div>
        );
    }

    const { personalInfo, courses, batches, stats } = details;
    const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString() : '—';

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <button
                onClick={() => router.push('/admin/students')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-5 h-5" /> Back to Students
            </button>

            {/* Header card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                        {personalInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{personalInfo.name}</h1>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{personalInfo.email}</span>
                            {personalInfo.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{personalInfo.phone}</span>}
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Joined {fmt(personalInfo.registrationDate)}</span>
                            <span className="flex items-center gap-1.5 capitalize"><UserIcon className="w-4 h-4" />{personalInfo.studentType}</span>
                        </div>
                    </div>
                </div>

                {/* Stat strip */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Stat icon={<BookOpen className="w-4 h-4 text-blue-500" />} label="Courses" value={stats.enrolledCourses} />
                    <Stat icon={<CheckCircle className="w-4 h-4 text-green-500" />} label="Completed" value={stats.completedCourses} />
                    <Stat icon={<TrendingUp className="w-4 h-4 text-purple-500" />} label="Avg Progress" value={`${stats.averageProgress}%`} />
                </div>
            </div>

            {/* Courses */}
            <Section title="Purchased Courses" icon={<GraduationCap className="w-4 h-4" />} count={courses.length}>
                {courses.length === 0 ? (
                    <Empty text="No courses purchased yet." />
                ) : (
                    <div className="space-y-3">
                        {courses.map((c) => (
                            <div key={c.courseId} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                                    {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{c.courseName}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[200px]">
                                            <div className={`h-full rounded-full ${c.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${c.progress}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{c.completedLessons}/{c.totalLessons} lessons</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.progress}%</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                                        <Clock className="w-3 h-3" /> {c.lastViewed ? fmt(c.lastViewed) : 'Not started'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* Batches */}
            <Section title="Batch Membership" icon={<Layers className="w-4 h-4" />} count={batches.length}>
                {batches.length === 0 ? (
                    <Empty text="Not a member of any batch." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {batches.map((b) => (
                            <button
                                key={b.batchId}
                                onClick={() => router.push(`/admin/batches/${b.batchId}`)}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left"
                            >
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{b.batchName}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Joined {fmt(b.joinDate)}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    b.status === 'active' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                }`}>{b.status}</span>
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            {/* Meeting history */}
            <Section title="Upcoming Meetings" icon={<Video className="w-4 h-4" />} count={meetings.upcoming.length}>
                {meetings.upcoming.length === 0 ? (
                    <Empty text="No upcoming meetings." />
                ) : (
                    <div className="space-y-3">
                        {meetings.upcoming.slice(0, 6).map((m, i) => <MeetingCard key={`${m.id}-${i}`} occ={m} variant="upcoming" />)}
                    </div>
                )}
            </Section>

            {meetings.past.length > 0 && (
                <Section title="Past Meetings" icon={<Clock className="w-4 h-4" />} count={meetings.past.length}>
                    <div className="space-y-3">
                        {meetings.past.slice(0, 5).map((m, i) => <MeetingCard key={`${m.id}-${i}`} occ={m} variant="past" />)}
                    </div>
                </Section>
            )}
        </div>
    );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">{icon}{label}</div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400">{icon}</span>
                <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
                {count !== undefined && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>}
            </div>
            {children}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="p-6 text-center text-sm text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">{text}</div>;
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400"><ArrowLeft className="w-5 h-5" /> Back</button>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 space-y-3 pt-2">
                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-72" />
                    </div>
                </div>
            </div>
            {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-40" />
                    <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800" />
                </div>
            ))}
        </div>
    );
}
