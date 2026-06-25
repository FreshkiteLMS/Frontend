"use client";

import { useState } from 'react';
import { X, Video, Repeat, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { meetingService } from '@/services/api/meeting.api';
import { Meeting, MeetingInput, MeetingType, MeetingFrequency } from '@/types/meeting';

interface MeetingFormProps {
    batchId: string;
    existing?: Meeting | null;
    onClose: () => void;
    onSaved: () => void;
}

const WEEKDAYS = [
    { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' },
    { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

export function MeetingForm({ batchId, existing, onClose, onSaved }: MeetingFormProps) {
    const isEdit = !!existing;
    const [title, setTitle] = useState(existing?.title || '');
    const [description, setDescription] = useState(existing?.description || '');
    const [meetLink, setMeetLink] = useState(existing?.meet_link || '');
    const [type, setType] = useState<MeetingType>(existing?.type || 'one-time');
    const [startDate, setStartDate] = useState(existing?.start_date ? existing.start_date.slice(0, 10) : '');
    const [endDate, setEndDate] = useState(existing?.end_date ? existing.end_date.slice(0, 10) : '');
    const [startTime, setStartTime] = useState(existing?.start_time || '');
    const [endTime, setEndTime] = useState(existing?.end_time || '');
    const [frequency, setFrequency] = useState<MeetingFrequency>(existing?.frequency || 'weekly');
    const [interval, setInterval] = useState(existing?.interval || 1);
    const [byweekday, setByweekday] = useState<number[]>(existing?.byweekday || []);
    const [submitting, setSubmitting] = useState(false);

    const toggleWeekday = (v: number) =>
        setByweekday(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Title is required');
        if (!meetLink.trim()) return toast.error('Google Meet link is required');
        if (!startDate) return toast.error('Start date is required');
        if (!startTime || !endTime) return toast.error('Start and end time are required');
        if (endTime <= startTime) return toast.error('End time must be after start time');

        const payload: MeetingInput = {
            title: title.trim(),
            description: description.trim(),
            batchId,
            meetLink: meetLink.trim(),
            type,
            startTime,
            endTime,
            startDate,
            endDate: endDate || undefined,
        };
        if (type === 'recurring') {
            payload.frequency = frequency;
            payload.interval = interval;
            if (frequency === 'weekly' && byweekday.length) payload.byweekday = byweekday;
        }

        try {
            setSubmitting(true);
            if (isEdit) {
                await meetingService.update(existing!.id, payload);
                toast.success('Meeting updated — students notified');
            } else {
                await meetingService.create(payload);
                toast.success('Meeting scheduled — students notified');
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to save meeting');
        } finally {
            setSubmitting(false);
        }
    };

    const field = "w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-600" />
                        {isEdit ? 'Edit Meeting' : 'Schedule Meeting'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className={field} placeholder="e.g. Week 3 Live Session" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={field} placeholder="What's this meeting about?" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Google Meet Link</label>
                        <input value={meetLink} onChange={e => setMeetLink(e.target.value)} className={field} placeholder="https://meet.google.com/abc-defg-hij" />
                    </div>

                    {/* Type toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setType('one-time')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'one-time' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                <Calendar className="w-4 h-4" /> One-time
                            </button>
                            <button type="button" onClick={() => setType('recurring')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'recurring' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                <Repeat className="w-4 h-4" /> Recurring
                            </button>
                        </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Time</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={field} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Time</label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={field} />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {type === 'recurring' ? 'Series Start' : 'Date'}
                            </label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={field} />
                        </div>
                        {type === 'recurring' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Series End <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={field} />
                            </div>
                        )}
                    </div>

                    {/* Recurrence options */}
                    {type === 'recurring' && (
                        <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frequency</label>
                                    <select value={frequency} onChange={e => setFrequency(e.target.value as MeetingFrequency)} className={field}>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Every</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" min={1} max={30} value={interval} onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))} className={field} />
                                        <span className="text-sm text-gray-500 whitespace-nowrap">{frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : 'month(s)'}</span>
                                    </div>
                                </div>
                            </div>
                            {frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Repeat on <span className="text-gray-400 font-normal">(defaults to start day)</span></label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {WEEKDAYS.map(d => (
                                            <button key={d.v} type="button" onClick={() => toggleWeekday(d.v)}
                                                className={`w-10 h-9 rounded-lg text-xs font-medium border transition-colors ${byweekday.includes(d.v) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400'}`}>
                                                {d.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-60">
                            {submitting ? 'Saving…' : isEdit ? 'Update Meeting' : 'Schedule Meeting'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
