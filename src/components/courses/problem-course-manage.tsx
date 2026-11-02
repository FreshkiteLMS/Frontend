"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ExternalLink, Eye, AlertTriangle, Layers, ListChecks, Clock, Mic, PlayCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { problemCourseService } from '@/services/api/problem-course.api';
import { ProblemsAdminTab } from '@/components/admin/problem-solving/ProblemsAdminTab';
import { LogicAssessmentsTab } from '@/components/admin/problem-solving/LogicAssessmentsTab';
import { TemplateDownload, WorkbookPicker } from '@/components/admin/problem-solving/WorkbookImportCard';

interface RawSection {
    id: string;
    title: string;
    icon: string;
    problems: unknown[];
}

interface ProblemCourseManagePanelProps {
    courseId: string;
    sheetUrl?: string;
    lastSyncedAt?: string | null;
    initialSections: RawSection[];
}

function formatWhen(iso?: string | null): string {
    if (!iso) return 'never';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'unknown';
    return d.toLocaleString();
}

export function ProblemCourseManagePanel({
    courseId,
    sheetUrl,
    lastSyncedAt,
    initialSections,
}: ProblemCourseManagePanelProps) {
    const router = useRouter();
    const [sections, setSections] = useState<RawSection[]>(initialSections || []);
    const [syncedAt, setSyncedAt] = useState<string | null>(lastSyncedAt ?? null);
    const [syncing, setSyncing] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    const totalProblems = sections.reduce((n, s) => n + (s.problems?.length || 0), 0);
    const [tab, setTab] = useState<'overview' | 'problems' | 'logic'>('overview');
    const [workbook, setWorkbook] = useState<File | null>(null);
    const [pickerKey, setPickerKey] = useState(0);
    const [applying, setApplying] = useState(false);

    const applyWorkbook = async () => {
        if (!workbook) return;
        setApplying(true);
        try {
            const res = await problemCourseService.syncWorkbook(courseId, workbook);
            const updated = (res.course as any)?.problem_sections as RawSection[] | undefined;
            if (updated) setSections(updated);
            setWarnings(res.warnings || []);
            toast.success(`Imported — ${res.summary.added} added, ${res.summary.removed} removed, ${res.summary.total} total problems`);
            setWorkbook(null);
            setPickerKey(k => k + 1);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to import the workbook');
        } finally {
            setApplying(false);
        }
    };

    const tabs = [
        { id: 'overview' as const, label: 'Overview', Icon: Layers },
        { id: 'problems' as const, label: 'Problems & videos', Icon: PlayCircle },
        { id: 'logic' as const, label: 'Logic Assessments', Icon: Mic },
    ];
    const tabBar = (
        <div role="tablist" aria-label="Problem course management" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            {tabs.map(({ id, label, Icon }) => (
                <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${tab === id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />{label}
                </button>
            ))}
        </div>
    );

    if (tab === 'problems') return <div className="space-y-6">{tabBar}<ProblemsAdminTab courseId={courseId} /></div>;
    if (tab === 'logic') return <div className="space-y-6">{tabBar}<LogicAssessmentsTab courseId={courseId} sections={sections.map(s => ({ id: s.id, title: s.title }))} /></div>;

    const handleSync = async () => {
        setSyncing(true);
        setWarnings([]);
        try {
            const res = await problemCourseService.sync(courseId);
            const updated = (res.course as any)?.problem_sections as RawSection[] | undefined;
            if (updated) setSections(updated);
            setSyncedAt((res.course as any)?.problem_sheet?.last_synced_at || new Date().toISOString());
            setWarnings(res.warnings || []);
            const { added, removed } = res.summary;
            toast.success(
                `Synced — ${added} added, ${removed} removed, ${res.summary.total} total problems`
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to sync sheet');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            {tabBar}
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Sections</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{sections.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <ListChecks className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Problems</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProblems}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Last Synced</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatWhen(syncedAt)}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{sheetUrl ? 'Google Sheet' : 'Uploaded workbook'}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {sheetUrl
                                ? 'Re-read the sheet to pull in new problems and edited links. Student progress is always preserved.'
                                : 'This course was imported from an Excel file. Upload a new version below to update it.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {sheetUrl && (
                            <a
                                href={sheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open Sheet
                            </a>
                        )}
                        <button
                            onClick={() => router.push(`/student/courses/${courseId}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                            <Eye className="w-4 h-4" />
                            View Tracker
                        </button>
                        {sheetUrl && (
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-semibold disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing…' : 'Sync Sheet'}
                            </button>
                        )}
                    </div>
                </div>

                {warnings.length > 0 && (
                    <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                {warnings.length} warning{warnings.length === 1 ? '' : 's'} from last sync
                            </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300/90 max-h-40 overflow-y-auto">
                            {warnings.slice(0, 20).map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Excel workbook re-import */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Import from Excel</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a workbook to add or update problems, statements and multilingual videos. Student progress is preserved;
                        nothing is imported if any row has an error.
                    </p>
                </div>
                <TemplateDownload />
                <WorkbookPicker key={pickerKey} onReady={file => setWorkbook(file)} disabled={applying} />
                <button
                    type="button"
                    onClick={applyWorkbook}
                    disabled={!workbook || applying}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {applying ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                    {applying ? 'Importing…' : 'Import into this course'}
                </button>
            </div>

            {/* Section breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sections</h4>
                {sections.length === 0 ? (
                    <p className="text-sm text-gray-400">No sections parsed.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sections.map(s => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40"
                            >
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {s.title}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                    {s.problems?.length || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
