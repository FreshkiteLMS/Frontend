"use client";

import { useEffect, useState } from 'react';
import { Check, Copy, Inbox, Link2, RefreshCw, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { batchAdminService, invitationUrl } from '@/services/api/batch-admin.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import { useStaffAccess } from '@/hooks/use-staff-access';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import {
    Avatar, DataNote, Empty, ErrorState, Panel, Pill, SkeletonBlock, StudentCode, btnPrimary, btnSecondary, fmtDate, fmtDateTime, fmtRelative, inputCls, useAsync,
} from '@/components/admin/insights/ui';
import type { Invitation, JoinMode, JoinRequestRow } from '@/types/batch-admin';

const STATE_TEXT: Record<Invitation['state'], { label: string; tone: string }> = {
    active: { label: 'Working', tone: 'active' },
    expired: { label: 'Expired', tone: 'inactive' },
    exhausted: { label: 'Limit reached', tone: 'inactive' },
    revoked: { label: 'Turned off', tone: 'neutral' },
};

const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/**
 * How students get into the batch: the invitation link, the joining method
 * (join at once / ask for approval), the seat limit, and the requests waiting
 * for a decision.
 */
export function BatchJoining({ batchId, batchName, joinMode, maxStudents, archived, onChanged }: {
    batchId: string; batchName: string; joinMode: JoinMode; maxStudents: number | null; archived: boolean; onChanged: () => void;
}) {
    const access = useStaffAccess();
    return (
        <div className="space-y-5">
            {archived && <DataNote>This batch is archived: links do not work and no one can join. Restore it in Settings to accept students again.</DataNote>}
            {access.can('batches.invitations') && <InvitationPanel batchId={batchId} batchName={batchName} archived={archived} />}
            {access.can('batches.edit') && <JoiningSettings batchId={batchId} joinMode={joinMode} maxStudents={maxStudents} onSaved={onChanged} />}
            {access.can('batches.approve_requests') && <RequestsPanel batchId={batchId} onChanged={onChanged} />}
        </div>
    );
}

