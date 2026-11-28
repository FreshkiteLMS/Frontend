import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('@/services/api/axios', () => ({ default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));

import { EffectiveSummary } from '../permission-editor';
import type { PermissionCatalog } from '@/types/mentor';

const catalog: PermissionCatalog = {
    defaults: [],
    groups: [
        { key: 'batches', label: 'Batch management', permissions: [{ key: 'batches.view', label: 'View batches', description: '', scope: 'batch' }] },
        { key: 'finance', label: 'Financial', permissions: [{ key: 'finance.view_payments', label: 'View payments', description: '', scope: 'global', finance: true }] },
    ],
};

const groupText = (label: string) => within(screen.getByText(label).parentElement as HTMLElement).getByText(/View|Nothing/).textContent;

describe('EffectiveSummary', () => {
    afterEach(cleanup);

    it('Full Administrative Access implies every permission except the financial ones', () => {
        render(<EffectiveSummary catalog={catalog} value={{ fullAdmin: true, batchScope: 'assigned', studentScope: 'assigned', permissions: [], batchIds: [] }} />);
        expect(groupText('Batch management')).toBe('View batches');
        expect(groupText('Financial')).toBe('Nothing');
        expect(screen.getByText('Every batch')).toBeTruthy();
        expect(screen.getByText('Every student')).toBeTruthy();
    });

    it('a batch-scoped mentor sees only what is switched on, and is warned when no batch is assigned', () => {
        render(<EffectiveSummary catalog={catalog} value={{ fullAdmin: false, batchScope: 'assigned', studentScope: 'assigned', permissions: ['finance.view_payments'], batchIds: [] }} />);
        expect(groupText('Batch management')).toBe('Nothing');
        expect(groupText('Financial')).toBe('View payments');
        expect(screen.getByText(/No batches assigned/)).toBeTruthy();
        expect(screen.getByText('Students in the assigned batches')).toBeTruthy();
    });
});
