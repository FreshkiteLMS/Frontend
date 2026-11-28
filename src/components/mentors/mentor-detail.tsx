"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pause, Play, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { mentorAdminService } from '@/services/api/mentor.api';
import { AUDIT_LABEL } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import {
    Avatar, Breadcrumbs, ErrorState, Panel, Pill, SkeletonBlock, TabBar, btnPrimary, btnSecondary, fmtDate, fmtDateTime, fmtRelative, inputCls, useAsync, type TabDef,
} from '@/components/admin/insights/ui';
import type { MentorAccess, MentorDetail as Detail } from '@/types/mentor';
import { PermissionEditor, useCatalog } from './permission-editor';

type Tab = 'access' | 'profile' | 'activity';

/** One mentor: permissions panel, profile and account actions, activity. */
export function MentorDetail({ mentorId }: { mentorId: string }) {
    const router = useRouter();
    const mentor = useAsync(() => mentorAdminService.get(mentorId), `mentor:${mentorId}`);
    const catalog = useCatalog();
    const [tab, setTab] = useState<Tab>('access');
    const [access, setAccess] = useState<MentorAccess | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState<'deactivate' | 'remove' | 'reset' | null>(null);
    const [busy, setBusy] = useState(false);
    const [password, setPassword] = useState<string | null>(null);
    const m = mentor.data;
    useEffect(() => {
        if (m) setAccess({ fullAdmin: m.fullAdmin, batchScope: m.batchScope, studentScope: m.studentScope, permissions: m.permissions, batchIds: m.batchIds });
    }, [m]);
    const dirty = !!m && !!access && JSON.stringify([access.fullAdmin, access.batchScope, access.studentScope, [...access.permissions].sort(), [...access.batchIds].sort()])
        !== JSON.stringify([m.fullAdmin, m.batchScope, m.studentScope, [...m.permissions].sort(), [...m.batchIds].sort()]);

    const save = async () => {
        if (!access) return;
        setSaving(true);
        try { await mentorAdminService.saveAccess(mentorId, access); toast.success('Permissions saved — they apply on the mentor’s next action'); mentor.reload(); }
        catch (err) { toast.error(apiErrorMessage(err, 'Permissions were not saved')); } finally { setSaving(false); }
    };
    const act = async () => {
        setBusy(true);
        try {
            if (confirm === 'deactivate') { await mentorAdminService.deactivate(mentorId); toast.success('Mentor deactivated and signed out'); }
            if (confirm === 'remove') {
                const r = await mentorAdminService.remove(mentorId);
                toast.success(r.restoredRole ? `Mentor access removed; the account is a ${r.restoredRole} again` : 'Mentor access removed');
                router.push('/admin/mentors');
                return;
            }
            if (confirm === 'reset') { const r = await mentorAdminService.resetPassword(mentorId); setPassword(r.temporaryPassword); }
            setConfirm(null);
            mentor.reload();
        } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); } finally { setBusy(false); }
    };
    const activate = async () => {
        try { await mentorAdminService.activate(mentorId); toast.success('Mentor active again'); mentor.reload(); } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); }
    };

    const tabs: TabDef<Tab>[] = [{ id: 'access', label: 'Permissions' }, { id: 'profile', label: 'Profile' }, { id: 'activity', label: 'Activity' }];
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={[{ label: 'Mentors', href: '/admin/mentors' }, { label: m?.name ?? 'Mentor' }]} />
            {mentor.error ? <ErrorState error={mentor.error} onRetry={mentor.reload} /> : !m ? <SkeletonBlock rows={5} /> : (
                <>
                    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
                        <Avatar name={m.name} url={m.avatarUrl} size={56} />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{m.name}</h1>
                                <span className="font-mono text-xs text-gray-500">{m.mentorCode}</span>
                                <Pill tone={m.status === 'active' ? 'active' : 'inactive'}>{m.status === 'active' ? 'Active' : 'Inactive'}</Pill>
                                {m.fullAdmin && <Pill tone="danger">Full administrative</Pill>}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''} · added {fmtDate(m.createdAt)} · last active {fmtRelative(m.lastActiveAt)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {m.status === 'active'
                                ? <button type="button" className={btnSecondary} onClick={() => setConfirm('deactivate')}><Pause className="h-4 w-4" aria-hidden="true" /> Deactivate</button>
                                : <button type="button" className={btnSecondary} onClick={activate}><Play className="h-4 w-4" aria-hidden="true" /> Activate</button>}
                            <button type="button" className={btnSecondary} onClick={() => setConfirm('reset')}><KeyRound className="h-4 w-4" aria-hidden="true" /> Reset password</button>
                            <button type="button" className={`${btnSecondary} text-red-600 dark:text-red-400`} onClick={() => setConfirm('remove')}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>
                        </div>
                    </div>
                    <TabBar tabs={tabs} active={tab} onChange={setTab} label="Mentor sections" />
                    {tab === 'access' && (catalog.error ? <ErrorState error={catalog.error} onRetry={catalog.reload} /> : !catalog.data || !access ? <SkeletonBlock rows={6} /> : (
                        <>
                            <PermissionEditor catalog={catalog.data} value={access} onChange={setAccess} />
                            <div className="sticky bottom-4 mt-5 flex items-center justify-end gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900/95">
                                <span className="text-sm text-gray-500">{dirty ? 'Unsaved changes' : 'Saved'}</span>
                                <button type="button" className={btnSecondary} disabled={!dirty || saving} onClick={() => setAccess({ fullAdmin: m.fullAdmin, batchScope: m.batchScope, studentScope: m.studentScope, permissions: m.permissions, batchIds: m.batchIds })}>Undo</button>
                                <button type="button" className={btnPrimary} disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save permissions'}</button>
                            </div>
                        </>
                    ))}
                    {tab === 'profile' && <ProfileTab m={m} onSaved={mentor.reload} />}
                    {tab === 'activity' && <ActivityTab mentorId={mentorId} />}
                </>
            )}
            <ConfirmDialog open={!!confirm} busy={busy}
                title={confirm === 'deactivate' ? `Deactivate ${m?.name}?` : confirm === 'remove' ? `Remove mentor access for ${m?.name}?` : `Reset ${m?.name}’s password?`}
                message={confirm === 'deactivate' ? 'They are signed out everywhere and cannot sign in until you activate them again. Their settings are kept.'
                    : confirm === 'remove' ? (m?.previousRole ? `They lose mentor access and their account becomes a ${m.previousRole} account again. The audit trail is kept.` : 'They lose mentor access and can no longer sign in. The audit trail is kept.')
                        : 'A new temporary password is created and shown once. Their current sessions end.'}
                confirmLabel={confirm === 'deactivate' ? 'Deactivate' : confirm === 'remove' ? 'Remove access' : 'Reset password'}
                tone={confirm === 'reset' ? 'primary' : 'danger'} onConfirm={act} onCancel={() => setConfirm(null)} />
            <Modal open={!!password} onClose={() => setPassword(null)} title="New temporary password" size="sm"
                footer={<div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => setPassword(null)}>Done</button></div>}>
                <p className="text-sm text-gray-700 dark:text-gray-300">Share it privately. It is not shown again.</p>
                <p className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-sm dark:bg-gray-800">{password}</p>
            </Modal>
        </div>
    );
}

