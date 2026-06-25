import { MeetingOccurrence } from '@/types/meeting';

/** Human label for a recurrence rule string, e.g. "Weekly on Mon, Wed". */
export function recurrenceLabel(rule?: string | null): string {
    if (!rule) return 'One-time';
    const map: Record<string, string> = {};
    for (const seg of rule.split(';')) {
        const [k, v] = seg.split('=');
        if (k && v) map[k.toUpperCase()] = v;
    }
    const freq = (map.FREQ || '').toLowerCase();
    const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1;
    const base =
        freq === 'daily' ? (interval > 1 ? `Every ${interval} days` : 'Daily') :
        freq === 'weekly' ? (interval > 1 ? `Every ${interval} weeks` : 'Weekly') :
        freq === 'monthly' ? (interval > 1 ? `Every ${interval} months` : 'Monthly') :
        'Recurring';

    if (freq === 'weekly' && map.BYDAY) {
        const names: Record<string, string> = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' };
        const days = map.BYDAY.split(',').map(d => names[d.trim().toUpperCase()]).filter(Boolean);
        if (days.length) return `${base} · ${days.join(', ')}`;
    }
    return base;
}

export function formatOccurrenceTime(occ: MeetingOccurrence): string {
    const start = new Date(occ.start);
    const end = new Date(occ.end);
    const t = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${t(start)} – ${t(end)}`;
}

export function formatOccurrenceDate(occ: MeetingOccurrence): string {
    return new Date(occ.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Minutes until the occurrence starts (negative if past). */
export function minutesUntil(occ: MeetingOccurrence): number {
    return Math.round((new Date(occ.start).getTime() - Date.now()) / 60000);
}

/** True when the meeting can be joined now (±5 min grace before, until end). */
export function isJoinable(occ: MeetingOccurrence): boolean {
    const now = Date.now();
    const start = new Date(occ.start).getTime();
    const end = new Date(occ.end).getTime();
    return now >= start - 5 * 60000 && now <= end;
}
