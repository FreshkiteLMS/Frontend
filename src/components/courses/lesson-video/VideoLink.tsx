"use client";

import { useState, type MouseEvent, type ReactNode } from 'react';
import { isInLmsVideoUrl } from '@/lib/video-utils';
import { LessonVideoModal } from './LessonVideoModal';

/** Ctrl/⌘/Shift/Alt-click and middle-click mean "open it elsewhere": respect that. */
const wantsNativeNavigation = (e: MouseEvent) => e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * A course link. Video links (YouTube, Vimeo, direct files) open in the LMS
 * video player instead of leaving the course; every other link opens in a new
 * tab as before. It stays a real link, so copying it, middle-clicking or
 * Ctrl/⌘-clicking still behaves like one.
 */
export function VideoLink({ href, videoTitle, className, children }: { href: string; videoTitle?: string; className?: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const playable = isInLmsVideoUrl(href);

    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // These links can sit inside clickable cards; never let the click do both.
        e.stopPropagation();
        if (!playable || wantsNativeNavigation(e)) return;
        e.preventDefault();
        setOpen(true);
    };

    const label = videoTitle || (typeof children === 'string' ? children : '') || 'Video';

    return (
        <>
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                onClick={onClick}
                aria-haspopup={playable ? 'dialog' : undefined}
                title={playable ? 'Play video' : undefined}
            >
                {children}
            </a>
            {open && <LessonVideoModal url={href} title={label} onClose={() => setOpen(false)} />}
        </>
    );
}
