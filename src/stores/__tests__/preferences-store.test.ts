import { describe, expect, it } from 'vitest';
import { formatDate, formatDayLabel, formatTime } from '../preferences-store';
import type { Preferences } from '@/types/profile';

const base: Preferences = { theme: 'system', timezone: 'Asia/Kolkata', date_format: 'DMY', time_format: '12h', reduce_motion: false };
// 2026-11-02 13:00 UTC = Mon 2 Nov, 6:30 pm in India.
const instant = '2026-11-02T13:00:00Z';

describe('preference-aware formatting', () => {
    it('shows the instant in the chosen timezone without changing it', () => {
        expect(formatTime(instant, base).toLowerCase()).toBe('6:30 pm');
        expect(formatTime(instant, { ...base, time_format: '24h' })).toBe('18:30');
        expect(formatTime(instant, { ...base, timezone: 'UTC', time_format: '24h' })).toBe('13:00');
    });

    it('applies the date format', () => {
        expect(formatDate(instant, base)).toBe('2 Nov 2026');
        expect(formatDate(instant, { ...base, date_format: 'MDY' })).toBe('Nov 2, 2026');
        expect(formatDate(instant, { ...base, date_format: 'YMD' })).toBe('2026-11-02');
        expect(formatDayLabel(instant, base)).toMatch(/Mon.*2.*Nov/);
    });

    it('crosses midnight correctly between zones', () => {
        // 23:59 IST on 31 Dec is still 31 Dec in India, but 18:29 UTC the same day.
        const nye = '2026-12-31T18:29:00Z';
        expect(formatDate(nye, base)).toBe('31 Dec 2026');
        expect(formatDate('2026-12-31T19:00:00Z', base)).toBe('1 Jan 2027');
    });
});
