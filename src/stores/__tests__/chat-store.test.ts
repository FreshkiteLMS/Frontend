import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatConversation, ChatMessage } from '@/types/chat';

const api = vi.hoisted(() => ({
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    listMessages: vi.fn(),
    sendMessage: vi.fn(),
    markRead: vi.fn(async () => ({})),
    react: vi.fn(async () => ({})),
    unreact: vi.fn(async () => ({})),
    deleteMessage: vi.fn(async () => ({})),
}));
vi.mock('@/services/api/chat.api', () => ({ chatService: api }));

import { useChatStore } from '../chat-store';

const ME = 'user-me';

function conv(id: string, extra: Partial<ChatConversation> = {}): ChatConversation {
    return {
        id, type: 'group', name: id, description: '', avatar_url: null, batch_id: null, course_id: null, meeting_id: null,
        created_by: ME, settings: { who_can_post: 'everyone', reactions_enabled: true, locked: false, slow_mode_seconds: 0 },
        last_message: null, member_count: 2, pinned_message_ids: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
        membership: { role: 'member', unread_count: 0, pinned: false, archived: false, notifications_muted: false, last_read_at: null },
        ...extra,
    };
}

let seq = 0;
function msg(conversationId: string, extra: Partial<ChatMessage> = {}): ChatMessage {
    seq++;
    return {
        id: `m${seq}`, conversation_id: conversationId, sender_id: 'other', sender_name: 'Other', sender_role: 'student', type: 'text',
        content: `hello ${seq}`, attachments: [], reply_to: null, thread_root_id: null, thread_reply_count: 0, thread_last_reply_at: null,
        mentions: [], reactions: [], status: 'sent', priority: 'normal', is_sticky: false, is_pinned: false, pinned_by: null, pinned_at: null,
        starred_by: [], edited_at: null, deleted_for_everyone: false, deleted_by: null, delivered_to: [], read_by: [], scheduled_for: null,
        system_event: null, poll_id: null, event_id: null, upvoted_by: [], accepted_reply_id: null, forwarded_from: null, client_temp_id: null,
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(), updated_at: '2026-01-01T00:00:00Z',
        ...extra,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: ME, name: 'Me', role: 'student' }));
    useChatStore.getState().reset();
});

