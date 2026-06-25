"use client";

import { useState, useMemo } from 'react';
import {
    Video, CalendarDays, Clock, ChevronLeft, ChevronRight,
    Repeat, X, AlignLeft, Pencil, Ban, Trash2, Plus
} from 'lucide-react';
import { MeetingFeed, MeetingOccurrence } from '@/types/meeting';
import { recurrenceLabel, formatOccurrenceTime, formatOccurrenceDate, minutesUntil, isJoinable } from './meeting-utils';

// ── Date helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function startOfWeek(d: Date): Date { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isSameDay(a: Date, b: Date): boolean { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

// ── Meeting color by type ───────────────────────────────────────────────────
// Recurring → blue, one-time → green, cancelled → gray. Used everywhere a
// meeting is rendered so the type is identifiable at a glance.
function meetingColor(m: MeetingOccurrence) {
    if (m.status === 'cancelled') {
        return { block: 'bg-gray-300 dark:bg-gray-700', bar: 'bg-gray-300 dark:bg-gray-700', header: 'bg-gray-400 dark:bg-gray-600' };
    }
    if (m.isRecurring) {
        return { block: 'bg-blue-500 hover:bg-blue-600', bar: 'bg-blue-500', header: 'bg-blue-500' };
    }
    return { block: 'bg-emerald-500 hover:bg-emerald-600', bar: 'bg-emerald-500', header: 'bg-emerald-500' };
}

type CalendarView = 'week' | 'month' | 'agenda';

