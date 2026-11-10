'use client';

import { memo, useState } from 'react';
import { AlertCircle, ExternalLink, Link as LinkIcon, Play, PlayCircle } from 'lucide-react';
import type { BlockOf } from '@/types/structured-course';
import { getYouTubeThumbnailUrl, isInLmsVideoUrl } from '@/lib/video-utils';
import { LessonVideoModal } from '../../lesson-video/LessonVideoModal';
import { VideoLink } from '../../lesson-video/VideoLink';
import { safeHref } from './text';

/**
 * Responsive, lazy-loaded image with a loading skeleton, an error fallback and
 * a click-to-zoom lightbox. Shared by structured image blocks and legacy sections.
 */
export const ImageView = memo(function ImageView({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    return (
        <>
            <figure className="my-8">
                <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm">
                    {status === 'loading' && (
                        <div className="absolute inset-0 animate-pulse bg-gray-100 dark:bg-gray-800" aria-hidden="true" />
                    )}
                    {status === 'error' ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-600">
                            <AlertCircle className="w-8 h-8" />
                            <p className="text-sm">Image failed to load</p>
                        </div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={src}
                            alt={alt}
                            loading="lazy"
                            decoding="async"
                            onClick={() => status === 'loaded' && setExpanded(true)}
                            onLoad={() => setStatus('loaded')}
                            onError={() => setStatus('error')}
                            className={`w-full h-auto max-h-[480px] object-contain transition-opacity duration-300 ${
                                status === 'loaded' ? 'opacity-100 cursor-zoom-in hover:opacity-95' : 'opacity-0'
                            }`}
                        />
                    )}
                </div>
                {caption && (
                    <figcaption className="mt-2.5 text-center text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>
                )}
            </figure>

            {expanded && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
                    onClick={() => setExpanded(false)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    <button
                        type="button"
                        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg"
                        onClick={() => setExpanded(false)}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    );
});

/**
 * A lesson video: a poster card that opens the LMS video player (the same
 * dialog as problem-solving videos), or, for links the player can't play, an
 * outbound link. Shared with legacy sections.
 */
export const VideoView = memo(function VideoView({ url, title }: { url: string; title: string }) {
    const [open, setOpen] = useState(false);
    const [thumbFailed, setThumbFailed] = useState(false);
    const href = safeHref(url);
    if (!href) return null;
    if (!isInLmsVideoUrl(href)) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer"
                className="my-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="break-all">{title || href}</span>
                <span className="sr-only"> (opens in a new tab)</span>
            </a>
        );
    }
    const thumbnail = thumbFailed ? null : getYouTubeThumbnailUrl(href);
    const label = title || 'Lesson video';
    return (
        <figure className="my-8">
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Play video: ${label}`}
                className="group relative block w-full aspect-video overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
            >
                {thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() => setThumbFailed(true)}
                        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform group-hover:scale-105">
                        <Play className="ml-1 h-7 w-7 fill-current" />
                    </span>
                </span>
                {title && (
                    <span className="absolute inset-x-0 bottom-0 truncate px-4 py-3 text-left text-sm font-semibold text-white" aria-hidden="true">
                        {title}
                    </span>
                )}
            </button>
            {title && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{title}</figcaption>}
            {open && <LessonVideoModal url={href} title={label} onClose={() => setOpen(false)} />}
        </figure>
    );
});

export const ImageBlockView = memo(function ImageBlockView({ block }: { block: BlockOf<'image'> }) {
    const src = safeHref(block.url);
    if (!src) return null;
    return <ImageView src={src} alt={block.alt || block.caption || 'Course image'} caption={block.caption} />;
});

export const VideoBlockView = memo(function VideoBlockView({ block }: { block: BlockOf<'video'> }) {
    return <VideoView url={block.url} title={block.title} />;
});

export const LinkBlockView = memo(function LinkBlockView({ block }: { block: BlockOf<'link'> }) {
    const href = safeHref(block.url);
    if (!href) return null;
    const isVideo = isInLmsVideoUrl(href);
    const Icon = isVideo ? PlayCircle : LinkIcon;
    return (
        <VideoLink href={href} videoTitle={block.title}
            className="group my-5 flex items-start gap-3 p-4 bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-500" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {block.title || href}
                </span>
                {block.description && <span className="block mt-0.5 text-sm text-gray-600 dark:text-gray-400">{block.description}</span>}
                <span className="block mt-1 text-xs text-gray-400 dark:text-gray-500 break-all">{href}</span>
            </span>
        </VideoLink>
    );
});