describe('chat store synchronisation', () => {
    it('keeps a socket message that arrives while the first page is loading', async () => {
        const c = conv('c1');
        useChatStore.getState().upsertConversation(c);
        const fetched = [msg('c1'), msg('c1')];
        let release!: () => void;
        api.listMessages.mockImplementationOnce(() => new Promise((r) => { release = () => r({ messages: fetched, has_more: false }); }));

        const opening = useChatStore.getState().openConversation('c1');
        await Promise.resolve();
        const live = msg('c1', { content: 'Hi' });
        // The list isn't cached yet, so the store just tracks the conversation…
        useChatStore.getState().applyIncomingMessage(live);
        // …and the fetched page (which already includes "Hi" on the server) merges, not overwrites.
        release();
        fetched.push(live);
        await opening;
        expect(useChatStore.getState().messages.c1.map((m) => m.content)).toContain('Hi');
    });

    it('re-opening a cached conversation fetches everything after the newest message', async () => {
        useChatStore.getState().upsertConversation(conv('c1'));
        const first = [msg('c1'), msg('c1')];
        api.listMessages.mockResolvedValueOnce({ messages: first, has_more: false });
        await useChatStore.getState().openConversation('c1');
        await useChatStore.getState().openConversation(null);

        const missed = msg('c1', { content: 'sent while away' });
        api.listMessages.mockResolvedValueOnce({ messages: [missed], has_more: false });
        await useChatStore.getState().openConversation('c1');

        expect(api.listMessages).toHaveBeenLastCalledWith('c1', { after: first[1].id, limit: 100 });
        expect(useChatStore.getState().messages.c1.map((m) => m.content)).toEqual([first[0].content, first[1].content, 'sent while away']);
    });

    it('updates the sidebar and unread count for background conversations', () => {
        useChatStore.getState().upsertConversation(conv('c1'));
        useChatStore.getState().upsertConversation(conv('c2'));
        useChatStore.setState({ activeConversationId: 'c1' });
        const incoming = msg('c2', { content: 'ping' });
        useChatStore.getState().applyIncomingMessage(incoming);
        useChatStore.getState().applyIncomingMessage(incoming); // duplicate delivery
        const c2 = useChatStore.getState().conversations.c2;
        expect(c2.last_message?.preview).toBe('ping');
        expect(c2.membership.unread_count).toBe(1);
        expect(useChatStore.getState().totalUnread()).toBe(1);
    });

    it('reconciles the optimistic bubble once, and a retry reuses the client_temp_id', async () => {
        useChatStore.getState().upsertConversation(conv('c1'));
        useChatStore.setState({ activeConversationId: 'c1', messages: { c1: [] } });

        api.sendMessage.mockRejectedValueOnce(new Error('offline'));
        await useChatStore.getState().sendMessage({ content: 'Hi' });
        const failed = useChatStore.getState().messages.c1[0];
        expect(failed._status).toBe('failed');
        expect(failed.content).toBe('Hi');

        // Retrying reuses the same client_temp_id, so the server can dedupe it.
        const tempId = failed.client_temp_id!;
        const saved = msg('c1', { sender_id: ME, content: 'Hi', client_temp_id: tempId });
        api.sendMessage.mockResolvedValueOnce(saved);
        await useChatStore.getState().retrySend('c1', tempId);
        expect(api.sendMessage.mock.calls[1][1].client_temp_id).toBe(tempId);
        expect(useChatStore.getState().messages.c1).toHaveLength(1);
        expect(useChatStore.getState().messages.c1[0]).toMatchObject({ id: saved.id, _status: undefined });
    });

    it('a socket echo that beats the HTTP response never produces a duplicate bubble', async () => {
        useChatStore.getState().upsertConversation(conv('c1'));
        useChatStore.setState({ activeConversationId: 'c1', messages: { c1: [] } });
        let respond!: (m: ChatMessage) => void;
        api.sendMessage.mockImplementationOnce(() => new Promise((r) => { respond = r; }));
        const sending = useChatStore.getState().sendMessage({ content: 'Hi' });
        const tempId = useChatStore.getState().messages.c1[0].client_temp_id!;
        const saved = msg('c1', { sender_id: ME, content: 'Hi', client_temp_id: tempId });
        useChatStore.getState().applyIncomingMessage(saved);
        respond(saved);
        await sending;
        const list = useChatStore.getState().messages.c1;
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({ id: saved.id, _status: undefined });
        // Own messages never bump your own unread count.
        expect(useChatStore.getState().conversations.c1.membership.unread_count).toBe(0);
    });

    it('applies authoritative reaction lists and rolls back a failed reaction', async () => {
        const m = msg('c1');
        useChatStore.setState({ messages: { c1: [m] }, activeConversationId: 'c1' });
        useChatStore.getState().applyReaction({ conversation_id: 'c1', message_id: m.id, emoji: '🔥', user_id: 'x', action: 'added', reactions: [{ emoji: '🔥', user_ids: ['x', 'y'] }] });
        expect(useChatStore.getState().messages.c1[0].reactions).toEqual([{ emoji: '🔥', user_ids: ['x', 'y'] }]);

        api.react.mockRejectedValueOnce(new Error('nope'));
        await expect(useChatStore.getState().reactToMessage(m.id, '👍')).rejects.toThrow('nope');
        expect(useChatStore.getState().messages.c1[0].reactions).toEqual([{ emoji: '🔥', user_ids: ['x', 'y'] }]);
    });

    it('applies receipt counters and turns quoted replies into "deleted" when the original goes', () => {
        const original = msg('c1', { sender_id: ME, recipient_count: 2 });
        const reply = msg('c1', { reply_to: { message_id: original.id, sender_id: ME, sender_name: 'Me', preview: 'hello', type: 'text' } });
        useChatStore.setState({ messages: { c1: [original, reply] } });

        useChatStore.getState().applyRead({ conversation_id: 'c1', user_id: 'other', receipts: [{ message_id: original.id, delivered_count: 2, read_count: 2, recipient_count: 2 }] });
        expect(useChatStore.getState().messages.c1[0]).toMatchObject({ read_count: 2, delivered_count: 2 });

        useChatStore.getState().applyDelete({ conversation_id: 'c1', message_id: original.id, scope: 'everyone' });
        const [tomb, quoted] = useChatStore.getState().messages.c1;
        expect(tomb).toMatchObject({ deleted_for_everyone: true, content: '' });
        expect(quoted.reply_to).toMatchObject({ deleted: true, preview: '' });

        useChatStore.getState().applyDelete({ conversation_id: 'c1', message_id: reply.id, scope: 'me' });
        expect(useChatStore.getState().messages.c1.map((x) => x.id)).toEqual([original.id]);
    });

    it('loads archived conversations too, and never stores a conversation without membership', async () => {
        api.listConversations.mockResolvedValueOnce([conv('a'), conv('b', { membership: { ...conv('b').membership, archived: true } })]);
        await useChatStore.getState().loadConversations();
        expect(api.listConversations).toHaveBeenCalledWith({ archived: 'all' });
        expect(Object.keys(useChatStore.getState().conversations).sort()).toEqual(['a', 'b']);

        api.getConversation.mockResolvedValueOnce(conv('raw'));
        const { membership: _omit, ...raw } = conv('raw');
        useChatStore.getState().upsertConversation(raw as ChatConversation);
        expect(useChatStore.getState().conversations.raw.membership).toBeDefined();
        expect(api.getConversation).toHaveBeenCalledWith('raw');
    });

    it('explains why a conversation cannot be opened instead of spinning forever', async () => {
        api.getConversation.mockRejectedValueOnce({ response: { status: 404 } });
        await useChatStore.getState().openConversation('gone');
        expect(useChatStore.getState().activeLoadError).toBe('not_found');

        api.getConversation.mockRejectedValueOnce({ response: { status: 403 } });
        await useChatStore.getState().openConversation('private');
        expect(useChatStore.getState().activeLoadError).toBe('forbidden');
    });
});
