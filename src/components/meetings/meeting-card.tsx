"use client";

import { Video, Clock, Repeat, Calendar, Users, ExternalLink, Pencil, Trash2, Ban } from 'lucide-react';
import { MeetingOccurrence } from '@/types/meeting';
import { recurrenceLabel, formatOccurrenceTime, formatOccurrenceDate, minutesUntil, isJoinable } from './meeting-utils';

interface MeetingCardProps {
    occ: MeetingOccurrence;
    variant?: 'upcoming' | 'past';
    showBatch?: boolean;
    /** Admin actions (omitted for students). */
    onEdit?: (meetingId: string) => void;
    onCancel?: (meetingId: string) => void;
    onDelete?: (meetingId: string) => void;
}

export function MeetingCard({ occ, variant = 'upcoming', showBatch = true, onEdit, onCancel, onDelete }: MeetingCardProps) {
    const isPast = variant === 'past';
    const joinable = !isPast && isJoinable(occ);
    const mins = minutesUntil(occ);
    const cancelled = occ.status === 'cancelled';

    const soonBadge = !isPast && !cancelled && mins >= 0 && mins <= 60;

    return (
        <div className={`group rounded-2xl border p-4 sm:p-5 transition-all ${
            cancelled
                ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 opacity-70'
                : isPast
                ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
        }`}>
            <div className="flex items-start gap-4">
                {/* Date block */}
                <div className={`shrink-0 w-14 text-center rounded-xl py-2 ${
                    isPast || cancelled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/30'
                }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${
                        isPast || cancelled ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                        {new Date(occ.start).toLocaleString([], { month: 'short' })}
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white leading-none mt-0.5">
                        {new Date(occ.start).getDate()}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                                {occ.title}
                                {cancelled && (
                                    <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Cancelled</span>
                                )}
                            </h4>
                            {occ.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{occ.description}</p>
                            )}
                        </div>
                        {soonBadge && (
                            <span className="shrink-0 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                {mins <= 0 ? 'Now' : `in ${mins}m`}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatOccurrenceDate(occ)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatOccurrenceTime(occ)}</span>
                        {occ.isRecurring && (
                            <span className="flex items-center gap-1.5 text-indigo-500"><Repeat className="w-3.5 h-3.5" />{recurrenceLabel(occ.recurrenceRule)}</span>
                        )}
                        {showBatch && occ.batchName && (
                            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{occ.batchName}</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        {!isPast && !cancelled && (
                            <a
                                href={occ.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                    joinable
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                <Video className="w-3.5 h-3.5" />
                                {joinable ? 'Join Now' : 'Join'}
                            </a>
                        )}
                        {isPast && (
                            <a
                                href={occ.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Link
                            </a>
                        )}

                        {/* Admin controls */}
                        {onEdit && !cancelled && (
                            <button onClick={() => onEdit(occ.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                        {onCancel && !cancelled && (
                            <button onClick={() => onCancel(occ.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Cancel">
                                <Ban className="w-4 h-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={() => onDelete(occ.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
