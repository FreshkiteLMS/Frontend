import { useRef } from 'react';
import type { TrackerProblem, ProblemStatus } from '@/types/problem-course';
import { ProblemRow, ROW_HEIGHT } from './ProblemRow';
import { useWindowVirtual } from './useWindowVirtual';

// Sections larger than this switch to windowed rendering. Below it, the plain
// list keeps things simple and avoids attaching scroll listeners per section.
const VIRTUALIZE_THRESHOLD = 30;

interface ListProps {
    problems: TrackerProblem[];
    busyId: string | null;
    onStatusChange: (problemId: string, status: ProblemStatus) => void;
}

/** Windowed list — only rows intersecting the viewport are in the DOM. */
function VirtualList({ problems, busyId, onStatusChange }: ListProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { start, end, totalHeight, offsetY } = useWindowVirtual(ref, problems.length, ROW_HEIGHT);
    const slice = problems.slice(start, end);

    return (
        <div ref={ref} style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
                {slice.map(p => (
                    <ProblemRow key={p.id} problem={p} busy={busyId === p.id} onStatusChange={onStatusChange} />
                ))}
            </div>
        </div>
    );
}

/** Simple list for small sections. */
function PlainList({ problems, busyId, onStatusChange }: ListProps) {
    return (
        <div>
            {problems.map(p => (
                <ProblemRow key={p.id} problem={p} busy={busyId === p.id} onStatusChange={onStatusChange} />
            ))}
        </div>
    );
}

export function ProblemList(props: ListProps) {
    return props.problems.length > VIRTUALIZE_THRESHOLD ? <VirtualList {...props} /> : <PlainList {...props} />;
}
