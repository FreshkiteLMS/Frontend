"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';
import { chatService } from '@/services/api/chat.api';
import { getChatNsp } from '@/services/chat-socket';
import {
    CHAT_EVENTS,
    type ChatEventView,
    type ChatMessage,
    type EventUpdatedPayload,
    type RsvpStatus,
} from '@/types/chat';

interface EventCardProps {
    eventId: string;
    message: ChatMessage;
}

// The API exposes events as a list (no single-event GET); share one fetch across cards.
const eventCache = new Map<string, ChatEventView>();
let inflight: Promise<void> | null = null;

async function loadEventsOnce(): Promise<void> {
    if (!inflight) {
        inflight = chatService
            .listEvents()
            .then((events) => {
                for (const e of events) eventCache.set(e.id, e);
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

const TYPE_LABEL: Record<string, string> = {
    hackathon: 'Hackathon',
    meeting: 'Meeting',
    interview: 'Interview',
    live_session: 'Live session',
    other: 'Event',
};

const RSVP_CHOICES: Array<{ value: RsvpStatus; label: string }> = [
    { value: 'going', label: 'Going' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'declined', label: "Can't go" },
];

function countsOf(event: ChatEventView): Record<RsvpStatus, number> {
    if (event.rsvp_counts) {
        return {
            going: event.rsvp_counts.going || 0,
            maybe: event.rsvp_counts.maybe || 0,
            declined: event.rsvp_counts.declined || 0,
        };
    }
    const counts: Record<RsvpStatus, number> = { going: 0, maybe: 0, declined: 0 };
    for (const r of event.rsvps || []) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
}

export function EventCard({ eventId, message }: EventCardProps) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [event, setEvent] = useState<ChatEventView | null>(eventCache.get(eventId) || null);
    const [loading, setLoading] = useState(!eventCache.has(eventId));
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => setMounted(true), []);

    const load = useCallback(async () => {
        const cached = eventCache.get(eventId);
        if (cached) {
            setEvent(cached);
            setLoading(false);
            return;
        }
        try {
            await loadEventsOnce();
            setEvent(eventCache.get(eventId) || null);
        } catch {
            setEvent(null);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        let socket: ReturnType<typeof getChatNsp> | null = null;
        const handler = (payload: EventUpdatedPayload) => {
            if (payload?.event?.id === eventId) {
                eventCache.set(eventId, payload.event);
                setEvent(payload.event);
            }
        };
        try {
            socket = getChatNsp();
            socket.on(CHAT_EVENTS.EVENT_UPDATED, handler);
        } catch {
            socket = null;
        }
        return () => {
            socket?.off(CHAT_EVENTS.EVENT_UPDATED, handler);
        };
    }, [eventId]);

    const myId = mounted ? user?.id : undefined;
    const role = (user?.role || '') as string;
    const isAdmin = role === 'admin' || role === 'teacher';

    const myRsvp: RsvpStatus | null = useMemo(() => {
        if (!event) return null;
        if (event.my_rsvp !== undefined) return event.my_rsvp;
        if (!myId) return null;
        return event.rsvps?.find((r) => r.user_id === myId)?.status || null;
    }, [event, myId]);

    const counts = useMemo(() => (event ? countsOf(event) : { going: 0, maybe: 0, declined: 0 }), [event]);

    const rsvp = async (status: RsvpStatus) => {
        if (!event || event.cancelled || saving) return;
        const previous = event;
        // Optimistic: adjust counts + my status locally.
        const nextCounts = { ...counts };
        if (myRsvp) nextCounts[myRsvp] = Math.max(0, nextCounts[myRsvp] - 1);
        if (myRsvp !== status) nextCounts[status] = nextCounts[status] + 1;
        const optimistic: ChatEventView = {
            ...event,
            my_rsvp: status,
            rsvp_counts: nextCounts,
        };
        setEvent(optimistic);
        setSaving(true);
        try {
            const updated = await chatService.rsvpEvent(eventId, status);
            eventCache.set(eventId, updated);
            setEvent(updated);
        } catch (err: any) {
            setEvent(previous);
            toast.error(err?.response?.data?.message || err.message || 'Failed to RSVP');
        } finally {
            setSaving(false);
        }
    };

    const cancelEvent = async () => {
        if (!event || cancelling) return;
        if (!window.confirm('Cancel this event for everyone?')) return;
        setCancelling(true);
        try {
            const updated = await chatService.cancelEvent(eventId);
            eventCache.set(eventId, updated);
            setEvent(updated);
            toast.success('Event cancelled');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to cancel event');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {message.content || 'This event is no longer available.'}
                </p>
            </div>
        );
    }

    const start = new Date(event.starts_at);
    const monthDay = start.toLocaleDateString([], { month: 'short', day: '2-digit' });
    const timeLabel = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const canCancel = mounted && !event.cancelled && (event.created_by === user?.id || isAdmin);

    return (
        <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
            {event.cancelled && (
                <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold uppercase tracking-wider">
                        Cancelled
                    </span>
                </div>
            )}

            <div className="flex items-start gap-3">
                <div className="shrink-0 w-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 py-2 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {monthDay}
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">{timeLabel}</p>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{event.title}</p>
                    <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        <Calendar className="w-3 h-3" />
                        {TYPE_LABEL[event.event_type] || 'Event'}
                    </span>
                    {event.description && (
                        <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 break-words">{event.description}</p>
                    )}
                    {event.location_url && (
                        <a
                            href={event.location_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Join / details
                        </a>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
                {RSVP_CHOICES.map(({ value, label }) => {
                    const active = myRsvp === value;
                    return (
                        <button
                            key={value}
                            onClick={() => rsvp(value)}
                            disabled={event.cancelled || saving}
                            className={`flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-60 ${
                                active
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span>{label}</span>
                            <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">{counts[value]}</span>
                        </button>
                    );
                })}
            </div>

            {canCancel && (
                <button
                    onClick={cancelEvent}
                    disabled={cancelling}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
                >
                    <Ban className="w-3 h-3" />
                    {cancelling ? 'Cancelling…' : 'Cancel event'}
                </button>
            )}
        </div>
    );
}
