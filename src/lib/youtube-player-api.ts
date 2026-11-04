/**
 * The official YouTube IFrame Player API, loaded once on first use. Only used
 * to hear about playback errors from a player that is already embedded, so a
 * failed load is harmless: the video still plays, it just can't report errors.
 */

export interface YouTubePlayerApi {
    Player: new (
        target: HTMLIFrameElement,
        options: { host?: string; events: { onError?: (event: { data: number }) => void } }
    ) => unknown;
}

declare global {
    interface Window {
        YT?: YouTubePlayerApi;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let loading: Promise<YouTubePlayerApi> | null = null;

export function loadYouTubePlayerApi(): Promise<YouTubePlayerApi> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (loading) return loading;
    loading = new Promise<YouTubePlayerApi>((resolve, reject) => {
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            if (window.YT?.Player) resolve(window.YT);
            else reject(new Error('YouTube player API unavailable'));
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
            loading = null; // allow a retry on the next video
            script.remove();
            reject(new Error('YouTube player API failed to load'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

/** Player error codes for "the owner doesn't allow embedding" (153: no embedder identity). */
const EMBED_BLOCKED_CODES = [101, 150, 153];

export type YouTubePlaybackProblem = 'embed-blocked' | 'unavailable';

export function classifyYouTubeError(code: number): YouTubePlaybackProblem {
    return EMBED_BLOCKED_CODES.includes(code) ? 'embed-blocked' : 'unavailable';
}
