"use client";

import { useCallback, useEffect, useState } from 'react';
import { problemCourseService } from '@/services/api/problem-course.api';
import { apiErrorMessage } from '@/services/api/structured-course.api';
import type { ProblemDetail } from '@/types/problem-course';

/** A problem's statement and videos, loaded when a dialog opens. A 404 means the student isn't enrolled. */
export function useProblemDetail(courseId: string, problemId: string) {
    const [detail, setDetail] = useState<ProblemDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [denied, setDenied] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setDetail(null);
        setError(null);
        setDenied(false);
        problemCourseService.getProblem(courseId, problemId)
            .then(d => { if (!cancelled) setDetail(d); })
            .catch(err => {
                if (cancelled) return;
                if (err?.response?.status === 404) setDenied(true);
                else setError(apiErrorMessage(err, 'Could not load this problem.'));
            });
        return () => { cancelled = true; };
    }, [courseId, problemId, attempt]);

    const retry = useCallback(() => setAttempt(n => n + 1), []);
    return { detail, error, denied, retry };
}
