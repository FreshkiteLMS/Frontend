/**
 * Validate a post-login `next` target. Only same-origin, absolute paths are
 * allowed ("/chat/join/abc"); anything that could leave the site
 * ("//evil.com", "https://…", "/\\evil.com", "javascript:") is rejected so the
 * login page can't be used as an open redirect.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') return null;
    if (value.length > 2000) return null;
    if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
    if (/[\u0000-\u001f]/.test(value)) return null;
    if (value === '/login' || value.startsWith('/login?') || value === '/signup') return null;
    return value;
}

/** The validated `next` query parameter of the current page, if any. */
export function nextParamFromLocation(): string | null {
    if (typeof window === 'undefined') return null;
    return safeRedirectPath(new URLSearchParams(window.location.search).get('next'));
}
