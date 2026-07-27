import { create } from 'zustand';
import { chatService } from '@/services/api/chat.api';
import { getChatNsp } from '@/services/chat-socket';
import {
    CHAT_EVENTS,
    type ChatAttachment,
    type ChatConversation,
    type ChatMessage,
    type ConversationLastMessage,
    type MessagePriority,
    type MessageType,
} from '@/types/chat';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

interface CurrentUserLite {
    id: string;
    name: string;
    role: 'admin' | 'student' | 'teacher';
}

/** Read the logged-in user snapshot from localStorage (for optimistic sends). */
function readCurrentUser(): CurrentUserLite | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const u = JSON.parse(raw);
        if (!u?.id) return null;
        return { id: String(u.id), name: u.name || u.username || 'You', role: u.role || 'student' };
    } catch {
        return null;
    }
}

function newTempId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `tmp-${crypto.randomUUID()}`;
    }
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function inferOptimisticType(content: string | undefined, attachments: ChatAttachment[]): MessageType {
    if (attachments.length > 0) {
        const mime = attachments[0].mime_type || '';
        if (mime.startsWith('audio/')) return 'audio';
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        return 'file';
    }
    return 'text';
}

/** Compare for conversation ordering: pinned first, then most-recent activity. */
function conversationSortValue(c: ChatConversation): { pinned: number; ts: number } {
    const pinned = c.membership?.pinned ? 1 : 0;
    const ts = c.last_message?.created_at
        ? new Date(c.last_message.created_at).getTime()
        : new Date(c.updated_at || 0).getTime();
    return { pinned, ts };
}

function sortedOrder(conversations: Record<string, ChatConversation>): string[] {
    return Object.values(conversations)
        .sort((a, b) => {
            const av = conversationSortValue(a);
            const bv = conversationSortValue(b);
            if (av.pinned !== bv.pinned) return bv.pinned - av.pinned;
            return bv.ts - av.ts;
        })
        .map((c) => c.id);
}

function previewFor(m: ChatMessage): ConversationLastMessage {
    return {
        message_id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        preview: m.content,
        type: m.type,
        created_at: m.created_at,
    };
}

function upsertMessageInList(list: ChatMessage[] | undefined, incoming: ChatMessage): ChatMessage[] {
    const arr = list ? [...list] : [];
    // Match either by real id or by the optimistic client_temp_id.
    const idx = arr.findIndex(
        (m) =>
            m.id === incoming.id ||
            (incoming.client_temp_id && m.client_temp_id && m.client_temp_id === incoming.client_temp_id) ||
            (incoming.client_temp_id && m.id === incoming.client_temp_id),
    );
    if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...incoming, _status: undefined };
        return arr;
    }
    arr.push(incoming);
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return arr;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export type ConversationFilter = 'all' | 'direct' | 'group' | 'channels' | 'batch';

export interface SendMessageInput {
    content?: string;
    attachments?: ChatAttachment[];
    reply_to_message_id?: string;
    thread_root_id?: string;
    mentions?: string[];
    priority?: MessagePriority;
    is_sticky?: boolean;
    scheduled_for?: string;
}

interface ReactionPayload {
    conversation_id: string;
    message_id: string;
    emoji: string;
    user_id: string;
    action: 'added' | 'removed';
}

interface ReadPayload {
    conversation_id: string;
    user_id: string;
    up_to_message_id?: string | null;
}

interface DeletePayload {
    conversation_id: string;
    message_id: string;
    scope: 'everyone';
}

interface PinnedPayload {
    conversation_id: string;
    message_id: string;
    pinned: boolean;
    message?: ChatMessage;
}

export interface ChatState {
    conversations: Record<string, ChatConversation>;
    conversationOrder: string[];
    activeConversationId: string | null;
    messages: Record<string, ChatMessage[]>;
    hasMore: Record<string, boolean>;
    loadingOlder: Record<string, boolean>;
    typing: Record<string, Record<string, { name: string; at: number }>>;
    threadOpenFor: string | null;
    threadMessages: Record<string, ChatMessage[]>;
    filter: ConversationFilter;
    searchQuery: string;
    showArchived: boolean;
    conversationsLoaded: boolean;

    // Composer state (pinned cross-agent contract — F3 consumes)
    replyTarget: ChatMessage | null;
    editingMessage: ChatMessage | null;
    setReplyTarget: (m: ChatMessage | null) => void;
    setEditingMessage: (m: ChatMessage | null) => void;

