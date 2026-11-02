"use client";

import { useState } from 'react';
import { Eye, Plus, Star, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { VideoSolutionPlayer } from '@/components/courses/problem-tracker/VideoSolutionPlayer';
import { VIDEO_LANGUAGES, OTHER_LANGUAGE, VIDEO_URL_HINT, isSupportedVideoUrl, isValidLanguageName, languageKey } from '@/lib/video-solutions';
import type { VideoStatus } from '@/types/problem-course';

/** One editable row. `language` is a catalog code or OTHER_LANGUAGE with `customName`. */
export interface VideoDraft {
    key: string;
    id?: string;
    title: string;
    language: string;
    customName: string;
    url: string;
    description: string;
    isDefault: boolean;
    status: VideoStatus;
}

let seq = 0;
export const newVideoDraft = (partial: Partial<VideoDraft> = {}): VideoDraft => ({
    key: `v${++seq}`, title: '', language: 'en', customName: '', url: '', description: '', isDefault: false, status: 'published', ...partial,
});

export function languageNameOf(d: VideoDraft): string {
    return d.language === OTHER_LANGUAGE ? d.customName.trim() : VIDEO_LANGUAGES.find(l => l.code === d.language)?.name ?? d.language;
}

/** Field errors keyed by `${row.key}.${field}` — same rules the server applies. */
export function validateVideoDrafts(rows: VideoDraft[]): Record<string, string> {
    const errors: Record<string, string> = {};
    const seen = new Map<string, number>();
    rows.forEach((r, i) => {
        if (r.language === OTHER_LANGUAGE && !isValidLanguageName(r.customName)) errors[`${r.key}.language`] = 'Type the language name (letters only).';
        if (!isSupportedVideoUrl(r.url)) errors[`${r.key}.url`] = `Enter a ${VIDEO_URL_HINT}.`;
        const k = languageKey(r.language, languageNameOf(r));
        if (seen.has(k)) errors[`${r.key}.language`] = `Video #${seen.get(k)! + 1} already uses this language.`;
        else seen.set(k, i);
        if (r.isDefault && r.status === 'draft') errors[`${r.key}.isDefault`] = 'The default video must be published.';
        if (r.title.length > 200) errors[`${r.key}.title`] = 'At most 200 characters.';
    });
    return errors;
}

/**
 * Add, edit, remove and preview a problem's solution videos, one per
 * language. Changes stay local until the parent saves the whole list.
 */
export function VideoSolutionsEditor({
    rows,
    onChange,
    errors,
    problemTitle,
}: {
    rows: VideoDraft[];
    onChange: (rows: VideoDraft[]) => void;
    errors: Record<string, string>;
    problemTitle: string;
}) {
    const [preview, setPreview] = useState<VideoDraft | null>(null);
    const update = (key: string, patch: Partial<VideoDraft>) => onChange(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
    const setDefault = (key: string) => onChange(rows.map(r => ({ ...r, isDefault: r.key === key ? !r.isDefault : false })));
    const usedLanguages = new Set(rows.map(r => r.language));
    const nextLanguage = VIDEO_LANGUAGES.find(l => !usedLanguages.has(l.code))?.code ?? OTHER_LANGUAGE;

    const input = (err?: string) => `w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 ${err ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/30'}`;
    const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[k]}</p> : null);

    return (
        <div className="space-y-3">
            {rows.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No video solutions yet. A problem without videos is fine.
                </p>
            )}
            {rows.map((r, i) => (
                <fieldset key={r.key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                    <legend className="px-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Video {i + 1}{languageNameOf(r) ? ` · ${languageNameOf(r)}` : ''}
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor={`${r.key}-lang`}>Language</label>
                            <select id={`${r.key}-lang`} value={r.language} onChange={e => update(r.key, { language: e.target.value })} className={input(errors[`${r.key}.language`])}>
                                {VIDEO_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                <option value={OTHER_LANGUAGE}>Other…</option>
                            </select>
                            {r.language === OTHER_LANGUAGE && (
                                <input aria-label="Language name" value={r.customName} onChange={e => update(r.key, { customName: e.target.value })} placeholder="e.g. Bengali" maxLength={40} className={`${input(errors[`${r.key}.language`])} mt-2`} />
                            )}
                            <Err k={`${r.key}.language`} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor={`${r.key}-url`}>Video URL</label>
                            <input id={`${r.key}-url`} value={r.url} onChange={e => update(r.key, { url: e.target.value.trim() })} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" className={input(errors[`${r.key}.url`])} />
                            <Err k={`${r.key}.url`} />
                        </div>
                        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor={`${r.key}-title`}>Title <span className="font-normal text-gray-400">(optional)</span></label>
                                <input id={`${r.key}-title`} value={r.title} onChange={e => update(r.key, { title: e.target.value })} placeholder={`${problemTitle} – ${languageNameOf(r) || 'language'}`} maxLength={200} className={input(errors[`${r.key}.title`])} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor={`${r.key}-desc`}>Description <span className="font-normal text-gray-400">(optional)</span></label>
                                <input id={`${r.key}-desc`} value={r.description} onChange={e => update(r.key, { description: e.target.value })} maxLength={2000} className={input()} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setDefault(r.key)} aria-pressed={r.isDefault} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${r.isDefault ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            <Star className={`h-3.5 w-3.5 ${r.isDefault ? 'fill-current' : ''}`} aria-hidden="true" /> {r.isDefault ? 'Default video' : 'Make default'}
                        </button>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={r.status === 'published'} onChange={e => update(r.key, { status: e.target.checked ? 'published' : 'draft' })} />
                            Published
                        </label>
                        <span className="ml-auto flex gap-1">
                            <button type="button" onClick={() => setPreview(r)} disabled={!isSupportedVideoUrl(r.url)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-40">
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Preview
                            </button>
                            <button type="button" onClick={() => onChange(rows.filter(x => x.key !== r.key))} aria-label={`Remove video ${i + 1}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                            </button>
                        </span>
                    </div>
                    <Err k={`${r.key}.isDefault`} />
                </fieldset>
            ))}
            <button type="button" onClick={() => onChange([...rows, newVideoDraft({ language: nextLanguage, isDefault: rows.length === 0 })])} disabled={rows.length >= 20} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 px-3.5 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50">
                <Plus className="h-4 w-4" aria-hidden="true" /> Add video
            </button>
            {preview && (
                <Modal open onClose={() => setPreview(null)} title="Preview" description={`${languageNameOf(preview)} · ${preview.status === 'draft' ? 'Draft (hidden from students)' : 'Published'}`} size="xl">
                    <VideoSolutionPlayer
                        videos={[{ id: preview.key, title: preview.title || `${problemTitle} – ${languageNameOf(preview)}`, languageCode: preview.language, languageName: languageNameOf(preview), url: preview.url, description: preview.description, isDefault: preview.isDefault }]}
                        legacyUrl={null}
                        problemTitle={problemTitle}
                    />
                </Modal>
            )}
        </div>
    );
}