function InvitationPanel({ batchId, batchName, archived }: { batchId: string; batchName: string; archived: boolean }) {
    const inv = useAsync(() => batchAdminService.invitation(batchId), `inv:${batchId}`);
    const past = useAsync(() => batchAdminService.invitations(batchId), `invs:${batchId}`);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(null);
    const [expiresAt, setExpiresAt] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const current = inv.data;
    useEffect(() => {
        setExpiresAt(toLocalInput(current?.expiresAt ?? null));
        setMaxUses(current?.maxUses ? String(current.maxUses) : '');
    }, [current?.id, current?.expiresAt, current?.maxUses]);

    const settings = () => ({ expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, maxUses: maxUses ? Number(maxUses) : null });
    const reload = () => { inv.reload(); past.reload(); };
    const run = async (fn: () => Promise<unknown>, ok: string) => {
        setBusy(true);
        try { await fn(); toast.success(ok); reload(); } catch (err) { toast.error(apiErrorMessage(err, 'That did not work')); } finally { setBusy(false); setConfirm(null); }
    };
    const url = current?.path ? invitationUrl(current.path) : '';
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast.error('Copy did not work — select the link and copy it'); }
    };

    return (
        <Panel title="Invitation link" subtitle={`Anyone signed in with a student account who opens this link can join ${batchName} (or ask to, if approval is on).`}>
            {inv.error ? <ErrorState error={inv.error} onRetry={inv.reload} /> : inv.loading && !inv.data ? <SkeletonBlock rows={2} /> : !current ? (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">There is no working link. Create one to share it with students.</p>
                    <LinkSettings expiresAt={expiresAt} maxUses={maxUses} onExpires={setExpiresAt} onMaxUses={setMaxUses} />
                    <button type="button" className={btnPrimary} disabled={busy || archived} onClick={() => run(() => batchAdminService.generateInvitation(batchId, settings()), 'Invitation link created')}>
                        <Link2 className="h-4 w-4" aria-hidden="true" /> Create link
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={STATE_TEXT[current.state].tone}>{STATE_TEXT[current.state].label}</Pill>
                        <span className="text-xs text-gray-500">Used {current.useCount}{current.maxUses ? ` of ${current.maxUses}` : ''} time{current.useCount === 1 ? '' : 's'} · created {fmtDate(current.createdAt)}{current.expiresAt ? ` · expires ${fmtDateTime(current.expiresAt)}` : ' · never expires'}</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input readOnly value={url} aria-label="Invitation link" onFocus={e => e.currentTarget.select()} className={`${inputCls} w-full font-mono text-xs`} />
                        <button type="button" className={btnPrimary} onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
                    </div>
                    <LinkSettings expiresAt={expiresAt} maxUses={maxUses} onExpires={setExpiresAt} onMaxUses={setMaxUses} />
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={btnSecondary} disabled={busy} onClick={() => run(() => batchAdminService.updateInvitation(batchId, settings()), 'Link settings saved')}>Save expiry and limit</button>
                        <button type="button" className={btnSecondary} disabled={busy} onClick={() => setConfirm('regenerate')}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Regenerate</button>
                        <button type="button" className={`${btnSecondary} text-red-600 dark:text-red-400`} disabled={busy} onClick={() => setConfirm('revoke')}><ShieldOff className="h-4 w-4" aria-hidden="true" /> Turn off</button>
                    </div>
                </div>
            )}
            {(past.data ?? []).filter(p => !p.active).length > 0 && (
                <details className="mt-5 text-sm">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400">Earlier links ({(past.data ?? []).filter(p => !p.active).length})</summary>
                    <ul className="mt-2 space-y-1 text-xs text-gray-500">
                        {(past.data ?? []).filter(p => !p.active).map(p => (
                            <li key={p.id}>Created {fmtDate(p.createdAt)} · used {p.useCount} · {p.revokedReason === 'regenerated' ? 'replaced' : 'turned off'} {fmtRelative(p.revokedAt)}</li>
                        ))}
                    </ul>
                </details>
            )}
            <ConfirmDialog open={!!confirm} busy={busy}
                title={confirm === 'regenerate' ? 'Regenerate the link?' : 'Turn the link off?'}
                message={confirm === 'regenerate' ? 'A new link is created and the current one stops working at once. Students who already joined stay members.' : 'The link stops working at once. Students who already joined stay members. You can create a new link later.'}
                confirmLabel={confirm === 'regenerate' ? 'Regenerate' : 'Turn off'}
                onConfirm={() => confirm === 'regenerate'
                    ? run(() => batchAdminService.generateInvitation(batchId, settings()), 'New link created; the old one no longer works')
                    : run(() => batchAdminService.revokeInvitation(batchId), 'Link turned off')}
                onCancel={() => setConfirm(null)} />
        </Panel>
    );
}

function LinkSettings({ expiresAt, maxUses, onExpires, onMaxUses }: { expiresAt: string; maxUses: string; onExpires: (v: string) => void; onMaxUses: (v: string) => void }) {
    return (
        <div className="grid w-full gap-3 sm:grid-cols-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">Expires (optional)
                <input type="datetime-local" className={`${inputCls} mt-1 w-full`} value={expiresAt} onChange={e => onExpires(e.target.value)} />
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300">Maximum uses (optional)
                <input type="number" min={1} max={100000} placeholder="No limit" className={`${inputCls} mt-1 w-full`} value={maxUses} onChange={e => onMaxUses(e.target.value)} />
            </label>
        </div>
    );
}

