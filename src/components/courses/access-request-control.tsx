"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Clock, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCourseAccess } from '@/hooks/use-course-access';
import { useMyAccessRequests } from '@/hooks/use-my-access-requests';
import type { ResourceType } from '@/types/enrollment';
import { RequestAccessModal } from './request-approval-modal';

/**
 * "Request access" under a buy button (students only). Shows "Request
 * pending" instead while one is open — the server also refuses duplicates —
 * and nothing once the student has access.
 */
export function AccessRequestControl({ type, id, name, courseIds }: { type: ResourceType; id: string; name: string; courseIds?: string[] }) {
    const { user } = useAuth();
    const access = useCourseAccess();
    const requests = useMyAccessRequests();
    const [open, setOpen] = useState(false);

    if (user?.role !== 'student' || !access.ready || !requests.ready) return null;
    const owned = type === 'ALL_IN_ONE' ? access.fullAccess
        : type === 'BUNDLE' ? access.ownsBundle({ _id: id, courses: (courseIds ?? []).map(courseId => ({ courseId })) })
            : access.hasCourse({ id });
    if (owned) return null;

    const pending = requests.pendingFor(type, id);
    if (pending) {
        return (
            <Link href="/student/access-requests" className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-xl">
                <Clock className="w-4 h-4" aria-hidden="true" /> Access request pending
            </Link>
        );
    }
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 w-full text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2.5 rounded-xl transition-all"
            >
                <KeyRound className="w-4 h-4" aria-hidden="true" /> Request Access
            </button>
            {open && <RequestAccessModal productType={type} productId={id} productName={name} onClose={() => setOpen(false)} onSubmitted={() => requests.refresh()} />}
        </>
    );
}
