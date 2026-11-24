"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, CheckCircle2, Crown, Loader2, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { enrollmentAdminApi, apiErrorMessage, apiErrorDetails } from '@/services/api/enrollment-management.api';
import type { GrantCatalog, GrantProblem, ResourceType, StudentAccessProfile, StudentSearchResult } from '@/types/enrollment';
import { defaultDraft, draftToDuration, fmtDate, accessEndLabel, type DurationDraft } from '@/lib/access-window';
import {
    DurationPicker, EnrollmentStatusBadge, ErrorBox, LoadingRows, RESOURCE_LABEL, ResourceIcon,
    cardCls, inputCls, labelCls, primaryBtn, secondaryBtn,
} from './shared';

const STEPS = ['Student', 'Access type', 'Select', 'Duration', 'Details', 'Confirm'] as const;
const rupees = (n: number) => (n > 0 ? `₹${n.toLocaleString('en-IN')}` : 'Free');

export function GrantAccessWizard({ initialStudentId, onGranted }: { initialStudentId?: string | null; onGranted?: () => void }) {
    const [step, setStep] = useState(0);
    const [student, setStudent] = useState<StudentSearchResult | null>(null);
    const [profile, setProfile] = useState<StudentAccessProfile | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [type, setType] = useState<ResourceType | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [draft, setDraft] = useState<DurationDraft>(defaultDraft('LIFETIME'));
    const [source, setSource] = useState<'ADMIN_GRANT' | 'PROMOTIONAL'>('ADMIN_GRANT');
    const [notes, setNotes] = useState({ adminNotes: '', reason: '', internalReference: '' });
    const [catalog, setCatalog] = useState<GrantCatalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [problems, setProblems] = useState<GrantProblem[]>([]);
    const [done, setDone] = useState<{ count: number; name: string } | null>(null);

    // Catalog once.
    const loadCatalog = () => {
        setCatalogError(null);
        enrollmentAdminApi.catalog().then(setCatalog).catch(e => setCatalogError(apiErrorMessage(e, 'Could not load courses and bundles')));
    };
    useEffect(loadCatalog, []);

    // Deep link: ?student=<userId>.
    useEffect(() => {
        if (!initialStudentId) return;
        enrollmentAdminApi.studentAccess(initialStudentId)
            .then(p => {
                setStudent({ id: p.student.userId, name: p.student.name, email: p.student.email, phone: p.student.phone, student_code: p.student.studentCode, created_at: null });
                setProfile(p);
                setStep(1);
            })
            .catch(() => undefined);
    }, [initialStudentId]);

    const pickStudent = async (s: StudentSearchResult) => {
        setStudent(s);
        setProfile(null);
        setProfileError(null);
        try {
            setProfile(await enrollmentAdminApi.studentAccess(s.id));
        } catch (e) {
            setProfileError(apiErrorMessage(e, 'Could not load this student’s access'));
        }
    };

    const reset = () => {
        setStep(0); setStudent(null); setProfile(null); setType(null); setSelected([]); setDraft(defaultDraft('LIFETIME'));
        setSource('ADMIN_GRANT'); setNotes({ adminNotes: '', reason: '', internalReference: '' }); setProblems([]); setDone(null);
    };

    const duration = draftToDuration(draft);
    const selectedNames = useMemo(() => {
        if (!catalog || !type) return [];
        if (type === 'ALL_IN_ONE') return [catalog.master.name];
        const list = type === 'COURSE' ? catalog.courses.map(c => ({ id: c.id, name: c.title })) : catalog.bundles.map(b => ({ id: b.id, name: b.name }));
        return selected.map(id => list.find(x => x.id === id)?.name || id);
    }, [catalog, type, selected]);

    const canNext = [
        !!student && !!profile,
        !!type,
        type === 'ALL_IN_ONE' ? !profile?.access.fullAccess || !!profile?.access.fullAccessExpiresAt : selected.length > 0,
        !duration.error,
        true,
        true,
    ][step];

    const submit = async () => {
        if (!student || !type || duration.error || !duration.duration) return;
        setSubmitting(true);
        setProblems([]);
        try {
            const res = await enrollmentAdminApi.grant({
                studentId: student.id,
                resourceType: type,
                resourceIds: type === 'ALL_IN_ONE' ? undefined : selected,
                accessSource: source,
                duration: duration.duration,
                adminNotes: notes.adminNotes.trim() || undefined,
                reason: notes.reason.trim() || undefined,
                internalReference: notes.internalReference.trim() || undefined,
            });
            toast.success(`Access granted to ${student.name}`);
            setDone({ count: res.enrollments.length, name: selectedNames.join(', ') });
            onGranted?.();
        } catch (e) {
            const details = apiErrorDetails<GrantProblem[]>(e);
            if (Array.isArray(details)) setProblems(details);
            toast.error(apiErrorMessage(e, 'Could not grant access'));
        } finally {
            setSubmitting(false);
        }
    };

    if (done && student) {
        return (
            <div className={`${cardCls} p-8 text-center max-w-xl mx-auto`}>
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Access granted</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    {student.name} now has access to <strong>{done.name}</strong> {duration.expiresAt ? `until ${fmtDate(duration.expiresAt)}` : 'for life'}
                    {draft.startDate ? `, starting ${fmtDate(duration.startsAt)}` : ''}. They’ve been notified, and their dashboard updates without signing in again.
                </p>
                <div className="flex justify-center gap-3 mt-6">
                    <button type="button" className={secondaryBtn} onClick={() => { const s = student; reset(); pickStudent(s); setStep(1); }}>Grant more to {student.name.split(' ')[0]}</button>
                    <button type="button" className={primaryBtn} onClick={reset}>Grant to another student</button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
            {/* Stepper */}
            <ol className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible" aria-label="Grant access steps">
                {STEPS.map((label, i) => {
                    const state = i < step ? 'done' : i === step ? 'current' : 'todo';
                    return (
                        <li key={label}>
                            <button
                                type="button"
                                disabled={i > step}
                                onClick={() => setStep(i)}
                                aria-current={state === 'current' ? 'step' : undefined}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${state === 'current' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold' : state === 'done' ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800' : 'text-gray-400 dark:text-gray-600'}`}
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${state === 'done' ? 'bg-emerald-500 text-white' : state === 'current' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    {state === 'done' ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </span>
                                {label}
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div className={`${cardCls} p-5 sm:p-6 min-w-0`}>
                {step === 0 && <StudentStep student={student} profile={profile} profileError={profileError} onPick={pickStudent} onClear={() => { setStudent(null); setProfile(null); }} />}

                {step === 1 && (
                    <section aria-labelledby="type-h">
                        <h3 id="type-h" className="font-bold text-gray-900 dark:text-white mb-4">What should {student?.name.split(' ')[0]} get?</h3>
                        <div role="radiogroup" className="grid sm:grid-cols-3 gap-3">
                            {(['COURSE', 'BUNDLE', 'ALL_IN_ONE'] as ResourceType[]).map(t => {
                                const on = type === t;
                                const hint = t === 'COURSE' ? 'One or more individual courses' : t === 'BUNDLE' ? 'Every course in a bundle' : 'Every active course';
                                return (
                                    <button key={t} type="button" role="radio" aria-checked={on}
                                        onClick={() => { if (type !== t) setSelected([]); setType(t); }}
                                        className={`text-left p-4 rounded-xl border-2 transition-colors ${on ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                        <ResourceIcon type={t} className={`w-6 h-6 mb-2 ${on ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <p className="font-semibold text-gray-900 dark:text-white">{t === 'COURSE' ? 'Individual course' : t === 'BUNDLE' ? 'Course bundle' : 'Master Subscription'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {step === 2 && type && (
                    catalogError ? <ErrorBox message={catalogError} onRetry={loadCatalog} />
                        : !catalog ? <LoadingRows />
                            : <SelectStep type={type} catalog={catalog} profile={profile} selected={selected} onChange={setSelected} />
                )}

                {step === 3 && (
                    <section aria-labelledby="dur-h" className="space-y-5">
                        <div>
                            <h3 id="dur-h" className="font-bold text-gray-900 dark:text-white mb-3">Access duration</h3>
                            <DurationPicker value={draft} onChange={setDraft} />
                        </div>
                        <fieldset>
                            <legend className={labelCls}>Access source</legend>
                            <div className="flex gap-2">
                                {([['ADMIN_GRANT', 'Admin grant'], ['PROMOTIONAL', 'Promotional']] as const).map(([v, l]) => (
                                    <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${source === v ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                        <input type="radio" name="source" value={v} checked={source === v} onChange={() => setSource(v)} className="sr-only" />
                                        {l}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">Granted access is free: no payment is created and Razorpay is never involved.</p>
                        </fieldset>
                    </section>
                )}

                {step === 4 && (
                    <section aria-labelledby="det-h" className="space-y-4">
                        <h3 id="det-h" className="font-bold text-gray-900 dark:text-white">Additional information <span className="text-sm font-normal text-gray-400">(optional, internal)</span></h3>
                        <label className="block">
                            <span className={labelCls}>Reason for granting access</span>
                            <input className={inputCls} maxLength={1000} value={notes.reason} onChange={e => setNotes({ ...notes, reason: e.target.value })} placeholder="e.g. Scholarship, paid offline, partner programme" />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Admin notes</span>
                            <textarea className={`${inputCls} resize-none`} rows={3} maxLength={1000} value={notes.adminNotes} onChange={e => setNotes({ ...notes, adminNotes: e.target.value })} placeholder="Visible to admins only" />
                        </label>
                        <label className="block">
                            <span className={labelCls}>Internal reference</span>
                            <input className={inputCls} maxLength={200} value={notes.internalReference} onChange={e => setNotes({ ...notes, internalReference: e.target.value })} placeholder="Receipt no., ticket, invoice…" />
                        </label>
                        <p className="text-xs text-gray-500">Students never see these fields.</p>
                    </section>
                )}

                {step === 5 && student && type && (
                    <section aria-labelledby="conf-h">
                        <h3 id="conf-h" className="font-bold text-gray-900 dark:text-white mb-4">Confirm grant</h3>
                        <dl className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                            {[
                                ['Student', `${student.name} · ${student.email}${student.student_code ? ` · ${student.student_code}` : ''}`],
                                ['Access type', RESOURCE_LABEL[type]],
                                [type === 'ALL_IN_ONE' ? 'Subscription' : type === 'BUNDLE' ? 'Bundles' : 'Courses', selectedNames.join(', ')],
                                ['Start date', draft.startDate ? fmtDate(duration.startsAt) : 'Immediately'],
                                ['Expiry date', duration.expiresAt ? fmtDate(duration.expiresAt) : 'Lifetime — never expires'],
                                ['Source', source === 'PROMOTIONAL' ? 'Promotional' : 'Admin grant'],
                                ['Granted by', 'You'],
                                ...(notes.reason.trim() ? [['Reason', notes.reason.trim()]] : []),
                            ].map(([k, v]) => (
                                <div key={k} className="flex gap-4 px-4 py-2.5">
                                    <dt className="w-32 shrink-0 text-gray-500 dark:text-gray-400">{k}</dt>
                                    <dd className="font-medium text-gray-900 dark:text-white min-w-0 break-words">{v}</dd>
                                </div>
                            ))}
                        </dl>
                        {problems.length > 0 && (
                            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40" role="alert">
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Nothing was granted:</p>
                                <ul className="text-sm text-red-700 dark:text-red-300 list-disc pl-5 space-y-0.5">
                                    {problems.map(p => <li key={p.resourceId}>{p.message}</li>)}
                                </ul>
                            </div>
                        )}
                    </section>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                    <button type="button" className={secondaryBtn} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || submitting}>Back</button>
                    {step < STEPS.length - 1 ? (
                        <button type="button" className={primaryBtn} onClick={() => setStep(s => s + 1)} disabled={!canNext}>Continue</button>
                    ) : (
                        <button type="button" className={primaryBtn} onClick={submit} disabled={submitting}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Grant Access
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────────── Step 1: student ───────────────────────────── */

function StudentStep({ student, profile, profileError, onPick, onClear }: {
    student: StudentSearchResult | null;
    profile: StudentAccessProfile | null;
    profileError: string | null;
    onPick: (s: StudentSearchResult) => void;
    onClear: () => void;
}) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<StudentSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const seq = useRef(0);

    useEffect(() => {
        if (student) return;
        const mine = ++seq.current;
        const t = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const rows = await enrollmentAdminApi.searchStudents(q.trim());
                if (mine === seq.current) setResults(rows);
            } catch (e) {
                if (mine === seq.current) setError(apiErrorMessage(e, 'Search failed'));
            } finally {
                if (mine === seq.current) setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [q, student]);

    if (student) {
        const live = profile?.enrollments.filter(e => e.effective_status === 'ACTIVE' || e.effective_status === 'PENDING') ?? [];
        return (
            <section aria-labelledby="stu-h">
                <h3 id="stu-h" className="font-bold text-gray-900 dark:text-white mb-4">Selected student</h3>
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">{student.name.charAt(0).toUpperCase()}</div>
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{student.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}{student.phone ? ` · ${student.phone}` : ''}</p>
                            {student.student_code && <p className="text-xs font-mono text-gray-500 mt-0.5">{student.student_code}</p>}
                        </div>
                    </div>
                    <button type="button" onClick={onClear} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Choose a different student"><X className="w-4 h-4" /></button>
                </div>

                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-6 mb-2">Current access</h4>
                {profileError ? <ErrorBox message={profileError} /> : !profile ? <LoadingRows rows={2} /> : (
                    <div className="space-y-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                            {profile.access.fullAccess && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                    <Crown className="w-3.5 h-3.5" /> Master Subscription · {accessEndLabel(profile.access.fullAccessExpiresAt)}
                                </span>
                            )}
                            {profile.access.bundles.map(b => (
                                <span key={b.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                                    <ResourceIcon type="BUNDLE" className="w-3.5 h-3.5" /> {b.name} · {accessEndLabel(b.expiresAt)}
                                </span>
                            ))}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                                {profile.access.courses.length} course{profile.access.courses.length === 1 ? '' : 's'} accessible
                            </span>
                        </div>
                        {live.length > 0 && (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl">
                                {live.map(e => (
                                    <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                        <span className="inline-flex items-center gap-2 min-w-0 truncate"><ResourceIcon type={e.resource_type} className="w-4 h-4 text-gray-400" /> {e.resource_name}</span>
                                        <span className="flex items-center gap-2 shrink-0 text-xs text-gray-500">{accessEndLabel(e.expires_at)} <EnrollmentStatusBadge status={e.effective_status} /></span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {!profile.access.fullAccess && !profile.access.bundles.length && !profile.access.courses.length && (
                            <p className="text-gray-500 dark:text-gray-400">No course access yet.</p>
                        )}
                    </div>
                )}
            </section>
        );
    }

    return (
        <section aria-labelledby="find-h">
            <h3 id="find-h" className="font-bold text-gray-900 dark:text-white mb-3">Find a student</h3>
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                    autoFocus
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Name, email, phone or Student ID"
                    aria-label="Search students"
                    className={`${inputCls} pl-9`}
                />
            </div>
            <div className="mt-3">
                {error ? <ErrorBox message={error} /> : loading && !results.length ? <LoadingRows rows={3} /> : results.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">{q.trim() ? 'No students match that search.' : 'No students yet.'}</p>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl max-h-96 overflow-y-auto">
                        {results.map(s => (
                            <li key={s.id}>
                                <button type="button" onClick={() => onPick(s)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                    <UserRound className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</span>
                                        <span className="block text-xs text-gray-500 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ''}</span>
                                    </span>
                                    {s.student_code && <span className="text-xs font-mono text-gray-500 shrink-0">{s.student_code}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

/* ───────────────────────────── Step 3: selection ───────────────────────────── */

function SelectStep({ type, catalog, profile, selected, onChange }: {
    type: ResourceType;
    catalog: GrantCatalog;
    profile: StudentAccessProfile | null;
    selected: string[];
    onChange: (ids: string[]) => void;
}) {
    const [q, setQ] = useState('');
    const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    const courseAccess = new Map((profile?.access.courses ?? []).map(c => [c.id, c]));
    const bundleAccess = new Map((profile?.access.bundles ?? []).map(b => [b.id, b]));
    const term = q.trim().toLowerCase();

    if (type === 'ALL_IN_ONE') {
        const m = catalog.master;
        const holds = profile?.access.fullAccess;
        return (
            <section aria-labelledby="mast-h">
                <h3 id="mast-h" className="font-bold text-gray-900 dark:text-white mb-4">Master Subscription</h3>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold"><Crown className="w-5 h-5" /> {m.name}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">List price {rupees(m.price)} · granting it is free.</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                        {m.benefits.map(b => <li key={b} className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{b}</li>)}
                    </ul>
                </div>
                {holds && (
                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                        {profile?.access.fullAccessExpiresAt
                            ? `Already subscribed until ${fmtDate(profile.access.fullAccessExpiresAt)} — a longer grant is allowed, or extend the existing enrollment.`
                            : 'Already has a permanent Master Subscription — nothing to grant.'}
                    </p>
                )}
            </section>
        );
    }

    if (type === 'COURSE') {
        const rows = catalog.courses.filter(c => !term || c.title.toLowerCase().includes(term) || (c.category || '').toLowerCase().includes(term));
        return (
            <section aria-labelledby="crs-h">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 id="crs-h" className="font-bold text-gray-900 dark:text-white">Select courses <span className="text-sm font-normal text-gray-400">({selected.length} selected)</span></h3>
                    <div className="relative sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses" aria-label="Search courses" className={`${inputCls} pl-9`} />
                    </div>
                </div>
                {rows.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center">No active courses match.</p> : (
                    <ul className="grid sm:grid-cols-2 gap-2 max-h-[28rem] overflow-y-auto pr-1">
                        {rows.map(c => {
                            const has = courseAccess.get(c.id);
                            const permanent = !!has && !has.expiresAt;
                            const on = selected.includes(c.id);
                            return (
                                <li key={c.id}>
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${permanent ? 'opacity-60 cursor-not-allowed' : ''} ${on ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                        <input type="checkbox" className="mt-1 accent-blue-600" checked={on} disabled={permanent} onChange={() => toggle(c.id)} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                                            <span className="block text-xs text-gray-500 mt-0.5">{(c.category || 'Uncategorised').replace(/_/g, ' ')} · {rupees(c.price)} · {c.status}</span>
                                            {has && <span className="block text-xs text-amber-700 dark:text-amber-400 mt-1">Has access {has.expiresAt ? `until ${fmtDate(has.expiresAt)}` : 'permanently'} ({has.via.join(', ').replace('full_access', 'Master Subscription')})</span>}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        );
    }

    const rows = catalog.bundles.filter(b => !term || b.name.toLowerCase().includes(term));
    return (
        <section aria-labelledby="bnd-h">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h3 id="bnd-h" className="font-bold text-gray-900 dark:text-white">Select bundles <span className="text-sm font-normal text-gray-400">({selected.length} selected)</span></h3>
                <div className="relative sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search bundles" aria-label="Search bundles" className={`${inputCls} pl-9`} />
                </div>
            </div>
            {rows.length === 0 ? <p className="text-sm text-gray-500 py-6 text-center">No bundles match.</p> : (
                <ul className="grid sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                    {rows.map(b => {
                        const inactive = b.status !== 'active' || b.courses.length === 0;
                        const has = bundleAccess.get(b.id);
                        const blocked = inactive || (!!has && !has.expiresAt);
                        const on = selected.includes(b.id);
                        return (
                            <li key={b.id}>
                                <label className={`block p-4 rounded-xl border h-full transition-colors ${blocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${on ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                    <span className="flex items-start gap-3">
                                        <input type="checkbox" className="mt-1 accent-blue-600" checked={on} disabled={blocked} onChange={() => toggle(b.id)} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</span>
                                                <span className="text-xs text-gray-500 shrink-0">{rupees(b.price)}</span>
                                            </span>
                                            <span className="block text-xs text-gray-500 mt-1">
                                                {inactive ? (b.status !== 'active' ? 'Inactive — cannot be granted' : 'No active courses') : `${b.courses.length} course${b.courses.length === 1 ? '' : 's'}: ${b.courses.map(c => c.title).join(', ')}`}
                                            </span>
                                            {has && <span className="block text-xs text-amber-700 dark:text-amber-400 mt-1">Has this bundle {has.expiresAt ? `until ${fmtDate(has.expiresAt)}` : 'permanently'}</span>}
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
