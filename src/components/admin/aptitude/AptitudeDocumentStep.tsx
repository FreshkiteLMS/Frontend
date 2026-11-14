"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Circle, FileText, Link2, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { aptitudeService } from '@/services/api/aptitude.api';
import { apiErrorCode, apiErrorMessage } from '@/services/api/structured-course.api';
import type { AdminAptitudeContent, AptitudeImportRun, AptitudeVerification } from '@/types/aptitude';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Async, useAsync } from '@/components/admin/insights/ui';
import { SampleDocumentGuide } from './SampleDocumentGuide';
import { AptitudeContentEditor, CheckBadge } from './AptitudeContentEditor';

const POLL_MS = 2500;
const GOOGLE_DOC_RE = /^https:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{10,})/;

/** Client-side shape check (the server re-checks and also opens the document). */
export function checkDocLink(raw: string): string | null {
    const v = raw.trim();
    if (!v) return 'Paste the Google Docs link of your aptitude document.';
    if (!/^https?:\/\//i.test(v)) return 'The link must start with https://';
    if (!/docs\.google\.com\/document\//i.test(v)) return 'This is not a Google Docs link. It should look like https://docs.google.com/document/d/…/edit. For a .docx or PDF, open it in Google Drive and use File › Save as Google Docs.';
    if (!GOOGLE_DOC_RE.test(v)) return 'The link is missing the document ID. Copy it again from the browser’s address bar or the Share dialog.';
    return null;
}

type LinkState =
    | { kind: 'idle' }
    | { kind: 'validating' }
    | { kind: 'valid'; title: string; url: string }
    | { kind: 'error'; message: string; code?: string };

const STAGES: { id: string; label: string }[] = [
    { id: 'validating', label: 'Checking the link' },
    { id: 'fetching_document', label: 'Reading the Google Doc' },
    { id: 'processing', label: 'Extracting concepts and questions (AI)' },
    { id: 'validating_output', label: 'Checking answers against the document' },
];

function SharingHelp() {
    return (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
            <li>Open the document in Google Docs and click <b>Share</b>.</li>
            <li>Under <b>General access</b>, choose <b>Anyone with the link</b> with the role <b>Viewer</b>.</li>
            <li>Come back and click <b>Validate link</b> again.</li>
        </ol>
    );
}

/**
 * Wizard step 3 for aptitude courses: prepare the document, process it, and
 * verify the extracted questions — all before the final preview.
 * Everything shown is read from the server, so leaving and coming back (or
 * refreshing) restores it without reprocessing.
 */
export function AptitudeDocumentStep({ courseId, docLink, onDocLinkChange, onVerification }: {
    courseId: string;
    docLink: string;
    onDocLinkChange: (url: string) => void;
    onVerification: (v: AptitudeVerification | null) => void;
}) {
    const content = useAsync(() => aptitudeService.content(courseId), `apt-step:${courseId}`);
    const [run, setRun] = useState<AptitudeImportRun | null>(null);
    const [runLoaded, setRunLoaded] = useState(false);
    const [link, setLink] = useState<LinkState>({ kind: 'idle' });
    const [starting, setStarting] = useState(false);
    const [draftAction, setDraftAction] = useState<'apply' | 'discard' | null>(null);
    const [busyDraft, setBusyDraft] = useState(false);
    const [deactivateMissing, setDeactivateMissing] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wasActive = useRef(false);
    const reloadContent = content.reload;

    useEffect(() => { onVerification(content.data?.verification ?? null); }, [content.data, onVerification]);

    const poll = useCallback(async () => {
        try {
            const r = await aptitudeService.latestImport(courseId);
            setRun(r);
            if (r?.active) {
                wasActive.current = true;
                timer.current = setTimeout(poll, POLL_MS);
            } else if (wasActive.current) {
                wasActive.current = false;
                reloadContent();
                if (r?.status === 'applied') toast.success(`Processing finished: ${r.stats.questions} questions in ${r.stats.concepts} concepts. Review them below.`);
                else if (r?.status === 'completed') toast.success('Processing finished. Review the new draft before applying it.');
                else if (r?.status === 'failed') toast.error('Processing failed. See the details below.');
            }
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the processing status.'));
        } finally {
            setRunLoaded(true);
        }
    }, [courseId, reloadContent]);

    useEffect(() => {
        poll();
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [poll]);

    const validate = async (): Promise<boolean> => {
        const problem = checkDocLink(docLink);
        if (problem) { setLink({ kind: 'error', message: problem }); return false; }
        setLink({ kind: 'validating' });
        try {
            const r = await aptitudeService.validateDocument(docLink.trim());
            setLink({ kind: 'valid', title: r.title, url: r.url });
            return true;
        } catch (err) {
            setLink({ kind: 'error', message: apiErrorMessage(err, 'The link could not be checked.'), code: apiErrorCode(err) });
            return false;
        }
    };

    const process = async () => {
        if (starting || run?.active) return;
        setStarting(true);
        try {
            if (!(link.kind === 'valid' && link.url === docLink.trim()) && !(await validate())) return;
            const r = await aptitudeService.startImport(courseId, docLink.trim());
            setRun(r);
            wasActive.current = true;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(poll, POLL_MS);
        } catch (err) {
            if (apiErrorCode(err) === 'APTITUDE_PROCESSING_ACTIVE') poll();
            toast.error(apiErrorMessage(err, 'Processing could not be started.'));
        } finally {
            setStarting(false);
        }
    };

    const clear = () => { onDocLinkChange(''); setLink({ kind: 'idle' }); };

    const confirmDraft = async () => {
        if (!run || !draftAction) return;
        setBusyDraft(true);
        try {
            if (draftAction === 'apply') {
                const r = await aptitudeService.applyImport(courseId, run.id, deactivateMissing);
                const a = r.applyResult ?? {};
                toast.success(`Applied: ${a.questionsAdded ?? 0} added, ${a.questionsUpdated ?? 0} updated${a.questionsDeactivated ? `, ${a.questionsDeactivated} hidden` : ''}.`);
                setRun(r);
            } else {
                setRun(await aptitudeService.discardImport(courseId, run.id));
                toast.success('Draft discarded. Your questions were not changed.');
            }
            setDraftAction(null);
            reloadContent();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'That did not work.'));
        } finally {
            setBusyDraft(false);
        }
    };

    const hasQuestions = (content.data?.totals.questions ?? 0) > 0;
    const processing = starting || !!run?.active;
    const stage = link.kind === 'validating' && starting ? 'validating' : run?.active ? run.status : null;
    const docChanged = !!run && run.documentUrl !== docLink.trim();

    return (
        <div className="space-y-6">
            {/* Open by default for a fresh course; collapsed once there is work to review. Remounted when that is known. */}
            <SampleDocumentGuide key={runLoaded && content.data ? 'known' : 'loading'} defaultOpen={!run && !hasQuestions} />

            {/* ── Link + processing ── */}
            <section aria-labelledby="apt-doc-h" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 id="apt-doc-h" className="font-semibold text-gray-900 dark:text-white">Google Docs link</h3>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">The document must be shared as <b>Anyone with the link → Viewer</b>.</p>
                <div className="mt-3 flex flex-col gap-2 lg:flex-row">
                    <div className="relative flex-1">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <input
                            type="url" inputMode="url" aria-label="Google Docs link" aria-invalid={link.kind === 'error'} aria-describedby="apt-doc-msg"
                            value={docLink}
                            onChange={e => { onDocLinkChange(e.target.value); setLink({ kind: 'idle' }); }}
                            placeholder="https://docs.google.com/document/d/DOCUMENT_ID/edit"
                            disabled={processing}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={validate} disabled={processing || link.kind === 'validating' || !docLink.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                            {link.kind === 'validating' && !starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />} Validate link
                        </button>
                        <button type="button" onClick={process} disabled={processing || !docLink.trim()}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                            {processing ? 'Processing…' : run && !docChanged ? 'Process again' : 'Process document'}
                        </button>
                        <button type="button" onClick={clear} disabled={processing || !docLink} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700">
                            <X className="h-4 w-4" aria-hidden="true" /> Clear
                        </button>
                    </div>
                </div>
                <div id="apt-doc-msg" aria-live="polite">
                    {link.kind === 'valid' && <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Accessible{link.title ? `: “${link.title}”` : ''}. Ready to process.</p>}
                    {link.kind === 'error' && (
                        <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                            <p className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{link.message}</p>
                            {link.code === 'DOCUMENT_ACCESS_DENIED' && <SharingHelp />}
                        </div>
                    )}
                </div>
                {hasQuestions && !processing && (
                    <p className="mt-2 text-xs text-gray-500">This course already has questions. Processing again creates a draft for you to compare and apply — your edited questions are not changed until you apply it.</p>
                )}

                {stage && <StageList current={stage} run={run} />}

                {!processing && run?.status === 'failed' && (
                    <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        <p className="flex items-start gap-2 font-semibold"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Processing failed</p>
                        <p className="mt-1">{run.error?.message ?? 'Please try again.'}</p>
                        {run.error?.code === 'DOCUMENT_ACCESS_DENIED' && <SharingHelp />}
                        <button type="button" onClick={process} disabled={!docLink.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 dark:bg-gray-900 dark:text-red-300 dark:ring-red-900">
                            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry processing
                        </button>
                        <p className="mt-2 text-xs opacity-80">Nothing was saved from this run, so retrying cannot create duplicate questions. Your course details and link are kept.</p>
                    </div>
                )}

                {!processing && run?.status === 'applied' && run.autoApplied && (
                    <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">
                        Extracted {run.stats.questions} questions in {run.stats.concepts} concepts from “{run.documentTitle || 'your document'}”
                        {run.stats.duplicates_removed ? ` (${run.stats.duplicates_removed} duplicates removed)` : ''}. Check every flagged question below.
                    </p>
                )}
            </section>

            {!processing && run?.status === 'completed' && (
                <PendingDraft run={run} onApply={() => setDraftAction('apply')} onDiscard={() => setDraftAction('discard')} deactivateMissing={deactivateMissing} setDeactivateMissing={setDeactivateMissing} />
            )}

            <Async state={content} skeleton={<div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" aria-busy="true" />}>
                {d => (
                    <>
                        {d.totals.questions === 0 && !processing && run?.status !== 'completed' && (
                            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                {docLink.trim()
                                    ? 'Your aptitude document has not been processed yet. Process the document to extract questions.'
                                    : 'Add a Google Docs link and process it, or add concepts and questions by hand below.'}
                            </div>
                        )}
                        {d.totals.questions > 0 && <VerificationSummary content={d} />}
                        <AptitudeContentEditor courseId={courseId} content={d} onChange={content.reload} />
                    </>
                )}
            </Async>

            <ConfirmDialog
                open={!!draftAction}
                title={draftAction === 'apply' ? 'Apply this draft to the course?' : 'Discard this draft?'}
                message={draftAction === 'apply'
                    ? `Questions with the same wording are updated from the document and new ones are added${deactivateMissing ? '; questions not in the document are hidden (never deleted)' : ''}. You will need to verify the questions again.`
                    : 'The extracted draft is removed. Your current questions are not changed.'}
                confirmLabel={draftAction === 'apply' ? 'Apply draft' : 'Discard'}
                tone={draftAction === 'apply' ? 'primary' : 'danger'}
                busy={busyDraft}
                onCancel={() => setDraftAction(null)}
                onConfirm={confirmDraft}
            />
        </div>
    );
}

function StageList({ current, run }: { current: string; run: AptitudeImportRun | null }) {
    const idx = STAGES.findIndex(s => s.id === current);
    return (
        <ol className="mt-4 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm dark:border-indigo-900/50 dark:bg-indigo-950/30" aria-label="Processing progress" role="status">
            {STAGES.map((s, i) => {
                const done = i < idx;
                const now = i === idx;
                const detail = s.id === 'processing' && now && run?.chunksTotal ? ` — part ${Math.min(run.chunksDone + 1, run.chunksTotal)} of ${run.chunksTotal}` : '';
                return (
                    <li key={s.id} className={`flex items-center gap-2 ${now ? 'font-semibold text-indigo-900 dark:text-indigo-200' : done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                        {done ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" /> : now ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
                        {s.label}{detail}
                    </li>
                );
            })}
            <li className="pt-1 text-xs font-normal text-gray-500">You can leave this page — processing continues on the server.</li>
        </ol>
    );
}

function VerificationSummary({ content }: { content: AdminAptitudeContent }) {
    const v = content.verification;
    const s = v.summary;
    return (
        <section aria-labelledby="apt-verify-h" className={`rounded-2xl border p-5 ${v.blockers.length ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20' : 'border-green-200 bg-green-50/40 dark:border-green-900 dark:bg-green-950/20'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <h3 id="apt-verify-h" className="mr-auto font-semibold text-gray-900 dark:text-white">Question verification</h3>
                {v.verified ? <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Verified</span>
                    : v.blockers.length ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Action needed</span>
                        : <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Ready to verify</span>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    ['Concepts', s.concepts, ''],
                    ['Questions', s.questions, ''],
                    ['Valid', s.valid, 'text-green-700 dark:text-green-400'],
                    ['Need review', s.needsReview, 'text-amber-700 dark:text-amber-300'],
                    ['Invalid', s.invalid, 'text-red-700 dark:text-red-400'],
                ].map(([label, value, cls]) => (
                    <div key={label as string} className="rounded-xl bg-white p-3 dark:bg-gray-900">
                        <dt className="text-xs text-gray-500">{label}</dt>
                        <dd className={`text-xl font-bold tabular-nums ${cls || 'text-gray-900 dark:text-white'}`}>{value}</dd>
                    </div>
                ))}
            </dl>
            {v.blockers.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-amber-900 dark:text-amber-200">
                    {v.blockers.map(b => <li key={b.code} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{b.message}</li>)}
                </ul>
            ) : (
                <p className="mt-3 text-sm text-green-800 dark:text-green-300">{s.visible} question{s.visible === 1 ? '' : 's'} will be visible to students. {v.verified ? '' : 'Continue to the course preview to verify them.'}</p>
            )}
            {s.invalid > 0 && <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Invalid questions (no answer, missing options, or more than one answer) stay hidden from students. Fix them, or open them and save them as hidden to confirm.</p>}
        </section>
    );
}

function PendingDraft({ run, onApply, onDiscard, deactivateMissing, setDeactivateMissing }: {
    run: AptitudeImportRun; onApply: () => void; onDiscard: () => void; deactivateMissing: boolean; setDeactivateMissing: (v: boolean) => void;
}) {
    const [open, setOpen] = useState<string | null>(null);
    return (
        <section aria-labelledby="apt-draft-h" className="rounded-2xl border border-indigo-200 bg-white p-5 dark:border-indigo-900/60 dark:bg-gray-800">
            <div className="flex flex-wrap items-center gap-2">
                <h3 id="apt-draft-h" className="mr-auto font-semibold text-gray-900 dark:text-white">New draft from {run.documentTitle ? `“${run.documentTitle}”` : 'the document'}</h3>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{run.stats.concepts} concepts</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">{run.stats.questions} questions</span>
                {run.stats.needs_review > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{run.stats.needs_review} flagged</span>}
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Your current questions are unchanged until you apply this draft.</p>
            {run.warnings.length > 0 && <ul className="mt-3 list-inside list-disc text-xs text-amber-800 dark:text-amber-300">{run.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}</ul>}
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {run.concepts.map(c => (
                    <li key={c.key}>
                        <button type="button" onClick={() => setOpen(open === c.key ? null : c.key)} aria-expanded={open === c.key} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40">
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open === c.key ? '' : '-rotate-90'}`} aria-hidden="true" />
                            <span className="flex-1 font-medium text-gray-900 dark:text-white">{c.title}</span>
                            <span className="text-xs text-gray-500">{c.questions.length} questions{c.questions.some(q => q.needsReview) ? ` · ${c.questions.filter(q => q.needsReview).length} flagged` : ''}</span>
                        </button>
                        {open === c.key && (
                            <ol className="space-y-1.5 bg-gray-50/60 px-4 pb-3 pt-1 text-sm dark:bg-gray-900/30">
                                {c.questions.map(q => (
                                    <li key={q.key} className="flex items-start gap-2">
                                        <CheckBadge status={!q.correctOption || q.options.length < 2 ? 'invalid' : q.needsReview ? 'needs_review' : 'valid'} />
                                        <span className="line-clamp-2 flex-1 text-gray-800 dark:text-gray-200">{q.questionText}</span>
                                        <span className="shrink-0 text-xs text-gray-500">answer {q.correctOption ?? '—'}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </li>
                ))}
            </ul>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={deactivateMissing} onChange={e => setDeactivateMissing(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                    <span>Hide questions that are not in this document <span className="block text-xs text-gray-500">Hidden, not deleted — students’ history is kept.</span></span>
                </label>
                <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={onDiscard} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">Discard</button>
                    <button type="button" onClick={onApply} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Apply draft…</button>
                </div>
            </div>
        </section>
    );
}
