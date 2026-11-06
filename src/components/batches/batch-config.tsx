"use client";

import { useState } from 'react';
import { Archive, ArchiveRestore, Lock, Megaphone, MessageSquare, Plus, Trash2, Users } from 'lucide-react';
import type { BatchGroup, Capabilities } from '@/types/admin-insights';
import { inputCls } from '@/components/admin/insights/ui';

/** Capabilities an admin can switch per batch. Meetings are enforced by the API; the rest decide what is tracked and shown. */
export const CAPABILITY_INFO: { key: keyof Capabilities; label: string; help: string }[] = [
    { key: 'meetings', label: 'Meetings', help: 'Scheduling, live rooms and attendance. When off, no meetings can be created for the batch (enforced by the server).' },
    { key: 'courses', label: 'Courses & progress tracking', help: 'Assign courses to the batch and track course progress.' },
    { key: 'assignments', label: 'Assignments', help: 'Track assignment completion in batch analytics.' },
    { key: 'audio_practice', label: 'Audio practice', help: 'Track audio practice and evaluations in batch analytics.' },
    { key: 'problem_solving', label: 'Problem solving', help: 'Track problem-solving activity in batch analytics.' },
];

export const DEFAULT_CAPS: Capabilities = { meetings: true, courses: true, assignments: true, audio_practice: true, problem_solving: true };

/** Suggested starting points. Purely presets — every option stays editable. */
export const BATCH_PRESETS: { label: string; caps: Partial<Capabilities>; groups: string[] }[] = [
    { label: 'Training batch', caps: { meetings: true }, groups: ['general', 'announcements', 'doubts', 'assignments', 'meetings'] },
    { label: 'Self-paced group', caps: { meetings: false }, groups: ['general', 'doubts'] },
    { label: 'Practice group', caps: { meetings: false, courses: true }, groups: ['daily_status', 'doubts'] },
    { label: 'Communication only', caps: { meetings: false, courses: false, assignments: false, audio_practice: false, problem_solving: false }, groups: ['general', 'daily_status', 'announcements'] },
];

export const GROUP_TEMPLATES: Record<string, { name: string; description: string; who_can_post: 'everyone' | 'moderators'; needsMeetings?: boolean }> = {
    general: { name: 'General', description: 'General communication, announcements and discussions.', who_can_post: 'everyone' },
    daily_status: { name: 'Daily Status', description: 'Post your daily progress, completed work and blockers.', who_can_post: 'everyone' },
    doubts: { name: 'Doubt Clearing', description: 'Ask technical questions; trainers and admins answer.', who_can_post: 'everyone' },
    assignments: { name: 'Assignment Updates', description: 'Assignment updates, submissions and related discussion.', who_can_post: 'everyone' },
    announcements: { name: 'Announcements', description: 'Important batch notifications from admins and trainers.', who_can_post: 'moderators' },
    meetings: { name: 'Meeting Discussion', description: 'Meeting updates, resources and follow-ups.', who_can_post: 'everyone', needsMeetings: true },
};

export function templateGroup(template: string): BatchGroup {
    const t = GROUP_TEMPLATES[template];
    return { key: template, template, name: t.name, description: t.description, audience: 'all', who_can_post: t.who_can_post };
}

