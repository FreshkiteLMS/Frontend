// Shared chat types — mirror of backend API responses (snake_case as delivered).
// Literal unions and socket event names MUST stay in sync with Backend/src/types/chat.ts.

export const CONVERSATION_TYPES = ['direct', 'group', 'batch', 'announcement', 'doubt', 'live', 'support'] as const;
export type ConversationType = typeof CONVERSATION_TYPES[number];

export const MESSAGE_TYPES = ['text', 'image', 'video', 'file', 'audio', 'system', 'poll', 'event'] as const;
export type MessageType = typeof MESSAGE_TYPES[number];

export const MEMBER_ROLES = ['owner', 'moderator', 'member'] as const;
export type MemberRole = typeof MEMBER_ROLES[number];

export const PRESENCE_STATUSES = ['online', 'away', 'busy', 'offline'] as const;
export type PresenceStatus = typeof PRESENCE_STATUSES[number];

export const ALLOWED_REACTIONS = ['👍', '❤️', '🔥', '😂', '👏', '🎉', '😮'] as const;
export type AllowedReaction = typeof ALLOWED_REACTIONS[number];
/** Announcement channels accept a deliberately narrower set (§5). */
export const ANNOUNCEMENT_REACTIONS = ['👍', '❤️', '🎉', '👏'] as const;

export const MESSAGE_PRIORITIES = ['normal', 'high', 'urgent'] as const;
export type MessagePriority = typeof MESSAGE_PRIORITIES[number];

export const SYSTEM_EVENT_KINDS = ['member_joined', 'member_added', 'member_removed', 'member_left', 'group_created', 'group_renamed', 'group_locked', 'group_unlocked', 'member_promoted', 'member_demoted', 'assignment_uploaded', 'live_class_scheduled', 'course_updated', 'meeting_started', 'poll_created', 'event_created', 'conversation_pinned_message'] as const;
export type SystemEventKind = typeof SYSTEM_EVENT_KINDS[number];

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const CHAT_EVENTS = {
    JOIN_ROOM: 'joinRoom', LEAVE_ROOM: 'leaveRoom', SEND_MESSAGE: 'sendMessage',
    MESSAGE_RECEIVED: 'messageReceived', TYPING: 'typing', STOP_TYPING: 'stopTyping',
    MESSAGE_READ: 'messageRead', MESSAGE_DELIVERED: 'messageDelivered',
    USER_ONLINE: 'userOnline', USER_OFFLINE: 'userOffline', NOTIFICATION: 'notification',
    FRIEND_REQUEST: 'friendRequest', FRIEND_ACCEPTED: 'friendAccepted',
    GROUP_CREATED: 'groupCreated', MESSAGE_REACTION: 'messageReaction',
    MESSAGE_EDITED: 'messageEdited', MESSAGE_DELETED: 'messageDeleted',
    CONVERSATION_UPDATED: 'conversationUpdated', CONVERSATION_CREATED: 'conversationCreated',
    MEMBER_ADDED: 'memberAdded', MEMBER_REMOVED: 'memberRemoved',
    MESSAGE_PINNED: 'messagePinned', POLL_UPDATED: 'pollUpdated', EVENT_UPDATED: 'eventUpdated',
    PRESENCE_STATE: 'presenceState', SUBSCRIBE_PRESENCE: 'subscribePresence',
    SET_STATUS: 'setStatus', BADGE_UPDATE: 'badgeUpdate',
} as const;

export type ChatUserRole = 'admin' | 'student' | 'teacher';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface ChatUserSummary {
    id: string;
    name: string;
    email?: string;
    role: ChatUserRole;
}

// ---------------------------------------------------------------------------
// Attachments / message fragments
// ---------------------------------------------------------------------------

export interface ChatAttachment {
    id: string;
    url: string;
    key: string;
    file_name: string;
    mime_type: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number;
}

export interface ChatReaction {
    emoji: string;
    user_ids: string[];
}

export interface ChatReplyRef {
    message_id: string;
    sender_id: string;
    sender_name: string;
    preview: string;
    type: MessageType;
}

