"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    Award, BookOpen, Brain, CheckCircle2, ChevronDown, ClipboardCheck, ExternalLink, Flame, Footprints, GraduationCap,
    Library, Loader2, Lock, Mountain, Plus, Puzzle, Star, Target, Trash2, Trophy, Zap,
    type LucideIcon,
} from 'lucide-react';
import { accountService, apiErrorMessage, profileService } from '@/services/api/account.api';
import { formatDate, formatDateTime } from '@/stores/preferences-store';
import type { AchievementView, CertificateView, GoalView, ProblemStats, ProfileCourse, ProfileFull, TimelineEvent } from '@/types/profile';

/* ───────────────────────── shared ───────────────────────── */

export function Card({ title, icon: Icon, action, children, className = '' }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 ${className}`}>
            <header className="flex items-center justify-between gap-3 mb-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                    {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    {title}
                </h2>
                {action}
            </header>
            {children}
        </section>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{children}</p>;
}

function Bar({ value, className = 'bg-blue-600' }: { value: number; className?: string }) {
    return (
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${className} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-4 rounded bg-gray-100 dark:bg-gray-800" style={{ width: `${90 - i * 15}%` }} />)}
        </div>
    );
}

/* ───────────────────────── stats ───────────────────────── */

export function StatsGrid({ stats }: { stats: NonNullable<ProfileFull['academic']>['stats'] }) {
    const items: Array<{ label: string; value: string | number | null; icon: LucideIcon; tint: string }> = [
        { label: 'Enrolled courses', value: stats.enrolled_courses, icon: BookOpen, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
        { label: 'Completed', value: stats.completed_courses, icon: CheckCircle2, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'In progress', value: stats.in_progress_courses, icon: Loader2, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
        { label: 'Overall progress', value: stats.overall_progress === null ? null : `${stats.overall_progress}%`, icon: Target, tint: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' },
        { label: 'Problems solved', value: stats.problems_solved, icon: Puzzle, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
        { label: 'Assessments', value: stats.assessments_completed, icon: ClipboardCheck, tint: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10' },
        { label: 'Certificates', value: stats.certificates, icon: Award, tint: 'text-pink-600 bg-pink-50 dark:bg-pink-500/10' },
        { label: 'Learning streak', value: stats.streak_current === null ? null : `${stats.streak_current} day${stats.streak_current === 1 ? '' : 's'}`, icon: Flame, tint: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10' },
        { label: 'Leaderboard rank', value: stats.rank === null ? null : `#${stats.rank}`, icon: Trophy, tint: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10' },
    ];
    const visible = items.filter((i) => i.value !== null && i.value !== undefined);
    if (!visible.length) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {visible.map(({ label, value, icon: Icon, tint }) => (
                <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <span className={`inline-flex w-9 h-9 rounded-xl items-center justify-center ${tint}`}><Icon className="w-5 h-5" /></span>
                    <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
            ))}
        </div>
    );
}

/* ───────────────────────── about / skills ───────────────────────── */

function Chips({ items, tone = 'gray' }: { items: string[]; tone?: 'gray' | 'blue' }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
                <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium ${tone === 'blue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{i}</span>
            ))}
        </div>
    );
}

export function AboutCard({ profile }: { profile: ProfileFull }) {
    const { about, user } = profile;
    const edu = about.education;
    const hasEdu = edu.institution || edu.degree || edu.field_of_study;
    const empty = !user.bio && !hasEdu && !about.career_goals && !about.career_interests.length && !about.learning_areas.length && !about.interests.length;
    return (
        <Card title="About" icon={Footprints}>
            {empty ? (
                <Empty>{profile.viewer.can_edit ? 'Tell classmates about yourself — add a bio, education and goals in Settings → Profile.' : 'Nothing shared yet.'}</Empty>
            ) : (
                <div className="space-y-5">
                    {user.bio && <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">{user.bio}</p>}
                    {hasEdu && (
                        <div className="flex gap-3">
                            <span className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-indigo-600" /></span>
                            <div className="text-sm">
                                <p className="font-semibold text-gray-900 dark:text-white">{edu.institution || 'Education'}</p>
                                <p className="text-gray-500 dark:text-gray-400">{[edu.degree, edu.field_of_study].filter(Boolean).join(' · ')}{edu.graduation_year ? ` · Class of ${edu.graduation_year}` : ''}</p>
                            </div>
                        </div>
                    )}
                    {about.career_goals && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Career goals</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{about.career_goals}</p>
                        </div>
                    )}
                    {about.career_interests.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Career interests</p><Chips items={about.career_interests} tone="blue" /></div>}
                    {about.learning_areas.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Learning focus</p><Chips items={about.learning_areas} /></div>}
                    {about.interests.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Interests</p><Chips items={about.interests} /></div>}
                </div>
            )}
        </Card>
    );
}

