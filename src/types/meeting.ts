export type MeetingType = 'one-time' | 'recurring';
export type MeetingFrequency = 'daily' | 'weekly' | 'monthly';
export type MeetingStatus = 'scheduled' | 'cancelled';

/** Raw meeting template (admin management view). */
export interface Meeting {
    id: string;
    title: string;
    description?: string;
    batch_id: string;
    meet_link: string;
    type: MeetingType;
    start_time: string;
    end_time: string;
    start_date: string;
    end_date?: string | null;
    recurrence_rule?: string | null;
    frequency?: MeetingFrequency | null;
    interval?: number;
    byweekday?: number[];
    status: MeetingStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
}

/** A single concrete occurrence expanded from a meeting template. */
export interface MeetingOccurrence {
    id: string;          // meeting id (occurrences share the template id)
    title: string;
    description?: string;
    batchId: string;
    batchName?: string;
    meetLink: string;
    type: MeetingType;
    recurrenceRule?: string | null;
    status: MeetingStatus;
    start: string;       // ISO
    end: string;         // ISO
    isRecurring: boolean;
}

export interface MeetingFeed {
    upcoming: MeetingOccurrence[];
    past: MeetingOccurrence[];
}

/** Payload for creating/updating a meeting. */
export interface MeetingInput {
    title: string;
    description?: string;
    batchId: string;
    meetLink: string;
    type: MeetingType;
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    startDate: string;   // YYYY-MM-DD
    endDate?: string;
    frequency?: MeetingFrequency;
    interval?: number;
    byweekday?: number[];
}
