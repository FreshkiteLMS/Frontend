import { safeExternalUrl } from '@/lib/video-utils';

const LEETCODE_HOST = /^(?:www\.)?leetcode\.(?:com|cn)$/i;

/**
 * The Solutions tab of a LeetCode problem, built from its stored link: any page
 * of that problem (description, a contest copy, one posted solution) leads to
 * the same place. Null for a link that isn't to a LeetCode problem.
 */
export function leetCodeSolutionsUrl(url: string | null | undefined): string | null {
    const safe = url ? safeExternalUrl(url) : null;
    if (!safe) return null;
    const u = new URL(safe);
    if (!LEETCODE_HOST.test(u.hostname)) return null;
    const slug = /\/problems\/([a-z0-9-]+)(?:\/|$)/i.exec(u.pathname)?.[1];
    return slug ? `https://${u.hostname.replace(/^www\./i, '')}/problems/${slug.toLowerCase()}/solutions/` : null;
}

/**
 * Where a problem's title leads: the LeetCode Solutions tab when a stored link
 * identifies the problem, otherwise the stored solution or problem page. Never
 * derived from the title, and null when nothing stored can be opened safely.
 */
export function problemTitleHref(problem: { problemUrl: string | null; solutionUrl: string | null }): string | null {
    return leetCodeSolutionsUrl(problem.problemUrl)
        ?? leetCodeSolutionsUrl(problem.solutionUrl)
        ?? (problem.solutionUrl ? safeExternalUrl(problem.solutionUrl) : null)
        ?? (problem.problemUrl ? safeExternalUrl(problem.problemUrl) : null);
}