export function CapabilityEditor({ value, onChange, lockMeetingsOff }: { value: Capabilities; onChange: (c: Capabilities) => void; lockMeetingsOff?: string | null }) {
    return (
        <ul className="space-y-2">
            {CAPABILITY_INFO.map(c => {
                const locked = c.key === 'meetings' && value.meetings && !!lockMeetingsOff;
                return (
                    <li key={c.key}>
                        <label className={`flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 ${locked ? 'opacity-80' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300" checked={value[c.key]} disabled={locked}
                                onChange={e => onChange({ ...value, [c.key]: e.target.checked })} />
                            <span>
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">{c.label}</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">{locked ? lockMeetingsOff : c.help}</span>
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Pick / configure communication groups. Template groups are suggestions;
 * custom groups take a name and description. Existing groups can only be
 * archived (their history is kept), never deleted — `existingKeys` marks them.
 */
export function GroupsEditor({ value, onChange, meetingsEnabled, existingKeys = [] }: { value: BatchGroup[]; onChange: (g: BatchGroup[]) => void; meetingsEnabled: boolean; existingKeys?: string[] }) {
    const [customName, setCustomName] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const has = (k: string) => value.some(g => g.key === k);
    const update = (key: string, patch: Partial<BatchGroup>) => onChange(value.map(g => (g.key === key ? { ...g, ...patch } : g)));
    const addCustom = () => {
        const name = customName.trim();
        if (!name) return;
        const base = `custom-${name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'group'}`;
        let key = base;
        let n = 2;
        while (has(key)) key = `${base}-${n++}`;
        onChange([...value, { key, template: 'custom', name, description: customDesc.trim(), audience: 'all', who_can_post: 'everyone' }]);
        setCustomName('');
        setCustomDesc('');
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Suggested groups</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(GROUP_TEMPLATES).map(([k, t]) => {
                        const disabled = !!t.needsMeetings && !meetingsEnabled;
                        const on = has(k);
                        const existing = existingKeys.includes(k);
                        return (
                            <button key={k} type="button" disabled={disabled || (on && existing)}
                                title={disabled ? 'Needs meetings to be enabled' : on && existing ? 'Existing groups can be archived below' : t.description}
                                onClick={() => onChange(on ? value.filter(g => g.key !== k) : [...value, templateGroup(k)])}
                                aria-pressed={on}
                                className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                {on ? '✓ ' : '+ '}{t.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {value.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">No communication groups — the batch will have no chat channels. You can add groups later.</p>
            ) : (
                <ul className="space-y-2">
                    {value.map(g => {
                        const existing = existingKeys.includes(g.key);
                        return (
                            <li key={g.key} className={`rounded-xl border p-3 ${g.archived ? 'border-dashed border-gray-300 dark:border-gray-700 opacity-70' : 'border-gray-200 dark:border-gray-700'}`}>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                                        <label className="text-xs text-gray-600 dark:text-gray-400">Name
                                            <input className={`${inputCls} mt-1 w-full`} value={g.name} maxLength={80} onChange={e => update(g.key, { name: e.target.value })} disabled={g.archived} />
                                        </label>
                                        <label className="text-xs text-gray-600 dark:text-gray-400">Description
                                            <input className={`${inputCls} mt-1 w-full`} value={g.description ?? ''} maxLength={500} onChange={e => update(g.key, { description: e.target.value })} disabled={g.archived} />
                                        </label>
                                        <label className="text-xs text-gray-600 dark:text-gray-400">Who can post
                                            <select className={`${inputCls} mt-1 w-full`} value={g.who_can_post} onChange={e => update(g.key, { who_can_post: e.target.value as BatchGroup['who_can_post'] })} disabled={g.archived}>
                                                <option value="everyone">Everyone in the group</option>
                                                <option value="moderators">Only admins / moderators</option>
                                            </select>
                                        </label>
                                        <label className="text-xs text-gray-600 dark:text-gray-400">Members
                                            <select className={`${inputCls} mt-1 w-full`} value={g.audience} onChange={e => update(g.key, { audience: e.target.value as BatchGroup['audience'] })} disabled={g.archived}>
                                                <option value="all">All batch students + admins</option>
                                                <option value="staff">Admins only (staff group)</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-1 sm:pt-5">
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-500">
                                            {g.who_can_post === 'moderators' ? <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> : <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
                                            {g.audience === 'staff' ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Users className="h-3.5 w-3.5" aria-hidden="true" />}
                                        </span>
                                        {existing ? (
                                            <button type="button" onClick={() => update(g.key, { archived: !g.archived })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title={g.archived ? 'Restore group' : 'Archive group (read-only, history kept)'} aria-label={g.archived ? `Restore ${g.name}` : `Archive ${g.name}`}>
                                                {g.archived ? <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => onChange(value.filter(x => x.key !== g.key))} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label={`Remove ${g.name}`}>
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {g.archived && <p className="mt-1 text-xs text-gray-500">Archived — read-only; messages are kept.</p>}
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Custom group</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input className={`${inputCls} sm:w-56`} placeholder="Group name" value={customName} maxLength={80} onChange={e => setCustomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} aria-label="Custom group name" />
                    <input className={`${inputCls} flex-1`} placeholder="Description (optional)" value={customDesc} maxLength={500} onChange={e => setCustomDesc(e.target.value)} aria-label="Custom group description" />
                    <button type="button" onClick={addCustom} disabled={!customName.trim()} className="inline-flex items-center justify-center gap-1 rounded-lg bg-gray-900 dark:bg-white px-3 py-2 text-sm font-medium text-white dark:text-gray-900 disabled:opacity-40">
                        <Plus className="h-4 w-4" aria-hidden="true" /> Add
                    </button>
                </div>
            </div>
        </div>
    );
}
