import { create } from 'zustand';
import { chatService } from '@/services/api/chat.api';
import {
    type ChatAttachment,
    type ChatConversation,
    type ChatMessage,
    type ChatReaction,
    type ConversationLastMessage,
    type ConversationMembership,
    type MessagePriority,
    type MessageType,
    type ReceiptCounts,
} from '@/types/chat';

// ---------------------------------------------------------------------------
// Synchronisation model
// ---------------------------------------------------------------------------
//
// The server is the source of truth; this store is a cache of it.
//  * Every chat socket is subscribed to ALL of the user's conversations, so
//    messages, edits, reactions and receipts arrive live for background chats
//    too — the sidebar and any cached message list stay in step.
//  * A message list is merged, never overwritten: anything that arrives over
//    the socket while a page is being fetched is kept.
//  * Re-opening a cached conversation (and every reconnect) fetches the
//    messages AFTER the newest one we hold, so nothing missed while away or
//    offline is lost.
//  * Sends are optimistic; the bubble is reconciled by `client_temp_id`, and a
//    retry reuses the same id so the server can never store it twice.

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

const isTempId = (id: string) => id.startsWith('tmp-');

function inferOptimisticType(attachments: ChatAttachment[]): MessageType {
    if (attachments.length > 0) {
        const mime = attachments[0].mime_type || '';
        if (mime.startsWith('audio/')) return 'audio';
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        return 'file';
    }
    return 'text';
}

const EMPTY_MEMBERSHIP: ConversationMembership = {
    role: 'member',
    unread_count: 0,
    pinned: false,
    archived: false,
    notifications_muted: false,
    last_read_at: null,
};

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

function previewText(m: ChatMessage): string {
    if (m.deleted_for_everyone) return 'This message was deleted';
    switch (m.type) {
        case 'image': return '📷 Photo';
        case 'video': return '🎥 Video';
        case 'audio': return '🎤 Voice message';
        case 'file': return `📎 ${m.attachments?.[0]?.file_name ?? 'File'}`;
        case 'poll': return '📊 Poll';
        case 'event': return '📅 Event';
        default: return (m.content || '').slice(0, 120);
    }
}

function previewFor(m: ChatMessage): ConversationLastMessage {
    return {
        message_id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        preview: previewText(m),
        type: m.type,
        created_at: m.created_at,
    };
}

const ts = (m: ChatMessage) => new Date(m.created_at).getTime();

/**
 * Insert or replace one message. Matches by server id or by the optimistic
 * client_temp_id, then keeps the list in creation order (stable for ties).
 */
function upsertMessageInList(list: ChatMessage[] | undefined, incoming: ChatMessage): ChatMessage[] {
    const arr = list ? [...list] : [];
    const idx = arr.findIndex(
        (m) =>
            m.id === incoming.id ||
            (incoming.client_temp_id && m.client_temp_id && m.client_temp_id === incoming.client_temp_id) ||
            (incoming.client_temp_id && m.id === incoming.client_temp_id),
    );
    if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...incoming, _status: undefined };
    } else {
        arr.push(incoming);
    }
    arr.sort((a, b) => ts(a) - ts(b));
    return arr;
}

/** Merge a fetched page into what we already hold (socket arrivals included). */
function mergeMessages(current: ChatMessage[] | undefined, page: ChatMessage[]): ChatMessage[] {
    let out = current ? [...current] : [];
    for (const m of page) out = upsertMessageInList(out, m);
    return out;
}

/** Newest server-confirmed message id (temp / failed bubbles are skipped). */
function newestConfirmedId(list: ChatMessage[] | undefined): string | undefined {
    if (!list) return undefined;
    for (let i = list.length - 1; i >= 0; i--) {
        if (!isTempId(list[i].id) && !list[i]._status) return list[i].id;
    }
    return undefined;
}

/** Apply `fn` to every cached copy of a message (conversation lists + threads). */
function patchEverywhere(
    s: Pick<ChatState, 'messages' | 'threadMessages'>,
    fn: (m: ChatMessage) => ChatMessage,
): Pick<ChatState, 'messages' | 'threadMessages'> {
    const map = (rec: Record<string, ChatMessage[]>) => {
        const next: Record<string, ChatMessage[]> = {};
        for (const [k, v] of Object.entries(rec)) next[k] = v.map(fn);
        return next;
    };
    return { messages: map(s.messages), threadMessages: map(s.threadMessages) };
}