function JoiningSettings({ batchId, joinMode, maxStudents, onSaved }: { batchId: string; joinMode: JoinMode; maxStudents: number | null; onSaved: () => void }) {
    const [mode, setMode] = useState<JoinMode>(joinMode);
    const [cap, setCap] = useState(maxStudents ? String(maxStudents) : '');
    const [busy, setBusy] = useState(false);
    useEffect(() => { setMode(joinMode); setCap(maxStudents ? String(maxStudents) : ''); }, [joinMode, maxStudents]);
    const save = async () => {
        setBusy(true);
        try {
            await batchAdminService.setJoining(batchId, { joinMode: mode, maxStudents: cap ? Number(cap) : null });
            toast.success('Joining settings saved');
            onSaved();
        } catch (err) { toast.error(apiErrorMessage(err, 'Settings were not saved')); } finally { setBusy(false); }
    };
    const option = (id: JoinMode, title: string, text: string) => (
        <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
            <input type="radio" name="join-mode" className="mt-1" checked={mode === id} onChange={() => setMode(id)} />
            <span><span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span><span className="block text-sm text-gray-600 dark:text-gray-400">{text}</span></span>
        </label>
    );
    return (
        <Panel title="Joining method and capacity">
            <div className="grid gap-3 md:grid-cols-2">
                {option('direct', 'Join directly', 'A student with a working link becomes a member at once and gets the batch courses.')}
                {option('approval', 'Admin approval', 'A student with the link sends a request; staff approve or reject it below.')}
            </div>
            <label className="mt-4 block max-w-xs text-sm text-gray-700 dark:text-gray-300">Maximum students (optional)
                <input type="number" min={1} max={100000} placeholder="No limit" className={`${inputCls} mt-1 w-full`} value={cap} onChange={e => setCap(e.target.value)} />
            </label>
            <p className="mt-1 text-xs text-gray-500">When the batch is full, links and manual adds are refused until a seat frees up.</p>
            <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
        </Panel>
    );
}

export function RequestsPanel({ batchId, onChanged }: { batchId: string; onChanged: () => void }) {
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const list = useAsync(() => batchAdminService.requests(batchId, status), `reqs:${batchId}:${status}`);
    const [rejecting, setRejecting] = useState<JoinRequestRow | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const approve = async (r: JoinRequestRow) => {
        setBusy(r.id);
        try { await batchAdminService.approve(batchId, r.id); toast.success(`${r.name ?? 'Student'} joined the batch`); list.reload(); onChanged(); }
        catch (err) { toast.error(apiErrorMessage(err, 'Could not approve')); } finally { setBusy(null); }
    };
    const reject = async () => {
        if (!rejecting) return;
        setBusy(rejecting.id);
        try { await batchAdminService.reject(batchId, rejecting.id, reason.trim()); toast.success('Request rejected'); setRejecting(null); setReason(''); list.reload(); }
        catch (err) { toast.error(apiErrorMessage(err, 'Could not reject')); } finally { setBusy(null); }
    };
    return (
        <Panel title="Joining requests" subtitle="Students who asked to join through the link while approval is on."
            actions={<select aria-label="Request status" className={inputCls} value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="pending">Waiting</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>}>
            {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonBlock rows={2} /> : list.data.rows.length === 0 ? (
                <Empty icon={<Inbox className="h-10 w-10" />} title={status === 'pending' ? 'No requests waiting' : `No ${status} requests`} />
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {list.data.rows.map(r => (
                        <li key={r.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <Avatar name={r.name ?? 'Student'} url={r.avatarUrl} size={32} />
                                <div className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{r.name}</span>
                                    <span className="block truncate text-xs text-gray-500">{r.email} · asked {fmtRelative(r.createdAt)}</span>
                                    <StudentCode code={r.studentCode} />
                                    {r.message && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">“{r.message}”</p>}
                                    {r.decisionReason && <p className="mt-1 text-xs text-gray-500">Reason: {r.decisionReason}</p>}
                                </div>
                            </div>
                            {r.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button type="button" className={btnSecondary} disabled={busy === r.id} onClick={() => { setReason(''); setRejecting(r); }}>Reject</button>
                                    <button type="button" className={btnPrimary} disabled={busy === r.id} onClick={() => approve(r)}>{busy === r.id ? 'Approving…' : 'Approve'}</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject the request" size="sm"
                footer={<div className="flex justify-end gap-2"><button type="button" className={btnSecondary} onClick={() => setRejecting(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={!reason.trim() || !!busy} onClick={reject}>Reject</button></div>}>
                <label className="block text-sm text-gray-700 dark:text-gray-300">Reason — the student sees this
                    <textarea rows={3} className={`${inputCls} mt-1 w-full`} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} />
                </label>
            </Modal>
        </Panel>
    );
}