function ProfileTab({ m, onSaved }: { m: Detail; onSaved: () => void }) {
    const [name, setName] = useState(m.name);
    const [email, setEmail] = useState(m.email);
    const [phone, setPhone] = useState(m.phone ?? '');
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        try { await mentorAdminService.update(m.id, { name: name.trim(), email: email.trim(), phone: phone.trim() || null }); toast.success('Profile saved'); onSaved(); }
        catch (err) { toast.error(apiErrorMessage(err, 'Profile was not saved')); } finally { setBusy(false); }
    };
    return (
        <Panel title="Profile">
            <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm text-gray-700 dark:text-gray-300">Full name<input className={`${inputCls} mt-1 w-full`} value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
                <label className="text-sm text-gray-700 dark:text-gray-300">Email<input type="email" className={`${inputCls} mt-1 w-full`} value={email} maxLength={200} onChange={e => setEmail(e.target.value)} /></label>
                <label className="text-sm text-gray-700 dark:text-gray-300">Phone<input className={`${inputCls} mt-1 w-full`} value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} /></label>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-gray-500">Mentor ID</dt><dd className="font-mono text-gray-900 dark:text-white">{m.mentorCode}</dd></div>
                <div><dt className="text-xs text-gray-500">Created</dt><dd className="text-gray-900 dark:text-white">{fmtDateTime(m.createdAt)}</dd></div>
                <div><dt className="text-xs text-gray-500">Previous role</dt><dd className="text-gray-900 dark:text-white">{m.previousRole ?? 'None (new account)'}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save profile'}</button></div>
        </Panel>
    );
}

function ActivityTab({ mentorId }: { mentorId: string }) {
    const [page, setPage] = useState(1);
    const act = useAsync(() => mentorAdminService.activity(mentorId, page), `mact:${mentorId}:${page}`);
    if (act.error) return <ErrorState error={act.error} onRetry={act.reload} />;
    if (!act.data) return <SkeletonBlock rows={5} />;
    const a = act.data;
    return (
        <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="What they did" className="lg:col-span-2">
                {a.actions.rows.length === 0 ? <p className="text-sm text-gray-500">No recorded actions yet.</p> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {a.actions.rows.map(r => (
                            <li key={r.id} className="flex gap-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1 text-gray-900 dark:text-white">{AUDIT_LABEL[r.action] ?? r.action}
                                    {r.action === 'mentor.admin_request' && typeof r.metadata?.path === 'string' && <span className="text-gray-500"> · {String(r.metadata.method)} {String(r.metadata.path)}</span>}
                                </span>
                                <time className="shrink-0 text-xs text-gray-500" title={fmtDateTime(r.at)}>{fmtRelative(r.at)}</time>
                            </li>
                        ))}
                    </ul>
                )}
                {a.actions.totalPages > 1 && (
                    <div className="mt-3 flex justify-end gap-2">
                        <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Newer</button>
                        <button type="button" className={btnSecondary} disabled={page >= a.actions.totalPages} onClick={() => setPage(p => p + 1)}>Older</button>
                    </div>
                )}
            </Panel>
            <div className="space-y-5">
                <Panel title="Recent sign-ins">
                    {a.signIns.length === 0 ? <p className="text-sm text-gray-500">Never signed in.</p> : (
                        <ul className="space-y-1.5 text-sm">{a.signIns.map((s, i) => <li key={i} className="flex justify-between gap-2"><span className="text-gray-800 dark:text-gray-200">{fmtDateTime(s.at)}</span><span className="text-xs text-gray-500">{s.revokedAt ? 'ended' : s.method}</span></li>)}</ul>
                    )}
                </Panel>
                <Panel title="Access changes">
                    {a.accessChanges.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
                        <ul className="space-y-1.5 text-sm">{a.accessChanges.map(c => <li key={c.id}><span className="text-gray-800 dark:text-gray-200">{AUDIT_LABEL[c.action] ?? c.action}</span><span className="block text-xs text-gray-500">{c.actorName} · {fmtRelative(c.at)}</span></li>)}</ul>
                    )}
                </Panel>
            </div>
        </div>
    );
}