function applyReceiptCounts(s: ChatState, receipts: ReceiptCounts[]) {
    const byId = new Map(receipts.map((r) => [r.message_id, r]));
    return patchEverywhere(s, (m) => {
        const r = byId.get(m.id);
        return r ? { ...m, delivered_count: r.delivered_count, read_count: r.read_count, recipient_count: r.recipient_count } : m;
    });
}

/** Recently applied incoming message ids — guards against double counting. */
const recentIncoming = new Set<string>();
function rememberIncoming(id: string): boolean {
    if (recentIncoming.has(id)) return false;
    recentIncoming.add(id);
    if (recentIncoming.size > 500) {
        const first = recentIncoming.values().next().value;
        if (first) recentIncoming.delete(first);
    }
    return true;
}

/** A conversation fetch that failed, kept so the UI can explain why. */
export type ConversationLoadError = 'not_found' | 'forbidden' | 'error';

function classifyLoadError(err: unknown): ConversationLoadError {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return 'not_found';
    if (status === 403) return 'forbidden';
    return 'error';
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
    reactions?: ChatReaction[];
}

interface ReadPayload {
    conversation_id: string;
    user_id: string;
    up_to_message_id?: string | null;
    receipts?: ReceiptCounts[];
}

interface DeliveredPayload {
    conversation_id: string;
    user_id: string;
    receipts?: ReceiptCounts[];
}

interface DeletePayload {
    conversation_id: string;
    message_id: string;
    scope: 'everyone' | 'me';
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
    /** Why the active conversation could not be opened (null = fine / loading). */
    activeLoadError: ConversationLoadError | null;
    messages: Record<string, ChatMessage[]>;
    hasMore: Record<string, boolean>;
    loadingOlder: Record<string, boolean>;
    loadingMessages: Record<string, boolean>;
    typing: Record<string, Record<string, { name: string; at: number }>>;
    threadOpenFor: string | null;
    threadMessages: Record<string, ChatMessage[]>;
    filter: ConversationFilter;
    searchQuery: string;
    showArchived: boolean;
    conversationsLoaded: boolean;
    /** Message to scroll to and highlight (reply preview click). */
    highlightMessageId: string | null;

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
    retryOpen: () => Promise<void>;
    loadOlder: (id: string) => Promise<void>;
    /** Fetch everything newer than what is cached for a conversation. */
    resyncConversation: (id: string) => Promise<void>;
    /** After a reconnect: refresh the list and the open conversation. */
    resyncAll: () => Promise<void>;
    jumpToMessage: (messageId: string) => Promise<boolean>;
    clearHighlight: () => void;

    // Sending
    sendMessage: (input: SendMessageInput) => Promise<void>;
    sendThreadReply: (rootId: string, input: SendMessageInput) => Promise<void>;
    retrySend: (conversationId: string, tempId: string) => Promise<void>;
    discardFailed: (conversationId: string, tempId: string) => void;

    // Incoming socket application
    applyIncomingMessage: (m: ChatMessage) => void;
    applyEdit: (m: ChatMessage) => void;
    applyDelete: (payload: DeletePayload) => void;
    applyReaction: (payload: ReactionPayload) => void;
    applyPinned: (payload: PinnedPayload) => void;
    applyRead: (payload: ReadPayload) => void;
    applyDelivered: (payload: DeliveredPayload) => void;

