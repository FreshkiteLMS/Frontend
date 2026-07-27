"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChatStore } from '@/stores/chat-store';
import { avatarColorFor, formatMessageTime, initialsOf, linkifySegments } from '@/lib/chat-utils';
import type { ChatMessage } from '@/types/chat';
import { MessageBubble } from '@/components/chat/message-bubble';

interface ThreadPanelProps {
    rootMessage: ChatMessage;
    onClose: () => void;
}

const MAX_MESSAGE_LENGTH = 4000;

export function ThreadPanel({ rootMessage, onClose }: ThreadPanelProps) {
    const conversation = useChatStore((s) => s.conversations[rootMessage.conversation_id]);
    const replies = useChatStore((s) => s.threadMessages[rootMessage.id]);
    const loadThread = useChatStore((s) => s.loadThread);
    const sendThreadReply = useChatStore((s) => s.sendThreadReply);

    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const rootId = rootMessage.id;

    useEffect(() => {
        void loadThread(rootId);
    }, [rootId, loadThread]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [replies]);

    // Autosize the reply textarea (max ~6 rows).
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
    }, [draft]);

    const send = async () => {
        const content = draft.trim();
        if (!content || sending) return;
        if (content.length > MAX_MESSAGE_LENGTH) {
            toast.error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
            return;
        }
        setSending(true);
        try {
            await sendThreadReply(rootId, { content });
            setDraft('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    // Replies exclude the root itself (the API returns root + replies).
    const replyList = (replies || []).filter((m) => m.id !== rootId);

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" aria-hidden />

            {/* Panel */}
            <aside
                className="fixed top-0 right-0 z-[70] h-full w-full sm:w-[400px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col"
                role="dialog"
                aria-label="Message thread"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Thread
                        </h2>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {replyList.length} {replyList.length === 1 ? 'reply' : 'replies'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close thread"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Root message (simplified inline render) */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                    <div className="flex gap-3">
                        <div
                            className={`w-8 h-8 rounded-full shrink-0 ${avatarColorFor(rootMessage.sender_id)} text-white flex items-center justify-center text-[11px] font-bold`}
                        >
                            {initialsOf(rootMessage.sender_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {rootMessage.sender_name}
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                                    {formatMessageTime(rootMessage.created_at)}
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">
                                {rootMessage.deleted_for_everyone
                                    ? 'This message was deleted'
                                    : linkifySegments(rootMessage.content).map((seg, i) =>
                                          seg.type === 'link' ? (
                                              <a
                                                  key={i}
                                                  href={seg.href}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 dark:text-blue-400 underline break-all"
                                              >
                                                  {seg.value}
                                              </a>
                                          ) : seg.type === 'mention' ? (
                                              <span
                                                  key={i}
                                                  className="font-medium rounded px-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                              >
                                                  {seg.value}
                                              </span>
                                          ) : (
                                              <span key={i}>{seg.value}</span>
                                          ),
                                      )}
                            </p>
                            {(rootMessage.attachments || []).length > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rootMessage.attachments.length} attachment
                                    {rootMessage.attachments.length === 1 ? '' : 's'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Replies */}
                <div className="flex-1 min-h-0 overflow-y-auto py-3 bg-gray-50 dark:bg-gray-950">
                    {!replies ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : replyList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6">
                            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No replies yet.</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to reply in this thread.</p>
                        </div>
                    ) : (
                        conversation &&
                        replyList.map((m, i) => {
                            const prev = i > 0 ? replyList[i - 1] : null;
                            const continues = !!prev && prev.sender_id === m.sender_id && m.type !== 'system';
                            return (
                                <MessageBubble
                                    key={m.id}
                                    message={m}
                                    conversation={conversation}
                                    showAvatar={!continues}
                                    showSenderName={!continues}
                                    compact={continues}
                                    inThread
                                />
                            );
                        })
                    )}
                    <div ref={bottomRef} className="h-2" />
                </div>

                {/* Composer */}
                <div className="border-t border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            maxLength={MAX_MESSAGE_LENGTH}
                            placeholder="Reply in thread…"
                            className="flex-1 resize-none px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={send}
                            disabled={!draft.trim() || sending}
                            className="flex items-center justify-center w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send reply"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
