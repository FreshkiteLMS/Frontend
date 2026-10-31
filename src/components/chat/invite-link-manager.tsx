"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Link2, Link2Off, Loader2, RefreshCw } from 'lucide-react';
import { chatService } from '@/services/api/chat.api';
import type { InviteLink } from '@/types/chat';

const EXPIRY_OPTIONS: Array<{ label: string; hours: number | null }> = [
    { label: 'Never', hours: null },
    { label: '1 hour', hours: 1 },
    { label: '1 day', hours: 24 },
    { label: '7 days', hours: 168 },
    { label: '30 days', hours: 720 },
];
const USE_OPTIONS: Array<{ label: string; uses: number | null }> = [
    { label: 'No limit', uses: null },
    { label: '1 use', uses: 1 },
    { label: '5 uses', uses: 5 },
    { label: '25 uses', uses: 25 },
    { label: '100 uses', uses: 100 },
];

function errorText(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e?.response?.data?.message || e?.message || fallback;
}

/**
 * Invite-link controls for group moderators: create (with optional expiry and
 * use limit), copy, regenerate (which revokes the old link) and revoke.
 */
export function InviteLinkManager({ conversationId }: { conversationId: string }) {
    const [invite, setInvite] = useState<InviteLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<'create' | 'revoke' | null>(null);
    const [expiryHours, setExpiryHours] = useState<number | null>(null);
    const [maxUses, setMaxUses] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setInvite(await chatService.getInviteLink(conversationId));
        } catch (err) {
            toast.error(errorText(err, 'Failed to load invite link'));
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        void load();
    }, [load]);

    const link = invite ? `${window.location.origin}/chat/join/${invite.token}` : '';

    const create = async () => {
        if (invite && !window.confirm('Create a new link? The current link will stop working.')) return;
        setBusy('create');
        try {
            const next = await chatService.rotateInviteLink(conversationId, { expires_in_hours: expiryHours, max_uses: maxUses });
            setInvite(next);
            toast.success(invite ? 'New invite link created' : 'Invite link created');
        } catch (err) {
            toast.error(errorText(err, 'Failed to create invite link'));
        } finally {
            setBusy(null);
        }
    };

    const revoke = async () => {
        if (!window.confirm('Revoke this invite link? People who have it will no longer be able to join.')) return;
        setBusy('revoke');
        try {
            await chatService.revokeInviteLink(conversationId);
            setInvite(null);
            toast.success('Invite link revoked');
        } catch (err) {
            toast.error(errorText(err, 'Failed to revoke invite link'));
        } finally {
            setBusy(null);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Invite link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    const expired = invite?.expires_at ? new Date(invite.expires_at).getTime() <= Date.now() : false;
    const exhausted = invite?.max_uses ? invite.use_count >= invite.max_uses : false;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-3">
            {loading ? (
                <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
            ) : invite ? (
                <>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 min-w-0 truncate text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5" title={link}>
                            {link}
                        </code>
                        <button
                            onClick={copy}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                            aria-label="Copy invite link"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className={`text-xs ${expired || exhausted ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {expired
                            ? 'This link has expired.'
                            : exhausted
                              ? 'This link has reached its use limit.'
                              : [
                                    invite.expires_at ? `Expires ${new Date(invite.expires_at).toLocaleString()}` : 'Never expires',
                                    invite.max_uses ? `${invite.use_count}/${invite.max_uses} uses` : `${invite.use_count} joined`,
                                ].join(' · ')}
                    </p>
                </>
            ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No active invite link. Create one to let people join.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <span>Expires</span>
                    <select
                        value={expiryHours ?? ''}
                        onChange={(e) => setExpiryHours(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                    >
                        {EXPIRY_OPTIONS.map((o) => <option key={o.label} value={o.hours ?? ''}>{o.label}</option>)}
                    </select>
                </label>
                <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <span>Limit</span>
                    <select
                        value={maxUses ?? ''}
                        onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200"
                    >
                        {USE_OPTIONS.map((o) => <option key={o.label} value={o.uses ?? ''}>{o.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={create}
                    disabled={busy !== null}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                    {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : invite ? <RefreshCw className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    {invite ? 'New link' : 'Create link'}
                </button>
                {invite && (
                    <button
                        onClick={revoke}
                        disabled={busy !== null}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                        {busy === 'revoke' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
                        Revoke
                    </button>
                )}
            </div>
        </div>
    );
}
