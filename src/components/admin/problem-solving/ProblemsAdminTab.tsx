"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage, apiFieldErrors } from '@/services/api/discount.api';
import { VIDEO_LANGUAGES, OTHER_LANGUAGE, UNSPECIFIED_LANGUAGE } from '@/lib/video-solutions';
import type { AdminProblemSection, ProblemStatement, VideoSolution } from '@/types/problem-course';
import { VideoSolutionsEditor, newVideoDraft, validateVideoDrafts, languageNameOf, type VideoDraft } from './VideoSolutionsEditor';

type AdminProblem = AdminProblemSection['problems'][number];
const EMPTY: ProblemStatement = { description: '', constraints: '', examples: [], solution_approach: '', time_complexity: '', space_complexity: '' };

const toDraft = (v: VideoSolution): VideoDraft => {
    const known = v.languageCode === UNSPECIFIED_LANGUAGE || VIDEO_LANGUAGES.some(l => l.code === v.languageCode);
    return newVideoDraft({
        id: v.id, title: v.title, language: known ? v.languageCode : OTHER_LANGUAGE, customName: known ? '' : v.languageName,
        url: v.url, description: v.description, isDefault: v.isDefault, status: v.status ?? 'published', videoType: v.videoType ?? 'solution',
    });
};

/** Edit one problem: statement fields and its full list of solution videos. */
function ProblemEditor({ courseId, problem, onClose, onSaved }: { courseId: string; problem: AdminProblem; onClose: () => void; onSaved: () => void }) {
    const [statement, setStatement] = useState<ProblemStatement | null>(null);
    const [videos, setVideos] = useState<VideoDraft[]>(() => problem.videoSolutions.map(toDraft));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        problemCourseService.getProblem(courseId, problem.id)
            .then(d => setStatement({ ...EMPTY, ...d.statement }))
            .catch(() => setStatement({ ...EMPTY }));
    }, [courseId, problem.id]);

    const setSt = (patch: Partial<ProblemStatement>) => { setStatement(s => ({ ...(s ?? EMPTY), ...patch })); setDirty(true); };
    const example = statement?.examples[0] ?? { input: '', output: '', explanation: '' };

    const save = async () => {
        const e = validateVideoDrafts(videos);
        setErrors(e);
        if (Object.keys(e).length) { toast.error('Fix the highlighted video fields.'); return; }
        setSaving(true);
        try {
            await problemCourseService.updateProblem(courseId, problem.id, {
                statement: statement ? { ...statement, examples: statement.examples.filter(x => x.input || x.output || x.explanation) } : undefined,
                videoSolutions: videos.map(v => ({
                    id: v.id,
                    title: v.title.trim(),
                    languageCode: v.language,
                    languageName: languageNameOf(v),
                    url: v.url.trim(),
                    description: v.description.trim(),
                    isDefault: v.isDefault,
                    status: v.status,
                    videoType: v.videoType,
                })),
            });
            toast.success('Problem saved');
            onSaved();
        } catch (err) {
            // Server field paths look like videoSolutions[1].url → map back to the row.
            const fields = apiFieldErrors(err);
            const mapped: Record<string, string> = {};
            for (const [path, msg] of Object.entries(fields)) {
                const m = /^videoSolutions\[(\d+)\]\.(\w+)$/.exec(path);
                if (m && videos[Number(m[1])]) mapped[`${videos[Number(m[1])].key}.${m[2] === 'is_default' ? 'isDefault' : m[2] === 'video_type' ? 'videoType' : m[2]}`] = msg;
            }
            setErrors(mapped);
            toast.error(apiErrorMessage(err, 'Could not save the problem.'));
        } finally {
            setSaving(false);
        }
    };

    const area = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 resize-y';
    const label = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';
    const close = () => { if (!dirty || window.confirm('Discard your unsaved changes?')) onClose(); };

    return (
        <Modal
            open
            onClose={saving ? () => undefined : close}
            closeOnBackdrop={false}
            size="2xl"
            title={problem.title}
            description="Problem statement and multilingual video solutions"
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={close} disabled={saving} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button type="button" onClick={save} disabled={saving || !statement} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save problem
                    </button>
                </div>
            }
        >
            {!statement ? (
                <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" />
            ) : (
                <div className="space-y-6">
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Statement</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Shown to students and used by the AI to assess their spoken explanations.</p>
                        <div>
                            <label htmlFor="pe-desc" className={label}>Description</label>
                            <textarea id="pe-desc" rows={4} value={statement.description} onChange={e => setSt({ description: e.target.value })} className={area} maxLength={20000} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div><label htmlFor="pe-in" className={label}>Example input</label><textarea id="pe-in" rows={2} value={example.input} onChange={e => setSt({ examples: [{ ...example, input: e.target.value }, ...statement.examples.slice(1)] })} className={`${area} font-mono`} /></div>
                            <div><label htmlFor="pe-out" className={label}>Example output</label><textarea id="pe-out" rows={2} value={example.output} onChange={e => setSt({ examples: [{ ...example, output: e.target.value }, ...statement.examples.slice(1)] })} className={`${area} font-mono`} /></div>
                            <div><label htmlFor="pe-exp" className={label}>Explanation</label><textarea id="pe-exp" rows={2} value={example.explanation} onChange={e => setSt({ examples: [{ ...example, explanation: e.target.value }, ...statement.examples.slice(1)] })} className={area} /></div>
                        </div>
                        <div>
                            <label htmlFor="pe-con" className={label}>Constraints</label>
                            <textarea id="pe-con" rows={2} value={statement.constraints} onChange={e => setSt({ constraints: e.target.value })} className={`${area} font-mono`} maxLength={5000} />
                        </div>
                        <div>
                            <label htmlFor="pe-app" className={label}>Solution approach <span className="font-normal text-gray-400">(reference for the AI; hidden from students until they reveal it)</span></label>
                            <textarea id="pe-app" rows={3} value={statement.solution_approach} onChange={e => setSt({ solution_approach: e.target.value })} className={area} maxLength={20000} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div><label htmlFor="pe-tc" className={label}>Time complexity</label><input id="pe-tc" value={statement.time_complexity} onChange={e => setSt({ time_complexity: e.target.value })} placeholder="O(n)" className={area} maxLength={200} /></div>
                            <div><label htmlFor="pe-sc" className={label}>Space complexity</label><input id="pe-sc" value={statement.space_complexity} onChange={e => setSt({ space_complexity: e.target.value })} placeholder="O(1)" className={area} maxLength={200} /></div>
                        </div>
                    </section>
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Video Solutions</h3>
                        <VideoSolutionsEditor rows={videos} onChange={r => { setVideos(r); setDirty(true); }} errors={errors} problemTitle={problem.title} />
                    </section>
                </div>
            )}
        </Modal>
    );
}

