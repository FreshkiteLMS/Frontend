"use client";

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Link2, Upload, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiErrorMessage, structuredCourseService } from '@/services/api/structured-course.api';
import { QUESTION_TYPE_LABELS, type QuestionImport } from '@/types/structured-questions';

interface QuestionImportPanelProps {
    /** Existing course id, or null before the course has been saved. */
    courseId: string | null;
    /** Persist the course draft first when needed; returns its id. */
    ensureCourseSaved?: () => Promise<string | null>;
    /** Called after a successful commit. */
    onImported?: (result: QuestionImport) => void;
}

const ACTION_STYLES = {
    insert: 'bg-green-50 text-green-800 dark:bg-green-500/15 dark:text-green-200',
    update: 'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
    unchanged: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300',
} as const;
const ACTION_LABELS = { insert: 'New', update: 'Update', unchanged: 'Unchanged' } as const;

/**
 * Spreadsheet → questions import: choose a source, validate & preview on the
 * server, inspect what will be created/updated/rejected, then confirm.
 * Nothing is written to the course's questions until "Confirm import".
 */
export function QuestionImportPanel({ courseId, ensureCourseSaved, onImported }: QuestionImportPanelProps) {
    const [mode, setMode] = useState<'sheet' | 'file'>('sheet');
    const [sheetUrl, setSheetUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<QuestionImport | null>(null);
    const [acceptPartial, setAcceptPartial] = useState(false);
    const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const reset = () => {
        setPreview(null);
        setAcceptPartial(false);
        setError(null);
    };

    const sheetUrlError =
        mode === 'sheet' && sheetUrl.trim() && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(sheetUrl.trim())
            ? 'Enter a Google Sheets link starting with https://docs.google.com/spreadsheets/d/'
            : null;
    const canPreview = mode === 'sheet' ? !!sheetUrl.trim() && !sheetUrlError : !!file;

    const handlePreview = async () => {
        if (!canPreview || busy) return;
        reset();
        setBusy('preview');
        try {
            const id = courseId || (ensureCourseSaved ? await ensureCourseSaved() : null);
            if (!id) throw new Error('Save the course before importing questions.');
            const result =
                mode === 'sheet'
                    ? await structuredCourseService.previewFromSheet(id, sheetUrl.trim())
                    : await structuredCourseService.previewFromFile(id, file as File);
            setPreview(result);
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not read the spreadsheet.'));
        } finally {
            setBusy(null);
        }
    };

    const rejected = preview ? preview.summary.invalid_rows + preview.summary.duplicate_rows : 0;
    const willChange = preview ? preview.summary.to_insert + preview.summary.to_update : 0;

    const handleCommit = async () => {
        if (!preview || busy) return;
        setBusy('commit');
        setError(null);
        try {
            const result = await structuredCourseService.commitImport(preview.courseId, preview.id, acceptPartial);
            const r = result.result;
            toast.success(
                result.alreadyCommitted
                    ? 'This import was already applied.'
                    : `Imported: ${r?.inserted ?? 0} new, ${r?.updated ?? 0} updated, ${r?.unchanged ?? 0} unchanged`
            );
            setPreview(null);
            setFile(null);
            if (fileInput.current) fileInput.current.value = '';
            onImported?.(result);
        } catch (err) {
            setError(apiErrorMessage(err, 'The import could not be applied.'));
        } finally {
            setBusy(null);
        }
    };

    const downloadTemplate = async (format: 'xlsx' | 'csv') => {
        try {
            await structuredCourseService.downloadTemplate(format);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not download the template.'));
        }
    };

    return (
        <section aria-labelledby="question-import-heading" className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <FileSpreadsheet className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-1" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                    <h4 id="question-import-heading" className="text-gray-900 dark:text-white font-medium mb-1">
                        Import questions &amp; assignments
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        One row per audio question or assignment. Rows are matched by <code>question_id</code>, so
                        re-importing updates existing questions instead of duplicating them, and questions missing from a
                        later sheet are never deleted.{' '}
                        <button type="button" onClick={() => downloadTemplate('xlsx')} className="inline-flex items-center gap-1 font-medium text-teal-700 dark:text-teal-300 underline">
                            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Excel template
                        </button>{' '}
                        ·{' '}
                        <button type="button" onClick={() => downloadTemplate('csv')} className="font-medium text-teal-700 dark:text-teal-300 underline">
                            CSV template
                        </button>
                    </p>

                    <div role="radiogroup" aria-label="Spreadsheet source" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden mb-3">
                        {([['sheet', 'Google Sheet link', Link2], ['file', 'Upload file', Upload]] as const).map(([id, label, Icon]) => (
                            <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={mode === id}
                                onClick={() => { setMode(id); reset(); }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${mode === id ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        {mode === 'sheet' ? (
                            <div className="flex-1">
                                <label htmlFor="question-sheet-url" className="sr-only">Google Sheet URL</label>
                                <input
                                    id="question-sheet-url"
                                    type="url"
                                    value={sheetUrl}
                                    onChange={e => { setSheetUrl(e.target.value); reset(); }}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    aria-invalid={!!sheetUrlError}
                                    aria-describedby={sheetUrlError ? 'question-sheet-url-error' : undefined}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                />
                                {sheetUrlError && <p id="question-sheet-url-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{sheetUrlError}</p>}
                            </div>
                        ) : (
                            <div className="flex-1">
                                <label htmlFor="question-file" className="sr-only">Spreadsheet file</label>
                                <input
                                    id="question-file"
                                    ref={fileInput}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={e => {
                                        const f = e.target.files?.[0] || null;
                                        reset();
                                        if (f && f.size > 5 * 1024 * 1024) {
                                            setError('The file is larger than 5 MB.');
                                            setFile(null);
                                            return;
                                        }
                                        setFile(f);
                                    }}
                                    className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white dark:file:bg-gray-700 file:px-3 file:py-2 file:text-sm file:font-medium"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handlePreview}
                            disabled={!canPreview || busy !== null}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
                        >
                            {busy === 'preview' ? 'Validating…' : 'Validate & preview'}
                        </button>
                    </div>

                    {mode === 'sheet' && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            Private sheets: share them (Viewer) with the LMS service account. You do not need to make them public.
                        </p>
                    )}

                    {error && (
                        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {preview && (
                <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5" aria-live="polite">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Import preview{preview.sheetName ? ` — tab “${preview.sheetName}”` : ''}
                    </h5>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center mb-4">
                        {([
                            ['Rows detected', preview.summary.total_rows],
                            ['Valid', preview.summary.valid_rows],
                            ['Invalid', preview.summary.invalid_rows],
                            ['Duplicates', preview.summary.duplicate_rows],
                            ['New', preview.summary.to_insert],
                            ['Updates', preview.summary.to_update],
                            ['Unchanged', preview.summary.unchanged],
                        ] as const).map(([label, n]) => (
                            <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-2 py-2">
                                <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
                                <dd className="text-lg font-bold text-gray-900 dark:text-white">{n}</dd>
                            </div>
                        ))}
                    </dl>

                    {preview.unmappedColumns.length > 0 && (
                        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                            Ignored columns: {preview.unmappedColumns.join(', ')}
                        </p>
                    )}

                    {preview.errors.length > 0 && (
                        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                {preview.errors.length} problem{preview.errors.length === 1 ? '' : 's'} found — these rows will not be imported
                            </p>
                            <ul className="max-h-48 overflow-y-auto space-y-1 text-xs text-amber-900 dark:text-amber-200">
                                {preview.errors.map((e, i) => (
                                    <li key={i}>
                                        <strong>Row {e.row}</strong>{e.field ? ` · ${e.field}` : ''}: {e.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(preview.rows?.length ?? 0) > 0 && (
                        <div className="max-h-80 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="min-w-full text-sm">
                                <caption className="sr-only">Rows that will be imported</caption>
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-3 py-2">Row</th>
                                        <th scope="col" className="px-3 py-2">Action</th>
                                        <th scope="col" className="px-3 py-2">Type</th>
                                        <th scope="col" className="px-3 py-2">ID</th>
                                        <th scope="col" className="px-3 py-2">Title</th>
                                        <th scope="col" className="px-3 py-2">Topic</th>
                                        <th scope="col" className="px-3 py-2">Difficulty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {preview.rows!.map(r => (
                                        <tr key={r.row} className="text-gray-800 dark:text-gray-200">
                                            <td className="px-3 py-2 tabular-nums">{r.row}</td>
                                            <td className="px-3 py-2">
                                                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ACTION_STYLES[r.action]}`}>{ACTION_LABELS[r.action]}</span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">{QUESTION_TYPE_LABELS[r.question_type]}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{r.external_question_id}</td>
                                            <td className="px-3 py-2 max-w-xs truncate" title={r.title}>{r.title}</td>
                                            <td className="px-3 py-2">{r.topic || '—'}</td>
                                            <td className="px-3 py-2 capitalize">{r.difficulty || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        {rejected > 0 && preview.summary.valid_rows > 0 && (
                            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked={acceptPartial} onChange={e => setAcceptPartial(e.target.checked)} className="mt-0.5" />
                                Import the {preview.summary.valid_rows} valid row(s) and skip the {rejected} rejected row(s)
                            </label>
                        )}
                        <div className="sm:ml-auto flex gap-2">
                            <button type="button" onClick={reset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCommit}
                                disabled={busy !== null || preview.summary.valid_rows === 0 || (rejected > 0 && !acceptPartial)}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                {busy === 'commit' ? 'Importing…' : willChange === 0 ? 'Confirm (no changes)' : `Confirm import (${willChange})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
