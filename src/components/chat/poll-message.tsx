"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { getChatNsp } from '@/services/chat-socket';
import { CHAT_EVENTS, type ChatMessage, type ChatPollView, type PollUpdatedPayload } from '@/types/chat';

interface PollMessageProps {
    pollId: string;
    message: ChatMessage;
}

function optionVotes(option: { voter_ids?: string[]; vote_count?: number }): number {
    if (Array.isArray(option.voter_ids)) return option.voter_ids.length;
    return option.vote_count ?? 0;
}

export function PollMessage({ pollId, message }: PollMessageProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [poll, setPoll] = useState<ChatPollView | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => setMounted(true), []);

    const load = useCallback(async () => {
        try {
            const data = await chatService.getPoll(pollId);
            setPoll(data);
        } catch {
            setPoll(null);
        } finally {
            setLoading(false);
        }
    }, [pollId]);

    useEffect(() => {
        load();
    }, [load]);

    // Live updates for this poll only.
    useEffect(() => {
        let socket: ReturnType<typeof getChatNsp> | null = null;
        const handler = (payload: PollUpdatedPayload) => {
            if (payload?.poll?.id === pollId) setPoll(payload.poll);
        };
        try {
            socket = getChatNsp();
            socket.on(CHAT_EVENTS.POLL_UPDATED, handler);
        } catch {
            socket = null;
        }
        return () => {
            socket?.off(CHAT_EVENTS.POLL_UPDATED, handler);
        };
    }, [pollId]);

    const myId = mounted ? user?.id : undefined;
    const role = (user?.role || '') as string;
    const isAdmin = role === 'admin' || role === 'teacher';

    const myOptionIds = useMemo(() => {
        if (!poll || !myId) return new Set<string>();
        if (poll.own_option_ids) return new Set(poll.own_option_ids);
        const ids = poll.options.filter((o) => o.voter_ids?.includes(myId)).map((o) => o.id);
        return new Set(ids);
    }, [poll, myId]);

    const totalVotes = useMemo(
        () => (poll ? poll.options.reduce((sum, o) => sum + optionVotes(o), 0) : 0),
        [poll],
    );

    const isClosed = useMemo(() => {
        if (!poll) return false;
        if (poll.closed) return true;
        if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) return true;
        return false;
    }, [poll]);

    const canClose = Boolean(poll && mounted && (poll.created_by === user?.id || isAdmin) && !isClosed);

    const vote = async (optionId: string) => {
        if (!poll || isClosed || voting) return;
        const already = myOptionIds.has(optionId);
        let next: string[];
        if (poll.allow_multiple) {
            next = already
                ? Array.from(myOptionIds).filter((id) => id !== optionId)
                : [...Array.from(myOptionIds), optionId];
        } else {
            if (already) return;
            next = [optionId];
        }
        setVoting(true);
        try {
            const updated = await chatService.votePoll(pollId, next);
            setPoll(updated);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to vote');
        } finally {
            setVoting(false);
        }
    };

    const closePoll = async () => {
        if (!poll || closing) return;
        setClosing(true);
        try {
            const updated = await chatService.closePoll(pollId);
            setPoll(updated);
            toast.success('Poll closed');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to close poll');
        } finally {
            setClosing(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!poll) {
        return (
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {message.content || 'This poll is no longer available.'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
            <div className="flex items-start gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{poll.question}</p>
            </div>

            <div className="space-y-2">
                {poll.options.map((option) => {
                    const votes = optionVotes(option);
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const mine = myOptionIds.has(option.id);
                    return (
                        <button
                            key={option.id}
                            onClick={() => vote(option.id)}
                            disabled={isClosed || voting}
                            className={`relative w-full overflow-hidden rounded-lg border text-left transition-colors ${
                                mine
                                    ? 'border-blue-500 ring-1 ring-blue-500'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } ${isClosed || voting ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                            <span
                                className="absolute inset-y-0 left-0 bg-blue-100 dark:bg-blue-900/30 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                                aria-hidden="true"
                            />
                            <span className="relative flex items-center justify-between gap-2 px-3 py-2">
                                <span className="flex items-center gap-1.5 min-w-0">
                                    {mine && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                                    <span className="text-sm text-gray-900 dark:text-white truncate">{option.text}</span>
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                    {poll.is_anonymous && ' · Anonymous'}
                    {isClosed
                        ? ' · Closed'
                        : poll.closes_at
                          ? ` · Closes ${new Date(poll.closes_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}`
                          : ''}
                </p>
                {canClose && (
                    <button
                        onClick={closePoll}
                        disabled={closing}
                        className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
                    >
                        <Lock className="w-3 h-3" />
                        {closing ? 'Closing…' : 'Close poll'}
                    </button>
                )}
            </div>
        </div>
    );
}
