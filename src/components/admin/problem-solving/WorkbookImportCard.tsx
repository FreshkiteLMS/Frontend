"use client";

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage } from '@/services/api/discount.api';
import type { WorkbookPreview } from '@/types/problem-course';

/** Save the server-generated sample workbook. */
export async function downloadProblemTemplate() {
    try {
        const blob = await problemCourseService.downloadTemplate();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'problem-solving-import-template.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not download the template.'));
    }
}

export function TemplateDownload() {
    const [busy, setBusy] = useState(false);
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-900 dark:text-emerald-200">
                Download this sample Excel file to understand the required format for uploading problems, solution details, and multilingual video solutions.
            </p>
            <button
                type="button"
                onClick={async () => { setBusy(true); await downloadProblemTemplate(); setBusy(false); }}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Download Sample Excel Template
            </button>
        </div>
    );
}

/** Problems, videos and every row error the server found — shown before anything is saved. */
export function WorkbookPreviewView({ preview }: { preview: WorkbookPreview }) {
    if (preview.errors.length) {
        return (
            <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {preview.errors.length} problem{preview.errors.length === 1 ? '' : 's'} found — fix them in the file and upload again. Nothing will be imported.
                </p>
                <div className="mt-3 max-h-64 overflow-auto rounded-lg bg-white dark:bg-gray-900">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-left text-gray-500"><tr><th className="px-3 py-2">Sheet</th><th className="px-3 py-2">Row</th><th className="px-3 py-2">Column</th><th className="px-3 py-2">Problem</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                            {preview.errors.map((e, i) => (
                                <tr key={i}><td className="px-3 py-1.5">{e.sheet}</td><td className="px-3 py-1.5 tabular-nums">{e.row ?? '—'}</td><td className="px-3 py-1.5 font-mono">{e.column ?? '—'}</td><td className="px-3 py-1.5">{e.message}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
    const withVideos = preview.problems.filter(p => p.videos.length).length;
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                {preview.stats.problemCount} problems in {preview.stats.sectionCount} categor{preview.stats.sectionCount === 1 ? 'y' : 'ies'}
                {preview.format === 'structured' && preview.hasVideoSheet && ` · ${withVideos} with videos`}
            </p>
            {preview.format === 'legacy' && <p className="mt-1 text-xs text-gray-500">Read with the original sheet format (no Problems / Video Solutions sheets found).</p>}
            {preview.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">{preview.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}</ul>}
            <div className="mt-3 max-h-64 overflow-auto">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-gray-800 text-left text-gray-500"><tr><th className="py-1.5 pr-3">ID</th><th className="py-1.5 pr-3">Problem</th><th className="py-1.5 pr-3">Category</th><th className="py-1.5 pr-3">Difficulty</th><th className="py-1.5">Videos</th></tr></thead>
                    <tbody className="text-gray-700 dark:text-gray-300">
                        {preview.problems.map((p, i) => (
                            <tr key={i} className="border-t border-gray-50 dark:border-gray-700/60">
                                <td className="py-1.5 pr-3 font-mono">{p.problemId ?? '—'}</td>
                                <td className="py-1.5 pr-3">{p.title}</td>
                                <td className="py-1.5 pr-3">{p.category}</td>
                                <td className="py-1.5 pr-3">{p.difficulty}</td>
                                <td className="py-1.5">{p.videos.length ? p.videos.map(v => `${v.language}${v.isDefault ? ' ★' : ''}${v.status === 'draft' ? ' (draft)' : ''}`).join(', ') : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Pick an .xlsx, preview it on the server, and hand the file back once it is valid. */
export function WorkbookPicker({ onReady, disabled = false }: { onReady: (file: File | null, preview: WorkbookPreview | null) => void; disabled?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<WorkbookPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const choose = async (f: File | null) => {
        setFile(f);
        setPreview(null);
        setError(null);
        onReady(null, null);
        if (!f) return;
        if (!/\.xlsx?$/i.test(f.name)) { setError('Choose an Excel workbook (.xlsx).'); return; }
        if (f.size > 5 * 1024 * 1024) { setError('The workbook is larger than 5 MB.'); return; }
        setLoading(true);
        try {
            const p = await problemCourseService.previewWorkbook(f);
            setPreview(p);
            onReady(p.errors.length ? null : f, p);
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not read this workbook.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <input ref={inputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={e => void choose(e.target.files?.[0] ?? null)} aria-label="Excel workbook" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || loading} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : file ? <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <Upload className="h-5 w-5" aria-hidden="true" />}
                {loading ? 'Checking the workbook…' : file ? `${file.name} — choose another file` : 'Choose an Excel workbook (.xlsx)'}
            </button>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {preview && <WorkbookPreviewView preview={preview} />}
        </div>
    );
}
