import { describe, expect, test } from 'vitest';
import { addMonths, accessEndLabel, defaultDraft, draftToDuration, endFromDateInput } from '../access-window';

const NOW = new Date('2026-01-31T10:00:00Z');

describe('access window preview', () => {
    test('presets match the server rules', () => {
        expect(draftToDuration(defaultDraft('30_DAYS'), NOW).expiresAt!.toISOString()).toBe('2026-03-02T10:00:00.000Z');
        expect(addMonths(NOW, 1).toISOString()).toBe('2026-02-28T10:00:00.000Z');
        expect(draftToDuration(defaultDraft('1_YEAR'), NOW).expiresAt!.toISOString()).toBe('2027-01-31T10:00:00.000Z');
        const life = draftToDuration(defaultDraft('LIFETIME'), NOW);
        expect(life.expiresAt).toBeNull();
        expect(life.duration).toEqual({ preset: 'LIFETIME' });
    });

    test('custom ranges need a future expiry after the start', () => {
        expect(draftToDuration({ preset: 'CUSTOM', startDate: '', expiryDate: '' }, NOW).error).toMatch(/expiry/i);
        expect(draftToDuration({ preset: 'CUSTOM', startDate: '', expiryDate: '2026-01-01' }, NOW).error).toBeTruthy();
        const ok = draftToDuration({ preset: 'CUSTOM', startDate: '', expiryDate: '2026-06-30' }, NOW);
        expect(ok.error).toBeUndefined();
        expect(ok.duration?.expiresAt).toBe(endFromDateInput('2026-06-30').toISOString());
    });

    test('an empty start keeps the existing start when editing', () => {
        const base = new Date('2025-12-01T00:00:00Z');
        const r = draftToDuration(defaultDraft('3_MONTHS'), NOW, base);
        expect(r.startsAt).toBe(base);
        expect(r.expiresAt!.toISOString()).toBe('2026-03-01T00:00:00.000Z');
        expect(r.duration).toEqual({ preset: '3_MONTHS' });
    });

    test('labels', () => {
        expect(accessEndLabel(null)).toBe('Lifetime');
        expect(accessEndLabel('2026-03-02T10:00:00Z')).toMatch(/^Until /);
    });
});
