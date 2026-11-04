import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BlockOf, ContentBlockType, StructuredCourse } from '@/types/structured-course';
import { BLOCK_RENDERERS, ContentBlockRenderer } from '../structured/ContentBlockRenderer';
import { LessonBody, buildCourseOutline, lessonHeadings } from '../course-outline';

afterEach(cleanup);

/** One sample per type — typed as a full map, so a new type fails to compile until it has a sample. */
const SAMPLES: { [K in ContentBlockType]: BlockOf<K> } = {
    heading: { id: 'b1', type: 'heading', text: 'Primitive types', level: 2 },
    paragraph: { id: 'b2', type: 'paragraph', text: 'A variable is a container used to store data.' },
    rich_text: { id: 'b3', type: 'rich_text', segments: [
        { text: 'Use ', bold: false, italic: false, code: false, link: null },
        { text: 'int', bold: false, italic: false, code: true, link: null },
    ] },
    bullet_list: { id: 'b4', type: 'bullet_list', items: ['Variables store values'] },
    numbered_list: { id: 'b5', type: 'numbered_list', items: ['Declare the variable'] },
    code: { id: 'b6', type: 'code', language: 'java', code: 'int age = 25;', caption: 'Integer variable' },
    quote: { id: 'b7', type: 'quote', text: 'Programs are for people.', attribution: 'Abelson' },
    callout: { id: 'b8', type: 'callout', title: '', text: 'Java is statically typed.' },
    example: { id: 'b9', type: 'example', title: 'Shopping cart', text: 'A cart total is a double.' },
    definition: { id: 'b10', type: 'definition', term: 'Variable', definition: 'A named storage location.' },
    table: { id: 'b11', type: 'table', caption: '', headers: ['Type', 'Description'], rows: [['int', 'Whole numbers']] },
    image: { id: 'b12', type: 'image', url: 'https://cdn.example.com/memory.png', alt: 'Memory diagram', caption: '' },
    video: { id: 'b13', type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Variables explained' },
    link: { id: 'b14', type: 'link', url: 'https://docs.oracle.com/javase/tutorial/', title: 'Java Tutorials', description: '' },
    exercise: { id: 'b15', type: 'exercise', title: 'Practice', instructions: 'Store your name and age.', difficulty: 'easy' },
    question: { id: 'b16', type: 'question', question: 'Which type stores text?', options: ['int', 'String'] },
    answer: { id: 'b17', type: 'answer', text: 'String stores text.' },
    warning: { id: 'b18', type: 'warning', title: '', text: 'Uninitialised variables do not compile.' },
    tip: { id: 'b19', type: 'tip', title: '', text: 'Name variables after what they hold.' },
    summary: { id: 'b20', type: 'summary', text: '', points: ['Variables hold data'] },
};

/** Text each renderer must show — proves it rendered the block's own content. */
const EXPECTED_TEXT: { [K in ContentBlockType]: string } = {
    heading: 'Primitive types',
    paragraph: 'A variable is a container used to store data.',
    rich_text: 'int',
    bullet_list: 'Variables store values',
    numbered_list: 'Declare the variable',
    code: 'int age = 25;',
    quote: 'Programs are for people.',
    callout: 'Java is statically typed.',
    example: 'A cart total is a double.',
    definition: 'A named storage location.',
    table: 'Whole numbers',
    image: 'Memory diagram',
    video: 'Variables explained',
    link: 'Java Tutorials',
    exercise: 'Store your name and age.',
    question: 'Which type stores text?',
    answer: 'Show answer',
    warning: 'Uninitialised variables do not compile.',
    tip: 'Name variables after what they hold.',
    summary: 'Variables hold data',
};

describe('URLs in course text', () => {
    const LC = 'https://leetcode.com/problems/two-sum/';
    const block = (b: Record<string, unknown>) => ({ id: 'b1', ...b }) as any;
    const links = (container: HTMLElement) => [...container.querySelectorAll('a')];

    test.each([
        ['paragraph', { type: 'paragraph', text: `Practice at ${LC}.` }],
        ['rich text', { type: 'rich_text', segments: [{ text: `Practice at ${LC}.`, bold: false, italic: false, code: false, link: null }] }],
        ['quote', { type: 'quote', text: `See ${LC}.`, attribution: '' }],
        ['bullet list', { type: 'bullet_list', items: [`Practice: ${LC}.`] }],
        ['numbered list', { type: 'numbered_list', items: [`Practice: ${LC}.`] }],
        ['table', { type: 'table', caption: '', headers: ['Link'], rows: [[`${LC}.`]] }],
        ['note', { type: 'callout', title: '', text: `See ${LC}.` }],
        ['tip', { type: 'tip', title: '', text: `See ${LC}.` }],
        ['warning', { type: 'warning', title: '', text: `See ${LC}.` }],
        ['example', { type: 'example', title: '', text: `See ${LC}.` }],
        ['definition', { type: 'definition', term: 'Two Sum', definition: `See ${LC}.` }],
        ['exercise', { type: 'exercise', title: '', instructions: `Solve ${LC}.`, difficulty: null }],
        ['question', { type: 'question', question: `Did you read ${LC}?`, options: [] }],
        ['summary', { type: 'summary', text: `See ${LC}.`, points: [] }],
    ])('a plain-text URL in a stored %s block is a safe link without its punctuation', (_name, b) => {
        const { container } = render(<ContentBlockRenderer block={block(b)} />);
        const [a] = links(container);
        expect(a.getAttribute('href')).toBe(LC);
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noopener noreferrer');
        expect(a.textContent).toBe(LC);
    });

    test('a labelled link in a list item shows its label', () => {
        const { container } = render(<ContentBlockRenderer block={block({ type: 'bullet_list', items: [`Try [Two Sum](${LC}) today`] })} />);
        expect(links(container)[0].textContent).toBe('Two Sum');
        expect(container.textContent).toBe('Try Two Sum today');
    });

    test('a structured rich-text link renders once, not twice', () => {
        const { container } = render(<ContentBlockRenderer block={block({ type: 'rich_text', segments: [{ text: LC, bold: false, italic: false, code: false, link: LC }] })} />);
        expect(links(container)).toHaveLength(1);
        expect(container.querySelector('a a')).toBeNull();
    });

    test('text that merely mentions https, and unsafe schemes, stay text', () => {
        const { container } = render(<ContentBlockRenderer block={block({ type: 'paragraph', text: 'Use https everywhere, not javascript:alert(1) or https://nodot' })} />);
        expect(links(container)).toHaveLength(0);
    });

    test('code is never linkified', () => {
        const { container } = render(<ContentBlockRenderer block={block({ type: 'code', language: 'bash', code: `curl ${LC}`, caption: '' })} />);
        expect(links(container)).toHaveLength(0);
        const inline = render(<ContentBlockRenderer block={block({ type: 'rich_text', segments: [{ text: LC, bold: false, italic: false, code: true, link: null }] })} />);
        expect(links(inline.container)).toHaveLength(0);
    });

    test('HTML in course text is shown as text, never parsed', () => {
        const { container } = render(<ContentBlockRenderer block={block({ type: 'paragraph', text: '<img src=x onerror=alert(1)> and <script>x</script>' })} />);
        expect(container.querySelector('img, script')).toBeNull();
    });
});

describe('ContentBlockRenderer', () => {
    test('every supported block type has a renderer', () => {
        expect(Object.keys(BLOCK_RENDERERS).sort()).toEqual(Object.keys(SAMPLES).sort());
    });

    test.each(Object.values(SAMPLES).map((b) => [b.type, b] as const))('renders a %s block', (type, block) => {
        const { container } = render(<ContentBlockRenderer block={block} />);
        expect(container.firstChild).not.toBeNull();
        const expected = EXPECTED_TEXT[type];
        const found = screen.queryAllByText(expected, { exact: false }).length > 0 ||
            container.querySelector(`[alt="${expected}"], [title="${expected}"]`) !== null;
        expect(found).toBe(true);
    });

    test('semantic types map to semantic UI, not to formatting', () => {
        render(<ContentBlockRenderer block={SAMPLES.code} />);
        expect(document.querySelector('pre code')?.textContent).toBe('int age = 25;');
        cleanup();
        render(<ContentBlockRenderer block={SAMPLES.table} />);
        expect(screen.getByRole('columnheader', { name: 'Type' })).toBeTruthy();
        cleanup();
        render(<ContentBlockRenderer block={SAMPLES.warning} />);
        expect(screen.getByRole('note').textContent).toContain('Warning');
    });

    test('answers are hidden until revealed', () => {
        render(<ContentBlockRenderer block={SAMPLES.answer} />);
        const panel = screen.getByText('String stores text.').closest('[id]') as HTMLElement;
        expect(panel.hidden).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /show answer/i }));
        expect(panel.hidden).toBe(false);
    });

    test('unsafe URLs are never rendered as links', () => {
        const { container } = render(
            <ContentBlockRenderer block={{ ...SAMPLES.link, url: 'javascript:alert(1)' }} />
        );
        expect(container.querySelector('a')).toBeNull();
    });

    test('an unknown block type is skipped instead of crashing', () => {
        const { container } = render(<ContentBlockRenderer block={{ id: 'x', type: 'hologram' } as any} />);
        expect(container.innerHTML).toBe('');
    });
});