export interface ChatSystemEvent {
    kind: SystemEventKind;
    data?: Record<string, unknown>;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    sender_role: ChatUserRole;
    type: MessageType;
    content: string;
    attachments: ChatAttachment[];
    reply_to: ChatReplyRef | null;
    thread_root_id: string | null;
    thread_reply_count: number;
    thread_last_reply_at: string | null;
    mentions: string[];
    reactions: ChatReaction[];
    status: 'sent' | 'scheduled';
    priority: MessagePriority;
    is_sticky: boolean;
    is_pinned: boolean;
    pinned_by: string | null;
    pinned_at: string | null;
    starred_by: string[];
    edited_at: string | null;
    deleted_for?: string[];
    deleted_for_everyone: boolean;
    deleted_by: string | null;
    delivered_to: string[];
    read_by: string[];
    scheduled_for: string | null;
    system_event: ChatSystemEvent | null;
    poll_id: string | null;
    event_id: string | null;
    upvoted_by: string[];
    accepted_reply_id: string | null;
    forwarded_from: { message_id: string; conversation_id: string } | null;
    client_temp_id: string | null;
    created_at: string;
    updated_at: string;
    /** Client-side only: optimistic send lifecycle flag (never sent by the server). */
    _status?: 'pending' | 'failed';
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export interface ConversationSettings {
    who_can_post: 'everyone' | 'moderators';
    reactions_enabled: boolean;
    locked: boolean;
    slow_mode_seconds: number;
}

export interface ConversationLastMessage {
    message_id: string;
    sender_id: string;
    sender_name: string;
    preview: string;
    type: MessageType;
    created_at: string;
}

export interface ConversationMembership {
    role: MemberRole;
    unread_count: number;
    pinned: boolean;
    archived: boolean;
    notifications_muted: boolean;
    last_read_at: string | null;
    muted_until?: string | null;
    banned?: boolean;
}

export interface ChatConversation {
    id: string;
    type: ConversationType;
    name: string;
    description: string;
    avatar_url: string | null;
    batch_id: string | null;
    course_id: string | null;
    meeting_id: string | null;
    created_by: string;
    settings: ConversationSettings;
    invite_token?: string | null;
    last_message: ConversationLastMessage | null;
    member_count: number;
    pinned_message_ids: string[];
    created_at: string;
    updated_at: string;
    membership: ConversationMembership;
    /** Present for `direct` conversations: the counterpart user. */
    other_user?: { id: string; name: string; role: ChatUserRole; avatar?: string | null };
}

export interface ConversationMemberView {
    user_id: string;
    name: string;
    email: string;
    /** Membership role inside the conversation. */
    role: MemberRole;
    /** Global LMS role of the user. */
    user_role: ChatUserRole;
    joined_at: string;
    muted_until: string | null;
    banned: boolean;
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export interface PresenceInfo {
    user_id: string;
    status: PresenceStatus;
    last_seen_at: string | null;
}

// ---------------------------------------------------------------------------
// Friends / social
// ---------------------------------------------------------------------------

export interface FriendView {
    id: string;
    name: string;
    email?: string;
    role: ChatUserRole;
    status?: PresenceStatus;
    last_seen_at?: string | null;
    mutual_friends?: number;
    mutual_batches?: number;
}

export interface FriendRequestView {
    id: string;
    from_user_id: string;
    to_user_id: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    responded_at?: string | null;
    created_at: string;
    /** The counterpart user (sender for incoming, recipient for outgoing). */
    user?: ChatUserSummary;
    mutual_friends?: number;
}

export interface FriendSuggestion {
    id: string;
    name: string;
    role: ChatUserRole;
    reason: 'same_batch' | 'same_course' | 'mutual_friends';
    mutual_friends: number;
    mutual_batches: number;
}

export interface BlockedUserView {
    id: string;
    name: string;
    email?: string;
    role?: ChatUserRole;
    blocked_at?: string;
}

// ---------------------------------------------------------------------------
// Profiles / gamification
// ---------------------------------------------------------------------------

export interface ChatBadge {
    key: string;
    label: string;
    awarded_at: string;
}

export interface ChatProfileStats {
    messages_sent: number;
    helpful_marks: number;
    accepted_answers: number;
    reactions_received: number;
}

export interface ChatProfileStreak {
    current: number;
    longest: number;
    last_active_date: string;
}

export interface ChatProfilePrivacy {
    show_online: boolean;
    allow_dms: 'everyone' | 'friends' | 'none';
}

export type FriendshipStatus = 'self' | 'friends' | 'request_sent' | 'request_received' | 'none' | 'blocked';

export interface ChatProfileView {
    user: ChatUserSummary;
    bio: string;
    skills: string[];
    interests: string[];
    github_url: string;
    linkedin_url: string;
    portfolio_url: string;
    badges: ChatBadge[];
    stats: ChatProfileStats;
    streak: ChatProfileStreak;
    privacy: ChatProfilePrivacy;
    courses?: { current: string[]; completed: string[] };
    friendship_status: FriendshipStatus;
    presence?: PresenceInfo;
}

export interface UpdateChatProfileInput {
    bio?: string;
    skills?: string[];
    interests?: string[];
    github_url?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    privacy?: Partial<ChatProfilePrivacy>;
}

export interface LeaderboardEntry {
    user_id: string;
    name: string;
    role?: ChatUserRole;
    messages: number;
    badges?: ChatBadge[];
    stats?: Partial<ChatProfileStats>;
    rank?: number;
}

// ---------------------------------------------------------------------------
// Polls / events
// ---------------------------------------------------------------------------

export interface ChatPollOption {
    id: string;
    text: string;
    /** Hidden by the API when the poll is anonymous. */
    voter_ids?: string[];
    /** Provided for anonymous polls instead of voter_ids. */
    vote_count?: number;
}

export interface ChatPollView {
    id: string;
    conversation_id: string;
    message_id: string;
    question: string;
    options: ChatPollOption[];
    allow_multiple: boolean;
    is_anonymous: boolean;
    closes_at: string | null;
    closed: boolean;
    created_by: string;
    created_at: string;
    updated_at?: string;
    /** Option ids the current user voted for (returned for anonymous polls). */
    own_option_ids?: string[];
}

export type ChatEventType = 'hackathon' | 'meeting' | 'interview' | 'live_session' | 'other';
export type RsvpStatus = 'going' | 'maybe' | 'declined';

export interface ChatEventRsvp {
    user_id: string;
    status: RsvpStatus;
    responded_at: string;
}

export interface ChatEventView {
    id: string;
    conversation_id: string | null;
    title: string;
    description: string;
    event_type: ChatEventType;
    location_url: string;
    starts_at: string;
    ends_at: string | null;
    created_by: string;
    cancelled: boolean;
    rsvps: ChatEventRsvp[];
    message_id: string | null;
    created_at: string;
    updated_at?: string;
    rsvp_counts?: { going: number; maybe: number; declined: number };
    my_rsvp?: RsvpStatus | null;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export type ChatReportStatus = 'open' | 'reviewed' | 'action_taken' | 'dismissed';

export interface ChatReportView {
    id: string;
    reporter_id: string;
    target_type: 'message' | 'user';
    message_id: string | null;
    reported_user_id: string;
    conversation_id: string | null;
    reason: string;
    details: string;
    status: ChatReportStatus;
    reviewed_by: string | null;
    created_at: string;
    updated_at?: string;
    reporter_name?: string;
    reported_user_name?: string;
    message_content?: string;
}

// ---------------------------------------------------------------------------
// DTOs (client → server)
// ---------------------------------------------------------------------------

export interface SendMessagePayload {
    type?: MessageType;
    content?: string;
    attachments?: ChatAttachment[];
    reply_to_message_id?: string;
    thread_root_id?: string;
    mentions?: string[];
    scheduled_for?: string;
    priority?: MessagePriority;
    is_sticky?: boolean;
    client_temp_id?: string;
    poll_id?: string;
    event_id?: string;
}

export interface CreateGroupInput {
    name: string;
    description?: string;
    avatar_url?: string;
    type?: 'group' | 'announcement' | 'doubt' | 'support';
    member_ids: string[];
    batch_id?: string;
    course_id?: string;
    settings?: Partial<ConversationSettings>;
}

export interface MessageSearchQuery {
    q?: string;
    conversation_id?: string;
    sender_id?: string;
    type?: string;
    has_attachments?: boolean;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
}

export interface BulkMessageInput {
    audience: { user_ids?: string[]; batch_ids?: string[]; all_students?: boolean };
    content: string;
    priority?: MessagePriority;
    is_sticky?: boolean;
    scheduled_for?: string;
}

export interface CreateEventInput {
    title: string;
    description?: string;
    event_type: ChatEventType;
    location_url?: string;
    starts_at: string;
    ends_at?: string;
    conversation_id?: string;
}

export interface CreatePollInput {
    question: string;
    options: string[];
    allow_multiple?: boolean;
    is_anonymous?: boolean;
    closes_at?: string;
}

export interface ReportInput {
    target_type: 'message' | 'user';
    message_id?: string;
    user_id?: string;
    conversation_id?: string;
    reason: string;
    details?: string;
}

export interface AdminChatOverview {
    conversations: number;
    messages_24h: number;
    online_users: number;
    open_reports: number;
}

// ---------------------------------------------------------------------------
// Socket payloads (server → client) — §8 of the contract
// ---------------------------------------------------------------------------

export interface TypingPayload {
    conversationId: string;
    userId: string;
    name: string;
}

export interface MessageDeletedPayload {
    conversation_id: string;
    message_id: string;
    scope: 'everyone';
}

export interface MessageReactionPayload {
    conversation_id: string;
    message_id: string;
    emoji: string;
    user_id: string;
    action: 'added' | 'removed';
}

export interface MessageReadPayload {
    conversation_id: string;
    user_id: string;
    up_to_message_id?: string | null;
}

export interface MessageDeliveredPayload {
    conversation_id: string;
    user_id: string;
    message_ids: string[];
}

export interface MessagePinnedPayload {
    conversation_id: string;
    message_id: string;
    pinned: boolean;
    message: ChatMessage;
}

export interface ConversationUpdatedPayload {
    conversation_id: string;
    conversation?: Partial<ChatConversation>;
    changes?: Partial<ChatConversation>;
}

export interface BadgeUpdatePayload {
    conversation_id: string;
}

export interface UserPresencePayload {
    userId: string;
    status: PresenceStatus;
    last_seen_at: string | null;
}

export interface FriendRequestPayload {
    request: FriendRequestView;
    from: { id: string; name: string };
}

export interface FriendAcceptedPayload {
    by: { id: string; name: string };
}

export interface PollUpdatedPayload {
    conversation_id: string;
    poll: ChatPollView;
}

export interface EventUpdatedPayload {
    event: ChatEventView;
}
