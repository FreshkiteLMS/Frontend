"use client";

import { useState } from 'react';
import { CalendarPlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatService } from '@/services/api/chat.api';
import type { ChatEventType } from '@/types/chat';

interface EventComposerModalProps {
    conversationId?: string;
    onClose: () => void;
}

const EVENT_TYPES: Array<{ value: ChatEventType; label: string }> = [
    { value: 'live_session', label: 'Live session' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'interview', label: 'Interview' },
    { value: 'other', label: 'Other' },
];

export function EventComposerModal({ conversationId, onClose }: EventComposerModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<ChatEventType>('live_session');
    const [locationUrl, setLocationUrl] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [creating, setCreating] = useState(false);

    const canCreate = title.trim().length > 0 && startsAt.length > 0;

    const create = async () => {
        if (creating) return;
        if (!canCreate) {
            toast.error('Title and start time are required');
            return;
        }
        if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
            toast.error('End time must be after the start time');
            return;
        }
        setCreating(true);
        try {
            await chatService.createEvent({
                title: title.trim(),
                description: description.trim() || undefined,
                event_type: eventType,
                location_url: locationUrl.trim() || undefined,
                starts_at: new Date(startsAt).toISOString(),
                ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
                conversation_id: conversationId,
            });
            toast.success('Event created');
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to create event');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <CalendarPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Create event</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            placeholder="Mock interview drive"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Description <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={800}
                            placeholder="What is this event about?"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value as ChatEventType)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {EVENT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Location / link <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                            value={locationUrl}
                            onChange={(e) => setLocationUrl(e.target.value)}
                            placeholder="https://meet.google.com/…"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Starts at</label>
                            <input
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                                Ends at <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={create}
                        disabled={!canCreate || creating}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        {creating ? 'Creating…' : 'Create event'}
                    </button>
                </div>
            </div>
        </div>
    );
}
