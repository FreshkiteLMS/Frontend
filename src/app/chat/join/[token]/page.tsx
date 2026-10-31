"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Clock, Link2Off, Loader2, Lock, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { useChatStore } from '@/stores/chat-store';
import type { InvitePreview, InviteStatus } from '@/types/chat';

const DEAD_LINK: Record<Exclude<InviteStatus, 'valid'>, { icon: typeof Lock; title: string; body: string }> = {
    invalid: { icon: Link2Off, title: 'Invite link not recognised', body: 'Check that you copied the whole link, or ask for a new one.' },
    revoked: { icon: Link2Off, title: 'This invite link was revoked', body: 'A group admin turned this link off. Ask them for a new one.' },
    expired: { icon: Clock, title: 'This invite link has expired', body: 'Ask a group admin to share a fresh link.' },
    exhausted: { icon: Users, title: 'This invite link is full', body: 'It has reached its maximum number of joins. Ask for a new one.' },
    locked: { icon: Lock, title: 'This group is closed', body: 'The group is not accepting new members right now.' },
    unavailable: { icon: AlertTriangle, title: 'This group is no longer available', body: 'It may have been deleted.' },
};

/**
 * Landing page for a group invite link. Members go straight to the chat;
 * everyone else sees a preview (name, description, size — never messages)
 * and a Join button. Signed-out visitors are sent to login by the proxy and
 * come back here afterwards. Dead links explain why instead of 404ing.
 */
export default function JoinGroupPage() {
    const params = useParams<{ token: string }>();
    const token = typeof params?.token === 'string' ? params.token : '';
    const router = useRouter();
    const { user, isLoading } = useAuth();

    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoadError(null);
        setPreview(null);
        try {
            const data = await chatService.previewInvite(token);
            if (data.is_member && data.conversation) {
                router.replace(`/chat/${data.conversation.id}`);
                return;
            }
            setPreview(data);
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setLoadError(e?.response?.data?.message || e?.message || 'Could not load this invite');
        }
    }, [token, router]);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            // The proxy normally does this before the page renders.
            router.replace(`/login?next=${encodeURIComponent(`/chat/join/${token}`)}`);
            return;
        }
        void load();
    }, [isLoading, user, token, router, load]);

    const join = async () => {
        setJoining(true);
        setJoinError(null);
        try {
            const conversation = await chatService.joinByInvite(token);
            useChatStore.getState().upsertConversation(conversation);
            router.replace(`/chat/${conversation.id}`);
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setJoinError(e?.response?.data?.message || e?.message || 'Could not join the group');
            setJoining(false);
            // The link may have died meanwhile — refresh the explanation.
            void load();
        }
    };

    const dead = preview && preview.status !== 'valid' ? DEAD_LINK[preview.status] : null;
    const group = preview?.conversation;

    return (
        <>
            <Header />
            <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-gray-950">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
                    {!preview && !loadError && (
                        <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-sm">Checking invite…</p>
                        </div>
                    )}

                    {loadError && (
                        <div className="space-y-4">
                            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Could not open this invite</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{loadError}</p>
                            <button onClick={() => void load()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                                Try again
                            </button>
                        </div>
                    )}

                    {dead && (
                        <div className="space-y-4">
                            <dead.icon className="w-10 h-10 mx-auto text-gray-400" />
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{dead.title}</h1>
                            {group?.name && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{group.name}</p>}
                            <p className="text-sm text-gray-500 dark:text-gray-400">{dead.body}</p>
                            <Link href="/chat" className="inline-block px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                Go to chats
                            </Link>
                        </div>
                    )}

                    {preview?.status === 'valid' && group && (
                        <div className="space-y-5">
                            <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                                {group.avatar_url
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : group.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">You&apos;re invited to join</p>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                                    <Users className="w-4 h-4" /> {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                </p>
                            </div>
                            {group.description && <p className="text-sm text-gray-600 dark:text-gray-300">{group.description}</p>}
                            {preview.expires_at && (
                                <p className="text-xs text-gray-400">Link expires {new Date(preview.expires_at).toLocaleString()}</p>
                            )}
                            {joinError && <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>}
                            <div className="flex gap-2 justify-center">
                                <Link href="/chat" className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    Not now
                                </Link>
                                <button
                                    onClick={join}
                                    disabled={joining}
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
                                >
                                    {joining && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Join group
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
