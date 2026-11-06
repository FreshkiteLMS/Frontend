"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminInsightsService } from '@/services/api/admin-insights.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { AttendanceStatus } from '@/types/admin-insights';
import { Modal } from '@/components/ui/modal';
import { Async, StudentCode, btnPrimary, btnSecondary, fmtDateTime, useAsync } from '@/components/admin/insights/ui';

const OPTIONS: { value: AttendanceStatus; label: string; tone: string }[] = [
    { value: 'present', label: 'Present', tone: 'bg-green-600 text-white' },
    { value: 'late', label: 'Late', tone: 'bg-amber-500 text-white' },
    { value: 'absent', label: 'Absent', tone: 'bg-red-600 text-white' },
    { value: 'excused', label: 'Excused', tone: 'bg-gray-600 text-white' },
];

/** Record attendance for one meeting occurrence. Unmarked students stay "not recorded". */
export function AttendanceModal({ meetingId, occurrence, onClose, onSaved }: { meetingId: string; occurrence: string; onClose: () => void; onSaved?: () => void }) {
    const state = useAsync(() => adminInsightsService.attendance(meetingId, occurrence), `att:${meetingId}:${occurrence}`);
    const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (state.data) setMarks(Object.fromEntries(state.data.students.map(s => [s.userId, s.status])));
    }, [state.data]);

    const dirty = state.data ? state.data.students.filter(s => (marks[s.userId] ?? null) !== s.status) : [];
    const save = async () => {
        if (!dirty.length) { onClose(); return; }
        setSaving(true);
        try {
            await adminInsightsService.recordAttendance(meetingId, occurrence, dirty.map(s => ({ user_id: s.userId, status: marks[s.userId] ?? null })));
            toast.success('Attendance saved');
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Attendance was not saved'));
        } finally { setSaving(false); }
    };

    return (
        <Modal open onClose={onClose} size="lg" title={state.data ? `Attendance · ${state.data.meeting.title}` : 'Attendance'} description={state.data ? fmtDateTime(state.data.occurrence.start) : undefined}
            footer={<div className="flex justify-between gap-2">
                <button type="button" className={btnSecondary} disabled={!state.data?.canMark} onClick={() => state.data && setMarks(Object.fromEntries(state.data.students.map(s => [s.userId, marks[s.userId] ?? 'present'])))}>Mark unmarked as present</button>
                <div className="flex gap-2"><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={saving || !state.data?.canMark} onClick={save}>{saving ? 'Saving…' : `Save${dirty.length ? ` (${dirty.length})` : ''}`}</button></div>
            </div>}>
            <Async state={state}>
                {d => !d.canMark ? <p className="text-sm text-gray-600 dark:text-gray-400">Attendance can be recorded once this session has started.</p> : d.students.length === 0 ? <p className="text-sm text-gray-500">This batch has no students.</p> : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {d.students.map(s => (
                            <li key={s.userId} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{s.name}</span><span className="block truncate text-xs text-gray-500">{s.email} <StudentCode code={s.studentCode} /></span></span>
                                <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
                                    {OPTIONS.map(o => {
                                        const on = marks[s.userId] === o.value;
                                        return (
                                            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => setMarks(m => ({ ...m, [s.userId]: on ? null : o.value }))}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium ${on ? o.tone : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                {o.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Async>
        </Modal>
    );
}
