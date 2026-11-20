"use client";

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { catalogService } from '@/services/api/catalog.api';
import type { Catalog } from '@/types/catalog';

/**
 * The public catalog, fetched once per page and shared by every section that
 * needs it (hero, stats, explorer, bundles…). Server-rendered pages seed it
 * with `initial` so nothing is requested again on hydration.
 */
type Status = 'idle' | 'loading' | 'ready' | 'error';
interface State { status: Status; data: Catalog | null }

let state: State = { status: 'idle', data: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = (next: State) => { state = next; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

export function loadCatalog(force = false): Promise<void> {
    if (inflight) return inflight;
    if (!force && state.status === 'ready') return Promise.resolve();
    emit({ status: 'loading', data: state.data });
    inflight = catalogService.getCatalog()
        .then(data => emit({ status: 'ready', data }))
        .catch(() => emit({ status: 'error', data: state.data }))
        .finally(() => { inflight = null; });
    return inflight;
}

/** Seed the store from server-rendered data (first call wins; newer data replaces older). */
function seed(initial: Catalog | null | undefined) {
    if (!initial) return;
    const current = state.data?.generatedAt ?? '';
    if (state.status !== 'ready' || initial.generatedAt > current) state = { status: 'ready', data: initial };
}

export function useCatalog(initial?: Catalog | null) {
    seed(initial);
    // Server/hydration snapshot must be referentially stable between calls.
    const serverSnap = useMemo<State>(() => (initial ? { status: 'ready', data: initial } : { status: 'idle', data: null }), [initial]);
    const snap = useSyncExternalStore(subscribe, getSnapshot, () => serverSnap);
    useEffect(() => { if (snap.status === 'idle') loadCatalog(); }, [snap.status]);
    return {
        catalog: snap.data,
        loading: snap.status === 'idle' || (snap.status === 'loading' && !snap.data),
        error: snap.status === 'error' && !snap.data,
        retry: () => loadCatalog(true),
    };
}

/** Test helper. */
export function __resetCatalogStore() { state = { status: 'idle', data: null }; inflight = null; }
