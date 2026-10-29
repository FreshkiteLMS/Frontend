"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './use-auth';
import { studentService } from '@/services/api/student.api';
import type { MyAccess } from '@/types/student';

/**
 * The signed-in student's course access, from GET /students/me/access — the
 * same server-side resolver that gates course content and refuses duplicate
 * purchases, so buttons can never disagree with what the backend allows.
 *
 * One request is shared by every component on the page (course cards, bundle
 * cards, the hero) via a small module-level store.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface AccessState { status: Status; userId: string | null; data: MyAccess | null }

let state: AccessState = { status: 'idle', userId: null, data: null };
const listeners = new Set<() => void>();
let inflight: { userId: string; promise: Promise<void> } | null = null;

const setState = (next: AccessState) => {
    state = next;
    listeners.forEach(l => l());
};
const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};
const getSnapshot = () => state;

function load(userId: string): Promise<void> {
    if (inflight?.userId === userId) return inflight.promise;
    setState({ status: 'loading', userId, data: state.userId === userId ? state.data : null });
    const promise = studentService.getMyAccess()
        .then(data => setState({ status: 'ready', userId, data }))
        .catch(() => setState({ status: 'error', userId, data: state.userId === userId ? state.data : null }))
        .finally(() => { if (inflight?.promise === promise) inflight = null; });
    inflight = { userId, promise };
    return promise;
}

/** Refetch after a purchase or approval so every button updates at once. */
export function refreshCourseAccess(): Promise<void> {
    return state.userId ? load(state.userId) : Promise.resolve();
}

type CourseRef = { id?: string | null; _id?: string | null };
type BundleRef = { _id: string; courses?: { courseId?: unknown }[] };

const refId = (ref: unknown): string | undefined => {
    if (!ref) return undefined;
    if (typeof ref === 'string') return ref;
    const r = ref as { _id?: unknown; id?: unknown };
    return String(r._id ?? r.id ?? ref);
};

export function useCourseAccess() {
    const { user } = useAuth();
    const isStudent = user?.role === 'student' && !!user?.id;
    const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        if (isStudent && (snap.userId !== user!.id || snap.status === 'idle')) load(user!.id);
    }, [isStudent, user, snap.userId, snap.status]);

    const data = isStudent && snap.userId === user?.id ? snap.data : null;
    const owned = useMemo(() => new Set((data?.courses || []).flatMap(c => [c.id, c._id])), [data]);

    const hasCourse = useCallback((c: CourseRef) => !!((c.id && owned.has(c.id)) || (c._id && owned.has(String(c._id)))), [owned]);

    /** Held directly, via full access, or every course in it is already owned. */
    const ownsBundle = useCallback((g: BundleRef) => {
        if (!data) return false;
        if (data.fullAccess || data.bundleIds.includes(String(g._id))) return true;
        const ids = (g.courses || []).map(ce => refId(ce.courseId)).filter(Boolean) as string[];
        return ids.length > 0 && ids.every(id => owned.has(id));
    }, [data, owned]);

    return {
        /** False while a student's access is still loading — don't offer purchase yet. */
        ready: !isStudent || snap.status === 'ready' || snap.status === 'error',
        failed: isStudent && snap.status === 'error',
        fullAccess: !!data?.fullAccess,
        hasCourse,
        ownsBundle,
        refresh: refreshCourseAccess,
    };
}
