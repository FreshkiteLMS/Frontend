"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './use-auth';
import { ACCESS_UPDATED_WINDOW_EVENT } from './use-chat-socket';
import { accessRequestApi } from '@/services/api/enrollment-management.api';
import type { MyAccessRequest, ResourceType } from '@/types/enrollment';

/**
 * The signed-in student's access requests, shared by every component on the
 * page (store buttons, the Access Requests page) through one module store.
 * Refetches when the server says access changed (approval, grant, revoke) and
 * when the tab regains focus, so a decision made by an admin shows up without
 * a reload.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';
interface State { status: Status; userId: string | null; rows: MyAccessRequest[] }

let state: State = { status: 'idle', userId: null, rows: [] };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

const set = (next: State) => { state = next; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => state;

function load(userId: string): Promise<void> {
    if (inflight && state.userId === userId) return inflight;
    set({ ...state, status: state.userId === userId && state.status === 'ready' ? 'ready' : 'loading', userId, rows: state.userId === userId ? state.rows : [] });
    const p = accessRequestApi.mine()
        .then(rows => set({ status: 'ready', userId, rows }))
        .catch(() => set({ ...state, status: 'error', userId }))
        .finally(() => { if (inflight === p) inflight = null; });
    inflight = p;
    return p;
}

export function refreshMyAccessRequests(): Promise<void> {
    return state.userId ? load(state.userId) : Promise.resolve();
}

const keyOf = (type: ResourceType, id: string) => `${type}:${type === 'ALL_IN_ONE' ? 'ALL_IN_ONE' : id}`;

export function useMyAccessRequests() {
    const { user } = useAuth();
    const isStudent = user?.role === 'student' && !!user?.id;
    const snap = useSyncExternalStore(subscribe, snapshot, snapshot);

    useEffect(() => {
        if (isStudent && (snap.userId !== user!.id || snap.status === 'idle')) load(user!.id);
    }, [isStudent, user, snap.userId, snap.status]);

    useEffect(() => {
        if (!isStudent) return;
        const refresh = () => { refreshMyAccessRequests().catch(() => undefined); };
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        window.addEventListener(ACCESS_UPDATED_WINDOW_EVENT, refresh);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener(ACCESS_UPDATED_WINDOW_EVENT, refresh);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isStudent]);

    const rows = useMemo(() => (isStudent && snap.userId === user?.id ? snap.rows : []), [isStudent, snap, user?.id]);
    const pending = useMemo(() => new Map(rows.filter(r => r.status === 'PENDING').map(r => [keyOf(r.product_type, r.product_id), r])), [rows]);

    /** The pending request for a resource, if any. */
    const pendingFor = useCallback((type: ResourceType, id: string) => pending.get(keyOf(type, id)) ?? null, [pending]);

    return {
        rows,
        ready: !isStudent || snap.status === 'ready' || snap.status === 'error',
        failed: isStudent && snap.status === 'error',
        pendingFor,
        refresh: refreshMyAccessRequests,
    };
}