interface Props {
    feed: MeetingFeed;
    onSchedule: () => void;
    onEdit: (id: string) => void;
    onCancel: (id: string) => void;
    onDelete: (id: string) => void;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function BatchMeetingCalendar({ feed, onSchedule, onEdit, onCancel, onDelete }: Props) {
    const [view, setView] = useState<CalendarView>('week');
    const [navDate, setNavDate] = useState(new Date());
    const [selected, setSelected] = useState<MeetingOccurrence | null>(null);

    const allMeetings = useMemo(() => [...feed.upcoming, ...feed.past], [feed]);

    const goBack = () => {
        if (view === 'week')  setNavDate(d => addDays(d, -7));
        else if (view === 'month') setNavDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
        else setNavDate(d => addDays(d, -30));
    };
    const goForward = () => {
        if (view === 'week')  setNavDate(d => addDays(d, 7));
        else if (view === 'month') setNavDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
        else setNavDate(d => addDays(d, 30));
    };

    const rangeLabel = useMemo(() => {
        if (view === 'week') {
            const s = startOfWeek(navDate), e = addDays(s, 6);
            if (s.getMonth() === e.getMonth()) return `${SHORT_MONTH[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
            return `${SHORT_MONTH[s.getMonth()]} ${s.getDate()} – ${SHORT_MONTH[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
        }
        if (view === 'month') return `${MONTH_NAMES[navDate.getMonth()]} ${navDate.getFullYear()}`;
        return 'All Meetings';
    }, [view, navDate]);

    return (
        <div className="flex h-[calc(100vh-260px)] min-h-[480px] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">

            {/* ── Left sidebar ──────────────────────────────────────── */}
            <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                <div className="p-4 space-y-5">
                    <button onClick={onSchedule}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm hover:shadow-md">
                        <Plus className="w-4 h-4" /> Schedule Meeting
                    </button>

                    <MiniCalendar navDate={navDate} onSelectDate={setNavDate} />

                    {/* Upcoming list */}
                    {feed.upcoming.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">Upcoming</p>
                            <div className="space-y-1.5">
                                {feed.upcoming.slice(0, 4).map((m, i) => {
                                    const mins = minutesUntil(m);
                                    return (
                                        <button key={`${m.id}-${i}`} onClick={() => setSelected(m)}
                                            className="w-full text-left p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:shadow-sm transition-all">
                                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">{m.title}</p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(m.start).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                            {mins >= 0 && mins <= 60 && (
                                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{mins <= 0 ? '● Live' : `in ${mins}m`}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main ────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                    <div className="flex items-center gap-0.5">
                        <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setNavDate(new Date())} className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Today</button>
                        <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>

                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 truncate">{rangeLabel}</span>

                    {/* Mobile schedule button */}
                    <button onClick={onSchedule} className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Schedule
                    </button>

                    {/* Type legend */}
                    <div className="hidden md:flex items-center gap-3 mr-1 shrink-0">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Recurring
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> One-time
                        </span>
                    </div>

                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 shrink-0">
                        {(['week', 'month', 'agenda'] as CalendarView[]).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${view === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar + drawer */}
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        {view === 'week'   && <WeekView   navDate={navDate} meetings={allMeetings} onEventClick={setSelected} />}
                        {view === 'month'  && <MonthView  navDate={navDate} meetings={allMeetings} onEventClick={setSelected} onDayClick={d => { setNavDate(d); setView('week'); }} />}
                        {view === 'agenda' && <AgendaView meetings={allMeetings} onEventClick={setSelected} onEdit={onEdit} onCancel={onCancel} onDelete={onDelete} />}
                    </div>

                    {selected && (
                        <EventDrawer occ={selected} onClose={() => setSelected(null)}
                            onEdit={onEdit} onCancel={onCancel} onDelete={onDelete} />
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
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">{SHORT_MONTH[month.getMonth()]} {month.getFullYear()}</span>
                <div className="flex gap-0.5">
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronLeft className="w-3 h-3" /></button>
                    <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronRight className="w-3 h-3" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {DAY_NAMES.map(d => <div key={d} className="text-center text-[9px] font-bold text-gray-400 dark:text-gray-600 py-0.5">{d[0]}</div>)}
                {cells.map((cellDate, i) => {
                    const inMonth = cellDate.getMonth() === month.getMonth();
                    const isToday = isSameDay(cellDate, today);
                    const isSel  = isSameDay(cellDate, navDate);
                    return (
                        <button key={i} onClick={() => onSelectDate(cellDate)}
                            className={`aspect-square text-[10px] font-medium rounded-full flex items-center justify-center transition-all
                                ${isSel   ? 'bg-blue-600 text-white font-bold' :
                                  isToday ? 'text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40' :
                                  inMonth ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' :
                                            'text-gray-300 dark:text-gray-700'}`}>
                            {cellDate.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── WeekView ──────────────────────────────────────────────────────────────────
const HOURS  = Array.from({ length: 18 }, (_, i) => i + 6);
const SLOT_H = 52;
const START_H = 6;

interface LaidOut { m: MeetingOccurrence; startH: number; endH: number; col: number; cols: number; }

/**
 * Lay out a day's meetings into side-by-side columns so overlapping meetings
 * are visually distinct instead of stacking on top of each other. Meetings are
 * grouped into clusters of mutual overlap; within a cluster each is greedily
 * placed in the first free column.
 */
function layoutDay(meetings: MeetingOccurrence[]): LaidOut[] {
    const items = meetings.map(m => {
        const s = new Date(m.start), e = new Date(m.end);
        const startH = s.getHours() + s.getMinutes() / 60;
        let endH = e.getHours() + e.getMinutes() / 60;
        if (endH <= startH) endH = startH + 0.5; // guard against zero/negative spans
        return { m, startH, endH };
    }).sort((a, b) => a.startH - b.startH || a.endH - b.endH);

    const result: LaidOut[] = [];
    let cluster: { m: MeetingOccurrence; startH: number; endH: number }[] = [];
    let clusterEnd = -Infinity;

    const flush = () => {
        const colEnds: number[] = []; // last endH for each column
        const placed = cluster.map(it => {
            let col = colEnds.findIndex(end => end <= it.startH);
            if (col === -1) { col = colEnds.length; colEnds.push(it.endH); }
            else colEnds[col] = it.endH;
            return { ...it, col };
        });
        const cols = colEnds.length;
        placed.forEach(p => result.push({ ...p, cols }));
        cluster = [];
        clusterEnd = -Infinity;
    };

    for (const it of items) {
        if (cluster.length && it.startH >= clusterEnd) flush();
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, it.endH);
    }
    if (cluster.length) flush();
    return result;
}

function WeekView({ navDate, meetings, onEventClick }: { navDate: Date; meetings: MeetingOccurrence[]; onEventClick: (m: MeetingOccurrence) => void }) {
    const weekStart = startOfWeek(navDate);
    const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    return (
        <div className="min-h-full select-none">
            {/* Day headers */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="grid" style={{ gridTemplateColumns: '2.75rem repeat(7, 1fr)' }}>
                    <div className="border-r border-gray-100 dark:border-gray-800/60" />
                    {days.map((day, i) => {
                        const isToday = isSameDay(day, today);
                        return (
                            <div key={i} className={`py-2 text-center border-r border-gray-100 dark:border-gray-800/60 ${i===6 ? 'border-r-0':''}`}>
                                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">{DAY_NAMES[day.getDay()]}</p>
                                <div className={`mt-0.5 text-base font-black leading-none mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-white'}`}>{day.getDate()}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid */}
            <div className="grid" style={{ gridTemplateColumns: '2.75rem repeat(7, 1fr)' }}>
                <div className="border-r border-gray-100 dark:border-gray-800/60">
                    {HOURS.map(h => (
                        <div key={h} style={{ height: SLOT_H }} className="relative">
                            <span className="absolute -top-2 right-1.5 text-[9px] text-gray-400 dark:text-gray-600 font-medium leading-none">
                                {h===12 ? '12p' : h>12 ? `${h-12}p` : `${h}a`}
                            </span>
                        </div>
                    ))}
                </div>
                {days.map((day, di) => {
                    const dayMeetings = meetings.filter(m => isSameDay(new Date(m.start), day));
                    const laid = layoutDay(dayMeetings);
                    return (
                        <div key={di} className={`relative border-r border-gray-100 dark:border-gray-800/60 ${di===6 ? 'border-r-0':''}`} style={{ height: SLOT_H * HOURS.length }}>
                            {HOURS.map((_, hi) => <div key={hi} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800/60" style={{ top: hi * SLOT_H }} />)}
                            {laid.map(({ m, startH, endH, col, cols }, idx) => {
                                const top    = Math.max(0, (startH - START_H) * SLOT_H);
                                const height = Math.max(20, (endH - startH) * SLOT_H - 2);
                                const widthPct = 100 / cols;
                                const leftPct  = col * widthPct;
                                const cancelled = m.status === 'cancelled';
                                const joinable  = isJoinable(m);
                                const colors    = meetingColor(m);
                                return (
                                    <button key={`${m.id}-${idx}`} onClick={() => onEventClick(m)}
                                        className={`absolute rounded-lg px-1 py-0.5 text-left overflow-hidden transition-all hover:shadow-md hover:z-20 focus:outline-none ring-1 ring-black/5
                                            ${colors.block} ${cancelled ? 'opacity-40' : ''}
                                            ${joinable && !cancelled ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-900' : ''}`}
                                        style={{ top, height, left: `calc(${leftPct}% + 1px)`, width: `calc(${widthPct}% - 2px)`, zIndex: idx + 1 }}>
                                        <p className="text-white text-[10px] font-bold leading-tight truncate">{m.title}</p>
                                        <p className="text-white/80 text-[9px] leading-tight truncate">{new Date(m.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
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
function MonthView({ navDate, meetings, onEventClick, onDayClick }: { navDate: Date; meetings: MeetingOccurrence[]; onEventClick: (m: MeetingOccurrence) => void; onDayClick: (d: Date) => void }) {
    const today    = new Date();
    const firstDay = new Date(navDate.getFullYear(), navDate.getMonth(), 1);
    const gridStart = addDays(firstDay, -firstDay.getDay());
    const cells    = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    return (
        <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-600 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
                {cells.map((cellDate, i) => {
                    const inMonth = cellDate.getMonth() === navDate.getMonth();
                    const isToday = isSameDay(cellDate, today);
                    const dayMtgs = meetings.filter(m => isSameDay(new Date(m.start), cellDate));
                    const shown   = dayMtgs.slice(0, 2);
                    const overflow = dayMtgs.length - 2;
                    return (
                        <div key={i} onClick={() => onDayClick(cellDate)} className="min-h-[76px] p-1 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                            <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
                                {cellDate.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {shown.map((m, mi) => (
                                    <button key={`${m.id}-${mi}`} onClick={e => { e.stopPropagation(); onEventClick(m); }}
                                        className={`w-full text-left text-[9px] font-semibold text-white rounded px-1 py-0.5 truncate hover:opacity-80 transition-opacity ${meetingColor(m).block} ${m.status==='cancelled' ? 'opacity-40' : ''}`}>
                                        {new Date(m.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {m.title}
                                    </button>
                                ))}
                                {overflow > 0 && <p className="text-[9px] text-gray-500 font-medium pl-0.5">+{overflow} more</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ meetings, onEventClick, onEdit, onCancel, onDelete }: {
    meetings: MeetingOccurrence[];
    onEventClick: (m: MeetingOccurrence) => void;
    onEdit: (id: string) => void;
    onCancel: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const today  = new Date();
    const sorted = [...meetings].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const grouped = new Map<string, MeetingOccurrence[]>();
    sorted.forEach(m => {
        const key = new Date(m.start).toDateString();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(m);
    });

    if (sorted.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <CalendarDays className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-3" />
                <p className="font-semibold text-gray-600 dark:text-gray-400 text-sm">No meetings scheduled</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-4 pb-8 space-y-5">
            {Array.from(grouped.entries()).map(([dateKey, dayMeetings]) => {
                const date    = new Date(dateKey);
                const isToday = isSameDay(date, today);
                const isPast  = date < today && !isToday;
                return (
                    <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className={`text-center shrink-0 w-9 ${isToday ? 'text-blue-600 dark:text-blue-400' : isPast ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                                <div className="text-[9px] font-bold uppercase tracking-wide">{DAY_NAMES[date.getDay()]}</div>
                                <div className="text-xl font-black leading-tight">{date.getDate()}</div>
                                <div className="text-[9px] text-gray-400 dark:text-gray-600">{SHORT_MONTH[date.getMonth()]}</div>
                            </div>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                            {isToday && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Today</span>}
                        </div>
                        <div className="space-y-1.5 ml-12">
                            {dayMeetings.map((m, i) => {
                                const joinable = isJoinable(m);
                                const mins     = minutesUntil(m);
                                return (
                                    <div key={`${m.id}-${i}`} onClick={() => onEventClick(m)} className="cursor-pointer group">
                                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all group-hover:shadow-sm
                                            ${m.status==='cancelled' ? 'opacity-50 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' :
                                            'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 group-hover:border-gray-300 dark:group-hover:border-gray-700'}`}>
                                            <div className={`shrink-0 w-1 self-stretch rounded-full ${meetingColor(m).bar}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${m.status==='cancelled' ? 'line-through' : ''}`}>{m.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatOccurrenceTime(m)}</p>
                                            </div>
                                            {mins >= 0 && mins <= 60 && m.status!=='cancelled' && <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 shrink-0">{mins<=0 ? 'Live' : `${mins}m`}</span>}
                                            {m.status==='cancelled' && <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-1.5 py-0.5 rounded shrink-0">Cancelled</span>}
                                            {/* Inline admin actions */}
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                {m.status !== 'cancelled' && <button onClick={() => onEdit(m.id)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                                                {m.status !== 'cancelled' && <button onClick={() => onCancel(m.id)} className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"><Ban className="w-3.5 h-3.5" /></button>}
                                                <button onClick={() => onDelete(m.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                            {joinable && <a href={m.meetLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"><Video className="w-3 h-3" />Join</a>}
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

// ── EventDrawer ───────────────────────────────────────────────────────────────
function EventDrawer({ occ, onClose, onEdit, onCancel, onDelete }: {
    occ: MeetingOccurrence;
    onClose: () => void;
    onEdit: (id: string) => void;
    onCancel: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const joinable  = isJoinable(occ);
    const mins      = minutesUntil(occ);
    const cancelled = occ.status === 'cancelled';

    return (
        <div className="w-64 xl:w-72 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className={`p-4 ${meetingColor(occ).header}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">{occ.isRecurring ? 'Recurring' : 'One-time'} Meeting</p>
                        <h2 className={`font-bold text-sm text-white leading-snug ${cancelled ? 'line-through opacity-60' : ''}`}>{occ.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
                {cancelled && (
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl">
                        <span className="text-red-600 dark:text-red-400 text-xs font-semibold">Meeting Cancelled</span>
                    </div>
                )}
                {!cancelled && mins >= 0 && mins <= 60 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-orange-700 dark:text-orange-300 text-xs font-semibold">{mins<=0 ? 'Live now!' : `Starting in ${mins}m`}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />{formatOccurrenceDate(occ)}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{formatOccurrenceTime(occ)}
                    </div>
                    {occ.isRecurring && (
                        <div className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                            <Repeat className="w-3.5 h-3.5 text-gray-400 shrink-0" />{recurrenceLabel(occ.recurrenceRule)}
                        </div>
                    )}
                </div>

                {occ.description && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-start gap-2">
                            <AlignLeft className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{occ.description}</p>
                        </div>
                    </div>
                )}

                {/* Join */}
                {!cancelled && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <a href={occ.meetLink} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md mb-2 ${joinable ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                            <Video className="w-3.5 h-3.5" />{joinable ? 'Join Now' : 'Join Meeting'}
                        </a>
                    </div>
                )}

                {/* Admin actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">Admin Actions</p>
                    {!cancelled && (
                        <button onClick={() => onEdit(occ.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Edit Meeting
                        </button>
                    )}
                    {!cancelled && (
                        <button onClick={() => onCancel(occ.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors">
                            <Ban className="w-3.5 h-3.5" /> Cancel Meeting
                        </button>
                    )}
                    <button onClick={() => onDelete(occ.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Meeting
                    </button>
                </div>
            </div>
        </div>
    );
}
