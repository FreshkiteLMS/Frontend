"use client";

import { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import type { VideoSolution } from '@/types/problem-course';
import { PLAYER_WIDTH } from '../problem-tracker/ProblemVideoModal';
import { VideoSolutionPlayer } from '../problem-tracker/VideoSolutionPlayer';

/**
 * Plays one course video inside the LMS, in the same dark full-attention
 * dialog and player students use for problem-solving videos. The player is
 * only mounted while open, so closing stops playback. Leaving for YouTube is
 * only ever the player's explicit "Watch on YouTube" link.
 */
export function LessonVideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
    const heading = title.trim() || 'Lesson video';
    const videos = useMemo<VideoSolution[]>(
        () => [{ id: url, title: heading, languageCode: '', languageName: '', url, description: '', isDefault: true }],
        [url, heading],
    );

    return (
        <Modal open onClose={onClose} size="video" panelClassName="dark" bodyClassName="p-4 sm:p-5" title={heading}>
            <div className={PLAYER_WIDTH}>
                <VideoSolutionPlayer videos={videos} legacyUrl={null} problemTitle={heading} />
            </div>
        </Modal>
    );
}
