"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Lock, PlayCircle, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { TrackerProblem, VideoSolution, VideoType } from '@/types/problem-course';
import { useProblemDetail } from './useProblemDetail';
import { VideoSolutionPlayer } from './VideoSolutionPlayer';

const TABS: { id: VideoType; label: string; empty: string; Icon: typeof PlayCircle }[] = [
    { id: 'explanation', label: 'Video Explanation', empty: 'No video explanation yet', Icon: BookOpen },
    { id: 'solution', label: 'Video Solution', empty: 'No video solution yet', Icon: PlayCircle },
];

/** Videos saved before the two types existed are solutions. */
const typeOf = (v: VideoSolution): VideoType => v.videoType ?? 'solution';

/**
 * Keeps the whole 16:9 player on screen, under the dialog's header, tabs and
 * selectors, however wide the window is.
 */
const PLAYER_WIDTH = 'mx-auto w-full sm:max-w-[calc((92dvh-15rem)*16/9)]';

/**
 * Plays a problem's videos inside the LMS, in a dark full-attention dialog.
 * Only the selected tab's player is mounted, so changing tab or closing stops
 * playback. Leaving for YouTube is only ever the player's explicit link.
 */
export function ProblemVideoModal({ courseId, problem, onClose }: { courseId: string; problem: TrackerProblem; onClose: () => void }) {
    const { detail, error, denied, retry } = useProblemDetail(courseId, problem.id);
    const [chosen, setChosen] = useState<VideoType | null>(null);
    const tabRefs = useRef<Partial<Record<VideoType, HTMLButtonElement | null>>>({});

    const byType = useMemo(() => {
        const videos = detail?.videoSolutions ?? [];
        return {
            explanation: videos.filter(v => typeOf(v) === 'explanation'),
            solution: videos.filter(v => typeOf(v) === 'solution'),
        };
    }, [detail]);
    const legacyUrl = detail?.legacyVideoUrl ?? null;
    const countOf = (type: VideoType) => byType[type].length + (type === 'solution' && legacyUrl ? 1 : 0);

    // Start on the explanation when there is one, otherwise on what exists.
    const tab: VideoType = chosen ?? (detail && !byType.explanation.length && countOf('solution') ? 'solution' : 'explanation');
    const active = TABS.find(t => t.id === tab)!;

    const onTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next: VideoType = tab === 'explanation' ? 'solution' : 'explanation';
        setChosen(next);
        tabRefs.current[next]?.focus();
    };

    return (
        <Modal open onClose={onClose} size="video" panelClassName="dark" bodyClassName="p-0" title={problem.title}>
            <div role="tablist" aria-label="Videos" onKeyDown={onTabKey} className="sticky top-0 z-10 flex gap-1 border-b border-gray-800 bg-gray-900 px-3 pt-1 sm:px-5">
                {TABS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        ref={el => { tabRefs.current[id] = el; }}
                        id={`video-tab-${id}`}
                        role="tab"
                        type="button"
                        aria-selected={tab === id}
                        aria-controls="video-tabpanel"
                        tabIndex={tab === id ? 0 : -1}
                        onClick={() => setChosen(id)}
                        className={`inline-flex min-w-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${tab === id ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                        {detail && countOf(id) > 1 && <span className="shrink-0 rounded-full bg-gray-800 px-1.5 text-[11px] text-gray-300">{countOf(id)}</span>}
                    </button>
                ))}
            </div>

            <div id="video-tabpanel" role="tabpanel" aria-labelledby={`video-tab-${tab}`} className="p-4 sm:p-5">
                {denied ? (
                    <div className="flex flex-col items-center py-14 text-center">
                        <Lock className="h-8 w-8 text-gray-600" aria-hidden="true" />
                        <p className="mt-2 text-sm font-medium text-gray-300">Enroll in this course to watch its videos.</p>
                    </div>
                ) : error ? (
                    <div role="alert" className="flex flex-col items-center gap-3 py-14 text-center">
                        <p className="text-sm text-red-400">{error}</p>
                        <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-200 hover:bg-gray-800">
                            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                        </button>
                    </div>
                ) : !detail ? (
                    <div aria-busy="true" aria-label="Loading videos" className={PLAYER_WIDTH}>
                        <div className="aspect-video animate-pulse rounded-xl bg-gray-800" />
                    </div>
                ) : (
                    <div className={PLAYER_WIDTH}>
                        <VideoSolutionPlayer
                            key={`${detail.id}-${tab}`}
                            videos={byType[tab]}
                            legacyUrl={tab === 'solution' ? legacyUrl : null}
                            problemTitle={detail.title}
                            emptyTitle={active.empty}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