const structured: StructuredCourse = {
    version: 1,
    title: 'Java',
    description: '',
    learningObjectives: ['Declare variables'],
    modules: [{
        id: 'm1', title: 'Basics', description: '',
        lessons: [{ id: 'l1', title: 'Java Variables', description: '', content: [SAMPLES.heading, SAMPLES.paragraph, SAMPLES.code] }],
    }],
};

const legacySections = [{
    id: 's1', title: 'Legacy section', description: '', duration: 0,
    content: '# Intro\nSome **bold** text.\n```java\nint x = 1;\n```\n| A | B |\n|---|---|\n| 1 | 2 |',
}];

describe('course formats', () => {
    test('structured content takes precedence and lessons keep their stored IDs', () => {
        const outline = buildCourseOutline({ structured_content: structured, sections: legacySections });
        expect(outline.format).toBe('structured');
        expect(outline.lessons.map((l) => l.id)).toEqual(['l1']);
        expect(lessonHeadings(outline.lessons[0])).toEqual([{ id: 'block-b1', text: 'Primitive types', level: 2 }]);

        render(<LessonBody item={outline.lessons[0]} />);
        expect(document.getElementById('block-b1')?.textContent).toBe('Primitive types');
        expect(document.querySelector('pre code')?.textContent).toBe('int age = 25;');
    });

    test('existing (legacy) courses still render through the legacy renderer', () => {
        const outline = buildCourseOutline({ structured_content: null, sections: legacySections });
        expect(outline.format).toBe('legacy');
        expect(outline.lessons.map((l) => l.id)).toEqual(['s1']);

        render(<LessonBody item={outline.lessons[0]} />);
        expect(screen.getByText('Intro')).toBeTruthy();
        expect(screen.getByText('bold').tagName).toBe('STRONG');
        expect(document.querySelector('pre code')?.textContent).toBe('int x = 1;');
        expect(screen.getByRole('columnheader', { name: 'A' })).toBeTruthy();
    });

    test('a course with neither format has no lessons', () => {
        expect(buildCourseOutline({}).lessons).toEqual([]);
    });
});