    // Derived
    totalUnread: () => number;

    // Sidebar controls
    setFilter: (filter: ConversationFilter) => void;
    setSearchQuery: (q: string) => void;
    setShowArchived: (v: boolean) => void;

    // Data loading
    loadConversations: () => Promise<void>;
    openConversation: (id: string | null) => Promise<void>;
    loadOlder: (id: string) => Promise<void>;

    // Sending
    sendMessage: (input: SendMessageInput) => Promise<void>;
    sendThreadReply: (rootId: string, input: SendMessageInput) => Promise<void>;
    retrySend: (conversationId: string, tempId: string) => Promise<void>;

    // Incoming socket application
    applyIncomingMessage: (m: ChatMessage) => void;
    applyEdit: (m: ChatMessage) => void;
    applyDelete: (payload: DeletePayload) => void;
    applyReaction: (payload: ReactionPayload) => void;
    applyPinned: (payload: PinnedPayload) => void;
    applyRead: (payload: ReadPayload) => void;

    // Conversation mutations
    markConversationRead: (id: string) => void;
    upsertConversation: (c: ChatConversation) => void;
    applyConversationUpdated: (payload: { conversation_id: string; conversation?: Partial<ChatConversation> }) => void;
    incrementUnread: (id: string) => void;

    // Typing
    setTyping: (convId: string, userId: string, name: string) => void;
    clearTyping: (convId: string, userId: string) => void;

    // Threads
    loadThread: (rootId: string) => Promise<void>;
    setThreadOpen: (rootId: string | null) => void;

    // Optimistic action wrappers
    reactToMessage: (messageId: string, emoji: string) => Promise<void>;
    editMessage: (messageId: string, content: string) => Promise<void>;
    deleteMessage: (messageId: string, scope: 'me' | 'everyone') => Promise<void>;
    pinMessage: (messageId: string, pin: boolean) => Promise<void>;
    starMessage: (messageId: string, star: boolean) => Promise<void>;
    forwardMessages: (messageIds: string[], conversationIds: string[]) => Promise<void>;
    upvoteMessage: (messageId: string, up: boolean) => Promise<void>;
    acceptAnswer: (rootMessageId: string, replyMessageId: string) => Promise<void>;

