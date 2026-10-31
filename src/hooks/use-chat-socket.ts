'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { refreshCourseAccess } from '@/hooks/use-course-access';
import {
    disconnectChatSockets,
    getChatNsp,
    getNotificationNsp,
    getPresenceNsp,
} from '@/services/chat-socket';
import { useChatStore } from '@/stores/chat-store';
import { useFriendStore } from '@/stores/friend-store';
import { useNotificationCenterStore } from '@/stores/notification-center-store';
import { usePresenceStore } from '@/stores/presence-store';
import {
    ACCESS_UPDATED_EVENT,
    CHAT_EVENTS,
    type BadgeUpdatePayload,
    type ChatConversation,
    type ChatMessage,
    type EventUpdatedPayload,
    type FriendAcceptedPayload,
    type FriendRequestPayload,
    type MessageDeletedPayload,
    type MessageDeliveredPayload,
    type MessagePinnedPayload,
    type MessageReactionPayload,
    type MessageReadPayload,
    type PollUpdatedPayload,
    type PresenceInfo,
    type TypingPayload,
    type UserPresencePayload,
} from '@/types/chat';
import type { Notification } from '@/services/api/notification.api';

/** Typing indicators self-expire if the sender never sends `stopTyping`. */
const TYPING_TTL_MS = 6000;
const TYPING_SWEEP_MS = 3000;

/** Window event fired when the user's course access changes (approval, purchase…). */
export const ACCESS_UPDATED_WINDOW_EVENT = 'lms:access-updated';

/** Notification types that mean "your course access just changed". */
const ACCESS_NOTIFICATION_TYPES = new Set(['request_approved', 'COURSE_ASSIGNED', 'BATCH_ADDED', 'BATCH_REMOVED']);

interface JoinAck {
    ok: boolean;
    error?: string;
}

/** The user is actually looking at this tab. */
function isViewing(): boolean {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible' && document.hasFocus();
}

/**
 * Wires the three realtime namespaces ('/chat', '/presence', '/notification')
 * to the chat/presence/friend/notification stores. Mounted ONCE for the whole
 * app (RealtimeProvider), so unread badges, access changes and incoming
 * messages stay live on every page — not only on /chat.
 *
 * Listener registration is idempotent across React StrictMode's double-invoke:
 * every `.on` is paired with an exact-handler `.off` in the cleanup.
 */
