"use client";

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { aptitudeService } from '@/services/api/aptitude.api';
import { Async, useAsync } from '@/components/admin/insights/ui';
import { AptitudeOverviewView } from './AptitudeOverviewView';
import { AptitudeConceptView } from './AptitudeConceptView';
import { AptitudeQuestionView } from './AptitudeQuestionView';

function Skeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
            <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: rows }, (_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800/70" />)}
            </div>
        </div>
    );
}

/**
 * The aptitude learning experience (a separate interface from lesson courses).
 * Where the student is lives in the URL — `?concept=…&q=…` — so refresh,
 * back/forward and shared links work without page reloads.
 */
export function AptitudeCourse({ courseId }: { courseId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const conceptId = params.get('concept');
    const questionId = params.get('q');
    // Bumped after an answer so overview/concept numbers are re-read from the server.
    const [version, setVersion] = useState(0);

    const go = useCallback((next: { concept?: string | null; q?: string | null }) => {
        const sp = new URLSearchParams();
        if (next.concept) sp.set('concept', next.concept);
        if (next.q) sp.set('q', next.q);
        const qs = sp.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
    }, [router, pathname]);

    const overview = useAsync(() => aptitudeService.overview(courseId), `apt:${courseId}:${version}`, !conceptId && !questionId);
    const concept = useAsync(() => aptitudeService.concept(courseId, conceptId!), `apt:${courseId}:c:${conceptId}:${version}`, !!conceptId && !questionId);
    const question = useAsync(() => aptitudeService.question(courseId, questionId!), `apt:${courseId}:q:${questionId}`, !!questionId);

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {questionId ? (
                    <Async state={question} skeleton={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/70" />}>
                        {d => (
                            <AptitudeQuestionView
                                key={d.question.id}
                                courseId={courseId}
                                data={d}
                                onBack={() => go({ concept: d.concept.id })}
                                onNavigate={id => go({ concept: d.concept.id, q: id })}
                                onAnswered={() => setVersion(v => v + 1)}
                            />
                        )}
                    </Async>
                ) : conceptId ? (
                    <Async state={concept} skeleton={<Skeleton rows={3} />}>
                        {d => <AptitudeConceptView data={d} onBack={() => go({})} onOpenQuestion={id => go({ concept: d.concept.id, q: id })} />}
                    </Async>
                ) : (
                    <Async state={overview} skeleton={<Skeleton />}>
                        {d => <AptitudeOverviewView data={d} onOpenConcept={id => go({ concept: id })} onOpenQuestion={(c, q) => go({ concept: c, q })} />}
                    </Async>
                )}
            </div>
        </div>
    );
}