    // Conversation mutations
    markConversationRead: (id: string) => void;
    upsertConversation: (c: ChatConversation) => void;
    refreshConversation: (id: string) => Promise<void>;
    removeConversation: (id: string) => void;
    applyConversationUpdated: (payload: { conversation_id: string; conversation?: Partial<ChatConversation>; removed?: boolean }) => void;
    incrementUnread: (id: string) => void;
    setUnread: (id: string, count: number) => void;

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

/** Most `after` pages a resync will walk before falling back to a fresh load. */
const MAX_RESYNC_PAGES = 5;
const PAGE_SIZE = 30;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>()((set, get) => {
    /** Persist a send (first attempt or retry) under a fixed client_temp_id. */
    async function deliver(
        conversationId: string,
        tempId: string,
        input: SendMessageInput,
        threadRootId: string | null,
    ): Promise<void> {
        const markStatus = (status: 'pending' | 'failed') =>
            set((s) => {
                const mark = (list: ChatMessage[] | undefined) =>
                    (list || []).map((m) => (m.client_temp_id === tempId ? { ...m, _status: status } : m));
                if (threadRootId) return { threadMessages: { ...s.threadMessages, [threadRootId]: mark(s.threadMessages[threadRootId]) } };
                return { messages: { ...s.messages, [conversationId]: mark(s.messages[conversationId]) } };
            });

        markStatus('pending');
        try {
            const saved = await chatService.sendMessage(conversationId, {
                content: input.content || undefined,
                attachments: input.attachments?.length ? input.attachments : undefined,
                reply_to_message_id: input.reply_to_message_id,
                thread_root_id: threadRootId || undefined,
                mentions: input.mentions,
                priority: input.priority,
                is_sticky: input.is_sticky,
                client_temp_id: tempId,
            });
            const reconciled: ChatMessage = { ...saved, client_temp_id: tempId, _status: undefined };
            rememberIncoming(reconciled.id);
            set((s) => {
                if (threadRootId) {
                    return { threadMessages: { ...s.threadMessages, [threadRootId]: upsertMessageInList(s.threadMessages[threadRootId], reconciled) } };
                }
                return { messages: { ...s.messages, [conversationId]: upsertMessageInList(s.messages[conversationId], reconciled) } };
            });
            const conv = get().conversations[conversationId];
            if (!threadRootId && conv) get().upsertConversation({ ...conv, last_message: previewFor(reconciled) });
        } catch {
            // Keep the bubble (and its text) with a retry affordance.
            markStatus('failed');
        }
    }

    /** Load (or resync) the message list for a conversation, merging safely. */
    async function ensureMessages(id: string): Promise<void> {
        if (get().messages[id]) {
            await get().resyncConversation(id);
            return;
        }
        set((s) => ({ loadingMessages: { ...s.loadingMessages, [id]: true } }));
        try {
            const { messages, has_more } = await chatService.listMessages(id, { limit: PAGE_SIZE });
            set((s) => ({
                // Merge: socket messages that landed during the request are kept.
                messages: { ...s.messages, [id]: mergeMessages(s.messages[id], messages) },
                hasMore: { ...s.hasMore, [id]: has_more },
            }));
        } finally {
            set((s) => ({ loadingMessages: { ...s.loadingMessages, [id]: false } }));
        }
    }

    return {
        conversations: {},
        conversationOrder: [],
        activeConversationId: null,
        activeLoadError: null,
        messages: {},
        hasMore: {},
        loadingOlder: {},
        loadingMessages: {},
        typing: {},
        threadOpenFor: null,
        threadMessages: {},
        filter: 'all',
        searchQuery: '',
        showArchived: false,
        conversationsLoaded: false,
        highlightMessageId: null,

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
            // Active AND archived in one call; the list UI splits them by
            // membership.archived, so archiving never makes a chat vanish.
            const list = await chatService.listConversations({ archived: 'all' });
            const conversations: Record<string, ChatConversation> = {};
            for (const c of list) conversations[c.id] = { ...c, membership: c.membership ?? EMPTY_MEMBERSHIP };
            set({
                conversations,
                conversationOrder: sortedOrder(conversations),
                conversationsLoaded: true,
            });
        },

        openConversation: async (id) => {
            if (id === null) {
                set({ activeConversationId: null, activeLoadError: null });
                return;
            }
            set({ activeConversationId: id, activeLoadError: null });

            // Cold deep-link (or a just-created group): fetch the caller's view.
            const known = get().conversations[id];
            if (!known || !known.membership) {
                try {
                    const conv = await chatService.getConversation(id);
                    get().upsertConversation(conv);
                } catch (err) {
                    if (get().activeConversationId === id) set({ activeLoadError: classifyLoadError(err) });
                    return;
                }
            }
            if (get().activeConversationId !== id) return;

            try {
                await ensureMessages(id);
            } catch (err) {
                if (get().activeConversationId === id && !get().messages[id]) set({ activeLoadError: classifyLoadError(err) });
                return;
            }

            if (get().activeConversationId === id) {
                get().markConversationRead(id);
                chatService.markRead(id).catch(() => undefined);
            }
        },

        retryOpen: async () => {
            const id = get().activeConversationId;
            if (id) await get().openConversation(id);
        },

        loadOlder: async (id) => {
            const state = get();
            if (state.loadingOlder[id] || state.hasMore[id] === false) return;
            const current = state.messages[id] || [];
            const before = current.find((m) => !isTempId(m.id))?.id;
            if (!before) return;
            set((s) => ({ loadingOlder: { ...s.loadingOlder, [id]: true } }));
            try {
                const { messages, has_more } = await chatService.listMessages(id, { before, limit: PAGE_SIZE });
                set((s) => ({
                    messages: { ...s.messages, [id]: mergeMessages(s.messages[id], messages) },
                    hasMore: { ...s.hasMore, [id]: has_more },
                    loadingOlder: { ...s.loadingOlder, [id]: false },
                }));
            } catch {
                set((s) => ({ loadingOlder: { ...s.loadingOlder, [id]: false } }));
            }
        },

        resyncConversation: async (id) => {
            let after = newestConfirmedId(get().messages[id]);
            if (!after) {
                const { messages, has_more } = await chatService.listMessages(id, { limit: PAGE_SIZE });
                set((s) => ({
                    messages: { ...s.messages, [id]: mergeMessages(s.messages[id], messages) },
                    hasMore: { ...s.hasMore, [id]: has_more },
                }));
                return;
            }
            for (let page = 0; page < MAX_RESYNC_PAGES; page++) {
                let result: { messages: ChatMessage[]; has_more: boolean };
                try {
                    result = await chatService.listMessages(id, { after, limit: 100 });
                } catch (err) {
                    // The cursor message was deleted / hidden: start over from the latest page.
                    if ((err as { response?: { status?: number } })?.response?.status === 400) {
                        const fresh = await chatService.listMessages(id, { limit: PAGE_SIZE });
                        set((s) => ({ messages: { ...s.messages, [id]: fresh.messages }, hasMore: { ...s.hasMore, [id]: fresh.has_more } }));
                        return;
                    }
                    throw err;
                }
                set((s) => ({ messages: { ...s.messages, [id]: mergeMessages(s.messages[id], result.messages) } }));
                if (!result.has_more) return;
                after = result.messages[result.messages.length - 1]?.id ?? after;
            }
            // Too far behind to page forward: replace with the latest page.
            const fresh = await chatService.listMessages(id, { limit: PAGE_SIZE });
            set((s) => ({ messages: { ...s.messages, [id]: fresh.messages }, hasMore: { ...s.hasMore, [id]: fresh.has_more } }));
        },

        resyncAll: async () => {
            await get().loadConversations().catch(() => undefined);
            const active = get().activeConversationId;
            // Cached lists for other chats resync when next opened.
            if (active && get().messages[active]) await get().resyncConversation(active).catch(() => undefined);
            if (active && get().conversations[active]) {
                chatService.markRead(active).catch(() => undefined);
                get().markConversationRead(active);
            }
        },

        jumpToMessage: async (messageId) => {
            const convId = get().activeConversationId;
            if (!convId) return false;
            // Page back until the message is loaded (bounded).
            for (let i = 0; i < 10; i++) {
                if ((get().messages[convId] || []).some((m) => m.id === messageId)) {
                    set({ highlightMessageId: messageId });
                    return true;
                }
                if (get().hasMore[convId] === false) break;
                await get().loadOlder(convId);
            }
            return false;
        },

        clearHighlight: () => set({ highlightMessageId: null }),

        sendMessage: async (input) => {
            const conversationId = get().activeConversationId;
            if (!conversationId) return;

            const attachments = input.attachments || [];
            const content = input.content?.trim() || '';
            if (!content && attachments.length === 0) return;

            // The main composer's reply target never leaks into a thread reply.
            const replyTarget = input.thread_root_id ? null : get().replyTarget;
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
            const threadRootId = input.thread_root_id || null;

            const optimistic: ChatMessage = {
                id: tempId,
                conversation_id: conversationId,
                sender_id: me?.id || '',
                sender_name: me?.name || 'You',
                sender_role: me?.role || 'student',
                type: inferOptimisticType(attachments),
                content,
                attachments,
                reply_to: replyTarget && replyId === replyTarget.id
                    ? {
                        message_id: replyTarget.id,
                        sender_id: replyTarget.sender_id,
                        sender_name: replyTarget.sender_name,
                        preview: previewText(replyTarget),
                        type: replyTarget.type,
                    }
                    : null,
                thread_root_id: threadRootId,
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
                recipient_count: 0,
                delivered_count: 0,
                read_count: 0,
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
                if (threadRootId) {
                    return { threadMessages: { ...s.threadMessages, [threadRootId]: [...(s.threadMessages[threadRootId] || []), optimistic] } };
                }
                return { messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] || []), optimistic] } };
            });

            // Clear the main composer state (thread replies have their own composer).
            if (!threadRootId) set({ replyTarget: null, editingMessage: null });

            await deliver(conversationId, tempId, { ...input, content, attachments, reply_to_message_id: replyId }, threadRootId);
        },

        sendThreadReply: async (rootId, input) => {
            await get().sendMessage({ ...input, thread_root_id: rootId });
        },

        retrySend: async (conversationId, tempId) => {
            const inMain = (get().messages[conversationId] || []).find((m) => m.client_temp_id === tempId);
            const inThread = inMain ? undefined : Object.values(get().threadMessages).flat().find((m) => m.client_temp_id === tempId);
            const failed = inMain ?? inThread;
            if (!failed || failed._status !== 'failed') return;
            // Same client_temp_id: if the first attempt actually reached the
            // server, this returns that message instead of storing a duplicate.
            await deliver(
                conversationId,
                tempId,
                {
                    content: failed.content,
                    attachments: failed.attachments,
                    reply_to_message_id: failed.reply_to?.message_id,
                    mentions: failed.mentions,
                    priority: failed.priority,
                    is_sticky: failed.is_sticky,
                },
                failed.thread_root_id,
            );
        },

        discardFailed: (conversationId, tempId) => {
            set((s) => {
                const drop = (list: ChatMessage[]) => list.filter((m) => !(m.client_temp_id === tempId && m._status === 'failed'));
                const threads: Record<string, ChatMessage[]> = {};
                for (const [k, v] of Object.entries(s.threadMessages)) threads[k] = drop(v);
                return { messages: { ...s.messages, [conversationId]: drop(s.messages[conversationId] || []) }, threadMessages: threads };
            });
        },

        applyIncomingMessage: (m) => {
            const state = get();
            const convId = m.conversation_id;
            const me = readCurrentUser();
            const isOwn = Boolean(me && m.sender_id === me.id);
            const isActive = state.activeConversationId === convId;
            const firstSighting = rememberIncoming(m.id);

            if (m.thread_root_id) {
                // Thread reply → thread list (if open) + the root's counters.
                set((s) => {
                    const rootId = m.thread_root_id as string;
                    const threadList = s.threadMessages[rootId];
                    const nextThread = threadList ? upsertMessageInList(threadList, m) : threadList;
                    const bumpRoot = (list: ChatMessage[] | undefined) =>
                        (list || []).map((rm) =>
                            rm.id === rootId && firstSighting
                                ? { ...rm, thread_reply_count: (rm.thread_reply_count || 0) + 1, thread_last_reply_at: m.created_at }
                                : rm,
                        );
                    return {
                        threadMessages: nextThread ? { ...s.threadMessages, [rootId]: nextThread } : s.threadMessages,
                        messages: s.messages[convId] ? { ...s.messages, [convId]: bumpRoot(s.messages[convId]) } : s.messages,
                    };
                });
            } else if (state.messages[convId]) {
                // Only cached lists are updated; others load fresh when opened.
                set((s) => ({ messages: { ...s.messages, [convId]: upsertMessageInList(s.messages[convId], m) } }));
            }

            const conv = get().conversations[convId];
            if (!conv) {
                // A conversation we don't know yet (added elsewhere): fetch our view of it.
                get().refreshConversation(convId).catch(() => undefined);
                return;
            }
            const bumpUnread = firstSighting && !isActive && !isOwn && m.type !== 'system';
            get().upsertConversation({
                ...conv,
                last_message: m.thread_root_id ? conv.last_message : previewFor(m),
                updated_at: m.created_at,
                membership: {
                    ...conv.membership,
                    unread_count: bumpUnread ? (conv.membership?.unread_count || 0) + 1 : conv.membership?.unread_count || 0,
                },
            });
        },

        applyEdit: (m) => {
            set((s) => {
                const patched = patchEverywhere(s, (x) => {
                    if (x.id === m.id) return { ...x, ...m };
                    // Quoted previews follow the edit; the link itself never changes.
                    if (x.reply_to?.message_id === m.id) return { ...x, reply_to: { ...x.reply_to, preview: previewText(m) } };
                    return x;
                });
                return patched;
            });
        },

        applyDelete: ({ conversation_id, message_id, scope }) => {
            if (scope === 'me') {
                set((s) => {
                    const drop = (list: ChatMessage[]) => list.filter((m) => m.id !== message_id);
                    const threads: Record<string, ChatMessage[]> = {};
                    for (const [k, v] of Object.entries(s.threadMessages)) threads[k] = drop(v);
                    return {
                        messages: s.messages[conversation_id] ? { ...s.messages, [conversation_id]: drop(s.messages[conversation_id]) } : s.messages,
                        threadMessages: threads,
                    };
                });
                return;
            }
            set((s) => {
                const patched = patchEverywhere(s, (x) => {
                    if (x.id === message_id) return { ...x, deleted_for_everyone: true, content: '', attachments: [], reactions: [], is_pinned: false };
                    if (x.reply_to?.message_id === message_id) return { ...x, reply_to: { ...x.reply_to, preview: '', deleted: true } };
                    return x;
                });
                const conv = s.conversations[conversation_id];
                let conversations = s.conversations;
                if (conv?.last_message?.message_id === message_id) {
                    conversations = { ...s.conversations, [conversation_id]: { ...conv, last_message: { ...conv.last_message, preview: 'This message was deleted' } } };
                }
                const editingMessage = s.editingMessage?.id === message_id ? null : s.editingMessage;
                const replyTarget = s.replyTarget?.id === message_id ? null : s.replyTarget;
                return { ...patched, conversations, editingMessage, replyTarget };
            });
        },

        applyReaction: ({ message_id, emoji, user_id, action, reactions }) => {
            set((s) =>
                patchEverywhere(s, (m) => {
                    if (m.id !== message_id) return m;
                    // The server sends the full list: replace, never drift.
                    if (reactions) return { ...m, reactions };
                    const next = (m.reactions || []).map((r) => ({ ...r, user_ids: [...r.user_ids] }));
                    const bucket = next.find((r) => r.emoji === emoji);
                    if (action === 'added') {
                        if (bucket) {
                            if (!bucket.user_ids.includes(user_id)) bucket.user_ids.push(user_id);
                        } else {
                            next.push({ emoji, user_ids: [user_id] });
                        }
                    } else if (bucket) {
                        bucket.user_ids = bucket.user_ids.filter((u) => u !== user_id);
                    }
                    return { ...m, reactions: next.filter((r) => r.user_ids.length > 0) };
                }),
            );
        },

        applyPinned: ({ conversation_id, message_id, pinned, message }) => {
            set((s) => {
                const patch = (list: ChatMessage[] | undefined) =>
                    (list || []).map((m) => (m.id === message_id ? { ...m, ...(message || {}), is_pinned: pinned } : m));
                const conv = s.conversations[conversation_id];
                let conversations = s.conversations;
                if (conv) {
                    const ids = new Set(conv.pinned_message_ids || []);
                    if (pinned) ids.add(message_id);
                    else ids.delete(message_id);
                    conversations = { ...s.conversations, [conversation_id]: { ...conv, pinned_message_ids: Array.from(ids) } };
                }
                return {
                    messages: s.messages[conversation_id] ? { ...s.messages, [conversation_id]: patch(s.messages[conversation_id]) } : s.messages,
                    conversations,
                };
            });
        },

        applyRead: ({ conversation_id, user_id, up_to_message_id, receipts }) => {
            const me = readCurrentUser();
            if (me && user_id === me.id) {
                // I read this conversation in another tab / device.
                get().setUnread(conversation_id, 0);
                return;
            }
            set((s) => {
                let next = receipts?.length ? applyReceiptCounts(s, receipts) : { messages: s.messages, threadMessages: s.threadMessages };
                const list = next.messages[conversation_id];
                if (list) {
                    // Legacy direct-chat ticks: mark read_by up to the cursor.
                    let passedCursor = !up_to_message_id;
                    const updated = list.map((m) => {
                        if (up_to_message_id && passedCursor) return m;
                        if (up_to_message_id && m.id === up_to_message_id) passedCursor = true;
                        return m.read_by?.includes(user_id) ? m : { ...m, read_by: [...(m.read_by || []), user_id] };
                    });
                    next = { ...next, messages: { ...next.messages, [conversation_id]: updated } };
                }
                return next;
            });
        },

        applyDelivered: ({ receipts }) => {
            if (!receipts?.length) return;
            set((s) => applyReceiptCounts(s, receipts));
        },

        markConversationRead: (id) => get().setUnread(id, 0),

        setUnread: (id, count) => {
            set((s) => {
                const conv = s.conversations[id];
                if (!conv) return {} as Partial<ChatState>;
                return {
                    conversations: {
                        ...s.conversations,
                        [id]: {
                            ...conv,
                            membership: {
                                ...(conv.membership ?? EMPTY_MEMBERSHIP),
                                unread_count: count,
                                ...(count === 0 ? { last_read_at: new Date().toISOString() } : {}),
                            },
                        },
                    },
                };
            });
        },

        incrementUnread: (id) => {
            const conv = get().conversations[id];
            if (conv) get().setUnread(id, (conv.membership?.unread_count || 0) + 1);
        },

        upsertConversation: (c) => {
            const existing = get().conversations[c.id];
            set((s) => {
                const prev = s.conversations[c.id];
                // A conversation is never stored without `membership` — the
                // composer and list read it directly.
                const membership = c.membership ?? prev?.membership ?? EMPTY_MEMBERSHIP;
                const conversations = { ...s.conversations, [c.id]: { ...prev, ...c, membership } };
                return { conversations, conversationOrder: sortedOrder(conversations) };
            });
            // Raw documents (e.g. from a socket broadcast) lack our membership:
            // fetch the authoritative view once.
            if (!c.membership && !existing?.membership) get().refreshConversation(c.id).catch(() => undefined);
        },

        refreshConversation: async (id) => {
            const conv = await chatService.getConversation(id);
            set((s) => {
                const conversations = { ...s.conversations, [id]: { ...s.conversations[id], ...conv, membership: conv.membership ?? EMPTY_MEMBERSHIP } };
                return { conversations, conversationOrder: sortedOrder(conversations) };
            });
        },

        removeConversation: (id) => {
            set((s) => {
                const conversations = { ...s.conversations };
                delete conversations[id];
                const messages = { ...s.messages };
                delete messages[id];
                return {
                    conversations,
                    messages,
                    conversationOrder: sortedOrder(conversations),
                    activeLoadError: s.activeConversationId === id ? 'forbidden' : s.activeLoadError,
                };
            });
        },

        applyConversationUpdated: ({ conversation_id, conversation, removed }) => {
            if (removed) {
                get().removeConversation(conversation_id);
                return;
            }
            set((s) => {
                const existing = s.conversations[conversation_id];
                if (!existing) return {} as Partial<ChatState>;
                const patch = (conversation || {}) as Partial<ChatConversation>;
                const merged = {
                    ...existing,
                    ...patch,
                    id: conversation_id,
                    membership: patch.membership ? { ...existing.membership, ...patch.membership } : existing.membership,
                } as ChatConversation;
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
                set((s) => ({ threadMessages: { ...s.threadMessages, [rootId]: mergeMessages(s.threadMessages[rootId], messages) } }));
            } catch {
                set((s) => ({ threadMessages: { ...s.threadMessages, [rootId]: s.threadMessages[rootId] || [] } }));
            }
        },

        setThreadOpen: (rootId) => set({ threadOpenFor: rootId }),

        reactToMessage: async (messageId, emoji) => {
            const me = readCurrentUser();
            if (!me) return;
            const findMsg = (): ChatMessage | undefined => {
                for (const list of [...Object.values(get().messages), ...Object.values(get().threadMessages)]) {
                    const found = list.find((m) => m.id === messageId);
                    if (found) return found;
                }
                return undefined;
            };
            const msg = findMsg();
            const before = msg?.reactions;
            const already = before?.find((r) => r.emoji === emoji)?.user_ids.includes(me.id) ?? false;
            const base = { conversation_id: msg?.conversation_id || get().activeConversationId || '', message_id: messageId, emoji, user_id: me.id };
            get().applyReaction({ ...base, action: already ? 'removed' : 'added' });
            try {
                if (already) await chatService.unreact(messageId, emoji);
                else await chatService.react(messageId, emoji);
            } catch (err) {
                // Roll back to exactly what we had.
                get().applyReaction({ ...base, action: already ? 'added' : 'removed', reactions: before ?? [] });
                throw err;
            }
        },

        editMessage: async (messageId, content) => {
            const updated = await chatService.editMessage(messageId, content);
            get().applyEdit(updated);
        },

        deleteMessage: async (messageId, scope) => {
            let convId = '';
            for (const [cid, list] of Object.entries(get().messages)) {
                if (list.some((m) => m.id === messageId)) {
                    convId = cid;
                    break;
                }
            }
            if (!convId) {
                const inThread = Object.values(get().threadMessages).flat().find((m) => m.id === messageId);
                convId = inThread?.conversation_id || get().activeConversationId || '';
            }
            await chatService.deleteMessage(messageId, scope);
            get().applyDelete({ conversation_id: convId, message_id: messageId, scope });
        },

        pinMessage: async (messageId, pin) => {
            if (pin) await chatService.pinMessage(messageId);
            else await chatService.unpinMessage(messageId);
        },

        starMessage: async (messageId, star) => {
            const me = readCurrentUser();
            const toggle = (m: ChatMessage, on: boolean) => {
                if (m.id !== messageId || !me) return m;
                const starred = new Set(m.starred_by || []);
                if (on) starred.add(me.id);
                else starred.delete(me.id);
                return { ...m, starred_by: Array.from(starred) };
            };
            set((s) => patchEverywhere(s, (m) => toggle(m, star)));
            try {
                if (star) await chatService.starMessage(messageId);
                else await chatService.unstarMessage(messageId);
            } catch {
                set((s) => patchEverywhere(s, (m) => toggle(m, !star)));
            }
        },

        forwardMessages: async (messageIds, conversationIds) => {
            await chatService.forwardMessages(messageIds, conversationIds);
        },

        upvoteMessage: async (messageId, up) => {
            const me = readCurrentUser();
            const toggle = (m: ChatMessage, on: boolean) => {
                if (m.id !== messageId || !me) return m;
                const voters = new Set(m.upvoted_by || []);
                if (on) voters.add(me.id);
                else voters.delete(me.id);
                return { ...m, upvoted_by: Array.from(voters) };
            };
            set((s) => patchEverywhere(s, (m) => toggle(m, up)));
            try {
                if (up) await chatService.upvote(messageId);
                else await chatService.removeUpvote(messageId);
            } catch {
                set((s) => patchEverywhere(s, (m) => toggle(m, !up)));
            }
        },

        acceptAnswer: async (rootMessageId, replyMessageId) => {
            const updated = await chatService.acceptAnswer(rootMessageId, replyMessageId);
            get().applyEdit(updated);
        },

        reset: () => {
            recentIncoming.clear();
            set({
                conversations: {},
                conversationOrder: [],
                activeConversationId: null,
                activeLoadError: null,
                messages: {},
                hasMore: {},
                loadingOlder: {},
                loadingMessages: {},
                typing: {},
                threadOpenFor: null,
                threadMessages: {},
                filter: 'all',
                searchQuery: '',
                showArchived: false,
                conversationsLoaded: false,
                highlightMessageId: null,
                replyTarget: null,
                editingMessage: null,
            });
        },
    };
});
