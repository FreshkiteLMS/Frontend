"use client";

import { useMemo, useState } from 'react';
import { ExternalLink, Languages, PlayCircle, VideoOff } from 'lucide-react';
import { extractYouTubeId } from '@/lib/video-utils';
import type { VideoSolution } from '@/types/problem-course';

/** The student's last chosen solution language (per browser), kept across problems. */
export const VIDEO_LANGUAGE_KEY = 'ps-video-language';

export function readPreferredLanguage(): string | null {
    try { return localStorage.getItem(VIDEO_LANGUAGE_KEY); } catch { return null; }
}
function writePreferredLanguage(code: string) {
    try { localStorage.setItem(VIDEO_LANGUAGE_KEY, code); } catch { /* storage unavailable */ }
}

/**
 * Which video to show first: the language the student picked last time (when
 * this problem has it), otherwise the admin's default, otherwise the first.
 */
export function pickInitialVideo(videos: VideoSolution[], preferredCode: string | null): VideoSolution | null {
    if (!videos.length) return null;
    return (preferredCode && videos.find(v => v.languageCode === preferredCode)) || videos.find(v => v.isDefault) || videos[0];
}

/** Embeddable player URL for a supported host, or null for a direct file / unknown link. */
export function embedUrl(url: string): string | null {
    const yt = extractYouTubeId(url);
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
    const vimeo = /vimeo\.com\/(?:video\/)?(\d{5,})/.exec(url);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    const drive = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url) || /drive\.google\.com\/.*[?&]id=([A-Za-z0-9_-]+)/.exec(url);
    if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
    return null;
}

const isFile = (url: string) => /\.(mp4|webm|ogg|ogv|m3u8)(\?|#|$)/i.test(url);

function Player({ video }: { video: VideoSolution }) {
    const [broken, setBroken] = useState(false);
    const embed = embedUrl(video.url);
    if (broken || (!embed && !isFile(video.url))) {
        return (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-800 p-6 text-center">
                <VideoOff className="h-8 w-8 text-gray-400" aria-hidden="true" />
                <p className="text-sm text-gray-600 dark:text-gray-300">This video can’t be played here.</p>
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open the video
                </a>
            </div>
        );
    }
    return (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {embed ? (
                <iframe
                    key={video.id}
                    src={embed}
                    title={`${video.title} (${video.languageName})`}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            ) : (
                <video key={video.id} src={video.url} controls preload="metadata" className="absolute inset-0 h-full w-full" onError={() => setBroken(true)} />
            )}
        </div>
    );
}

/**
 * Solution videos for one problem with a language selector. Only published
 * videos ever reach the browser; with a single video there is no selector,
 * and switching languages swaps the player only (the page is not reloaded).
 */
export function VideoSolutionPlayer({ videos, legacyUrl, problemTitle }: { videos: VideoSolution[]; legacyUrl: string | null; problemTitle: string }) {
    // Older problems have just one link from the sheet.
    const list = useMemo<VideoSolution[]>(() => {
        if (videos.length) return videos;
        return legacyUrl ? [{ id: 'legacy', title: `${problemTitle} – solution`, languageCode: '', languageName: '', url: legacyUrl, description: '', isDefault: true }] : [];
    }, [videos, legacyUrl, problemTitle]);
    const [selectedId, setSelectedId] = useState<string | null>(() => pickInitialVideo(list, readPreferredLanguage())?.id ?? null);
    const selected = list.find(v => v.id === selectedId) ?? pickInitialVideo(list, readPreferredLanguage());

    if (!selected) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-6 py-10 text-center">
                <PlayCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">No video solution yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Check back later — your instructors may add one.</p>
            </div>
        );
    }

    const choose = (v: VideoSolution) => {
        setSelectedId(v.id);
        if (v.languageCode) writePreferredLanguage(v.languageCode);
    };

    return (
        <div className="space-y-3">
            {list.length > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400" id="video-lang-label">
                        <Languages className="h-4 w-4" aria-hidden="true" /> Language
                    </span>
                    <div role="radiogroup" aria-labelledby="video-lang-label" className="flex flex-wrap gap-1.5">
                        {list.map(v => {
                            const on = v.id === selected.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={on}
                                    onClick={() => choose(v)}
                                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    {v.languageName}
                                    {v.isDefault && <span className={`ml-1 text-[10px] ${on ? 'text-blue-100' : 'text-gray-400'}`}>(default)</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : selected.languageName ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <Languages className="h-4 w-4" aria-hidden="true" /> {selected.languageName}
                </p>
            ) : null}
            <Player video={selected} />
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selected.title}
                    {selected.languageName && <span className="ml-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300" aria-label={`Language: ${selected.languageName}`}>{selected.languageName}</span>}
                </p>
                {selected.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selected.description}</p>}
            </div>
        </div>
    );
}
