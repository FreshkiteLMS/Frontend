import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const forwardMessages = vi.fn();
const searchUsers = vi.fn();

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: 'me', role: 'student', name: 'Me' } }) }));
vi.mock('@/services/api/chat-social.api', () => ({ chatSocialService: { searchUsers: (...a: unknown[]) => searchUsers(...a) } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const conversations: Record<string, any> = {
    g1: { id: 'g1', type: 'group', name: 'Java Batch', member_count: 12, avatar_url: null },
    d1: { id: 'd1', type: 'direct', name: '', other_user: { id: 'u-bob', name: 'Bob', role: 'student' }, avatar_url: null },
};
vi.mock('@/stores/chat-store', () => ({
    useChatStore: (sel: (s: any) => unknown) => sel({ conversations, conversationOrder: ['g1', 'd1'], forwardMessages }),
}));
vi.mock('@/stores/friend-store', () => ({
    useFriendStore: (sel: (s: any) => unknown) => sel({
        friends: [{ id: 'u-bob', name: 'Bob', role: 'student' }, { id: 'u-cara', name: 'Cara', role: 'student' }],
        loadFriends: () => Promise.resolve(),
    }),
}));

import { ForwardModal } from '../forward-modal';

afterEach(() => { cleanup(); forwardMessages.mockReset(); searchUsers.mockReset(); });
beforeEach(() => { document.body.innerHTML = ''; });

describe('ForwardModal', () => {
    test('renders fully in <body> and lists both people and groups', () => {
        render(<ForwardModal messageIds={['m1']} onClose={vi.fn()} />);
        expect(screen.getByRole('dialog').closest('body')).toBe(document.body);
        expect(screen.getByRole('listbox', { name: 'People' })).toBeTruthy();
        expect(screen.getByRole('listbox', { name: 'Groups & channels' })).toBeTruthy();
        // Bob has a DM already, so he is listed once (as that chat); Cara is a friend without one.
        expect(screen.getAllByText('Bob')).toHaveLength(1);
        expect(screen.getByText('Cara')).toBeTruthy();
        expect(screen.getByText('Java Batch')).toBeTruthy();
    });

    test('forwards to a group, an existing DM and a person in one go', async () => {
        forwardMessages.mockResolvedValue({ failed: [] });
        const onClose = vi.fn();
        render(<ForwardModal messageIds={['m1']} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: /Java Batch/ }));
        fireEvent.click(screen.getByRole('button', { name: /Bob/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Cara/ }));
        expect(screen.getByText('3 selected')).toBeTruthy();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Forward' })); });
        expect(forwardMessages).toHaveBeenCalledWith(['m1'], { conversationIds: ['g1', 'd1'], userIds: ['u-cara'] });
        expect(onClose).toHaveBeenCalled();
    });

    test('selected recipients can be removed from the chip list', () => {
        render(<ForwardModal messageIds={['m1']} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Java Batch/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove Java Batch' }));
        expect(screen.getByText('No one selected')).toBeTruthy();
    });

    test('filters by search, shows server results and an empty state', async () => {
        searchUsers.mockResolvedValue([{ id: 'u-dev', name: 'Devi', role: 'teacher' }]);
        render(<ForwardModal messageIds={['m1']} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Search people or groups'), { target: { value: 'dev' } });
        await waitFor(() => expect(screen.getByText('Devi')).toBeTruthy(), { timeout: 2000 });
        expect(screen.queryByText('Java Batch')).toBeNull();

        searchUsers.mockResolvedValue([]);
        fireEvent.change(screen.getByLabelText('Search people or groups'), { target: { value: 'zzz' } });
        await waitFor(() => expect(screen.getByText(/No one matches/)).toBeTruthy(), { timeout: 2000 });
    });

    test('keeps refused recipients selected and explains why', async () => {
        forwardMessages.mockResolvedValue({ failed: [{ kind: 'user', id: 'u-cara', status: 403, message: 'This user is not accepting direct messages' }] });
        const onClose = vi.fn();
        render(<ForwardModal messageIds={['m1']} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: /Java Batch/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Cara/ }));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Forward' })); });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toContain('not accepting direct messages');
        expect(screen.getByText('1 selected')).toBeTruthy();
    });

    test('Escape closes the dialog', () => {
        const onClose = vi.fn();
        render(<ForwardModal messageIds={['m1']} onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});