export function useChatSocket(): void {
    const { user } = useAuth();
    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            // Logged out: tear down sockets and drop every cached copy of
            // the previous user's data.
            disconnectChatSockets();
            useChatStore.getState().reset();
            usePresenceStore.getState().reset();
            useFriendStore.getState().reset();
            return;
        }

        const chat = getChatNsp();
        const presence = getPresenceNsp();
        const notification = getNotificationNsp();
        let connectedBefore = chat.connected;

        /** Mark the open conversation read when the user can actually see it. */
        const readActiveIfViewing = (upToMessageId?: string) => {
            const store = useChatStore.getState();
            const activeId = store.activeConversationId;
            if (!activeId || !isViewing()) return;
            const conv = store.conversations[activeId];
            if (!upToMessageId && !conv?.membership?.unread_count) return;
            chat.emit(CHAT_EVENTS.MESSAGE_READ, { conversationId: activeId, upToMessageId });
            store.markConversationRead(activeId);
        };

        /* ---------------------------- /chat ---------------------------- */

        const onMessageReceived = (message: ChatMessage) => {
            if (!message?.id) return;
            const store = useChatStore.getState();
            store.applyIncomingMessage(message);
            if (message.sender_id === userId || message.type === 'system') return;

            // This device has the message → delivery receipt.
            chat.emit(CHAT_EVENTS.MESSAGE_DELIVERED, { conversationId: message.conversation_id, messageIds: [message.id] });
            // Read receipt only when the chat is open AND visible.
            if (store.activeConversationId === message.conversation_id && !message.thread_root_id) {
                readActiveIfViewing(message.id);
            }
        };

        const onMessageEdited = (message: ChatMessage) => useChatStore.getState().applyEdit(message);
        const onMessageDeleted = (payload: MessageDeletedPayload) => useChatStore.getState().applyDelete(payload);
        const onMessageReaction = (payload: MessageReactionPayload) => useChatStore.getState().applyReaction(payload);
        const onMessagePinned = (payload: MessagePinnedPayload) => useChatStore.getState().applyPinned(payload);
        const onMessageRead = (payload: MessageReadPayload) => useChatStore.getState().applyRead(payload);
        const onMessageDelivered = (payload: MessageDeliveredPayload) => useChatStore.getState().applyDelivered(payload);

        const onTyping = (payload: TypingPayload) => {
            if (!payload?.conversationId || payload.userId === userId) return;
            useChatStore.getState().setTyping(payload.conversationId, payload.userId, payload.name || 'Someone');
        };

        const onStopTyping = (payload: TypingPayload) => {
            if (!payload?.conversationId) return;
            useChatStore.getState().clearTyping(payload.conversationId, payload.userId);
        };

        const onConversationCreated = (payload: { conversation: ChatConversation } | ChatConversation) => {
            const conversation = 'conversation' in payload ? payload.conversation : payload;
            // upsertConversation fetches our membership view when the
            // broadcast document doesn't carry one.
            if (conversation?.id) useChatStore.getState().upsertConversation(conversation);
        };

        const onConversationUpdated = (payload: {
            conversation_id: string;
            conversation?: Partial<ChatConversation>;
            removed?: boolean;
        } & Partial<ChatConversation>) => {
            if (!payload?.conversation_id && !payload?.id) return;
            const id = payload.conversation_id || (payload.id as string);
            // Older broadcasts send the whole conversation document instead of a patch.
            const patch = payload.conversation ?? (payload.id ? (payload as Partial<ChatConversation>) : undefined);
            useChatStore.getState().applyConversationUpdated({ conversation_id: id, conversation: patch, removed: payload.removed });
        };

        const onMemberChanged = (payload: { conversation_id: string }) => {
            if (!payload?.conversation_id) return;
            useChatStore.getState().refreshConversation(payload.conversation_id).catch(() => undefined);
        };

        const onBadgeUpdate = (payload: BadgeUpdatePayload) => {
            const convId = payload?.conversation_id;
            if (!convId) return;
            const store = useChatStore.getState();
            if (typeof payload.unread_count === 'number') {
                store.setUnread(convId, payload.unread_count);
                return;
            }
            if (store.activeConversationId === convId) return;
            store.refreshConversation(convId).catch(() => store.incrementUnread(convId));
        };

        const onPollUpdated = (payload: PollUpdatedPayload) => {
            if (typeof window === 'undefined' || !payload?.poll) return;
            window.dispatchEvent(new CustomEvent('chat:pollUpdated', { detail: payload }));
        };

        const onEventUpdated = (payload: EventUpdatedPayload) => {
            if (typeof window === 'undefined' || !payload?.event) return;
            window.dispatchEvent(new CustomEvent('chat:eventUpdated', { detail: payload }));
        };

        const onChatConnect = () => {
            const store = useChatStore.getState();
            const activeId = store.activeConversationId;
            if (activeId) chat.emit(CHAT_EVENTS.JOIN_ROOM, { conversationId: activeId });
            // After an interruption, fetch whatever was missed while offline.
            if (connectedBefore) void store.resyncAll();
            connectedBefore = true;
        };

        chat.on('connect', onChatConnect);
        chat.on(CHAT_EVENTS.MESSAGE_RECEIVED, onMessageReceived);
        chat.on(CHAT_EVENTS.MESSAGE_EDITED, onMessageEdited);
        chat.on(CHAT_EVENTS.MESSAGE_DELETED, onMessageDeleted);
        chat.on(CHAT_EVENTS.MESSAGE_REACTION, onMessageReaction);
        chat.on(CHAT_EVENTS.MESSAGE_PINNED, onMessagePinned);
        chat.on(CHAT_EVENTS.MESSAGE_READ, onMessageRead);
        chat.on(CHAT_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
        chat.on(CHAT_EVENTS.TYPING, onTyping);
        chat.on(CHAT_EVENTS.STOP_TYPING, onStopTyping);
        chat.on(CHAT_EVENTS.CONVERSATION_CREATED, onConversationCreated);
        chat.on(CHAT_EVENTS.GROUP_CREATED, onConversationCreated);
        chat.on(CHAT_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
        chat.on(CHAT_EVENTS.MEMBER_ADDED, onMemberChanged);
        chat.on(CHAT_EVENTS.MEMBER_REMOVED, onMemberChanged);
        chat.on(CHAT_EVENTS.BADGE_UPDATE, onBadgeUpdate);
        chat.on(CHAT_EVENTS.POLL_UPDATED, onPollUpdated);
        chat.on(CHAT_EVENTS.EVENT_UPDATED, onEventUpdated);

        /* -------------------------- /presence -------------------------- */

        const onPresenceState = (payload: PresenceInfo | PresenceInfo[]) => usePresenceStore.getState().applyPresence(payload);
        const onUserPresence = (payload: UserPresencePayload) => {
            if (!payload?.userId) return;
            usePresenceStore.getState().applyPresence(payload);
        };
        const onPresenceConnect = () => usePresenceStore.getState().resubscribeAll();

        presence.on('connect', onPresenceConnect);
        presence.on(CHAT_EVENTS.PRESENCE_STATE, onPresenceState);
        presence.on(CHAT_EVENTS.USER_ONLINE, onUserPresence);
        presence.on(CHAT_EVENTS.USER_OFFLINE, onUserPresence);

        /* ------------------------ /notification ------------------------ */

        const onAccessUpdated = () => {
            // Course access is re-derived on the server; refetch every cached copy.
            refreshCourseAccess().catch(() => undefined);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ACCESS_UPDATED_WINDOW_EVENT));
        };

        const onNotification = (payload: Notification) => {
            if (!payload) return;
            useNotificationCenterStore.getState().applyIncoming(payload);
            if (ACCESS_NOTIFICATION_TYPES.has(String((payload as { type?: string }).type))) onAccessUpdated();
        };

        const onFriendRequest = (payload: FriendRequestPayload) => {
            if (!payload?.request) return;
            useFriendStore.getState().applyIncomingRequest(payload.request);
            toast.success(`${payload.from?.name || 'Someone'} sent you a friend request`);
        };

        const onFriendAccepted = (payload: FriendAcceptedPayload) => {
            if (!payload?.by) return;
            useFriendStore.getState().applyAccepted(payload.by);
            toast.success(`${payload.by.name || 'Someone'} accepted your friend request`);
        };

        notification.on(CHAT_EVENTS.NOTIFICATION, onNotification);
        notification.on(CHAT_EVENTS.FRIEND_REQUEST, onFriendRequest);
        notification.on(CHAT_EVENTS.FRIEND_ACCEPTED, onFriendAccepted);
        notification.on(ACCESS_UPDATED_EVENT, onAccessUpdated);

        /* --------------- focus: read what arrived while away --------------- */

        const onVisible = () => readActiveIfViewing();
        window.addEventListener('focus', onVisible);
        document.addEventListener('visibilitychange', onVisible);

        /* ---------------------- typing TTL sweeper ---------------------- */

        const sweeper = window.setInterval(() => {
            const store = useChatStore.getState();
            const now = Date.now();
            for (const [convId, byUser] of Object.entries(store.typing)) {
                for (const [uid, info] of Object.entries(byUser)) {
                    if (now - info.at > TYPING_TTL_MS) store.clearTyping(convId, uid);
                }
            }
        }, TYPING_SWEEP_MS);

        return () => {
            window.clearInterval(sweeper);
            window.removeEventListener('focus', onVisible);
            document.removeEventListener('visibilitychange', onVisible);

            chat.off('connect', onChatConnect);
            chat.off(CHAT_EVENTS.MESSAGE_RECEIVED, onMessageReceived);
            chat.off(CHAT_EVENTS.MESSAGE_EDITED, onMessageEdited);
            chat.off(CHAT_EVENTS.MESSAGE_DELETED, onMessageDeleted);
            chat.off(CHAT_EVENTS.MESSAGE_REACTION, onMessageReaction);
            chat.off(CHAT_EVENTS.MESSAGE_PINNED, onMessagePinned);
            chat.off(CHAT_EVENTS.MESSAGE_READ, onMessageRead);
            chat.off(CHAT_EVENTS.MESSAGE_DELIVERED, onMessageDelivered);
            chat.off(CHAT_EVENTS.TYPING, onTyping);
            chat.off(CHAT_EVENTS.STOP_TYPING, onStopTyping);
            chat.off(CHAT_EVENTS.CONVERSATION_CREATED, onConversationCreated);
            chat.off(CHAT_EVENTS.GROUP_CREATED, onConversationCreated);
            chat.off(CHAT_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
            chat.off(CHAT_EVENTS.MEMBER_ADDED, onMemberChanged);
            chat.off(CHAT_EVENTS.MEMBER_REMOVED, onMemberChanged);
            chat.off(CHAT_EVENTS.BADGE_UPDATE, onBadgeUpdate);
            chat.off(CHAT_EVENTS.POLL_UPDATED, onPollUpdated);
            chat.off(CHAT_EVENTS.EVENT_UPDATED, onEventUpdated);

            presence.off('connect', onPresenceConnect);
            presence.off(CHAT_EVENTS.PRESENCE_STATE, onPresenceState);
            presence.off(CHAT_EVENTS.USER_ONLINE, onUserPresence);
            presence.off(CHAT_EVENTS.USER_OFFLINE, onUserPresence);

            notification.off(CHAT_EVENTS.NOTIFICATION, onNotification);
            notification.off(CHAT_EVENTS.FRIEND_REQUEST, onFriendRequest);
            notification.off(CHAT_EVENTS.FRIEND_ACCEPTED, onFriendAccepted);
            notification.off(ACCESS_UPDATED_EVENT, onAccessUpdated);
        };
    }, [userId]);

    // ------------------------------------------------------------------
    // The server subscribes every chat socket to all of the user's rooms on
    // connect. Joining the open conversation again is a cheap, idempotent
    // safety net (e.g. a room added while this socket was reconnecting).
    // Rooms are deliberately NOT left when switching chats — that is what
    // used to stop background conversations from receiving messages.
    // ------------------------------------------------------------------
    const activeConversationId = useChatStore((s) => s.activeConversationId);

    useEffect(() => {
        if (!userId || !activeConversationId) return;
        getChatNsp().emit(CHAT_EVENTS.JOIN_ROOM, { conversationId: activeConversationId }, (ack?: JoinAck) => {
            if (ack && ack.ok === false && useChatStore.getState().activeConversationId === activeConversationId) {
                // The conversation view shows the reason; no duplicate toast.
                console.warn('[chat] join room refused:', ack.error);
            }
        });
    }, [userId, activeConversationId]);
}

/**
 * Aggregate unread-message count for the navbar badge. The realtime provider
 * keeps the store live app-wide; this only makes sure the conversation index
 * is loaded once per signed-in user.
 */
export function useChatBadge(): number {
    const { user } = useAuth();
    const userId = user?.id;
    const requestedFor = useRef<string | null>(null);

    const totalUnread = useChatStore((s) =>
        Object.values(s.conversations).reduce(
            (sum, c) => (c.membership?.archived ? sum : sum + (c.membership?.unread_count || 0)),
            0
        )
    );

    useEffect(() => {
        if (!userId || requestedFor.current === userId) return;
        requestedFor.current = userId;
        const store = useChatStore.getState();
        if (store.conversationsLoaded) return;
        store.loadConversations().catch(() => undefined);
    }, [userId]);

    return totalUnread;
}