    reset: () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>()((set, get) => ({
    conversations: {},
    conversationOrder: [],
    activeConversationId: null,
    messages: {},
    hasMore: {},
    loadingOlder: {},
    typing: {},
    threadOpenFor: null,
    threadMessages: {},
    filter: 'all',
    searchQuery: '',
    showArchived: false,
    conversationsLoaded: false,

    replyTarget: null,
    editingMessage: null,
    setReplyTarget: (m) => set({ replyTarget: m, editingMessage: m ? null : get().editingMessage }),
    setEditingMessage: (m) => set({ editingMessage: m, replyTarget: m ? null : get().replyTarget }),

    totalUnread: () => {
        const { conversations } = get();
        return Object.values(conversations).reduce((sum, c) => {
            if (c.membership?.archived) return sum;
            return sum + (c.membership?.unread_count || 0);
        }, 0);
    },

    setFilter: (filter) => set({ filter }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setShowArchived: (v) => set({ showArchived: v }),

    loadConversations: async () => {
        const list = await chatService.listConversations();
        const conversations: Record<string, ChatConversation> = {};
        for (const c of list) conversations[c.id] = c;
        set({
            conversations,
            conversationOrder: sortedOrder(conversations),
            conversationsLoaded: true,
        });
    },

    openConversation: async (id) => {
        if (id === null) {
            set({ activeConversationId: null });
            return;
        }
        set({ activeConversationId: id });

        // Ensure the conversation object is known (fetch on cold deep-link).
        if (!get().conversations[id]) {
            try {
                const conv = await chatService.getConversation(id);
                get().upsertConversation(conv);
            } catch {
                // conversation may not be accessible; leave active id set for UI to handle
            }
        }

        // Join the realtime room (idempotent server-side).
        try {
            getChatNsp().emit(CHAT_EVENTS.JOIN_ROOM, { conversationId: id });
        } catch {
            // socket not ready — the socket hook will join on active change too
        }

        // Load first page if not loaded yet.
        if (!get().messages[id]) {
            try {
                const { messages, has_more } = await chatService.listMessages(id, { limit: 30 });
                set((s) => ({
                    messages: { ...s.messages, [id]: messages },
                    hasMore: { ...s.hasMore, [id]: has_more },
                }));
            } catch {
                set((s) => ({ messages: { ...s.messages, [id]: [] }, hasMore: { ...s.hasMore, [id]: false } }));
            }
        }

        // Mark read (REST) + reset local unread.
        get().markConversationRead(id);
        chatService.markRead(id).catch(() => undefined);
    },

    loadOlder: async (id) => {
        const state = get();
        if (state.loadingOlder[id] || state.hasMore[id] === false) return;
        const current = state.messages[id] || [];
        const before = current[0]?.id;
        set((s) => ({ loadingOlder: { ...s.loadingOlder, [id]: true } }));
        try {
            const { messages, has_more } = await chatService.listMessages(id, { before, limit: 30 });
            set((s) => {
                const existing = s.messages[id] || [];
                const seen = new Set(existing.map((m) => m.id));
                const prepend = messages.filter((m) => !seen.has(m.id));
                return {
                    messages: { ...s.messages, [id]: [...prepend, ...existing] },
                    hasMore: { ...s.hasMore, [id]: has_more },
                    loadingOlder: { ...s.loadingOlder, [id]: false },
                };
            });
        } catch {
            set((s) => ({ loadingOlder: { ...s.loadingOlder, [id]: false } }));
        }
    },

    sendMessage: async (input) => {
        const conversationId = get().activeConversationId;
        if (!conversationId) return;

        const attachments = input.attachments || [];
        const content = input.content?.trim() || '';
        if (!content && attachments.length === 0) return;

        const replyTarget = get().replyTarget;
        const replyId = input.reply_to_message_id ?? replyTarget?.id;

        // Scheduled messages are not shown optimistically (they aren't "sent" yet).
        if (input.scheduled_for) {
            await chatService.sendMessage(conversationId, {
                content: content || undefined,
                attachments: attachments.length ? attachments : undefined,
                reply_to_message_id: replyId,
                thread_root_id: input.thread_root_id,
                mentions: input.mentions,
                priority: input.priority,
                is_sticky: input.is_sticky,
                scheduled_for: input.scheduled_for,
            });
            set({ replyTarget: null, editingMessage: null });
            return;
        }

        const me = readCurrentUser();
        const tempId = newTempId();
        const now = new Date().toISOString();
        const isThread = Boolean(input.thread_root_id);

        const optimistic: ChatMessage = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: me?.id || '',
            sender_name: me?.name || 'You',
            sender_role: me?.role || 'student',
            type: inferOptimisticType(content, attachments),
            content,
            attachments,
            reply_to: replyTarget && replyId === replyTarget.id
                ? {
                      message_id: replyTarget.id,
                      sender_id: replyTarget.sender_id,
                      sender_name: replyTarget.sender_name,
                      preview: replyTarget.content,
                      type: replyTarget.type,
                  }
                : null,
            thread_root_id: input.thread_root_id || null,
            thread_reply_count: 0,
            thread_last_reply_at: null,
            mentions: input.mentions || [],
            reactions: [],
            status: 'sent',
            priority: input.priority || 'normal',
            is_sticky: Boolean(input.is_sticky),
            is_pinned: false,
            pinned_by: null,
            pinned_at: null,
            starred_by: [],
            edited_at: null,
            deleted_for: [],
            deleted_for_everyone: false,
            deleted_by: null,
            delivered_to: [],
            read_by: [],
            scheduled_for: null,
            system_event: null,
            poll_id: null,
            event_id: null,
            upvoted_by: [],
            accepted_reply_id: null,
            forwarded_from: null,
            client_temp_id: tempId,
            created_at: now,
            updated_at: now,
            _status: 'pending',
        };

        set((s) => {
            if (isThread) {
                const rootId = input.thread_root_id as string;
                return {
                    threadMessages: {
                        ...s.threadMessages,
                        [rootId]: [...(s.threadMessages[rootId] || []), optimistic],
                    },
                };
            }
            return { messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] || []), optimistic] } };
        });

        // Clear composer immediately after enqueueing the optimistic bubble.
        set({ replyTarget: null, editingMessage: null });

