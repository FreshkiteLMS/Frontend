import { describe, expect, test } from 'vitest';
import { isValidHttpUrl, splitLinkedText } from '../linkify';
import { leetCodeSolutionsUrl, problemTitleHref } from '../problem-links';

const urlsIn = (text: string) => splitLinkedText(text).flatMap(p => (p.kind === 'link' ? [p.url] : []));

describe('splitLinkedText', () => {
    test.each([
        ['https://leetcode.com/problems/two-sum/', 'https://leetcode.com/problems/two-sum/'],
        ['https://www.youtube.com/watch?v=abc&t=30#notes', 'https://www.youtube.com/watch?v=abc&t=30#notes'],
        ['See https://github.com/example/repository.', 'https://github.com/example/repository'],
        ['(see https://docs.google.com/document/d/x)', 'https://docs.google.com/document/d/x'],
        ['Wiki https://en.wikipedia.org/wiki/Heap_(data_structure), then go', 'https://en.wikipedia.org/wiki/Heap_(data_structure)'],
    ])('finds the URL in %s', (text, url) => {
        expect(urlsIn(text)).toEqual([url]);
    });

    test.each([
        'plain text with https in it',
        'https://',
        'https://nodot',
        'https://user:pass@example.com/',
        'javascript:alert(1)',
        'ftp://example.com/file',
    ])('leaves %s as text', text => {
        expect(splitLinkedText(text)).toEqual([{ kind: 'text', text }]);
    });

    test('a labelled link keeps its label and exact URL', () => {
        expect(splitLinkedText('Try [Two Sum](https://leetcode.com/problems/two-sum/?x=1#y) now')).toEqual([
            { kind: 'text', text: 'Try ' },
            { kind: 'link', text: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/?x=1#y' },
            { kind: 'text', text: ' now' },
        ]);
    });

    test('a labelled link with an unsafe target stays text', () => {
        expect(urlsIn('[click](javascript:alert(1))')).toEqual([]);
    });

    test('isValidHttpUrl rejects malformed destinations', () => {
        expect(isValidHttpUrl('https://exa mple.com')).toBe(false);
        expect(isValidHttpUrl('https://example.com/')).toBe(true);
    });
});

describe('leetCodeSolutionsUrl', () => {
    test.each([
        ['https://leetcode.com/problems/two-sum/', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['https://leetcode.com/problems/two-sum', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['https://www.leetcode.com/problems/two-sum/description/', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['https://leetcode.com/problems/Two-Sum/?envType=study-plan#anchor', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['https://leetcode.com/problems/two-sum/solutions/123/my-post/', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['https://leetcode.com/contest/weekly-1/problems/two-sum/', 'https://leetcode.com/problems/two-sum/solutions/'],
        ['leetcode.cn/problems/two-sum', null],
        ['https://leetcode.cn/problems/two-sum/', 'https://leetcode.cn/problems/two-sum/solutions/'],
    ])('%s', (url, expected) => {
        expect(leetCodeSolutionsUrl(url)).toBe(expected);
    });

    test.each([
        'https://leetcode.com/',
        'https://leetcode.com/explore/learn/',
        'https://leetcode.com.evil.example/problems/two-sum/',
        'https://evil.example/leetcode.com/problems/two-sum/',
        'https://www.geeksforgeeks.org/problems/two-sum/',
        'javascript:alert(1)',
        'not a url',
        '',
    ])('not a LeetCode problem: %s', url => {
        expect(leetCodeSolutionsUrl(url)).toBeNull();
    });
});

describe('problemTitleHref', () => {
    const p = (problemUrl: string | null, solutionUrl: string | null = null) => ({ problemUrl, solutionUrl });

    test('prefers the LeetCode Solutions tab from either stored link', () => {
        expect(problemTitleHref(p('https://leetcode.com/problems/two-sum/'))).toBe('https://leetcode.com/problems/two-sum/solutions/');
        expect(problemTitleHref(p('https://leetcode.com/problems/two-sum/', 'https://blog.example.com/two-sum'))).toBe('https://leetcode.com/problems/two-sum/solutions/');
        expect(problemTitleHref(p(null, 'https://leetcode.com/problems/two-sum/solutions/1/x/'))).toBe('https://leetcode.com/problems/two-sum/solutions/');
    });

    test('elsewhere, opens the stored solution page, then the stored problem page', () => {
        expect(problemTitleHref(p('https://www.geeksforgeeks.org/problems/x/', 'https://blog.example.com/x'))).toBe('https://blog.example.com/x');
        expect(problemTitleHref(p('https://www.geeksforgeeks.org/problems/x/'))).toBe('https://www.geeksforgeeks.org/problems/x/');
    });

    test('nothing usable stored means no link, never one guessed from the title', () => {
        expect(problemTitleHref(p(null))).toBeNull();
        expect(problemTitleHref(p('javascript:alert(1)', 'not a url'))).toBeNull();
    });
});
