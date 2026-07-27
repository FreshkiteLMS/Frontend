'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
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
    CHAT_EVENTS,
    type BadgeUpdatePayload,
    type ChatConversation,
    type ChatMessage,
    type EventUpdatedPayload,
    type FriendAcceptedPayload,
    type FriendRequestPayload,
    type MessageDeletedPayload,
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

interface JoinAck {
    ok: boolean;
    error?: string;
}

/**
 * Wires the three chat namespaces ('/chat', '/presence', '/notification') to the
 * chat/presence/friend/notification stores. Mount ONCE (ChatApp does).
 *
 * Listener registration is idempotent across React StrictMode's double-invoke:
 * every `.on` is paired with an exact-handler `.off` in the cleanup, so a
 * remount never leaves duplicates behind.
 */
export function useChatSocket(): void {
    const { user } = useAuth();
    const userId = user?.id;

    // ------------------------------------------------------------------
    // Event wiring — one effect per authenticated user.
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!userId) {
            // Logged out: tear down sockets and drop any cached social state.
            disconnectChatSockets();
            usePresenceStore.getState().reset();
            useFriendStore.getState().reset();
            return;
        }

        const chat = getChatNsp();
        const presence = getPresenceNsp();
        const notification = getNotificationNsp();

        /* ---------------------------- /chat ---------------------------- */

        const onMessageReceived = (message: ChatMessage) => {
            const store = useChatStore.getState();
            store.applyIncomingMessage(message);

            // Read receipt: the conversation is open and the tab is focused.
            const isActive = store.activeConversationId === message.conversation_id;
            const isOwn = message.sender_id === userId;
            const focused = typeof document === 'undefined' || document.hasFocus();
            if (isActive && !isOwn && focused) {
                chat.emit(CHAT_EVENTS.MESSAGE_READ, {
                    conversationId: message.conversation_id,
                    upToMessageId: message.id,
                });
            }
        };

        const onMessageEdited = (message: ChatMessage) => {
            useChatStore.getState().applyEdit(message);
        };

        const onMessageDeleted = (payload: MessageDeletedPayload) => {
            useChatStore.getState().applyDelete(payload);
        };

        const onMessageReaction = (payload: MessageReactionPayload) => {
            useChatStore.getState().applyReaction(payload);
        };

        const onMessagePinned = (payload: MessagePinnedPayload) => {
            useChatStore.getState().applyPinned(payload);
        };

        const onMessageRead = (payload: MessageReadPayload) => {
            useChatStore.getState().applyRead(payload);
        };

        const onMessageDelivered = () => {
            // Delivery ticks are derived from the message docs themselves; the
            // event only matters for direct chats, where the next message patch
            // carries `delivered_to`. Nothing to reconcile locally.
        };

        const onTyping = (payload: TypingPayload) => {
            if (!payload?.conversationId || payload.userId === userId) return;
            useChatStore
                .getState()
                .setTyping(payload.conversationId, payload.userId, payload.name || 'Someone');
        };

        const onStopTyping = (payload: TypingPayload) => {
            if (!payload?.conversationId) return;
            useChatStore.getState().clearTyping(payload.conversationId, payload.userId);
        };

        const onConversationCreated = (payload: { conversation: ChatConversation } | ChatConversation) => {
            const conversation = 'conversation' in payload ? payload.conversation : payload;
            if (conversation?.id) useChatStore.getState().upsertConversation(conversation);
        };

        const onConversationUpdated = (payload: {
            conversation_id: string;
            conversation?: Partial<ChatConversation>;
        }) => {
            if (payload?.conversation_id) useChatStore.getState().applyConversationUpdated(payload);
        };

        const onMemberChanged = (payload: { conversation_id: string }) => {
            // Membership changed — refresh the conversation so member_count and
            // settings stay accurate for whoever has it open.
            if (!payload?.conversation_id) return;
            chatService
                .getConversation(payload.conversation_id)
                .then((conv) => useChatStore.getState().upsertConversation(conv))
                .catch(() => undefined);
        };

        const onBadgeUpdate = (payload: BadgeUpdatePayload) => {
            const convId = payload?.conversation_id;
            if (!convId) return;
            const store = useChatStore.getState();
            // The active conversation is already read; ignore its badge pings.
            if (store.activeConversationId === convId) return;
            // Refetch for an authoritative unread_count + last_message preview,
            // falling back to a local increment if the request fails.
            chatService
                .getConversation(convId)
                .then((conv) => useChatStore.getState().upsertConversation(conv))
                .catch(() => useChatStore.getState().incrementUnread(convId));
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
            // Re-join the open conversation room after a reconnect.
            const activeId = useChatStore.getState().activeConversationId;
            if (activeId) chat.emit(CHAT_EVENTS.JOIN_ROOM, { conversationId: activeId });
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

        const onPresenceState = (payload: PresenceInfo | PresenceInfo[]) => {
            usePresenceStore.getState().applyPresence(payload);
        };

        const onUserPresence = (payload: UserPresencePayload) => {
            if (!payload?.userId) return;
            usePresenceStore.getState().applyPresence(payload);
        };

        const onPresenceConnect = () => {
            // Re-establish watch rooms after a reconnect.
            usePresenceStore.getState().resubscribeAll();
        };

        presence.on('connect', onPresenceConnect);
        presence.on(CHAT_EVENTS.PRESENCE_STATE, onPresenceState);
        presence.on(CHAT_EVENTS.USER_ONLINE, onUserPresence);
        presence.on(CHAT_EVENTS.USER_OFFLINE, onUserPresence);

        /* ------------------------ /notification ------------------------ */

        const onNotification = (payload: Notification) => {
            if (!payload) return;
            useNotificationCenterStore.getState().applyIncoming(payload);
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
        };
    }, [userId]);

    // ------------------------------------------------------------------
    // Room membership follows the active conversation.
    // ------------------------------------------------------------------
    const activeConversationId = useChatStore((s) => s.activeConversationId);

    useEffect(() => {
        if (!userId || !activeConversationId) return;
        const chat = getChatNsp();
        const conversationId = activeConversationId;

        chat.emit(CHAT_EVENTS.JOIN_ROOM, { conversationId }, (ack?: JoinAck) => {
            if (ack && ack.ok === false) {
                toast.error(ack.error || 'Could not join this conversation');
            }
        });

        return () => {
            chat.emit(CHAT_EVENTS.LEAVE_ROOM, { conversationId });
        };
    }, [userId, activeConversationId]);
}

/**
 * Lightweight unread-badge subscriber for the Header — does not mount the chat
 * UI. Loads the conversation list once per authenticated session, then tracks
 * the store's aggregate unread count.
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