/** Admin list of every problem with its video solutions; opens the editor. */
export function ProblemsAdminTab({ courseId }: { courseId: string }) {
    const [sections, setSections] = useState<AdminProblemSection[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState<AdminProblem | null>(null);

    const load = useCallback(async () => {
        try {
            setSections(await problemCourseService.adminProblems(courseId));
            setError(null);
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load problems.'));
        }
    }, [courseId]);
    useEffect(() => { void load(); }, [load]);

    const shown = useMemo(() => {
        const t = q.trim().toLowerCase();
        return (sections ?? []).map(s => ({ ...s, problems: s.problems.filter(p => !t || p.title.toLowerCase().includes(t) || s.title.toLowerCase().includes(t)) })).filter(s => s.problems.length);
    }, [sections, q]);

    if (error) return <p role="alert" className="text-sm text-red-600">{error} <button onClick={() => void load()} className="underline">Retry</button></p>;
    if (!sections) return <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" aria-label="Loading" />;

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search problems or categories" aria-label="Search problems" className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {shown.length === 0 && <p className="text-sm text-gray-500">No problems match.</p>}
            {shown.map(s => (
                <section key={s.id} className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h4 className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100">{s.title} <span className="font-normal text-gray-400">· {s.problems.length}</span></h4>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {s.problems.map(p => (
                            <li key={p.id} className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{p.externalId && <span className="mr-1.5 font-mono text-xs text-gray-400">{p.externalId}</span>}{p.title}</span>
                                    {p.hasStatement && <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><FileText className="h-3.5 w-3.5" aria-hidden="true" />Statement</span>}
                                    <button type="button" onClick={() => setEditing(p)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        {p.videoSolutions.length ? <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                                        {p.videoSolutions.length ? 'Edit' : 'Add video'}
                                    </button>
                                </div>
                                {p.videoSolutions.length > 0 && (
                                    <div className="mt-2 overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="text-left text-gray-500 dark:text-gray-400"><tr><th className="py-1 pr-3 font-semibold">Video</th><th className="py-1 pr-3 font-semibold">Language</th><th className="py-1 pr-3 font-semibold">Default</th><th className="py-1 font-semibold">Status</th></tr></thead>
                                            <tbody className="text-gray-700 dark:text-gray-300">
                                                {p.videoSolutions.map(v => (
                                                    <tr key={v.id}>
                                                        <td className="max-w-[240px] truncate py-1 pr-3">{v.title}</td>
                                                        <td className="py-1 pr-3">{v.languageName}</td>
                                                        <td className="py-1 pr-3">{v.isDefault ? 'Yes' : 'No'}</td>
                                                        <td className="py-1"><span className={`rounded-full px-2 py-0.5 font-semibold ${v.status === 'draft' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>{v.status === 'draft' ? 'Draft' : 'Published'}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {!p.videoSolutions.length && p.legacyVideoUrl && <p className="mt-1 text-xs text-gray-500">Sheet video link (shown until you add videos here): <a href={p.legacyVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{p.legacyVideoUrl.slice(0, 60)}</a></p>}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {editing && <ProblemEditor courseId={courseId} problem={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
        </div>
    );
}

