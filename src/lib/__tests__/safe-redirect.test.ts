import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../safe-redirect';

describe('safeRedirectPath', () => {
    it('accepts same-site paths with query strings', () => {
        expect(safeRedirectPath('/chat/join/AbC_12-x')).toBe('/chat/join/AbC_12-x');
        expect(safeRedirectPath('/student?tab=1')).toBe('/student?tab=1');
    });

    it('rejects anything that could leave the site', () => {
        for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', 'evil.com', '', null, undefined, '/\nx']) {
            expect(safeRedirectPath(bad as string)).toBeNull();
        }
    });

    it('never loops back to the auth pages', () => {
        expect(safeRedirectPath('/login')).toBeNull();
        expect(safeRedirectPath('/login?next=/x')).toBeNull();
    });
});