const LEVEL_DOTS: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

export function SkillsCard({ profile }: { profile: ProfileFull }) {
    const skills = profile.skills ?? [];
    return (
        <Card title="Skills" icon={Zap}>
            {skills.length === 0 ? (
                <Empty>{profile.viewer.can_edit ? 'Add the technologies you work with in Settings → Profile.' : 'No skills listed yet.'}</Empty>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((s) => (
                            <span key={s.name} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm ${s.primary ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                {s.primary && <Star className="w-3.5 h-3.5 fill-current" aria-label="Primary skill" />}
                                {s.name}
                                {s.level && (
                                    <span className="flex gap-0.5" title={s.level} aria-label={`Level: ${s.level}`}>
                                        {[1, 2, 3, 4].map((n) => <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= LEVEL_DOTS[s.level!] ? 'bg-current' : 'bg-gray-300 dark:bg-gray-600'}`} />)}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">Self-reported skills and levels.</p>
                </>
            )}
        </Card>
    );
}

/* ───────────────────────── learning overview ───────────────────────── */

function CourseRow({ course, profileId, canOpen }: { course: ProfileCourse; profileId: string; canOpen: boolean }) {
    const [open, setOpen] = useState(false);
    const [modules, setModules] = useState<Array<{ title: string; total: number; completed: number }> | null>(null);
    const [loading, setLoading] = useState(false);
    const structured = course.template !== 'problem-solving';

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && !modules && structured) {
            setLoading(true);
            try {
                setModules((await profileService.modules(profileId, course.id)).modules);
            } catch {
                setModules([]);
            } finally {
                setLoading(false);
            }
        }
    };

    const statusTone = course.status === 'completed' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : course.status === 'in-progress' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    return (
        <li className="py-3">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {course.thumbnail_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        : course.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {canOpen
                            ? <Link href={`/student/courses/${course.id}`} className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600">{course.title}</Link>
                            : <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{course.title}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 ${statusTone}`}>{course.status.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1"><Bar value={course.progress} className={course.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'} /></div>
                        <span className="text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300 w-10 text-right">{course.progress}%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{course.completed_units}/{course.total_units} {structured ? 'lessons' : 'problems'}</p>
                </div>
                {structured && course.total_units > 0 && (
                    <button onClick={toggle} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-expanded={open} aria-label="Show modules">
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
            {open && (
                <div className="mt-3 ml-[3.75rem] space-y-2">
                    {loading ? <Skeleton rows={2} /> : modules && modules.length ? modules.map((m) => (
                        <div key={m.title} className="text-xs">
                            <div className="flex justify-between text-gray-600 dark:text-gray-300 mb-1"><span className="truncate pr-2">{m.title}</span><span className="tabular-nums">{m.completed}/{m.total}</span></div>
                            <Bar value={m.total ? (m.completed / m.total) * 100 : 0} className="bg-indigo-500" />
                        </div>
                    )) : <p className="text-xs text-gray-400">No module breakdown for this course.</p>}
                </div>
            )}
        </li>
    );
}

export function LearningOverview({ profile }: { profile: ProfileFull }) {
    const courses = profile.academic?.courses ?? [];
    const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
    const shown = courses.filter((c) => filter === 'all' || c.status === filter);
    return (
        <Card
            title="Learning overview"
            icon={BookOpen}
            action={courses.length > 0 && (
                <div className="flex gap-1 text-xs">
                    {(['all', 'in-progress', 'completed'] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-full font-medium ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            {f === 'all' ? 'All' : f === 'in-progress' ? 'In progress' : 'Completed'}
                        </button>
                    ))}
                </div>
            )}
        >
            {courses.length === 0 ? <Empty>No courses yet.</Empty> : shown.length === 0 ? <Empty>No courses in this state.</Empty> : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 -my-3">
                    {shown.map((c) => <CourseRow key={c.id} course={c} profileId={profile.user.id} canOpen={profile.viewer.relation === 'self'} />)}
                </ul>
            )}
        </Card>
    );
}

/* ───────────────────────── problem solving (lazy) ───────────────────────── */

const DIFF_TONE: Record<string, string> = { easy: 'bg-emerald-500', medium: 'bg-amber-500', hard: 'bg-red-500' };

export function ProblemSolvingCard({ profileKey, isPublic }: { profileKey: string; isPublic: boolean }) {
    const [data, setData] = useState<ProblemStats | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let alive = true;
        profileService.problems(profileKey, isPublic).then((d) => alive && setData(d)).catch(() => alive && setError(true));
        return () => { alive = false; };
    }, [profileKey, isPublic]);

    if (error) return null;
    if (data && data.total_problems === 0 && data.total_solved === 0) return null; // no problem-solving courses
    return (
        <Card title="Problem solving" icon={Puzzle}>
            {!data ? <Skeleton rows={4} /> : (
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{data.total_solved}<span className="text-base font-semibold text-gray-400"> / {data.total_problems}</span></p>
                            <p className="text-xs text-gray-500">problems solved</p>
                        </div>
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <div key={d}>
                                <div className="flex justify-between text-xs mb-1"><span className="capitalize font-medium text-gray-700 dark:text-gray-300">{d}</span><span className="tabular-nums text-gray-500">{data.by_difficulty[d].solved}/{data.by_difficulty[d].total}</span></div>
                                <Bar value={data.by_difficulty[d].total ? (data.by_difficulty[d].solved / data.by_difficulty[d].total) * 100 : 0} className={DIFF_TONE[d]} />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {data.by_category.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">By topic</p>
                                <ul className="space-y-2">
                                    {data.by_category.slice(0, 6).map((c) => (
                                        <li key={`${c.course_title}-${c.category}`} className="text-xs">
                                            <div className="flex justify-between mb-1"><span className="truncate pr-2 text-gray-700 dark:text-gray-300">{c.category}</span><span className="tabular-nums text-gray-500">{c.solved}/{c.total}</span></div>
                                            <Bar value={c.total ? (c.solved / c.total) * 100 : 0} className="bg-violet-500" />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {data.recent.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recently solved</p>
                                <ul className="space-y-1.5">
                                    {data.recent.slice(0, 5).map((r, i) => (
                                        <li key={`${r.title}-${i}`} className="flex items-center gap-2 text-xs">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${DIFF_TONE[String(r.difficulty).toLowerCase()] ?? 'bg-gray-400'}`} />
                                            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{r.title}</span>
                                            <span className="text-gray-400 shrink-0">{formatDate(r.at)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

/* ───────────────────────── achievements / certificates ───────────────────────── */

const ACH_ICON: Record<AchievementView['icon'], LucideIcon> = {
    footprints: Footprints, 'graduation-cap': GraduationCap, library: Library, 'clipboard-check': ClipboardCheck,
    star: Star, puzzle: Puzzle, brain: Brain, mountain: Mountain, flame: Flame, zap: Zap, 'book-open': BookOpen,
};
const TIER: Record<AchievementView['tier'], string> = {
    bronze: 'from-amber-600 to-orange-700',
    silver: 'from-slate-400 to-slate-600',
    gold: 'from-yellow-400 to-amber-500',
};

export function AchievementsCard({ achievements }: { achievements: AchievementView[] }) {
    const earned = achievements.filter((a) => a.earned);
    return (
        <Card title="Achievements" icon={Award} action={<span className="text-xs text-gray-500">{earned.length} of {achievements.length} earned</span>}>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...earned, ...achievements.filter((a) => !a.earned)].map((a) => {
                    const Icon = ACH_ICON[a.icon] ?? Award;
                    return (
                        <li key={a.key} className={`rounded-2xl border p-4 text-center ${a.earned ? 'border-gray-200 dark:border-gray-800' : 'border-dashed border-gray-200 dark:border-gray-800 opacity-80'}`}>
                            <span className={`relative mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${a.earned ? TIER[a.tier] : 'from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600'}`}>
                                <Icon className="w-6 h-6" />
                                {!a.earned && <Lock className="absolute -bottom-1 -right-1 w-4 h-4 p-0.5 rounded-full bg-white dark:bg-gray-900 text-gray-500" />}
                            </span>
                            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{a.name}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 min-h-[2rem]">{a.description}</p>
                            {a.earned ? (
                                <p className="text-[11px] font-medium text-emerald-600 mt-1">Earned {a.earned_at ? formatDate(a.earned_at) : ''}</p>
                            ) : (
                                <div className="mt-2">
                                    <Bar value={(a.progress.current / a.progress.target) * 100} className="bg-gray-400" />
                                    <p className="text-[10px] text-gray-400 mt-1 tabular-nums">{a.progress.current}/{a.progress.target}</p>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

export function CertificatesCard({ certificates }: { certificates: CertificateView[] }) {
    return (
        <Card title="Certificates" icon={GraduationCap}>
            {certificates.length === 0 ? <Empty>No certificates issued yet. Certificates appear here when your institute issues one for a completed course.</Empty> : (
                <ul className="grid sm:grid-cols-2 gap-3">
                    {certificates.map((c) => (
                        <li key={c.id} className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-500/10 dark:to-gray-900 p-4">
                            <Award className="absolute -right-3 -top-3 w-20 h-20 text-amber-200/60 dark:text-amber-500/10" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">{c.title}</p>
                            <p className="mt-1 font-bold text-gray-900 dark:text-white">{c.course_title ?? 'Course'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Issued {formatDate(c.issued_at)}</p>
                            {c.certificate_url && (
                                <a href={c.certificate_url} target="_blank" rel="noopener noreferrer" className="relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                                    View certificate <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/* ───────────────────────── activity ───────────────────────── */

const LEVELS = ['bg-gray-100 dark:bg-gray-800', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-400 dark:bg-emerald-700', 'bg-emerald-500 dark:bg-emerald-500', 'bg-emerald-700 dark:bg-emerald-300'];
const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);

const EVENT_LABEL: Record<TimelineEvent['type'], { verb: string; icon: LucideIcon; tone: string }> = {
    lesson_completed: { verb: 'Completed lesson', icon: CheckCircle2, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
    problem_solved: { verb: 'Solved', icon: Puzzle, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
    assessment_submitted: { verb: 'Submitted', icon: ClipboardCheck, tone: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10' },
    question_completed: { verb: 'Completed', icon: CheckCircle2, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' },
    course_enrolled: { verb: 'Joined', icon: BookOpen, tone: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
    course_completed: { verb: 'Finished course', icon: GraduationCap, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    certificate_earned: { verb: 'Earned', icon: Award, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
};

export function ActivityCard({ profile, profileKey, isPublic }: { profile: ProfileFull; profileKey: string; isPublic: boolean }) {
    const activity = profile.academic!.activity!;
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await profileService.timeline(profileKey, p, isPublic);
            setEvents((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
            setTotal(res.total);
            setPage(p);
        } catch {
            /* timeline is optional */
        } finally {
            setLoading(false);
        }
    }, [profileKey, isPublic]);

    useEffect(() => { void load(1); }, [load]);

    // Columns of 7 days, starting on a Sunday, last 52 weeks.
    const weeks = useMemo(() => {
        const days = activity.calendar.slice(-364);
        const firstDow = new Date(days[0]?.date + 'T00:00:00Z').getUTCDay();
        const padded = [...Array(firstDow).fill(null), ...days];
        const cols: Array<Array<{ date: string; count: number } | null>> = [];
        for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
        return cols;
    }, [activity.calendar]);
    const activeDays = activity.calendar.filter((d) => d.count > 0).length;

    return (
        <Card title="Learning activity" icon={Flame} action={<span className="text-xs text-gray-500">{activeDays} active day{activeDays === 1 ? '' : 's'} this year</span>}>
            <div className="flex flex-wrap gap-6 mb-5">
                <div><p className="text-2xl font-black text-orange-500 tabular-nums">{activity.streak.current}</p><p className="text-xs text-gray-500">day streak{activity.streak.active_today ? ' · active today' : ''}</p></div>
                <div><p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{activity.streak.longest}</p><p className="text-xs text-gray-500">longest streak</p></div>
            </div>
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-[3px] w-max" role="img" aria-label={`Learning activity calendar, ${activeDays} active days in the last year`}>
                    {weeks.map((col, i) => (
                        <div key={i} className="flex flex-col gap-[3px]">
                            {col.map((d, j) => d
                                ? <span key={d.date} title={`${d.count} learning action${d.count === 1 ? '' : 's'} on ${formatDate(d.date + 'T12:00:00Z')}`} className={`w-[11px] h-[11px] rounded-[3px] ${LEVELS[level(d.count)]}`} />
                                : <span key={`pad-${j}`} className="w-[11px] h-[11px]" />)}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400 mt-1">
                Less {LEVELS.map((c, i) => <span key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`} />)} More
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Counts lessons, problems, questions and assessments completed (times in {activity.timezone}).</p>

            <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent activity</p>
                {events.length === 0 && !loading ? <Empty>No learning activity recorded yet.</Empty> : (
                    <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-3 space-y-4">
                        {events.map((e, i) => {
                            const meta = EVENT_LABEL[e.type];
                            const Icon = meta.icon;
                            const score = e.detail?.max_score ? ` · ${e.detail.score}/${e.detail.max_score}` : '';
                            return (
                                <li key={`${e.type}-${e.at}-${i}`} className="ml-5">
                                    <span className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-900 ${meta.tone}`}><Icon className="w-3.5 h-3.5" /></span>
                                    <p className="text-sm text-gray-800 dark:text-gray-200"><span className="text-gray-500">{meta.verb}</span> <span className="font-medium">{e.title}</span>{score}</p>
                                    <p className="text-[11px] text-gray-400">{[e.type !== 'course_enrolled' && e.type !== 'course_completed' ? e.course_title : null, formatDateTime(e.at)].filter(Boolean).join(' · ')}</p>
                                </li>
                            );
                        })}
                    </ol>
                )}
                {loading && <div className="mt-3"><Skeleton rows={2} /></div>}
                {!loading && events.length < total && (
                    <button onClick={() => void load(page + 1)} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">Show more</button>
                )}
            </div>
        </Card>
    );
}

/* ───────────────────────── leaderboard ───────────────────────── */

export function LeaderboardCard({ lb }: { lb: { rank: number; points: number; breakdown: Record<string, number> } }) {
    const parts = [
        { k: 'course_points', label: 'Courses' },
        { k: 'problem_points', label: 'Problem solving' },
        { k: 'completion_bonus', label: 'Completion bonus' },
        { k: 'assessment_points', label: 'Assessments' },
    ];
    return (
        <Card title="Leaderboard" icon={Trophy} action={<Link href="/leaderboard" className="text-xs font-semibold text-blue-600 hover:underline">View leaderboard</Link>}>
            <div className="flex items-end gap-6">
                <div><p className="text-3xl font-black text-gray-900 dark:text-white">#{lb.rank}</p><p className="text-xs text-gray-500">rank</p></div>
                <div><p className="text-3xl font-black text-blue-600 tabular-nums">{lb.points.toLocaleString()}</p><p className="text-xs text-gray-500">points</p></div>
            </div>
            <dl className="grid grid-cols-2 gap-2 mt-4">
                {parts.map((p) => (
                    <div key={p.k} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                        <dt className="text-[11px] text-gray-500">{p.label}</dt>
                        <dd className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{lb.breakdown?.[p.k] ?? 0}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

/* ───────────────────────── goals (owner only) ───────────────────────── */

const GOAL_TYPES: Array<{ type: GoalView['type']; label: string; needsTarget: boolean; unit: string }> = [
    { type: 'complete_lessons', label: 'Complete lessons', needsTarget: true, unit: 'lessons' },
    { type: 'solve_problems', label: 'Solve problems', needsTarget: true, unit: 'problems' },
    { type: 'complete_courses', label: 'Complete courses', needsTarget: true, unit: 'courses' },
    { type: 'finish_course', label: 'Finish a specific course', needsTarget: false, unit: '' },
    { type: 'assessment_average', label: 'Reach an assessment average', needsTarget: true, unit: '%' },
];

export function GoalsCard({ initial, courses }: { initial: GoalView[]; courses: Array<{ id: string; title: string; status: string }> }) {
    const [goals, setGoals] = useState(initial);
    const [adding, setAdding] = useState(false);
    const [type, setType] = useState<GoalView['type']>('complete_lessons');
    const [target, setTarget] = useState(5);
    const [courseId, setCourseId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [busy, setBusy] = useState(false);
    const meta = GOAL_TYPES.find((g) => g.type === type)!;

    const add = async () => {
        setBusy(true);
        try {
            const goal = await accountService.createGoal({
                type,
                target: meta.needsTarget ? target : undefined,
                course_id: type === 'finish_course' ? courseId : undefined,
                deadline: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
            });
            setGoals((g) => [goal, ...g]);
            setAdding(false);
            toast.success('Goal added');
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not add goal'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id: string) => {
        const prev = goals;
        setGoals((g) => g.filter((x) => x.id !== id));
        try {
            await accountService.removeGoal(id);
        } catch (err) {
            setGoals(prev);
            toast.error(apiErrorMessage(err, 'Could not remove goal'));
        }
    };

    return (
        <Card title="Learning goals" icon={Target} action={!adding && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><Plus className="w-3.5 h-3.5" /> Add goal</button>}>
            {adding && (
                <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-xs text-gray-500 space-y-1">Goal
                            <select value={type} onChange={(e) => setType(e.target.value as GoalView['type'])} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {GOAL_TYPES.map((g) => <option key={g.type} value={g.type}>{g.label}</option>)}
                            </select>
                        </label>
                        {type === 'finish_course' ? (
                            <label className="text-xs text-gray-500 space-y-1">Course
                                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    <option value="">Choose…</option>
                                    {courses.filter((c) => c.status !== 'completed').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </label>
                        ) : (
                            <label className="text-xs text-gray-500 space-y-1">Target ({meta.unit})
                                <input type="number" min={1} max={type === 'assessment_average' ? 100 : 1000} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                            </label>
                        )}
                        <label className="text-xs text-gray-500 space-y-1">Deadline (optional)
                            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                        </label>
                    </div>
                    <p className="text-[11px] text-gray-400">Progress counts only what you do from now on, from your real course activity.</p>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                        <button onClick={add} disabled={busy || (type === 'finish_course' && !courseId)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">
                            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add
                        </button>
                    </div>
                </div>
            )}
            {goals.length === 0 && !adding ? <Empty>Set a goal to keep yourself on track — e.g. “Solve 20 problems this month”.</Empty> : (
                <ul className="space-y-3">
                    {goals.map((g) => (
                        <li key={g.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{g.title}</p>
                                    <p className="text-[11px] text-gray-400">
                                        {g.status === 'completed' ? 'Completed 🎉' : g.status === 'missed' ? 'Deadline passed' : g.deadline ? `Due ${formatDate(g.deadline)}` : 'No deadline'}
                                    </p>
                                </div>
                                <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">{g.unit === 'percent' ? `${g.current}%` : `${g.current}/${g.target}`}</span>
                                <button onClick={() => void remove(g.id)} className="p-1 rounded text-gray-400 hover:text-red-600" aria-label={`Remove goal ${g.title}`}><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="mt-2"><Bar value={g.percent} className={g.status === 'completed' ? 'bg-emerald-500' : g.status === 'missed' ? 'bg-gray-400' : 'bg-blue-600'} /></div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

/* ───────────────────────── completion (owner only) ───────────────────────── */

export function CompletionCard({ completion }: { completion: NonNullable<ProfileFull['completion']> }) {
    if (completion.percent >= 100) return null;
    const r = 26;
    const c = 2 * Math.PI * r;
    return (
        <section className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" role="img" aria-label={`Profile ${completion.percent}% complete`}>
                <circle cx="32" cy="32" r={r} strokeWidth="7" className="fill-none stroke-blue-100 dark:stroke-blue-900" />
                <circle cx="32" cy="32" r={r} strokeWidth="7" strokeLinecap="round" className="fill-none stroke-blue-600" strokeDasharray={c} strokeDashoffset={c * (1 - completion.percent / 100)} transform="rotate(-90 32 32)" />
                <text x="32" y="37" textAnchor="middle" className="fill-gray-900 dark:fill-white text-[14px] font-bold">{completion.percent}%</text>
            </svg>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white">Complete your profile</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">A fuller profile helps classmates and mentors know you. Optional — fill in what you like:</p>
                <ul className="flex flex-wrap gap-2 mt-2">
                    {completion.missing.map((m) => (
                        <li key={m.key}><Link href="/settings?section=profile" className="inline-flex px-2.5 py-1 rounded-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/30 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50" title={m.hint}>+ {m.label}</Link></li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
