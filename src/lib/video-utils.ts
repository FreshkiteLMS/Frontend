
/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
    if (!url) return null;

    // Remove whitespace
    url = url.trim();

    // Pattern 1: youtube.com/watch?v=VIDEO_ID
    const watchPattern = /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\s]+)/;
    let match = url.match(watchPattern);
    if (match && match[1]) return match[1];

    // Pattern 2: youtu.be/VIDEO_ID
    const shortPattern = /youtu\.be\/([^?\s]+)/;
    match = url.match(shortPattern);
    if (match && match[1]) return match[1];

    // Pattern 3: youtube.com/embed/VIDEO_ID
    const embedPattern = /youtube\.com\/embed\/([^?\s]+)/;
    match = url.match(embedPattern);
    if (match && match[1]) return match[1];

    // Pattern 4: m.youtube.com/watch?v=VIDEO_ID (mobile)
    const mobilePattern = /m\.youtube\.com\/watch\?v=([^&\s]+)/;
    match = url.match(mobilePattern);
    if (match && match[1]) return match[1];

    return null;
}

/**
 * Convert any YouTube URL to embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return /(?:youtube\.com|youtu\.be)/.test(url);
}
