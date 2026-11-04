"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Languages, Loader2, PlayCircle, VideoOff } from 'lucide-react';
import { extractYouTubeId, getYouTubePlayerUrl, safeExternalUrl } from '@/lib/video-utils';
import { classifyYouTubeError, loadYouTubePlayerApi, type YouTubePlaybackProblem } from '@/lib/youtube-player-api';
import { UNSPECIFIED_LANGUAGE, UNSPECIFIED_LANGUAGE_NAME } from '@/lib/video-solutions';
import type { VideoSolution } from '@/types/problem-course';

/** The student's last chosen solution language (per browser), kept across problems. */
export const VIDEO_LANGUAGE_KEY = 'ps-video-language';

/** More languages than this don't fit as tabs on a phone, so they become a dropdown. */
const MAX_LANGUAGE_TABS = 4;

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

const hasLanguage = (v: VideoSolution) => !!v.languageCode && v.languageCode !== UNSPECIFIED_LANGUAGE;

export interface VideoLanguageGroup {
    code: string;
    name: string;
    videos: VideoSolution[];
}

/** Only languages that have a video, in the order they first appear. */
export function groupByLanguage(videos: VideoSolution[]): VideoLanguageGroup[] {
    const groups = new Map<string, VideoLanguageGroup>();
    for (const v of videos) {
        const code = hasLanguage(v) ? v.languageCode : UNSPECIFIED_LANGUAGE;
        const group = groups.get(code) ?? { code, name: hasLanguage(v) ? v.languageName : UNSPECIFIED_LANGUAGE_NAME, videos: [] };
        group.videos.push(v);
        groups.set(code, group);
    }
    return [...groups.values()];
}

/** Embeddable player URL for a supported host, or null for a direct file / unknown link. */
export function embedUrl(url: string): string | null {
    const yt = getYouTubePlayerUrl(url, typeof window === 'undefined' ? undefined : window.location.origin);
    if (yt) return yt;
    const vimeo = /vimeo\.com\/(?:video\/)?(\d{5,})/.exec(url);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    const drive = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url) || /drive\.google\.com\/.*[?&]id=([A-Za-z0-9_-]+)/.exec(url);
    if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
    return null;
}

