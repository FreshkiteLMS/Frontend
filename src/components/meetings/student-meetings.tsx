"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Video, CalendarDays, Clock, RefreshCw,
    ChevronLeft, ChevronRight, Repeat, Users,
    ExternalLink, X, AlignLeft
} from 'lucide-react';
import { meetingService } from '@/services/api/meeting.api';
import { MeetingFeed, MeetingOccurrence } from '@/types/meeting';
import { getSocket } from '@/services/socket';
import { recurrenceLabel, formatOccurrenceTime, formatOccurrenceDate, minutesUntil, isJoinable } from './meeting-utils';

// ── Batch color palette ───────────────────────────────────────────────────────
const BATCH_COLORS = [
    { bg: 'bg-blue-500',    light: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    { bg: 'bg-violet-500',  light: 'bg-violet-50 dark:bg-violet-950/40',  text: 'text-violet-700 dark:text-violet-300',  border: 'border-violet-200 dark:border-violet-800' },
    { bg: 'bg-orange-500',  light: 'bg-orange-50 dark:bg-orange-950/40',  text: 'text-orange-700 dark:text-orange-300',  border: 'border-orange-200 dark:border-orange-800' },
    { bg: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-800' },
    { bg: 'bg-cyan-500',    light: 'bg-cyan-50 dark:bg-cyan-950/40',    text: 'text-cyan-700 dark:text-cyan-300',    border: 'border-cyan-200 dark:border-cyan-800' },
    { bg: 'bg-amber-500',   light: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800' },
    { bg: 'bg-indigo-500',  light: 'bg-indigo-50 dark:bg-indigo-950/40',  text: 'text-indigo-700 dark:text-indigo-300',  border: 'border-indigo-200 dark:border-indigo-800' },
] as const;

type BatchColor = typeof BATCH_COLORS[number];
type CalendarView = 'week' | 'month' | 'agenda';

// ── Date helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfWeek(d: Date): Date {
    const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r;
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getDaysInMonth(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// ── Root component ────────────────────────────────────────────────────────────
export function StudentMeetings() {
    const [feed, setFeed] = useState<MeetingFeed>({ upcoming: [], past: [] });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState<CalendarView>('week');
    const [navDate, setNavDate] = useState(new Date());
    const [selected, setSelected] = useState<MeetingOccurrence | null>(null);
    const [hiddenBatches, setHiddenBatches] = useState<Set<string>>(new Set());

    const load = useCallback(async (silent = false) => {
        try {
            silent ? setRefreshing(true) : setLoading(true);
            const data = await meetingService.getMyMeetings(90);
            setFeed(data);
        } catch (err) {
            console.error('Failed to load meetings', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const socket = getSocket();
        const onNotif = (n: any) => {
            if (typeof n?.type === 'string' && n.type.startsWith('MEETING')) load(true);
        };
        socket.on('new_notification', onNotif);
        return () => { socket.off('new_notification', onNotif); };
    }, [load]);

    const allMeetings = useMemo(() => [...feed.upcoming, ...feed.past], [feed]);

    const batches = useMemo(() => {
        const map = new Map<string, string>();
        allMeetings.forEach(m => { if (m.batchId && !map.has(m.batchId)) map.set(m.batchId, m.batchName || m.batchId); });
        return Array.from(map.entries()).map(([id, name], idx) => ({ id, name, color: BATCH_COLORS[idx % BATCH_COLORS.length] }));
    }, [allMeetings]);

    const batchColorMap = useMemo(() => {
        const map = new Map<string, BatchColor>();
        batches.forEach(b => map.set(b.id, b.color));
        return map;
    }, [batches]);

    const visibleMeetings = useMemo(() => allMeetings.filter(m => !hiddenBatches.has(m.batchId)), [allMeetings, hiddenBatches]);

    const goBack = () => {
        if (view === 'week') setNavDate(d => addDays(d, -7));
        else if (view === 'month') setNavDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
        else setNavDate(d => addDays(d, -30));
    };
    const goForward = () => {
        if (view === 'week') setNavDate(d => addDays(d, 7));
        else if (view === 'month') setNavDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
        else setNavDate(d => addDays(d, 30));
    };

    const rangeLabel = useMemo(() => {
        if (view === 'week') {
            const s = startOfWeek(navDate);
            const e = addDays(s, 6);
            if (s.getMonth() === e.getMonth()) return `${SHORT_MONTH[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
            return `${SHORT_MONTH[s.getMonth()]} ${s.getDate()} – ${SHORT_MONTH[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
        }
        if (view === 'month') return `${MONTH_NAMES[navDate.getMonth()]} ${navDate.getFullYear()}`;
        return 'All Meetings';
    }, [view, navDate]);

    const toggleBatch = (id: string) => setHiddenBatches(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading meetings…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-950">
            {/* ── Left sidebar ──────────────────────────────────────── */}
            <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
                <div className="p-5 space-y-6">
                    <MiniCalendar navDate={navDate} onSelectDate={setNavDate} />

                    {batches.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Batches</p>
                            <div className="space-y-2">
                                {batches.map(b => (
                                    <button key={b.id} onClick={() => toggleBatch(b.id)} className="w-full flex items-center gap-2.5 text-left">
                                        <div className={`w-3 h-3 rounded-sm shrink-0 transition-colors ${hiddenBatches.has(b.id) ? 'bg-gray-200 dark:bg-gray-700' : b.color.bg}`} />
                                        <span className={`text-sm font-medium truncate transition-colors ${hiddenBatches.has(b.id) ? 'text-gray-300 dark:text-gray-600 line-through' : 'text-gray-700 dark:text-gray-300'}`}>{b.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Next-up pill */}
                    {(() => {
                        const next = feed.upcoming.find(m => !hiddenBatches.has(m.batchId));
                        if (!next) return null;
                        const color = batchColorMap.get(next.batchId);
                        const mins = minutesUntil(next);
                        return (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Next Up</p>
                                <button onClick={() => setSelected(next)}
                                    className={`w-full text-left p-3 rounded-xl border ${color?.border ?? 'border-blue-200 dark:border-blue-800'} ${color?.light ?? 'bg-blue-50 dark:bg-blue-950/40'} hover:shadow-sm transition-all`}>
                                    <p className={`text-sm font-semibold truncate ${color?.text ?? 'text-blue-700 dark:text-blue-300'}`}>{next.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(next.start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                    {mins >= 0 && mins <= 60 && (
                                        <span className="mt-1.5 inline-block text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                            {mins <= 0 ? '● Live now' : `in ${mins}m`}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </aside>

            {/* ── Main area ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <Video className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-base font-bold text-gray-900 dark:text-white hidden sm:block mr-2">Meetings</span>

                    <div className="flex items-center gap-0.5">
                        <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setNavDate(new Date())} className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Today</button>
                        <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 truncate">{rangeLabel}</span>

                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 shrink-0">
                        {(['week', 'month', 'agenda'] as CalendarView[]).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${view === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                {v}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => load(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors" title="Refresh">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Calendar + optional detail drawer */}
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        {view === 'week' && (
                            <WeekView navDate={navDate} meetings={visibleMeetings} batchColorMap={batchColorMap} onEventClick={setSelected} />
                        )}
                        {view === 'month' && (
                            <MonthView navDate={navDate} meetings={visibleMeetings} batchColorMap={batchColorMap} onEventClick={setSelected}
                                onDayClick={d => { setNavDate(d); setView('week'); }} />
                        )}
                        {view === 'agenda' && (
                            <AgendaView meetings={visibleMeetings} batchColorMap={batchColorMap} onEventClick={setSelected} />
                        )}
                    </div>

                    {selected && (
                        <MeetingDrawer occ={selected} color={batchColorMap.get(selected.batchId)} onClose={() => setSelected(null)} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ navDate, onSelectDate }: { navDate: Date; onSelectDate: (d: Date) => void }) {
    const [month, setMonth] = useState(new Date(navDate.getFullYear(), navDate.getMonth(), 1));
    const today = new Date();

    const firstWeekday = month.getDay();
    const gridStart = addDays(month, -firstWeekday);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{SHORT_MONTH[month.getMonth()]} {month.getFullYear()}</span>
                <div className="flex gap-0.5">
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-gray-400 dark:text-gray-600 py-1">{d[0]}</div>
                ))}
                {cells.map((cellDate, i) => {
                    const inMonth = cellDate.getMonth() === month.getMonth();
                    const isToday = isSameDay(cellDate, today);
                    const isSel = isSameDay(cellDate, navDate);
                    return (
                        <button key={i} onClick={() => onSelectDate(cellDate)}
                            className={`aspect-square text-[11px] font-medium rounded-full flex items-center justify-center transition-all
                                ${isSel ? 'bg-blue-600 text-white font-bold' :
                                  isToday ? 'text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40' :
                                  inMonth ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' :
                                  'text-gray-300 dark:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                            {cellDate.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── WeekView ──────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const SLOT_H = 56;
const START_H = 6;

function WeekView({ navDate, meetings, batchColorMap, onEventClick }: {
    navDate: Date;
    meetings: MeetingOccurrence[];
    batchColorMap: Map<string, BatchColor>;
    onEventClick: (occ: MeetingOccurrence) => void;
}) {
    const weekStart = startOfWeek(navDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    return (
        <div className="min-h-full select-none">
            {/* Day headers */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid" style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
                    <div className="border-r border-gray-100 dark:border-gray-800/60" />
                    {days.map((day, i) => {
                        const isToday = isSameDay(day, today);
                        return (
                            <div key={i} className={`py-2 text-center border-r border-gray-100 dark:border-gray-800/60 ${i === 6 ? 'border-r-0' : ''}`}>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{DAY_NAMES[day.getDay()]}</p>
                                <div className={`mt-0.5 text-lg font-black leading-none mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Time grid */}
            <div className="grid" style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
                {/* Hour labels */}
                <div className="border-r border-gray-100 dark:border-gray-800/60">
                    {HOURS.map(h => (
                        <div key={h} style={{ height: SLOT_H }} className="relative">
                            <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 dark:text-gray-600 font-medium leading-none">
                                {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                {days.map((day, di) => {
                    const dayMeetings = meetings.filter(m => isSameDay(new Date(m.start), day));
                    return (
                        <div key={di} className={`relative border-r border-gray-100 dark:border-gray-800/60 ${di === 6 ? 'border-r-0' : ''}`}
                            style={{ height: SLOT_H * HOURS.length }}>
                            {HOURS.map((_, hi) => (
                                <div key={hi} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800/60" style={{ top: hi * SLOT_H }} />
                            ))}
                            {dayMeetings.map((m, idx) => {
                                const start = new Date(m.start);
                                const end = new Date(m.end);
                                const startH = start.getHours() + start.getMinutes() / 60;
                                const endH = end.getHours() + end.getMinutes() / 60;
                                const top = Math.max(0, (startH - START_H) * SLOT_H);
                                const height = Math.max(22, (endH - startH) * SLOT_H - 2);
                                const color = batchColorMap.get(m.batchId);
                                const cancelled = m.status === 'cancelled';
                                const joinable = isJoinable(m);
                                return (
                                    <button key={`${m.id}-${idx}`} onClick={() => onEventClick(m)}
                                        className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-all hover:opacity-90 hover:shadow-md focus:outline-none
                                            ${cancelled ? 'bg-gray-300 dark:bg-gray-700 opacity-40' : (color?.bg ?? 'bg-blue-500')}
                                            ${joinable && !cancelled ? 'ring-2 ring-green-400 ring-offset-1 dark:ring-offset-gray-900' : ''}`}
                                        style={{ top, height, zIndex: idx + 1 }}>
                                        <p className="text-white text-[11px] font-bold leading-tight truncate">{m.title}</p>
                                        <p className="text-white/75 text-[10px] leading-tight">{start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({ navDate, meetings, batchColorMap, onEventClick, onDayClick }: {
    navDate: Date;
    meetings: MeetingOccurrence[];
    batchColorMap: Map<string, BatchColor>;
    onEventClick: (occ: MeetingOccurrence) => void;
    onDayClick: (d: Date) => void;
}) {
    const today = new Date();
    const firstDay = new Date(navDate.getFullYear(), navDate.getMonth(), 1);
    const gridStart = addDays(firstDay, -firstDay.getDay());
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    return (
        <div className="p-4">
            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-600 py-2">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
                {cells.map((cellDate, i) => {
                    const inMonth = cellDate.getMonth() === navDate.getMonth();
                    const isToday = isSameDay(cellDate, today);
                    const dayMeetings = meetings.filter(m => isSameDay(new Date(m.start), cellDate));
                    const shown = dayMeetings.slice(0, 3);
                    const overflow = dayMeetings.length - 3;
                    return (
                        <div key={i} onClick={() => onDayClick(cellDate)}
                            className="min-h-[88px] p-1.5 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                            <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-colors
                                ${isToday ? 'bg-blue-600 text-white' :
                                  inMonth ? 'text-gray-900 dark:text-white' :
                                  'text-gray-300 dark:text-gray-700'}`}>
                                {cellDate.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {shown.map((m, mi) => {
                                    const color = batchColorMap.get(m.batchId);
                                    return (
                                        <button key={`${m.id}-${mi}`} onClick={e => { e.stopPropagation(); onEventClick(m); }}
                                            className={`w-full text-left text-[10px] font-semibold text-white rounded px-1 py-0.5 truncate hover:opacity-80 transition-opacity
                                                ${m.status === 'cancelled' ? 'opacity-40 bg-gray-400 dark:bg-gray-600' : (color?.bg ?? 'bg-blue-500')}`}>
                                            {new Date(m.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {m.title}
                                        </button>
                                    );
                                })}
                                {overflow > 0 && <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium pl-0.5">+{overflow} more</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ meetings, batchColorMap, onEventClick }: {
    meetings: MeetingOccurrence[];
    batchColorMap: Map<string, BatchColor>;
    onEventClick: (occ: MeetingOccurrence) => void;
}) {
    const today = new Date();
    const sorted = [...meetings].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const grouped = new Map<string, MeetingOccurrence[]>();
    sorted.forEach(m => {
        const key = new Date(m.start).toDateString();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(m);
    });

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-16 text-center">
                <CalendarDays className="w-14 h-14 text-gray-200 dark:text-gray-800 mb-4" />
                <p className="font-semibold text-gray-600 dark:text-gray-400">No meetings scheduled</p>
                <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">When meetings are scheduled, they&apos;ll appear here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 pb-12 space-y-6">
            {Array.from(grouped.entries()).map(([dateKey, dayMeetings]) => {
                const date = new Date(dateKey);
                const isToday = isSameDay(date, today);
                const isPast = date < today && !isToday;
                return (
                    <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`text-center shrink-0 w-10 ${isToday ? 'text-blue-600 dark:text-blue-400' : isPast ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                                <div className="text-[10px] font-bold uppercase tracking-wide">{DAY_NAMES[date.getDay()]}</div>
                                <div className="text-2xl font-black leading-tight">{date.getDate()}</div>
                                <div className="text-[10px] font-medium text-gray-400 dark:text-gray-600">{SHORT_MONTH[date.getMonth()]}</div>
                            </div>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                            {isToday && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Today</span>}
                        </div>
                        <div className="space-y-2 ml-14">
                            {dayMeetings.map((m, i) => {
                                const color = batchColorMap.get(m.batchId);
                                const joinable = isJoinable(m);
                                const mins = minutesUntil(m);
                                return (
                                    <div key={`${m.id}-${i}`} onClick={() => onEventClick(m)} className="cursor-pointer group">
                                        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all group-hover:shadow-sm
                                            ${m.status === 'cancelled' ? 'opacity-50 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' :
                                            'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-gray-300 dark:group-hover:border-gray-700'}`}>
                                            <div className={`shrink-0 w-1 self-stretch rounded-full ${m.status === 'cancelled' ? 'bg-gray-300 dark:bg-gray-700' : (color?.bg ?? 'bg-blue-500')}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${m.status === 'cancelled' ? 'line-through' : ''}`}>{m.title}</p>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {mins >= 0 && mins <= 60 && m.status !== 'cancelled' && (
                                                            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">{mins <= 0 ? 'Live' : `${mins}m`}</span>
                                                        )}
                                                        {m.status === 'cancelled' && (
                                                            <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded">Cancelled</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatOccurrenceTime(m)}{m.batchName ? ` · ${m.batchName}` : ''}</p>
                                            </div>
                                            {joinable && (
                                                <a href={m.meetLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                                    className="shrink-0 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors">
                                                    <Video className="w-3 h-3" /> Join
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── MeetingDrawer ─────────────────────────────────────────────────────────────
function MeetingDrawer({ occ, color, onClose }: { occ: MeetingOccurrence; color?: BatchColor; onClose: () => void }) {
    const joinable = isJoinable(occ);
    const mins = minutesUntil(occ);
    const cancelled = occ.status === 'cancelled';

    return (
        <div className="w-72 xl:w-80 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto">
            {/* Colored header */}
            <div className={`p-4 ${color?.bg ?? 'bg-blue-500'}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">
                            {occ.isRecurring ? 'Recurring' : 'One-time'} Meeting
                        </p>
                        <h2 className={`font-bold text-base text-white leading-snug ${cancelled ? 'line-through opacity-60' : ''}`}>{occ.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0 text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
                {cancelled && (
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl">
                        <span className="text-red-600 dark:text-red-400 text-sm font-semibold">Meeting Cancelled</span>
                    </div>
                )}
                {!cancelled && mins >= 0 && mins <= 60 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-orange-700 dark:text-orange-300 text-sm font-semibold">
                            {mins <= 0 ? 'Live now!' : `Starting in ${mins} minutes`}
                        </span>
                    </div>
                )}

                <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{formatOccurrenceDate(occ)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{formatOccurrenceTime(occ)}</span>
                    </div>
                    {occ.isRecurring && (
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <Repeat className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{recurrenceLabel(occ.recurrenceRule)}</span>
                        </div>
                    )}
                    {occ.batchName && (
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <Users className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{occ.batchName}</span>
                        </div>
                    )}
                </div>

                {occ.description && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-start gap-2.5">
                            <AlignLeft className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{occ.description}</p>
                        </div>
                    </div>
                )}

                {!cancelled && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <a href={occ.meetLink} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md
                                ${joinable ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                            <Video className="w-4 h-4" />
                            {joinable ? 'Join Now' : 'Join Meeting'}
                        </a>
                        <a href={occ.meetLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" /> Open link
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
