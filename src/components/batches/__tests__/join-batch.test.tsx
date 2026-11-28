import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const preview = vi.fn();
const join = vi.fn();
vi.mock('@/services/api/batch-admin.api', () => ({ studentBatchService: { preview: (...a: unknown[]) => preview(...a), join: (...a: unknown[]) => join(...a) } }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'asha@test.dev', role: 'student' } }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { JoinBatch } from '../join-batch';

const batch = {
    id: 'b1', name: 'Java Full Stack 01', description: 'Nov intake', batchCode: 'BATCH-ABC123', startDate: '2026-11-01', endDate: null,
    lifecycle: 'active', batchType: null, courses: [{ id: 'c1', title: 'Java', description: '', thumbnail: null, category: null }], mentors: ['Rahul'], seatsLeft: null,
};

beforeEach(() => { preview.mockReset(); join.mockReset(); });

describe('JoinBatch', () => {
    afterEach(cleanup);

    it('explains an expired link instead of showing the batch', async () => {
        preview.mockRejectedValue({ response: { status: 410, data: { error: { code: 'INVITATION_EXPIRED', message: 'expired' } } } });
        render(<JoinBatch token="t" />);
        expect(await screen.findByText('This link has expired')).toBeTruthy();
        expect(screen.queryByText('Java Full Stack 01')).toBeNull();
    });

    it('shows the batch and its courses, and joins directly', async () => {
        preview.mockResolvedValue({ batch, joinMode: 'direct', state: 'can_join' });
        join.mockResolvedValue({ result: 'joined', batchId: 'b1' });
        render(<JoinBatch token="t" />);
        expect(await screen.findByText('Java Full Stack 01')).toBeTruthy();
        expect(screen.getByText('Java')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Join batch' }));
        await waitFor(() => expect(join).toHaveBeenCalledWith('t', undefined));
        expect(await screen.findByText('You are in!')).toBeTruthy();
    });

    it('asks to join when the batch uses approval', async () => {
        preview.mockResolvedValue({ batch, joinMode: 'approval', state: 'can_join' });
        join.mockResolvedValue({ result: 'request_submitted', batchId: 'b1', requestId: 'r1' });
        render(<JoinBatch token="t" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Ask to join' }));
        expect(await screen.findByText('Request sent')).toBeTruthy();
    });
});
