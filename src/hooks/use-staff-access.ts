"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { mentorSelfService } from '@/services/api/mentor.api';
import type { MentorMe } from '@/types/mentor';

/**
 * What the signed-in staff member may do — for showing and hiding UI only.
 * Every action is still checked by the API; hiding a button is a courtesy,
 * not the protection.
 *
 * Administrators can do everything (`isSuperAdmin`). Mentors load their live
 * permissions from GET /mentor/me (cached for 30 s, shared by every component).
 */
let cache: { at: number; userId: string; me: MentorMe } | null = null;
let inflight: Promise<MentorMe> | null = null;
const TTL = 30_000;

export function invalidateStaffAccess() {
    cache = null;
}

export interface StaffAccess {
    ready: boolean;
    isSuperAdmin: boolean;
    isMentor: boolean;
    fullAdmin: boolean;
    me: MentorMe | null;
    can: (permission: string) => boolean;
}

export function useStaffAccess(): StaffAccess {
    const { user } = useAuth();
    const role = (user?.role as string | undefined) ?? null;
    const userId = user?.id ?? '';
    // Start from the shared copy (possibly stale); the effect refreshes it when older than TTL.
    const [me, setMe] = useState<MentorMe | null>(() => (cache && cache.userId === userId ? cache.me : null));

    useEffect(() => {
        if (role !== 'mentor') return;
        if (cache && cache.userId === userId && Date.now() - cache.at < TTL) { setMe(cache.me); return; }
        let alive = true;
        inflight = inflight ?? mentorSelfService.me().finally(() => { inflight = null; });
        inflight.then(m => {
            cache = { at: Date.now(), userId, me: m };
            if (alive) setMe(m);
        }).catch(() => undefined);
        return () => { alive = false; };
    }, [role, userId]);

    if (role === 'admin') return { ready: true, isSuperAdmin: true, isMentor: false, fullAdmin: false, me: null, can: () => true };
    if (role === 'mentor') {
        return { ready: !!me, isSuperAdmin: false, isMentor: true, fullAdmin: !!me?.fullAdmin, me, can: (p: string) => !!me?.can?.[p] };
    }
    return { ready: true, isSuperAdmin: false, isMentor: false, fullAdmin: false, me: null, can: () => false };
}
