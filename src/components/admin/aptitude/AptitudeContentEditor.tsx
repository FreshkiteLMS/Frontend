"use client";

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Copy as CopyIcon, EyeOff, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { aptitudeService } from '@/services/api/aptitude.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { AdminAptitudeConcept, AdminAptitudeContent, AdminAptitudeQuestion, AptitudeDifficulty, QuestionCheck, QuestionInput } from '@/types/aptitude';
import { DifficultyTag, RichQuestionText } from '@/components/courses/aptitude/aptitude-ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
const small = 'inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-white';

/** Indicator per issue code (from extraction and from server checks). */
export const ISSUE_LABEL: Record<string, string> = {
    missing_answer: 'Missing answer',
    missing_options: 'Missing options',
    duplicate: 'Duplicate question',
    ambiguous_answer: 'Ambiguous answer',
    answer_unverified: 'Answer not confirmed',
    answer_not_option: 'Answer not an option',
    wording_mismatch: 'Wording differs from document',
    option_mismatch: 'Options differ from document',
    explanation_mismatch: 'Explanation differs',
    too_many_options: 'Options trimmed',
    truncated: 'Text shortened',
    ai_note: 'AI note',
    needs_review: 'Needs review',
};

const CHECK: Record<QuestionCheck, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    valid: { label: 'Valid', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', Icon: CheckCircle2 },
    needs_review: { label: 'Needs review', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', Icon: AlertTriangle },
    invalid: { label: 'Invalid', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', Icon: XCircle },
};

export function CheckBadge({ status }: { status: QuestionCheck }) {
    const c = CHECK[status];
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}><c.Icon className="h-3 w-3" aria-hidden="true" />{c.label}</span>;
}

type Filter = 'all' | QuestionCheck;

const move = <T,>(list: T[], i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
};

type Confirm = { title: string; message: string; label: string; run: () => Promise<unknown> };

/**
 * Admin verification editor: every concept and question with answers, a
 * validity indicator per question, and every edit persisted immediately.
 */
export function AptitudeContentEditor({ courseId, content, onChange }: { courseId: string; content: AdminAptitudeContent; onChange: () => void }) {
    const [openConcepts, setOpenConcepts] = useState<Set<string>>(() => new Set(content.concepts.slice(0, 1).map(c => c.id)));
    const [openQ, setOpenQ] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ conceptId: string; question: AdminAptitudeQuestion | null } | null>(null);
    const [conceptForm, setConceptForm] = useState<{ id: string | null; title: string; description: string } | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [busy, setBusy] = useState(false);

    const run = async (fn: () => Promise<unknown>, ok?: string) => {
        setBusy(true);
        try {
            await fn();
            if (ok) toast.success(ok);
            onChange();
            return true;
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The change could not be saved.'));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const all = content.concepts.flatMap(c => c.questions);
    const counts = { all: all.length, valid: all.filter(q => q.status === 'valid').length, needs_review: all.filter(q => q.status === 'needs_review').length, invalid: all.filter(q => q.status === 'invalid').length };
    // Numbering across the course, as students see concept by concept.
    const numberOf = useMemo(() => new Map(content.concepts.flatMap(c => c.questions).map((q, i) => [q.id, i + 1])), [content.concepts]);
    const toggleConcept = (id: string) => setOpenConcepts(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

    const saveConcept = () => conceptForm && run(async () => {
        if (conceptForm.id) await aptitudeService.updateConcept(courseId, conceptForm.id, { title: conceptForm.title, description: conceptForm.description });
        else {
            const c = await aptitudeService.createConcept(courseId, { title: conceptForm.title, description: conceptForm.description });
            setOpenConcepts(s => new Set(s).add(c.id));
        }
        setConceptForm(null);
    }, conceptForm.id ? 'Concept updated' : 'Concept added');

    const askDeleteConcept = (c: AdminAptitudeConcept) => {
        const used = c.questions.some(q => q.attempts > 0);
        setConfirm({
            title: used ? `Archive “${c.title}”?` : `Delete “${c.title}”?`,
            message: used
                ? 'Students have answered questions in this concept. It will be hidden from students and their history kept.'
                : `This deletes the concept and its ${c.questionCount} question${c.questionCount === 1 ? '' : 's'}. This cannot be undone.`,
            label: used ? 'Archive' : 'Delete',
            run: async () => { const r = await aptitudeService.deleteConcept(courseId, c.id); toast.success(r.archived ? 'Concept archived' : 'Concept deleted'); },
        });
    };
    const askDeleteQuestion = (q: AdminAptitudeQuestion) => setConfirm({
        title: q.attempts > 0 ? 'Hide this question?' : 'Delete this question?',
        message: q.attempts > 0 ? 'Students have answered this question. It will be hidden from students and their attempts kept.' : 'This cannot be undone.',
        label: q.attempts > 0 ? 'Hide' : 'Delete',
        run: async () => { const r = await aptitudeService.deleteQuestion(courseId, q.id); toast.success(r.deactivated ? 'Question hidden' : 'Question deleted'); },
    });
    const approve = (q: AdminAptitudeQuestion) => run(() => aptitudeService.updateQuestion(courseId, q.id, { markReviewed: true }), 'Marked as reviewed');

    return (
        <section aria-labelledby="apt-content-h" className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center dark:border-gray-700">
                <div className="min-w-0 flex-1">
                    <h3 id="apt-content-h" className="font-semibold text-gray-900 dark:text-white">Concepts & questions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Every change is saved immediately. Students only see visible questions with a correct answer.</p>
                </div>
                <button type="button" onClick={() => setConceptForm({ id: null, title: '', description: '' })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add concept
                </button>
            </div>

            {all.length > 0 && (
                <div role="radiogroup" aria-label="Show questions" className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
                    {([['all', 'All'], ['valid', 'Valid'], ['needs_review', 'Needs review'], ['invalid', 'Invalid']] as const).map(([id, label]) => (
                        <button key={id} type="button" role="radio" aria-checked={filter === id} onClick={() => { setFilter(id); if (id !== 'all') setOpenConcepts(new Set(content.concepts.map(c => c.id))); }}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
                            {label} <span className="tabular-nums opacity-75">{counts[id]}</span>
                        </button>
                    ))}
                </div>
            )}

            {content.concepts.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-500">No concepts yet. Process your document above, or add a concept and write questions by hand.</p>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {content.concepts.map((c, ci) => {
                        const qs = filter === 'all' ? c.questions : c.questions.filter(q => q.status === filter);
                        if (filter !== 'all' && !qs.length) return null;
                        const flagged = c.questions.filter(q => q.status !== 'valid').length;
                        const open = openConcepts.has(c.id);
                        return (
                            <li key={c.id} className={c.isActive ? '' : 'bg-gray-50 dark:bg-gray-900/40'}>
                                <div className="flex items-center gap-1 px-4 py-3">
                                    <button type="button" onClick={() => toggleConcept(c.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
                                        <span className="text-xs font-semibold text-gray-400">Concept {ci + 1}</span>
                                        <span className="truncate font-medium text-gray-900 dark:text-white">{c.title}</span>
                                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-gray-700 dark:text-gray-200">{c.questionCount}</span>
                                        {flagged > 0 && <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300">{flagged} to check</span>}
                                        {!c.isActive && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">Archived</span>}
                                    </button>
                                    <button type="button" className={small} onClick={() => run(() => aptitudeService.reorderConcepts(courseId, move(content.concepts, ci, -1).map(x => x.id)))} disabled={busy || ci === 0} aria-label={`Move ${c.title} up`}><ArrowUp className="h-4 w-4" /></button>
                                    <button type="button" className={small} onClick={() => run(() => aptitudeService.reorderConcepts(courseId, move(content.concepts, ci, 1).map(x => x.id)))} disabled={busy || ci === content.concepts.length - 1} aria-label={`Move ${c.title} down`}><ArrowDown className="h-4 w-4" /></button>
                                    <button type="button" className={small} onClick={() => setConceptForm({ id: c.id, title: c.title, description: c.description })} disabled={busy} aria-label={`Rename ${c.title}`}><Pencil className="h-4 w-4" /></button>
                                    {!c.isActive && <button type="button" className={`${small} text-xs font-semibold`} onClick={() => run(() => aptitudeService.updateConcept(courseId, c.id, { isActive: true }), 'Concept restored')} disabled={busy}>Restore</button>}
                                    <button type="button" className={`${small} hover:text-red-600`} onClick={() => askDeleteConcept(c)} disabled={busy} aria-label={`Delete ${c.title}`}><Trash2 className="h-4 w-4" /></button>
                                </div>
                                {open && (
                                    <div className="px-4 pb-4">
                                        {c.description && <p className="mb-2 pl-6 text-xs text-gray-500">{c.description}</p>}
                                        <ol className="space-y-2 sm:pl-6">
                                            {qs.map(q => {
                                                const qi = c.questions.findIndex(x => x.id === q.id);
                                                const expanded = openQ === q.id;
                                                const ring = q.status === 'invalid' ? 'border-red-300 dark:border-red-900' : q.status === 'needs_review' ? 'border-amber-300 dark:border-amber-800' : 'border-gray-200 dark:border-gray-700';
                                                return (
                                                    <li key={q.id} className={`rounded-lg border ${ring} ${q.isActive ? '' : 'bg-gray-50/70 dark:bg-gray-900/30'}`}>
                                                        <div className="flex items-start gap-3 p-3">
                                                            <span className="mt-0.5 w-8 shrink-0 text-xs font-semibold tabular-nums text-gray-400">Q{numberOf.get(q.id)}</span>
                                                            <button type="button" onClick={() => setOpenQ(expanded ? null : q.id)} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
                                                                <span className={`block whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 ${expanded ? '' : 'line-clamp-2'}`}>{q.questionText}</span>
                                                                <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                                                    <CheckBadge status={q.status} />
                                                                    {q.issues.filter(i => i !== 'needs_review').map(i => <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-300">{ISSUE_LABEL[i] ?? i}</span>)}
                                                                    <span>answer <b className={q.correctOption ? 'text-green-700 dark:text-green-400' : 'text-red-600'}>{q.correctOption ?? 'none'}</b></span>
                                                                    <DifficultyTag value={q.difficulty} />
                                                                    {!q.isActive && <span className="inline-flex items-center gap-0.5 rounded bg-gray-200 px-1.5 text-gray-700 dark:bg-gray-700 dark:text-gray-300"><EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden from students</span>}
                                                                    {q.attempts > 0 && <span>{q.attempts} answers by {q.students} {q.students === 1 ? 'student' : 'students'}</span>}
                                                                </span>
                                                            </button>
                                                            <div className="flex shrink-0 items-center">
                                                                {q.needsReview && q.status !== 'invalid' && (
                                                                    <button type="button" className={`${small} text-green-700 hover:text-green-800 dark:text-green-400`} disabled={busy} onClick={() => approve(q)} aria-label="Mark as reviewed" title="Looks right — mark as reviewed"><CheckCircle2 className="h-4 w-4" /></button>
                                                                )}
                                                                {filter === 'all' && <>
                                                                    <button type="button" className={small} disabled={busy || qi === 0} onClick={() => run(() => aptitudeService.reorderQuestions(courseId, c.id, move(c.questions, qi, -1).map(x => x.id)))} aria-label="Move question up"><ArrowUp className="h-4 w-4" /></button>
                                                                    <button type="button" className={small} disabled={busy || qi === c.questions.length - 1} onClick={() => run(() => aptitudeService.reorderQuestions(courseId, c.id, move(c.questions, qi, 1).map(x => x.id)))} aria-label="Move question down"><ArrowDown className="h-4 w-4" /></button>
                                                                </>}
                                                                <button type="button" className={small} disabled={busy} onClick={() => setEditing({ conceptId: c.id, question: q })} aria-label="Edit question"><Pencil className="h-4 w-4" /></button>
                                                                <button type="button" className={`${small} hover:text-red-600`} disabled={busy} onClick={() => askDeleteQuestion(q)} aria-label="Delete question"><Trash2 className="h-4 w-4" /></button>
                                                            </div>
                                                        </div>
                                                        {expanded && <QuestionDetails q={q} />}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                        {filter === 'all' && (
                                            <button type="button" onClick={() => setEditing({ conceptId: c.id, question: null })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:ml-6 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/40">
                                                <Plus className="h-4 w-4" aria-hidden="true" /> Add question
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {conceptForm && (
                <Modal open onClose={() => setConceptForm(null)} title={conceptForm.id ? 'Edit concept' : 'Add concept'} size="lg"
                    footer={<div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setConceptForm(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-200">Cancel</button>
                        <button type="button" onClick={saveConcept} disabled={busy || !conceptForm.title.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                    </div>}>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Concept name
                            <input className={`${input} mt-1`} value={conceptForm.title} maxLength={200} onChange={e => setConceptForm({ ...conceptForm, title: e.target.value })} placeholder="e.g. Time and Distance" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description <span className="font-normal text-gray-400">(optional)</span>
                            <textarea className={`${input} mt-1`} rows={3} maxLength={2000} value={conceptForm.description} onChange={e => setConceptForm({ ...conceptForm, description: e.target.value })} />
                        </label>
                    </div>
                </Modal>
            )}

            {editing && (
                <QuestionEditor
                    courseId={courseId}
                    concepts={content.concepts}
                    conceptId={editing.conceptId}
                    question={editing.question}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onChange(); }}
                />
            )}

            <ConfirmDialog
                open={!!confirm}
                title={confirm?.title ?? ''}
                message={confirm?.message ?? ''}
                confirmLabel={confirm?.label}
                tone="danger"
                busy={busy}
                onCancel={() => setConfirm(null)}
                onConfirm={async () => { if (!confirm) return; const c = confirm; if (await run(c.run)) setConfirm(null); }}
            />
        </section>
    );
}

function QuestionDetails({ q }: { q: AdminAptitudeQuestion }) {
    return (
        <div className="space-y-3 border-t border-gray-100 px-3 pb-3 pt-3 text-sm sm:pl-14 dark:border-gray-700">
            <RichQuestionText text={q.questionText} className="text-gray-900 dark:text-gray-100" />
            {q.options.length ? (
                <ul className="grid gap-1 sm:grid-cols-2">
                    {q.options.map(o => (
                        <li key={o.id} className={`rounded px-2 py-1 ${o.id === q.correctOption ? 'bg-green-50 font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {o.id}. {o.text}{o.id === q.correctOption ? ' ✓' : ''}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-red-600">No options.</p>}
            <p className="text-gray-600 dark:text-gray-400"><b className="text-gray-700 dark:text-gray-300">Explanation:</b> {q.explanation || <span className="italic">none</span>}</p>
            {q.reviewReasons.length > 0 && (
                <ul className="space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
                    {q.reviewReasons.map((r, i) => <li key={i} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{r}</li>)}
                </ul>
            )}
            {q.issues.includes('duplicate') && <p className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300"><CopyIcon className="h-3 w-3" aria-hidden="true" />Another question in this concept has the same wording — delete one, or edit it.</p>}
        </div>
    );
}

function QuestionEditor({ courseId, concepts, conceptId, question, onClose, onSaved }: {
    courseId: string;
    concepts: AdminAptitudeConcept[];
    conceptId: string;
    question: AdminAptitudeQuestion | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [text, setText] = useState(question?.questionText ?? '');
    const [options, setOptions] = useState<string[]>(question?.options.map(o => o.text) ?? ['', '', '', '']);
    const [correct, setCorrect] = useState<number | null>(question?.correctOption ? LETTERS.indexOf(question.correctOption) : null);
    const [explanation, setExplanation] = useState(question?.explanation ?? '');
    const [difficulty, setDifficulty] = useState<AptitudeDifficulty | ''>(question?.difficulty ?? '');
    const [active, setActive] = useState(question ? question.isActive : true);
    const [target, setTarget] = useState(conceptId);
    const [saving, setSaving] = useState(false);

    const problems = useMemo(() => {
        const p: string[] = [];
        if (!text.trim()) p.push('Write the question.');
        const filled = options.map(o => o.trim());
        if (filled.length < 2) p.push('Add at least two options.');
        if (filled.some(o => !o)) p.push('Fill in or remove empty options.');
        if (new Set(filled.map(o => o.toLowerCase())).size !== filled.length) p.push('Two options are the same.');
        if (active && correct === null) p.push('Choose the correct answer, or hide the question from students.');
        return p;
    }, [text, options, correct, active]);

    const save = async () => {
        if (problems.length) return;
        setSaving(true);
        const body: QuestionInput = {
            questionText: text, options: options.map(o => o.trim()), correctOption: correct === null ? null : LETTERS[correct],
            explanation, difficulty: difficulty || null, isActive: active, ...(question && target !== conceptId ? { conceptId: target } : {}),
        };
        try {
            if (question) await aptitudeService.updateQuestion(courseId, question.id, body);
            else await aptitudeService.createQuestion(courseId, conceptId, body);
            toast.success(question ? 'Question saved' : 'Question added');
            onSaved();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The question could not be saved.'));
        } finally {
            setSaving(false);
        }
    };

    const removeOption = (i: number) => {
        setOptions(o => o.filter((_, j) => j !== i));
        setCorrect(c => (c === null ? null : c === i ? null : c > i ? c - 1 : c));
    };

    return (
        <Modal open onClose={onClose} title={question ? 'Edit question' : 'Add question'} size="2xl" closeOnBackdrop={false}
            footer={<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-amber-700 dark:text-amber-300">{problems[0] ?? ''}</p>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-200">Cancel</button>
                    <button type="button" onClick={save} disabled={saving || problems.length > 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save question'}</button>
                </div>
            </div>}>
            <div className="space-y-4">
                {question?.needsReview && question.reviewReasons.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                        <p className="mb-1 font-semibold">Flagged during import — check against the document:</p>
                        <ul className="list-inside list-disc">{question.reviewReasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                        <p className="mt-1">Saving marks the question as reviewed.</p>
                    </div>
                )}
                {question && question.attempts > 0 && (
                    <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                        {question.students} {question.students === 1 ? 'student has' : 'students have'} answered this question. Changing the options or answer only affects new answers — earlier results stay as they were marked.
                    </p>
                )}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question
                    <textarea className={`${input} mt-1 font-normal`} rows={4} maxLength={10000} value={text} onChange={e => setText(e.target.value)} />
                </label>
                <fieldset>
                    <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Options <span className="font-normal text-gray-400">— select the correct one</span></legend>
                    <div className="mt-1 space-y-2">
                        {options.map((o, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} aria-label={`Option ${LETTERS[i]} is correct`} className="h-4 w-4" />
                                <span className="w-5 text-sm font-semibold text-gray-500">{LETTERS[i]}</span>
                                <input className={input} value={o} maxLength={2000} onChange={e => setOptions(list => list.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Option ${LETTERS[i]}`} />
                                <button type="button" className={small} onClick={() => removeOption(i)} disabled={options.length <= 2} aria-label={`Remove option ${LETTERS[i]}`}><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                    {options.length < 8 && (
                        <button type="button" onClick={() => setOptions(o => [...o, ''])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"><Plus className="h-4 w-4" aria-hidden="true" /> Add option</button>
                    )}
                </fieldset>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Explanation <span className="font-normal text-gray-400">(shown after answering)</span>
                    <textarea className={`${input} mt-1 font-normal`} rows={3} maxLength={10000} value={explanation} onChange={e => setExplanation(e.target.value)} />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty
                        <select className={`${input} mt-1`} value={difficulty} onChange={e => setDifficulty(e.target.value as AptitudeDifficulty | '')}>
                            <option value="">Not set</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                        </select>
                    </label>
                    {question && (
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Concept
                            <select className={`${input} mt-1`} value={target} onChange={e => setTarget(e.target.value)}>
                                {concepts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Visible to students
                    </label>
                </div>
            </div>
        </Modal>
    );
}