        try {
            const saved = await chatService.sendMessage(conversationId, {
                content: content || undefined,
                attachments: attachments.length ? attachments : undefined,
                reply_to_message_id: replyId,
                thread_root_id: input.thread_root_id,
                mentions: input.mentions,
                priority: input.priority,
                is_sticky: input.is_sticky,
                client_temp_id: tempId,
            });
            const reconciled: ChatMessage = { ...saved, client_temp_id: tempId, _status: undefined };
            set((s) => {
                if (isThread) {
                    const rootId = input.thread_root_id as string;
                    return { threadMessages: { ...s.threadMessages, [rootId]: upsertMessageInList(s.threadMessages[rootId], reconciled) } };
                }
                return { messages: { ...s.messages, [conversationId]: upsertMessageInList(s.messages[conversationId], reconciled) } };
            });
            if (!isThread) {
                get().upsertConversation({
                    ...get().conversations[conversationId],
                    last_message: previewFor(reconciled),
                } as ChatConversation);
            }
        } catch {
            // Mark the optimistic bubble as failed (retry affordance).
            set((s) => {
                const markFailed = (list: ChatMessage[] | undefined) =>
                    (list || []).map((m) => (m.client_temp_id === tempId ? { ...m, _status: 'failed' as const } : m));
                if (isThread) {
                    const rootId = input.thread_root_id as string;
                    return { threadMessages: { ...s.threadMessages, [rootId]: markFailed(s.threadMessages[rootId]) } };
                }
                return { messages: { ...s.messages, [conversationId]: markFailed(s.messages[conversationId]) } };
            });
        }
    },

    sendThreadReply: async (rootId, input) => {
        await get().sendMessage({ ...input, thread_root_id: rootId });
    },

    retrySend: async (conversationId, tempId) => {
        const list = get().messages[conversationId] || [];
        const failed = list.find((m) => m.client_temp_id === tempId);
        if (!failed) return;
        // Drop the failed bubble and resend through the normal pipeline.
        set((s) => ({
            messages: { ...s.messages, [conversationId]: (s.messages[conversationId] || []).filter((m) => m.client_temp_id !== tempId) },
        }));
        const wasActive = get().activeConversationId;
        set({ activeConversationId: conversationId });
        await get().sendMessage({
            content: failed.content,
            attachments: failed.attachments,
            reply_to_message_id: failed.reply_to?.message_id,
            mentions: failed.mentions,
            priority: failed.priority,
            is_sticky: failed.is_sticky,
        });
        if (wasActive !== conversationId) set({ activeConversationId: wasActive });
    },

    applyIncomingMessage: (m) => {
        const state = get();
        const convId = m.conversation_id;

        // Thread reply → route to thread list + bump root's counters.
        if (m.thread_root_id) {
            set((s) => {
                const rootId = m.thread_root_id as string;
                const threadList = s.threadMessages[rootId];
                const nextThread = threadList ? upsertMessageInList(threadList, m) : threadList;
                const bumpRoot = (list: ChatMessage[] | undefined) =>
                    (list || []).map((rm) =>
                        rm.id === rootId
                            ? {
                                  ...rm,
                                  thread_reply_count: (rm.thread_reply_count || 0) + 1,
                                  thread_last_reply_at: m.created_at,
                              }
                            : rm,
                    );
                return {
                    threadMessages: nextThread ? { ...s.threadMessages, [rootId]: nextThread } : s.threadMessages,
                    messages: { ...s.messages, [convId]: bumpRoot(s.messages[convId]) },
                };
            });
            return;
        }

        const me = readCurrentUser();
        const isOwn = me && m.sender_id === me.id;
        const isActive = state.activeConversationId === convId;

        set((s) => {
            const existing = s.messages[convId];
            const nextMessages = existing !== undefined ? { ...s.messages, [convId]: upsertMessageInList(existing, m) } : s.messages;
            return { messages: nextMessages };
        });

        // Update conversation last_message / order / unread.
        const conv = get().conversations[convId];
        if (conv) {
            const alreadyCounted = (state.messages[convId] || []).some((x) => x.id === m.id);
            const bumpUnread = !isActive && !isOwn && !alreadyCounted && m.type !== 'system';
            get().upsertConversation({
                ...conv,
                last_message: previewFor(m),
                updated_at: m.created_at,
                membership: {
                    ...conv.membership,
                    unread_count: bumpUnread ? (conv.membership.unread_count || 0) + 1 : conv.membership.unread_count,
                },
            });
        } else {
            // Unknown conversation — refresh list so it appears.
            get().loadConversations().catch(() => undefined);
        }

        // Auto-mark read if this conversation is active.
        if (isActive && !isOwn) {
            get().markConversationRead(convId);
            chatService.markRead(convId).catch(() => undefined);
        }
    },

    applyEdit: (m) => {
        set((s) => {
            const convId = m.conversation_id;
            const patch = (list: ChatMessage[] | undefined) =>
                (list || []).map((x) => (x.id === m.id ? { ...x, ...m } : x));
            const threadRoot = m.thread_root_id;
            return {
                messages: { ...s.messages, [convId]: patch(s.messages[convId]) },
                threadMessages: threadRoot
                    ? { ...s.threadMessages, [threadRoot]: patch(s.threadMessages[threadRoot]) }
                    : { ...s.threadMessages, [m.id]: patch(s.threadMessages[m.id]) },
            };
        });
    },

    applyDelete: ({ conversation_id, message_id }) => {
        set((s) => {
            const tombstone = (list: ChatMessage[] | undefined) =>
                (list || []).map((x) =>
                    x.id === message_id ? { ...x, deleted_for_everyone: true, content: '', attachments: [] } : x,
                );
            const nextThreads: Record<string, ChatMessage[]> = {};
            for (const [k, v] of Object.entries(s.threadMessages)) nextThreads[k] = tombstone(v);
            return {
                messages: { ...s.messages, [conversation_id]: tombstone(s.messages[conversation_id]) },
                threadMessages: nextThreads,
            };
        });
    },

    applyReaction: ({ conversation_id, message_id, emoji, user_id, action }) => {
        set((s) => {
            const patch = (list: ChatMessage[] | undefined) =>
                (list || []).map((m) => {
                    if (m.id !== message_id) return m;
                    const reactions = m.reactions ? m.reactions.map((r) => ({ ...r, user_ids: [...r.user_ids] })) : [];
                    const bucket = reactions.find((r) => r.emoji === emoji);
                    if (action === 'added') {
                        if (bucket) {
                            if (!bucket.user_ids.includes(user_id)) bucket.user_ids.push(user_id);
                        } else {
                            reactions.push({ emoji, user_ids: [user_id] });
                        }
                    } else if (bucket) {
                        bucket.user_ids = bucket.user_ids.filter((u) => u !== user_id);
                    }
                    return { ...m, reactions: reactions.filter((r) => r.user_ids.length > 0) };
                });
            const nextThreads: Record<string, ChatMessage[]> = {};
            for (const [k, v] of Object.entries(s.threadMessages)) nextThreads[k] = patch(v);
            return {
                messages: { ...s.messages, [conversation_id]: patch(s.messages[conversation_id]) },
                threadMessages: nextThreads,
            };
        });
    },

    applyPinned: ({ conversation_id, message_id, pinned, message }) => {
        set((s) => {
            const patch = (list: ChatMessage[] | undefined) =>
                (list || []).map((m) =>
                    m.id === message_id ? { ...m, ...(message || {}), is_pinned: pinned } : m,
                );
            const conv = s.conversations[conversation_id];
            let conversations = s.conversations;
            if (conv) {
                const ids = new Set(conv.pinned_message_ids || []);
                if (pinned) ids.add(message_id);
                else ids.delete(message_id);
                conversations = { ...s.conversations, [conversation_id]: { ...conv, pinned_message_ids: Array.from(ids) } };
            }
            return { messages: { ...s.messages, [conversation_id]: patch(s.messages[conversation_id]) }, conversations };
        });
    },

    applyRead: ({ conversation_id, user_id, up_to_message_id }) => {
        set((s) => {
            const list = s.messages[conversation_id];
            if (!list) return {} as Partial<ChatState>;
            let passedCursor = !up_to_message_id;
            const next = list.map((m) => {
                const withRead =
                    m.read_by?.includes(user_id) ? m : { ...m, read_by: [...(m.read_by || []), user_id] };
                if (up_to_message_id && m.id === up_to_message_id) {
                    passedCursor = true;
                    return withRead;
                }
                if (up_to_message_id && passedCursor) return m;
                return withRead;
            });
            return { messages: { ...s.messages, [conversation_id]: next } };
        });
    },

    markConversationRead: (id) => {
        set((s) => {
            const conv = s.conversations[id];
            if (!conv) return {} as Partial<ChatState>;
            return {
                conversations: {
                    ...s.conversations,
                    [id]: {
                        ...conv,
                        membership: { ...conv.membership, unread_count: 0, last_read_at: new Date().toISOString() },
                    },
                },
            };
        });
    },

    incrementUnread: (id) => {
        set((s) => {
            const conv = s.conversations[id];
            if (!conv) return {} as Partial<ChatState>;
            return {
                conversations: {
                    ...s.conversations,
                    [id]: { ...conv, membership: { ...conv.membership, unread_count: (conv.membership.unread_count || 0) + 1 } },
                },
            };
        });
    },

    upsertConversation: (c) => {
        set((s) => {
            const conversations = { ...s.conversations, [c.id]: { ...s.conversations[c.id], ...c } };
            return { conversations, conversationOrder: sortedOrder(conversations) };
        });
    },

    applyConversationUpdated: ({ conversation_id, conversation }) => {
        set((s) => {
            const existing = s.conversations[conversation_id];
            if (!existing && !conversation) return {} as Partial<ChatState>;
            const merged = { ...existing, ...(conversation || {}), id: conversation_id } as ChatConversation;
            const conversations = { ...s.conversations, [conversation_id]: merged };
            return { conversations, conversationOrder: sortedOrder(conversations) };
        });
    },

    setTyping: (convId, userId, name) => {
        set((s) => ({
            typing: {
                ...s.typing,
                [convId]: { ...(s.typing[convId] || {}), [userId]: { name, at: Date.now() } },
            },
        }));
    },

    clearTyping: (convId, userId) => {
        set((s) => {
            const conv = { ...(s.typing[convId] || {}) };
            delete conv[userId];
            return { typing: { ...s.typing, [convId]: conv } };
        });
    },

    loadThread: async (rootId) => {
        set({ threadOpenFor: rootId });
        try {
            const { messages } = await chatService.getThread(rootId, { limit: 50 });
            set((s) => ({ threadMessages: { ...s.threadMessages, [rootId]: messages } }));
        } catch {
            set((s) => ({ threadMessages: { ...s.threadMessages, [rootId]: s.threadMessages[rootId] || [] } }));
        }
    },

    setThreadOpen: (rootId) => set({ threadOpenFor: rootId }),

    reactToMessage: async (messageId, emoji) => {
        const me = readCurrentUser();
        if (!me) return;
        const convId = get().activeConversationId;
        // Determine current reaction state for optimistic toggle.
        const findMsg = (): ChatMessage | undefined => {
            for (const list of Object.values(get().messages)) {
                const found = list.find((m) => m.id === messageId);
                if (found) return found;
            }
            for (const list of Object.values(get().threadMessages)) {
                const found = list.find((m) => m.id === messageId);
                if (found) return found;
            }
            return undefined;
        };
        const msg = findMsg();
        const already = msg?.reactions?.find((r) => r.emoji === emoji)?.user_ids.includes(me.id) ?? false;
        const action = already ? 'removed' : 'added';
        get().applyReaction({ conversation_id: msg?.conversation_id || convId || '', message_id: messageId, emoji, user_id: me.id, action });
        try {
            if (already) await chatService.unreact(messageId, emoji);
            else await chatService.react(messageId, emoji);
        } catch {
            // Revert on failure.
            get().applyReaction({
                conversation_id: msg?.conversation_id || convId || '',
                message_id: messageId,
                emoji,
                user_id: me.id,
                action: already ? 'added' : 'removed',
            });
        }
    },

    editMessage: async (messageId, content) => {
        const updated = await chatService.editMessage(messageId, content);
        get().applyEdit(updated);
    },

    deleteMessage: async (messageId, scope) => {
        await chatService.deleteMessage(messageId, scope);
        if (scope === 'everyone') {
            // Find conversation id for local tombstone.
            let convId = '';
            for (const [cid, list] of Object.entries(get().messages)) {
                if (list.some((m) => m.id === messageId)) {
                    convId = cid;
                    break;
                }
            }
            if (convId) get().applyDelete({ conversation_id: convId, message_id: messageId, scope: 'everyone' });
        } else {
            // Delete for me → drop locally everywhere.
            set((s) => {
                const nextMsgs: Record<string, ChatMessage[]> = {};
                for (const [k, v] of Object.entries(s.messages)) nextMsgs[k] = v.filter((m) => m.id !== messageId);
                const nextThreads: Record<string, ChatMessage[]> = {};
                for (const [k, v] of Object.entries(s.threadMessages)) nextThreads[k] = v.filter((m) => m.id !== messageId);
                return { messages: nextMsgs, threadMessages: nextThreads };
            });
        }
    },

    pinMessage: async (messageId, pin) => {
        if (pin) await chatService.pinMessage(messageId);
        else await chatService.unpinMessage(messageId);
    },

    starMessage: async (messageId, star) => {
        const me = readCurrentUser();
        const patch = (list: ChatMessage[]) =>
            list.map((m) => {
                if (m.id !== messageId || !me) return m;
                const starred = new Set(m.starred_by || []);
                if (star) starred.add(me.id);
                else starred.delete(me.id);
                return { ...m, starred_by: Array.from(starred) };
            });
        set((s) => {
            const nextMsgs: Record<string, ChatMessage[]> = {};
            for (const [k, v] of Object.entries(s.messages)) nextMsgs[k] = patch(v);
            return { messages: nextMsgs };
        });
        try {
            if (star) await chatService.starMessage(messageId);
            else await chatService.unstarMessage(messageId);
        } catch {
            // Revert.
            const revert = (list: ChatMessage[]) =>
                list.map((m) => {
                    if (m.id !== messageId || !me) return m;
                    const starred = new Set(m.starred_by || []);
                    if (star) starred.delete(me.id);
                    else starred.add(me.id);
                    return { ...m, starred_by: Array.from(starred) };
                });
            set((s) => {
                const nextMsgs: Record<string, ChatMessage[]> = {};
                for (const [k, v] of Object.entries(s.messages)) nextMsgs[k] = revert(v);
                return { messages: nextMsgs };
            });
        }
    },

    forwardMessages: async (messageIds, conversationIds) => {
        await chatService.forwardMessages(messageIds, conversationIds);
    },

    upvoteMessage: async (messageId, up) => {
        const me = readCurrentUser();
        const patch = (list: ChatMessage[]) =>
            list.map((m) => {
                if (m.id !== messageId || !me) return m;
                const voters = new Set(m.upvoted_by || []);
                if (up) voters.add(me.id);
                else voters.delete(me.id);
                return { ...m, upvoted_by: Array.from(voters) };
            });
        set((s) => {
            const nextMsgs: Record<string, ChatMessage[]> = {};
            for (const [k, v] of Object.entries(s.messages)) nextMsgs[k] = patch(v);
            const nextThreads: Record<string, ChatMessage[]> = {};
            for (const [k, v] of Object.entries(s.threadMessages)) nextThreads[k] = patch(v);
            return { messages: nextMsgs, threadMessages: nextThreads };
        });
        try {
            if (up) await chatService.upvote(messageId);
            else await chatService.removeUpvote(messageId);
        } catch {
            const revert = (list: ChatMessage[]) =>
                list.map((m) => {
                    if (m.id !== messageId || !me) return m;
                    const voters = new Set(m.upvoted_by || []);
                    if (up) voters.delete(me.id);
                    else voters.add(me.id);
                    return { ...m, upvoted_by: Array.from(voters) };
                });
            set((s) => {
                const nextMsgs: Record<string, ChatMessage[]> = {};
                for (const [k, v] of Object.entries(s.messages)) nextMsgs[k] = revert(v);
                return { messages: nextMsgs };
            });
        }
    },

    acceptAnswer: async (rootMessageId, replyMessageId) => {
        const updated = await chatService.acceptAnswer(rootMessageId, replyMessageId);
        get().applyEdit(updated);
    },

    reset: () =>
        set({
            conversations: {},
            conversationOrder: [],
            activeConversationId: null,
            messages: {},
            hasMore: {},
            loadingOlder: {},
            typing: {},
            threadOpenFor: null,
            threadMessages: {},
            filter: 'all',
            searchQuery: '',
            showArchived: false,
            conversationsLoaded: false,
            replyTarget: null,
            editingMessage: null,
        }),
}));
