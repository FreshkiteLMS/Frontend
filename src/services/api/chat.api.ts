import api from './axios';
import type {
    AdminChatOverview,
    BulkMessageInput,
    ChatAttachment,
    ChatConversation,
    ChatEventView,
    ChatMessage,
    ChatPollView,
    ChatReportView,
    ConversationMemberView,
    ConversationSettings,
    CreateEventInput,
    CreateGroupInput,
    CreatePollInput,
    MemberRole,
    MessageSearchQuery,
    PresenceInfo,
    PresenceStatus,
    ReportInput,
    RsvpStatus,
    SendMessagePayload,
} from '@/types/chat';

/** Unwrap the standard `{success, data, message}` envelope. */
function unwrap<T>(response: { data: { success: boolean; data: T; message?: string } }, fallback: string): T {
    if (response.data.success) return response.data.data;
    throw new Error(response.data.message || fallback);
}

export const chatService = {
    // ------------------------------------------------------------------
    // Conversations
    // ------------------------------------------------------------------
    listConversations: async (opts?: { type?: string; archived?: boolean; q?: string }): Promise<ChatConversation[]> => {
        const response = await api.get('/chat/conversations', { params: opts });
        return unwrap<ChatConversation[]>(response, 'Failed to load conversations');
    },

    createDirect: async (userId: string): Promise<ChatConversation> => {
        const response = await api.post('/chat/conversations/direct', { user_id: userId });
        // The endpoint returns { conversation, created } — unwrap the conversation.
        const data = unwrap<{ conversation: ChatConversation; created: boolean }>(
            response,
            'Failed to start conversation'
        );
        return data.conversation;
    },

    createGroup: async (dto: CreateGroupInput): Promise<ChatConversation> => {
        const response = await api.post('/chat/conversations/group', dto);
        return unwrap<ChatConversation>(response, 'Failed to create group');
    },

    getConversation: async (conversationId: string): Promise<ChatConversation> => {
        const response = await api.get(`/chat/conversations/${conversationId}`);
        return unwrap<ChatConversation>(response, 'Failed to load conversation');
    },

    updateConversation: async (
        conversationId: string,
        dto: { name?: string; description?: string; avatar_url?: string; settings?: Partial<ConversationSettings> }
    ): Promise<ChatConversation> => {
        const response = await api.patch(`/chat/conversations/${conversationId}`, dto);
        return unwrap<ChatConversation>(response, 'Failed to update conversation');
    },

    listMembers: async (conversationId: string): Promise<ConversationMemberView[]> => {
        const response = await api.get(`/chat/conversations/${conversationId}/members`);
        return unwrap<ConversationMemberView[]>(response, 'Failed to load members');
    },

    addMembers: async (conversationId: string, userIds: string[]): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/members`, { user_ids: userIds });
        return unwrap<unknown>(response, 'Failed to add members');
    },

    removeMember: async (conversationId: string, userId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
        return unwrap<unknown>(response, 'Failed to remove member');
    },

    setMemberRole: async (conversationId: string, userId: string, role: MemberRole): Promise<unknown> => {
        const response = await api.patch(`/chat/conversations/${conversationId}/members/${userId}`, { role });
        return unwrap<unknown>(response, 'Failed to change member role');
    },

    leaveConversation: async (conversationId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/leave`);
        return unwrap<unknown>(response, 'Failed to leave conversation');
    },

    markRead: async (conversationId: string, upToMessageId?: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/read`, {
            up_to_message_id: upToMessageId,
        });
        return unwrap<unknown>(response, 'Failed to mark as read');
    },

    setFlags: async (
        conversationId: string,
        flags: { pinned?: boolean; archived?: boolean; notifications_muted?: boolean }
    ): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/flags`, flags);
        return unwrap<unknown>(response, 'Failed to update conversation settings');
    },

    rotateInviteLink: async (conversationId: string): Promise<{ invite_token: string }> => {
        const response = await api.post(`/chat/conversations/${conversationId}/invite-link`);
        return unwrap<{ invite_token: string }>(response, 'Failed to generate invite link');
    },

    joinByInvite: async (inviteToken: string): Promise<ChatConversation> => {
        const response = await api.post(`/chat/join/${inviteToken}`);
        return unwrap<ChatConversation>(response, 'Failed to join via invite');
    },

    listPinnedMessages: async (conversationId: string): Promise<ChatMessage[]> => {
        const response = await api.get(`/chat/conversations/${conversationId}/pinned-messages`);
        return unwrap<ChatMessage[]>(response, 'Failed to load pinned messages');
    },

    ensureSupportConversation: async (): Promise<ChatConversation> => {
        const response = await api.post('/chat/support');
        return unwrap<ChatConversation>(response, 'Failed to open support chat');
    },

    getDoubtChannels: async (courseId: string): Promise<ChatConversation[]> => {
        const response = await api.get(`/chat/courses/${courseId}/doubt-channels`);
        return unwrap<ChatConversation[]>(response, 'Failed to load doubt channels');
    },

    ensureLiveRoom: async (meetingId: string): Promise<ChatConversation> => {
        const response = await api.post(`/chat/meetings/${meetingId}/live-room`);
        return unwrap<ChatConversation>(response, 'Failed to open live room');
    },

    // ------------------------------------------------------------------
    // Messages
    // ------------------------------------------------------------------
    listMessages: async (
        conversationId: string,
        opts?: { before?: string; limit?: number; thread_root_id?: string }
    ): Promise<{ messages: ChatMessage[]; has_more: boolean }> => {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params: opts });
        return unwrap<{ messages: ChatMessage[]; has_more: boolean }>(response, 'Failed to load messages');
    },

    sendMessage: async (conversationId: string, dto: SendMessagePayload): Promise<ChatMessage> => {
        const response = await api.post(`/chat/conversations/${conversationId}/messages`, dto);
        return unwrap<ChatMessage>(response, 'Failed to send message');
    },

    editMessage: async (messageId: string, content: string): Promise<ChatMessage> => {
        const response = await api.patch(`/chat/messages/${messageId}`, { content });
        return unwrap<ChatMessage>(response, 'Failed to edit message');
    },

    deleteMessage: async (messageId: string, scope: 'me' | 'everyone'): Promise<unknown> => {
        const response = await api.delete(`/chat/messages/${messageId}`, { params: { scope } });
        return unwrap<unknown>(response, 'Failed to delete message');
    },

    react: async (messageId: string, emoji: string): Promise<unknown> => {
        const response = await api.post(`/chat/messages/${messageId}/reactions`, { emoji });
        return unwrap<unknown>(response, 'Failed to add reaction');
    },

    unreact: async (messageId: string, emoji: string): Promise<unknown> => {
        const response = await api.delete(`/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
        return unwrap<unknown>(response, 'Failed to remove reaction');
    },

    pinMessage: async (messageId: string): Promise<unknown> => {
        const response = await api.post(`/chat/messages/${messageId}/pin`);
        return unwrap<unknown>(response, 'Failed to pin message');
    },

    unpinMessage: async (messageId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/messages/${messageId}/pin`);
        return unwrap<unknown>(response, 'Failed to unpin message');
    },

    starMessage: async (messageId: string): Promise<unknown> => {
        const response = await api.post(`/chat/messages/${messageId}/star`);
        return unwrap<unknown>(response, 'Failed to star message');
    },

    unstarMessage: async (messageId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/messages/${messageId}/star`);
        return unwrap<unknown>(response, 'Failed to unstar message');
    },

    listStarred: async (): Promise<ChatMessage[]> => {
        const response = await api.get('/chat/starred');
        return unwrap<ChatMessage[]>(response, 'Failed to load starred messages');
    },

    upvote: async (messageId: string): Promise<unknown> => {
        const response = await api.post(`/chat/messages/${messageId}/upvote`);
        return unwrap<unknown>(response, 'Failed to upvote');
    },

    removeUpvote: async (messageId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/messages/${messageId}/upvote`);
        return unwrap<unknown>(response, 'Failed to remove upvote');
    },

    acceptAnswer: async (rootMessageId: string, replyMessageId: string): Promise<ChatMessage> => {
        const response = await api.post(`/chat/messages/${rootMessageId}/accept-answer`, {
            reply_message_id: replyMessageId,
        });
        return unwrap<ChatMessage>(response, 'Failed to accept answer');
    },

    forwardMessages: async (messageIds: string[], conversationIds: string[]): Promise<ChatMessage[]> => {
        const response = await api.post('/chat/messages/forward', {
            message_ids: messageIds,
            conversation_ids: conversationIds,
        });
        return unwrap<ChatMessage[]>(response, 'Failed to forward messages');
    },

    getThread: async (
        messageId: string,
        opts?: { before?: string; limit?: number }
    ): Promise<{ messages: ChatMessage[]; has_more: boolean }> => {
        const response = await api.get(`/chat/messages/${messageId}/thread`, { params: opts });
        return unwrap<{ messages: ChatMessage[]; has_more: boolean }>(response, 'Failed to load thread');
    },

    searchMessages: async (query: MessageSearchQuery): Promise<{ data: ChatMessage[]; total: number }> => {
        const response = await api.get('/chat/search', { params: query });
        if (response.data.success) {
            return {
                data: response.data.data || [],
                total: response.data.meta?.total ?? (response.data.data?.length || 0),
            };
        }
        throw new Error(response.data.message || 'Failed to search messages');
    },

    listScheduled: async (): Promise<ChatMessage[]> => {
        const response = await api.get('/chat/scheduled');
        return unwrap<ChatMessage[]>(response, 'Failed to load scheduled messages');
    },

    cancelScheduled: async (messageId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/scheduled/${messageId}`);
        return unwrap<unknown>(response, 'Failed to cancel scheduled message');
    },

    // ------------------------------------------------------------------
    // Attachments
    // ------------------------------------------------------------------
    uploadAttachments: async (files: File[]): Promise<ChatAttachment[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        const response = await api.post('/chat/attachments', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = unwrap<{ attachments: ChatAttachment[] }>(response, 'Failed to upload files');
        return data.attachments;
    },

    // ------------------------------------------------------------------
    // Presence
    // ------------------------------------------------------------------
    getPresence: async (userIds: string[]): Promise<PresenceInfo[]> => {
        const response = await api.get('/chat/presence', { params: { user_ids: userIds.join(',') } });
        return unwrap<PresenceInfo[]>(response, 'Failed to load presence');
    },

    setPresenceStatus: async (status: PresenceStatus): Promise<unknown> => {
        const response = await api.put('/chat/presence/status', { status });
        return unwrap<unknown>(response, 'Failed to update status');
    },

    // ------------------------------------------------------------------
    // Polls
    // ------------------------------------------------------------------
    createPoll: async (conversationId: string, dto: CreatePollInput): Promise<ChatPollView> => {
        const response = await api.post(`/chat/conversations/${conversationId}/polls`, dto);
        return unwrap<ChatPollView>(response, 'Failed to create poll');
    },

    getPoll: async (pollId: string): Promise<ChatPollView> => {
        const response = await api.get(`/chat/polls/${pollId}`);
        return unwrap<ChatPollView>(response, 'Failed to load poll');
    },

    votePoll: async (pollId: string, optionIds: string[]): Promise<ChatPollView> => {
        const response = await api.post(`/chat/polls/${pollId}/vote`, { option_ids: optionIds });
        return unwrap<ChatPollView>(response, 'Failed to vote');
    },

    closePoll: async (pollId: string): Promise<ChatPollView> => {
        const response = await api.post(`/chat/polls/${pollId}/close`);
        return unwrap<ChatPollView>(response, 'Failed to close poll');
    },

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    createEvent: async (dto: CreateEventInput): Promise<ChatEventView> => {
        const response = await api.post('/chat/events', dto);
        return unwrap<ChatEventView>(response, 'Failed to create event');
    },

    listEvents: async (opts?: { upcoming?: boolean }): Promise<ChatEventView[]> => {
        const response = await api.get('/chat/events', {
            params: opts?.upcoming ? { upcoming: 1 } : undefined,
        });
        return unwrap<ChatEventView[]>(response, 'Failed to load events');
    },

    rsvpEvent: async (eventId: string, status: RsvpStatus): Promise<ChatEventView> => {
        const response = await api.post(`/chat/events/${eventId}/rsvp`, { status });
        return unwrap<ChatEventView>(response, 'Failed to RSVP');
    },

    cancelEvent: async (eventId: string): Promise<ChatEventView> => {
        const response = await api.post(`/chat/events/${eventId}/cancel`);
        return unwrap<ChatEventView>(response, 'Failed to cancel event');
    },

    // ------------------------------------------------------------------
    // Moderation
    // ------------------------------------------------------------------
    report: async (dto: ReportInput): Promise<unknown> => {
        const response = await api.post('/chat/reports', dto);
        return unwrap<unknown>(response, 'Failed to submit report');
    },

    listReports: async (opts?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: ChatReportView[]; total: number }> => {
        const response = await api.get('/chat/reports', { params: opts });
        if (response.data.success) {
            return {
                data: response.data.data || [],
                total: response.data.meta?.total ?? (response.data.data?.length || 0),
            };
        }
        throw new Error(response.data.message || 'Failed to load reports');
    },

    resolveReport: async (reportId: string, status: 'reviewed' | 'action_taken' | 'dismissed'): Promise<unknown> => {
        const response = await api.patch(`/chat/reports/${reportId}`, { status });
        return unwrap<unknown>(response, 'Failed to update report');
    },

    muteMember: async (conversationId: string, userId: string, minutes: number): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/mute`, {
            user_id: userId,
            minutes,
        });
        return unwrap<unknown>(response, 'Failed to mute member');
    },

    unmuteMember: async (conversationId: string, userId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/unmute`, {
            user_id: userId,
        });
        return unwrap<unknown>(response, 'Failed to unmute member');
    },

    banMember: async (conversationId: string, userId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/ban`, { user_id: userId });
        return unwrap<unknown>(response, 'Failed to ban member');
    },

    unbanMember: async (conversationId: string, userId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/unban`, { user_id: userId });
        return unwrap<unknown>(response, 'Failed to unban member');
    },

    lockConversation: async (conversationId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/lock`);
        return unwrap<unknown>(response, 'Failed to lock conversation');
    },

    unlockConversation: async (conversationId: string): Promise<unknown> => {
        const response = await api.post(`/chat/conversations/${conversationId}/moderation/unlock`);
        return unwrap<unknown>(response, 'Failed to unlock conversation');
    },

    moderationDeleteMessage: async (messageId: string): Promise<unknown> => {
        const response = await api.delete(`/chat/moderation/messages/${messageId}`);
        return unwrap<unknown>(response, 'Failed to delete message');
    },

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------
    adminBulkMessage: async (dto: BulkMessageInput): Promise<{ sent: number }> => {
        const response = await api.post('/chat/admin/bulk-message', dto);
        return unwrap<{ sent: number }>(response, 'Failed to send bulk message');
    },

    adminOverview: async (): Promise<AdminChatOverview> => {
        const response = await api.get('/chat/admin/overview');
        return unwrap<AdminChatOverview>(response, 'Failed to load overview');
    },
};
