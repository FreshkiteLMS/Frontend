import type { CatalogCourse, CatalogUnit } from '@/types/catalog';

/** Whole rupees (products are priced in rupees). */
export function formatINR(rupees: number, currency = 'INR'): string {
    const value = Number.isFinite(rupees) ? rupees : 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
}

const CATEGORY_LABELS: Record<string, string> = {
    ai_ml: 'AI & ML',
    web_development: 'Web Development',
    data_science: 'Data Science',
    dsa: 'DSA',
    devops: 'DevOps',
    other: 'Other',
};

/** "web_development" → "Web Development" (known keys get a curated label). */
export function categoryLabel(key: string | null | undefined): string {
    if (!key) return 'General';
    if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

const UNIT_WORDS: Record<CatalogUnit, [string, string]> = {
    lessons: ['lesson', 'lessons'],
    problems: ['problem', 'problems'],
    questions: ['question', 'questions'],
};
export const unitLabel = (unit: CatalogUnit, n: number) => `${n.toLocaleString('en-IN')} ${UNIT_WORDS[unit][n === 1 ? 0 : 1]}`;
export const moduleWord = (kind: CatalogCourse['kind'], n: number) =>
    kind === 'problems' ? (n === 1 ? 'section' : 'sections') : kind === 'aptitude' ? (n === 1 ? 'topic' : 'topics') : n === 1 ? 'module' : 'modules';

export const difficultyLabel = (d: string | null | undefined) => (d ? d[0].toUpperCase() + d.slice(1) : null);

export type CourseSort = 'newest' | 'popular-content' | 'price-asc' | 'price-desc' | 'title';
export const SORT_OPTIONS: { value: CourseSort; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular-content', label: 'Most content' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'title', label: 'A – Z' },
];

export interface CourseFilterState {
    query: string;
    category: string; // 'all' or a category key
    difficulty: string; // 'all' or beginner/intermediate/advanced
    sort: CourseSort;
}
export const DEFAULT_FILTERS: CourseFilterState = { query: '', category: 'all', difficulty: 'all', sort: 'newest' };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Search (title, description, category, tags — every word must match), filter and sort. Pure. */
export function filterCourses(courses: CatalogCourse[], f: CourseFilterState): CatalogCourse[] {
    const words = norm(f.query.trim()).split(/\s+/).filter(Boolean);
    const out = courses.filter(c => {
        if (f.category !== 'all' && c.category !== f.category) return false;
        if (f.difficulty !== 'all' && c.difficulty !== f.difficulty) return false;
        if (!words.length) return true;
        const hay = norm([c.title, c.description, categoryLabel(c.category), ...c.tags].join(' '));
        return words.every(w => hay.includes(w));
    });
    const time = (c: CatalogCourse) => (c.createdAt ? Date.parse(c.createdAt) : 0);
    const sorters: Record<CourseSort, (a: CatalogCourse, b: CatalogCourse) => number> = {
        newest: (a, b) => time(b) - time(a),
        'popular-content': (a, b) => b.counts.lessons - a.counts.lessons || b.counts.modules - a.counts.modules,
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...out].sort((a, b) => sorters[f.sort](a, b) || a.title.localeCompare(b.title));
}

/** Login link that brings the visitor back to `next` afterwards (validated by the login page). */
export const loginHref = (next: string) => `/login?next=${encodeURIComponent(next)}`;
export const signupHref = (next?: string) => (next ? `/signup?next=${encodeURIComponent(next)}` : '/signup');

/** Where a signed-in student completes a purchase of this product. */
export const studentStoreHref = (target: { course?: string; bundle?: string }) =>
    target.course ? `/student/courses?course=${encodeURIComponent(target.course)}`
        : target.bundle ? `/student/courses?bundle=${encodeURIComponent(target.bundle)}`
            : '/student/courses';
