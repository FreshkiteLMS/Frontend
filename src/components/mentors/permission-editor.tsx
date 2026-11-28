"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import api from '@/services/api/axios';
import { useAsync, inputCls, Panel, SkeletonBlock, ErrorState } from '@/components/admin/insights/ui';
import type { MentorAccess, PermissionCatalog } from '@/types/mentor';

/**
 * The mentor permission panel: Full Administrative Access, batch access,
 * student access and individual permissions, with a live plain-language
 * summary of what the mentor can and cannot do. The server applies the same
 * rules (services/access/accessControl.ts); this only previews them.
 */
export function PermissionEditor({ catalog, value, onChange }: { catalog: PermissionCatalog; value: MentorAccess; onChange: (v: MentorAccess) => void }) {
    const set = (patch: Partial<MentorAccess>) => onChange({ ...value, ...patch });
    const perms = new Set(value.permissions);
    const toggle = (key: string) => {
        const next = new Set(perms);
        if (next.has(key)) next.delete(key); else next.add(key);
        set({ permissions: Array.from(next) });
    };
    const setGroup = (keys: string[], on: boolean) => {
        const next = new Set(perms);
        for (const k of keys) { if (on) next.add(k); else next.delete(k); }
        set({ permissions: Array.from(next) });
    };

    return (
        <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
                <Panel title="Full Administrative Access">
                    <Toggle checked={value.fullAdmin} onChange={on => set({ fullAdmin: on })} label="Give this mentor the same operational access as an administrator">
                        Every admin module, every batch and every student. Still reserved for administrators: managing mentors and permissions, and the audit log. Financial permissions stay separate.
                    </Toggle>
                    {value.fullAdmin && (
                        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Only switch this on for someone you would trust as an administrator.
                        </p>
                    )}
                </Panel>

                <Panel title="Batch access" subtitle="Which batches the mentor can open.">
                    <BatchPicker value={value.batchIds} onChange={batchIds => set({ batchIds })} disabled={value.fullAdmin || value.batchScope === 'all'} />
                    <div className="mt-3">
                        <Toggle checked={value.fullAdmin || value.batchScope === 'all'} disabled={value.fullAdmin} onChange={on => set({ batchScope: on ? 'all' : 'assigned' })} label="All batches">
                            Every batch, current and future. Gives visibility only — actions still need the permissions below.
                        </Toggle>
                    </div>
                </Panel>

                <Panel title="Student access" subtitle="Which students the mentor can see.">
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Radio name="student-scope" checked={!value.fullAdmin && value.studentScope === 'assigned'} disabled={value.fullAdmin} onChange={() => set({ studentScope: 'assigned' })} title="Students in their batches">
                            Members of the batches above.
                        </Radio>
                        <Radio name="student-scope" checked={value.fullAdmin || value.studentScope === 'all'} disabled={value.fullAdmin} onChange={() => set({ studentScope: 'all' })} title="All students">
                            Every student in the LMS, including those in no batch. No admin modules come with it.
                        </Radio>
                    </div>
                </Panel>

                <Panel title="Permissions" subtitle={value.fullAdmin ? 'Full Administrative Access already includes every permission except the financial ones.' : 'What the mentor may do within the access above.'}>
                    <div className="space-y-6">
                        {catalog.groups.map(g => {
                            const keys = g.permissions.map(p => p.key);
                            const finance = g.permissions.some(p => p.finance);
                            const allOn = keys.every(k => perms.has(k));
                            return (
                                <fieldset key={g.key}>
                                    <legend className="mb-2 flex w-full items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{g.label}</span>
                                        {!(value.fullAdmin && !finance) && (
                                            <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => setGroup(keys, !allOn)}>{allOn ? 'Clear all' : 'Select all'}</button>
                                        )}
                                    </legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {g.permissions.map(p => {
                                            const implied = value.fullAdmin && !p.finance;
                                            return (
                                                <label key={p.key} className={`flex gap-3 rounded-lg border px-3 py-2 ${implied ? 'border-gray-100 opacity-70 dark:border-gray-800' : 'cursor-pointer border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/40'}`}>
                                                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300" checked={implied || perms.has(p.key)} disabled={implied} onChange={() => toggle(p.key)} />
                                                    <span>
                                                        <span className="block text-sm font-medium text-gray-900 dark:text-white">{p.label}</span>
                                                        <span className="block text-xs text-gray-500">{p.description}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            );
                        })}
                    </div>
                </Panel>
            </div>
            <div className="xl:sticky xl:top-20 xl:self-start">
                <EffectiveSummary catalog={catalog} value={value} />
            </div>
        </div>
    );
}

/** Live summary of the effective access for the current (unsaved) settings. */
export function EffectiveSummary({ catalog, value }: { catalog: PermissionCatalog; value: MentorAccess }) {
    const perms = new Set(value.permissions);
    const allowed = (key: string, finance?: boolean) => (finance ? perms.has(key) : value.fullAdmin || perms.has(key));
    const batchesAll = value.fullAdmin || value.batchScope === 'all';
    const studentsAll = value.fullAdmin || value.studentScope === 'all';
    return (
        <Panel title="What this mentor can access">
            <dl className="space-y-2 text-sm">
                <div><dt className="text-xs uppercase tracking-wide text-gray-500">Batches</dt><dd className="text-gray-900 dark:text-white">{batchesAll ? 'Every batch' : `${value.batchIds.length} assigned batch${value.batchIds.length === 1 ? '' : 'es'}`}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-gray-500">Students</dt><dd className="text-gray-900 dark:text-white">{studentsAll ? 'Every student' : batchesAll ? 'Students in any batch' : 'Students in the assigned batches'}</dd></div>
            </dl>
            {!value.fullAdmin && !batchesAll && value.batchIds.length === 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">No batches assigned: batch and student permissions reach nothing yet.</p>
            )}
            <div className="mt-4 space-y-3">
                {catalog.groups.map(g => {
                    const yes = g.permissions.filter(p => allowed(p.key, p.finance));
                    return (
                        <div key={g.key}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.label}</p>
                            {yes.length === 0 ? <p className="flex items-center gap-1.5 text-sm text-gray-400"><X className="h-3.5 w-3.5" aria-hidden="true" />Nothing</p> : (
                                <ul className="mt-1 space-y-0.5">
                                    {yes.map(p => <li key={p.key} className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200"><Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />{p.label}</li>)}
                                </ul>
                            )}
                        </div>
                    );
                })}
                <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Never</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Managing mentors or permissions (including their own) and the audit log.</p>
                </div>
            </div>
        </Panel>
    );
}

function BatchPicker({ value, onChange, disabled }: { value: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
    const [q, setQ] = useState('');
    const [dq, setDq] = useState('');
    useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
    const list = useAsync(() => api.get('/admin/batches', { params: { q: dq || undefined, limit: 100, sort: 'name', dir: 'asc' } }).then(r => r.data.data as { id: string; name: string; batch_number?: string; lifecycle?: string }[]), `perm-batches:${dq}`);
    const selected = new Set(value);
    const names = useMemo(() => new Map((list.data ?? []).map(b => [b.id, b.name])), [list.data]);
    return (
        <div className={disabled ? 'pointer-events-none opacity-50' : ''} aria-disabled={disabled}>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search batches" aria-label="Search batches" className={`${inputCls} w-full`} />
            {list.error ? <div className="mt-2"><ErrorState error={list.error} onRetry={list.reload} /></div> : !list.data ? <div className="mt-2"><SkeletonBlock rows={2} /></div> : (
                <ul className="mt-2 max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                    {list.data.length === 0 ? <li className="p-3 text-sm text-gray-500">No batches found.</li> : list.data.map(b => (
                        <li key={b.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selected.has(b.id)}
                                    onChange={() => onChange(selected.has(b.id) ? value.filter(x => x !== b.id) : [...value, b.id])} />
                                <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{b.name}</span>
                                <span className="shrink-0 font-mono text-xs text-gray-500">{b.batch_number}</span>
                                {b.lifecycle === 'archived' && <span className="shrink-0 text-xs text-gray-400">archived</span>}
                            </label>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-2 text-xs text-gray-500">{value.length} selected{value.length ? `: ${value.map(id => names.get(id) ?? '…').slice(0, 4).join(', ')}${value.length > 4 ? ` and ${value.length - 4} more` : ''}` : ''}</p>
        </div>
    );
}

function Toggle({ checked, onChange, label, children, disabled }: { checked: boolean; onChange: (on: boolean) => void; label: string; children?: React.ReactNode; disabled?: boolean }) {
    return (
        <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                <span className="sr-only">{label}</span>
            </button>
            <span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>{children && <span className="block text-sm text-gray-600 dark:text-gray-400">{children}</span>}</span>
        </label>
    );
}

function Radio({ name, checked, onChange, title, children, disabled }: { name: string; checked: boolean; onChange: () => void; title: string; children: React.ReactNode; disabled?: boolean }) {
    return (
        <label className={`flex gap-3 rounded-xl border p-3 ${checked ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'} ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
            <input type="radio" name={name} className="mt-1" checked={checked} disabled={disabled} onChange={onChange} />
            <span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span><span className="block text-sm text-gray-600 dark:text-gray-400">{children}</span></span>
        </label>
    );
}

export function useCatalog() {
    return useAsync(() => import('@/services/api/mentor.api').then(m => m.mentorAdminService.catalog()), 'mentor-catalog');
}
