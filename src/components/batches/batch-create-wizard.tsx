"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchService } from '@/services/api/batch.api';
import { courseService } from '@/services/api/course.api';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { BatchGroup, Capabilities, DirectoryRow } from '@/types/admin-insights';
import { useDebouncedValue } from '@/components/courses/structured-questions/useDebouncedValue';
import { Avatar, Breadcrumbs, Panel, StudentCode, btnPrimary, btnSecondary, inputCls, useAsync } from '@/components/admin/insights/ui';
import { BATCH_PRESETS, CAPABILITY_INFO, CapabilityEditor, DEFAULT_CAPS, GROUP_TEMPLATES, GroupsEditor, templateGroup } from './batch-config';

const STEPS = ['Basics', 'Capabilities', 'Groups', 'Courses & students', 'Review'] as const;
const TYPE_SUGGESTIONS = ['Classroom training', 'Online training', 'Self-paced learning', 'Assignment monitoring', 'Practice group', 'Mentorship group', 'Communication only', 'Course cohort'];

function newRequestId() {
    return (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
}

export function BatchCreateWizard() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [requestId] = useState(newRequestId);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [batchType, setBatchType] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<'active' | 'archived'>('active');
    const [caps, setCaps] = useState<Capabilities>(DEFAULT_CAPS);
    const [groups, setGroups] = useState<BatchGroup[]>([templateGroup('general')]);
    const [courseIds, setCourseIds] = useState<string[]>([]);
    const [students, setStudents] = useState<Map<string, DirectoryRow>>(new Map());

    const courses = useAsync(() => courseService.getAllCourses({}), 'wizard-courses');
    const [courseQ, setCourseQ] = useState('');
    const [studentQ, setStudentQ] = useState('');
    const dq = useDebouncedValue(studentQ.trim(), 300);
    const studentResults = useAsync(() => adminInsightsService.directory({ q: dq, limit: 15, sort: 'name', dir: 'asc' }), `wiz-students:${dq}`, step === 3);

    const setCapsSafe = (c: Capabilities) => {
        setCaps(c);
        // A Meeting Discussion group only exists with meetings.
        if (!c.meetings) setGroups(g => g.filter(x => !GROUP_TEMPLATES[x.template]?.needsMeetings));
        if (!c.courses) setCourseIds([]);
    };
    const applyPreset = (p: typeof BATCH_PRESETS[number]) => {
        const next = { ...DEFAULT_CAPS, ...p.caps };
        setCapsSafe(next);
        setGroups(p.groups.filter(k => !GROUP_TEMPLATES[k].needsMeetings || next.meetings).map(templateGroup));
        if (!batchType) setBatchType(p.label);
    };

    const errors = useMemo(() => {
        const e: string[] = [];
        if (!name.trim()) e.push('Enter a batch name.');
        if (!startDate) e.push('Choose a start date.');
        if (endDate && startDate && endDate < startDate) e.push('The end date is before the start date.');
        if (groups.some(g => !g.name.trim())) e.push('Every group needs a name.');
        return e;
    }, [name, startDate, endDate, groups]);
    const stepValid = step !== 0 || (name.trim() && startDate && !(endDate && endDate < startDate));

    const submit = async () => {
        if (errors.length) { toast.error(errors[0]); return; }
        setSubmitting(true);
        try {
            const batch: any = await batchService.create({
                client_request_id: requestId,
                name: name.trim(),
                description: description.trim(),
                batch_type: batchType.trim() || null,
                start_date: startDate,
                end_date: endDate || undefined,
                status,
                capabilities: caps,
                communication_groups: groups.map(({ key, template, name, description, audience, who_can_post }) => ({ key, template, name, description, audience, who_can_post })),
                course_ids: caps.courses ? courseIds : [],
                student_ids: Array.from(students.values()).map(s => s.id),
            });
            toast.success(`Batch “${batch.name}” created`);
            router.push(`/admin/batches/${batch.id}`);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The batch could not be created. You can safely try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const courseList = (courses.data ?? []).filter(c => c.id && (!courseQ || c.title.toLowerCase().includes(courseQ.toLowerCase())));
    const courseTitle = (id: string) => (courses.data ?? []).find(c => c.id === id)?.title ?? id;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Batches', href: '/admin/batches' }, { label: 'New batch' }]} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create a batch</h1>
            <p className="mt-0.5 mb-6 text-sm text-gray-500 dark:text-gray-400">A batch can be a training cohort, a practice or mentorship group, a communication-only group — or any mix. Choose only what it needs.</p>

            <ol className="mb-6 flex flex-wrap gap-2" aria-label="Steps">
                {STEPS.map((s, i) => (
                    <li key={s}>
                        <button type="button" onClick={() => (i <= step || stepValid) && setStep(i)} aria-current={i === step ? 'step' : undefined}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                            {i < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="tabular-nums">{i + 1}</span>} {s}
                        </button>
                    </li>
                ))}
            </ol>

            {step === 0 && (
                <Panel title="Basic information">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">Batch name *
                            <input className={`${inputCls} mt-1 w-full`} value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="e.g. Full-stack Cohort — Jan 2027" autoFocus />
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">Description
                            <textarea className={`${inputCls} mt-1 w-full`} rows={3} value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} />
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">Category / type
                            <input className={`${inputCls} mt-1 w-full`} value={batchType} maxLength={60} onChange={e => setBatchType(e.target.value)} list="batch-types" placeholder="Any label you like" />
                            <datalist id="batch-types">{TYPE_SUGGESTIONS.map(t => <option key={t} value={t} />)}</datalist>
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">Status
                            <select className={`${inputCls} mt-1 w-full`} value={status} onChange={e => setStatus(e.target.value as 'active' | 'archived')}>
                                <option value="active">Active</option>
                                <option value="archived">Archived</option>
                            </select>
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">Start date *
                            <input type="date" className={`${inputCls} mt-1 w-full`} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </label>
                        <label className="text-sm text-gray-700 dark:text-gray-300">End date (optional)
                            <input type="date" className={`${inputCls} mt-1 w-full`} value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
                        </label>
                    </div>
                </Panel>
            )}

            {step === 1 && (
                <Panel title="What will this batch be used for?" subtitle="Start from a preset or switch capabilities individually.">
                    <div className="mb-4 flex flex-wrap gap-2">
                        {BATCH_PRESETS.map(p => <button key={p.label} type="button" onClick={() => applyPreset(p)} className={btnSecondary}>{p.label}</button>)}
                    </div>
                    <CapabilityEditor value={caps} onChange={setCapsSafe} />
                    {!caps.meetings && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Meetings off: no meeting records, scheduling actions or meeting analytics for this batch, and students see no meetings from it.</p>}
                </Panel>
            )}

            {step === 2 && (
                <Panel title="Communication groups" subtitle="Each group becomes a chat channel for the batch. Pick any, none, or add your own.">
                    <GroupsEditor value={groups} onChange={setGroups} meetingsEnabled={caps.meetings} />
                </Panel>
            )}

            {step === 3 && (
                <div className="space-y-5">
                    <Panel title="Courses" subtitle={caps.courses ? 'Batch members get access to these courses.' : 'Courses are switched off for this batch.'}>
                        {!caps.courses ? <p className="text-sm text-gray-500">Turn on “Courses &amp; progress tracking” in Capabilities to assign courses.</p> : (
                            <>
                                <input type="search" className={`${inputCls} mb-2 w-full`} placeholder="Filter courses" value={courseQ} onChange={e => setCourseQ(e.target.value)} aria-label="Filter courses" />
                                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                                    {courses.loading ? <p className="p-3 text-sm text-gray-500">Loading courses…</p> : courseList.length === 0 ? <p className="p-3 text-sm text-gray-500">No courses.</p> : courseList.map(c => (
                                        <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={courseIds.includes(c.id!)} onChange={() => setCourseIds(ids => ids.includes(c.id!) ? ids.filter(x => x !== c.id) : [...ids, c.id!])} />
                                            <span className="flex-1 text-gray-800 dark:text-gray-200">{c.title}</span>
                                            {c.status !== 'active' && <span className="text-xs text-gray-400">{c.status}</span>}
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </Panel>
                    <Panel title="Students" subtitle="Optional — you can add students later from the batch's Students tab.">
                        <div className="relative mb-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                            <input type="search" className={`${inputCls} w-full pl-9`} placeholder="Search by name, email or Student ID" value={studentQ} onChange={e => setStudentQ(e.target.value)} aria-label="Search students" />
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                            {studentResults.loading && !studentResults.data ? <p className="p-3 text-sm text-gray-500">Searching…</p> : (studentResults.data?.rows ?? []).map(s => (
                                <label key={s.userId} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={students.has(s.userId)}
                                        onChange={() => setStudents(m => { const n = new Map(m); if (n.has(s.userId)) n.delete(s.userId); else n.set(s.userId, s); return n; })} />
                                    <Avatar name={s.name} url={s.avatarUrl} size={28} />
                                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-gray-900 dark:text-white">{s.name}</span><span className="block truncate text-xs text-gray-500">{s.email}</span></span>
                                    <StudentCode code={s.studentCode} />
                                </label>
                            ))}
                        </div>
                        {students.size > 0 && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{students.size} selected: {Array.from(students.values()).slice(0, 5).map(s => s.name).join(', ')}{students.size > 5 ? ` and ${students.size - 5} more` : ''}</p>}
                    </Panel>
                </div>
            )}

            {step === 4 && (
                <Panel title="Review" subtitle="Nothing is created until you confirm.">
                    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-[180px_1fr]">
                        <dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900 dark:text-white">{name || '—'}</dd>
                        <dt className="text-gray-500">Type</dt><dd>{batchType || '—'}</dd>
                        <dt className="text-gray-500">Dates</dt><dd>{startDate || '—'}{endDate ? ` → ${endDate}` : ' (no end date)'} · {status}</dd>
                        {description && <><dt className="text-gray-500">Description</dt><dd className="whitespace-pre-wrap">{description}</dd></>}
                        <dt className="text-gray-500">Capabilities</dt>
                        <dd className="flex flex-wrap gap-1.5">{CAPABILITY_INFO.map(c => <span key={c.key} className={`rounded-full px-2 py-0.5 text-xs ${caps[c.key] ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 line-through dark:bg-gray-800'}`}>{c.label}</span>)}</dd>
                        <dt className="text-gray-500">Meetings</dt><dd>{caps.meetings ? 'Enabled — schedule them from the batch’s Meetings tab after creating it.' : 'Disabled'}</dd>
                        <dt className="text-gray-500">Communication groups</dt>
                        <dd>{groups.length === 0 ? 'None' : <ul className="space-y-0.5">{groups.map(g => <li key={g.key}>{g.name} <span className="text-xs text-gray-500">· {g.audience === 'staff' ? 'admins only' : 'all members'} · {g.who_can_post === 'moderators' ? 'admins post' : 'everyone posts'}</span></li>)}</ul>}</dd>
                        <dt className="text-gray-500">Courses</dt><dd>{courseIds.length ? courseIds.map(courseTitle).join(', ') : 'None'}</dd>
                        <dt className="text-gray-500">Students</dt><dd>{students.size ? `${students.size}: ${Array.from(students.values()).map(s => s.name).join(', ')}` : 'None yet'}</dd>
                    </dl>
                    {errors.length > 0 && <ul role="alert" className="mt-4 list-disc pl-5 text-sm text-red-700 dark:text-red-300">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
                </Panel>
            )}

            <div className="mt-6 flex items-center justify-between">
                <button type="button" className={btnSecondary} onClick={() => (step === 0 ? router.push('/admin/batches') : setStep(s => s - 1))}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {step === 0 ? 'Cancel' : 'Back'}
                </button>
                {step < STEPS.length - 1 ? (
                    <button type="button" className={btnPrimary} disabled={!stepValid} onClick={() => setStep(s => s + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                ) : (
                    <button type="button" className={btnPrimary} disabled={submitting || errors.length > 0} onClick={submit}>{submitting ? 'Creating…' : 'Create batch'}</button>
                )}
            </div>
        </div>
    );
}
