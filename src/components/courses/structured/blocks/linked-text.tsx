import { memo } from 'react';
import { splitLinkedText } from '@/lib/linkify';
import { VideoLink } from '../../lesson-video/VideoLink';

export const LINK_CLASS = 'text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 [overflow-wrap:anywhere]';

/**
 * Course text with its URLs clickable. Everything is rendered as React text and
 * validated http(s) links: no HTML from course content ever reaches the page.
 * Video links open in the LMS player rather than leaving the course.
 */
export const LinkedText = memo(function LinkedText({ text }: { text: string }) {
    return (
        <>
            {splitLinkedText(text).map((part, i) =>
                part.kind === 'link' ? (
                    <VideoLink key={i} href={part.url} className={LINK_CLASS}>{part.text}</VideoLink>
                ) : (
                    part.text
                )
            )}
        </>
    );
});