const isFile = (url: string) => /\.(mp4|webm|ogg|ogv|m3u8)(\?|#|$)/i.test(url);

/** The explicit "leave the LMS" action for a video, when its link can be opened safely. */
function externalAction(url: string): { href: string; label: string } | null {
    const href = safeExternalUrl(url);
    if (!href) return null;
    if (extractYouTubeId(url)) return { href, label: 'Watch on YouTube' };
    if (/vimeo\.com\//i.test(url)) return { href, label: 'Watch on Vimeo' };
    if (/drive\.google\.com\//i.test(url)) return { href, label: 'Open in Google Drive' };
    return { href, label: 'Open video' };
}

type PlaybackProblem = YouTubePlaybackProblem | 'unsupported' | 'failed';

const PROBLEM_MESSAGE: Record<PlaybackProblem, (external: string | undefined) => string> = {
    'embed-blocked': external => `This video cannot be played directly inside the LMS.${external ? ' You can watch it on YouTube instead.' : ''}`,
    unavailable: () => 'This video is unavailable. It may be private or may have been removed.',
    unsupported: () => 'This video link can’t be played inside the LMS.',
    failed: () => 'This video could not be loaded.',
};

/** Mounted once per video (keyed by id), so a problem never carries over to the next one. */
function Player({ video, externalLabel }: { video: VideoSolution; externalLabel?: string }) {
    const embed = useMemo(() => embedUrl(video.url), [video.url]);
    const isYouTube = !!extractYouTubeId(video.url);
    const [problem, setProblem] = useState<PlaybackProblem | null>(!embed && !isFile(video.url) ? 'unsupported' : null);
    const [loaded, setLoaded] = useState(false);
    const frame = useRef<HTMLIFrameElement>(null);

    // Attach to the player that's already embedded, purely to hear about errors.
    // It is not destroyed on unmount: that would remove the iframe React owns.
    useEffect(() => {
        if (!isYouTube || problem) return;
        let active = true;
        loadYouTubePlayerApi()
            .then(api => {
                if (!active || !frame.current) return;
                new api.Player(frame.current, {
                    host: 'https://www.youtube-nocookie.com',
                    events: { onError: e => { if (active) setProblem(classifyYouTubeError(e.data)); } },
                });
            })
            .catch(() => { /* the embed still plays; it just can't report errors */ });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- attach once per mounted iframe
    }, [isYouTube]);

    if (problem) {
        return (
            <div role="status" className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-800 p-6 text-center">
                <VideoOff className="h-8 w-8 text-gray-400" aria-hidden="true" />
                <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">{PROBLEM_MESSAGE[problem](isYouTube ? externalLabel : undefined)}</p>
            </div>
        );
    }
    return (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {embed ? (
                <>
                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400" aria-hidden="true">
                            <Loader2 className="h-7 w-7 animate-spin" />
                        </div>
                    )}
                    <iframe
                        ref={frame}
                        src={embed}
                        title={hasLanguage(video) ? `${video.title} (${video.languageName})` : video.title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        onLoad={() => setLoaded(true)}
                    />
                </>
            ) : (
                <video src={video.url} controls preload="metadata" className="absolute inset-0 h-full w-full" onError={() => setProblem('failed')} />
            )}
        </div>
    );
}

const pillClass = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`;

function LanguageSelector({ groups, selected, onSelect }: { groups: VideoLanguageGroup[]; selected: VideoLanguageGroup; onSelect: (group: VideoLanguageGroup) => void }) {
    const label = (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Languages className="h-4 w-4" aria-hidden="true" /> Language
        </span>
    );
    if (groups.length > MAX_LANGUAGE_TABS) {
        return (
            <label className="flex flex-wrap items-center gap-2">
                {label}
                <select
                    value={selected.code}
                    onChange={e => onSelect(groups.find(g => g.code === e.target.value)!)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                    {groups.map(g => <option key={g.code} value={g.code}>{g.name}</option>)}
                </select>
            </label>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span id="video-lang-label">{label}</span>
            <div role="radiogroup" aria-labelledby="video-lang-label" className="flex flex-wrap gap-1.5">
                {groups.map(g => {
                    const on = g.code === selected.code;
                    return (
                        <button key={g.code} type="button" role="radio" aria-checked={on} onClick={() => onSelect(g)} className={pillClass(on)}>
                            {g.name}
                            {g.videos.some(v => v.isDefault) && <span className={`ml-1 text-[10px] ${on ? 'text-blue-100' : 'text-gray-400'}`}>(default)</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Titles when they tell the videos apart, otherwise "Video 1", "Video 2"… */
function videoChoiceLabels(videos: VideoSolution[]): string[] {
    const distinct = new Set(videos.map(v => v.title)).size === videos.length;
    return videos.map((v, i) => (distinct ? v.title : `Video ${i + 1}`));
}

/**
 * Solution videos for one problem, played inside the LMS. Students pick a
 * language, then a video when that language has several; both only swap the
 * player (the page is not reloaded). Only published videos ever reach the
 * browser. Leaving for YouTube is a separate, explicit action.
 */
export function VideoSolutionPlayer({ videos, legacyUrl, problemTitle, emptyTitle = 'No video solution yet' }: { videos: VideoSolution[]; legacyUrl: string | null; problemTitle: string; emptyTitle?: string }) {
    // Older problems have just one link from the sheet.
    const list = useMemo<VideoSolution[]>(() => {
        if (videos.length) return videos;
        return legacyUrl ? [{ id: 'legacy', title: `${problemTitle} – solution`, languageCode: '', languageName: '', url: legacyUrl, description: '', isDefault: true }] : [];
    }, [videos, legacyUrl, problemTitle]);
    const groups = useMemo(() => groupByLanguage(list), [list]);
    const [selectedId, setSelectedId] = useState<string | null>(() => pickInitialVideo(list, readPreferredLanguage())?.id ?? null);
    const selected = list.find(v => v.id === selectedId) ?? pickInitialVideo(list, readPreferredLanguage());

    if (!selected) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-6 py-10 text-center">
                <PlayCircle className="h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{emptyTitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Check back later — your instructors may add one.</p>
            </div>
        );
    }

    const currentGroup = groups.find(g => g.videos.some(v => v.id === selected.id))!;
    const chooseLanguage = (group: VideoLanguageGroup) => {
        setSelectedId((group.videos.find(v => v.isDefault) ?? group.videos[0]).id);
        if (group.code !== UNSPECIFIED_LANGUAGE) writePreferredLanguage(group.code);
    };
    const external = externalAction(selected.url);
    const choiceLabels = videoChoiceLabels(currentGroup.videos);

    return (
        <div className="space-y-3">
            {groups.length > 1 && <LanguageSelector groups={groups} selected={currentGroup} onSelect={chooseLanguage} />}
            {currentGroup.videos.length > 1 && (
                <div role="radiogroup" aria-label={hasLanguage(selected) ? `Choose a ${currentGroup.name} video` : 'Choose a video'} className="flex flex-wrap gap-1.5">
                    {currentGroup.videos.map((v, i) => (
                        <button key={v.id} type="button" role="radio" aria-checked={v.id === selected.id} onClick={() => setSelectedId(v.id)} title={v.title} className={`${pillClass(v.id === selected.id)} max-w-full truncate sm:max-w-xs`}>
                            {choiceLabels[i]}
                        </button>
                    ))}
                </div>
            )}
            <Player key={selected.id} video={selected} externalLabel={external?.label} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selected.title}
                        {hasLanguage(selected) && <span className="ml-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300" aria-label={`Language: ${selected.languageName}`}>{selected.languageName}</span>}
                    </p>
                    {selected.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selected.description}</p>}
                </div>
                {external && (
                    <a href={external.href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {external.label} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                )}
            </div>
        </div>
    );
}
