import { useRef, useSyncExternalStore } from 'react';
import type { TrackerProblem, ProblemStatus, OpenProblemHandler } from '@/types/problem-course';
import { PHONE_ROW_HEIGHT, ProblemRow, ROW_HEIGHT } from './ProblemRow';
import { useWindowVirtual } from './useWindowVirtual';

// Sections larger than this switch to windowed rendering. Below it, the plain
// list keeps things simple and avoids attaching scroll listeners per section.
const VIRTUALIZE_THRESHOLD = 30;

interface ListProps {
    problems: TrackerProblem[];
    busyId: string | null;
    onStatusChange: (problemId: string, status: ProblemStatus) => void;
    onOpen?: OpenProblemHandler;
}

const WIDE_SCREEN = '(min-width: 640px)';

function subscribeToWidth(onChange: () => void) {
    const query = window.matchMedia(WIDE_SCREEN);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}

/** The height the row's classes give it at the current width. */
function useRowHeight(): number {
    return useSyncExternalStore(
        subscribeToWidth,
        () => (window.matchMedia(WIDE_SCREEN).matches ? ROW_HEIGHT : PHONE_ROW_HEIGHT),
        () => ROW_HEIGHT
    );
}

/** Windowed list — only rows intersecting the viewport are in the DOM. */
function VirtualList({ problems, busyId, onStatusChange, onOpen }: ListProps) {
    const ref = useRef<HTMLDivElement>(null);
    const rowHeight = useRowHeight();
    const { start, end, totalHeight, offsetY } = useWindowVirtual(ref, problems.length, rowHeight);
    const slice = problems.slice(start, end);

    return (
        <div ref={ref} style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
                {slice.map(p => (
                    <ProblemRow key={p.id} problem={p} busy={busyId === p.id} onStatusChange={onStatusChange} onOpen={onOpen} />
                ))}
            </div>
        </div>
    );
}

/** Simple list for small sections. */
function PlainList({ problems, busyId, onStatusChange, onOpen }: ListProps) {
    return (
        <div>
            {problems.map(p => (
                <ProblemRow key={p.id} problem={p} busy={busyId === p.id} onStatusChange={onStatusChange} onOpen={onOpen} />
            ))}
        </div>
    );
}

export function ProblemList(props: ListProps) {
    return props.problems.length > VIRTUALIZE_THRESHOLD ? <VirtualList {...props} /> : <PlainList {...props} />;
}
