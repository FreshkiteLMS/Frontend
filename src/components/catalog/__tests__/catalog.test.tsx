import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MyAccess } from '@/types/student';
import type { Catalog, CatalogCourse, CurriculumModule } from '@/types/catalog';

const auth = vi.hoisted(() => ({ user: null as null | { id: string; role: string; name: string; email: string } }));
const getMyAccess = vi.hoisted(() => vi.fn());
const getCatalog = vi.hoisted(() => vi.fn());
const getCourse = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock('@/services/api/student.api', () => ({ studentService: { getMyAccess } }));
vi.mock('@/services/api/catalog.api', () => ({ catalogService: { getCatalog, getCourse, getBundle: vi.fn() } }));
vi.mock('@/components/payment/PaymentButton', () => ({
    default: ({ label, courseId }: { label?: string; courseId: string }) => <button type="button" data-item={courseId}>{label ?? 'Buy Now'}</button>,
}));
vi.mock('@/components/layout/selling-navbar', () => ({ SellingNavbar: () => null }));
vi.mock('@/services/api/enrollment-management.api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/services/api/enrollment-management.api')>()),
    accessRequestApi: { mine: vi.fn().mockResolvedValue([]), create: vi.fn(), cancel: vi.fn(), get: vi.fn(), myEnrollments: vi.fn().mockResolvedValue([]) },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { filterCourses, DEFAULT_FILTERS, loginHref, studentStoreHref } from '@/lib/catalog';
import { __resetCatalogStore } from '@/hooks/use-catalog';
import { PurchaseAction } from '../purchase-action';
import { CurriculumAccordion } from '../curriculum-accordion';
import { CatalogBundleCard } from '../bundle-card';
import { CourseSellingPage } from '../../courses/course-selling-page';

beforeAll(() => {
    // jsdom lacks these; framer-motion's whileInView/useInView and reduced-motion need them.
    class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    (globalThis as any).IntersectionObserver = IO;
    window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as any);
    window.scrollTo = () => {};
});

const course = (over: Partial<CatalogCourse>): CatalogCourse => ({
    id: 'uuid', _id: 'oid', title: 'Course', description: '', category: 'web_development', difficulty: 'beginner',
    templateType: 'structured-course', kind: 'structured', price: 1000, thumbnailUrl: null, estimatedHours: null, tags: [],
    counts: { modules: 2, lessons: 5, unit: 'lessons', audioQuestions: 0, assignments: 0 }, bundleIds: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: null,
    ...over,
});

const html = course({ id: 'uuid-html', _id: 'oid-html', title: 'HTML Basics', description: 'Markup', price: 1000, tags: ['html'], createdAt: '2026-01-01T00:00:00Z', bundleIds: ['bundle-web'] });
const ts = course({ id: 'uuid-ts', _id: 'oid-ts', title: 'TypeScript Pro', description: 'Types for JS', price: 1500, difficulty: 'advanced', createdAt: '2026-03-01T00:00:00Z', bundleIds: ['bundle-web'] });
const dsa = course({ id: 'uuid-dsa', _id: 'oid-dsa', title: 'DSA Sheet', category: 'dsa', kind: 'problems', price: 500, createdAt: '2026-02-01T00:00:00Z', counts: { modules: 3, lessons: 40, unit: 'problems', audioQuestions: 0, assignments: 0 } });

const bundle = {
    id: 'bundle-web', name: 'Web Development', description: 'Front to back', imageUrl: null, price: 2000,
    courseIds: [html.id, ts.id], courseCount: 2, totals: { modules: 4, lessons: 10 },
    combinedPrice: 2500, savings: 500, savingsPercent: 20, createdAt: null,
};

const catalog: Catalog = {
    courses: [html, ts, dsa],
    bundles: [bundle],
    categories: [{ key: 'web_development', count: 2 }, { key: 'dsa', count: 1 }],
    stats: { courses: 3, bundles: 1, modules: 7, lessons: 10, problems: 40, aptitudeQuestions: 0, audioQuestions: 0, assignments: 0, students: 3, categories: 2 },
    allAccess: { price: 60000, currency: 'INR', courseCount: 3 },
    currency: 'INR',
    generatedAt: '2026-11-20T00:00:00Z',
};

const access = (over: Partial<MyAccess>): MyAccess => ({ fullAccess: false, bundleIds: [], courses: [], grants: [], ...over });
const entry = (c: CatalogCourse, via: ('bundle' | 'direct' | 'full_access')[] = ['direct']) =>
    ({ id: c.id, _id: c._id, title: c.title, status: 'active', via, bundleIds: via.includes('bundle') ? [bundle.id] : [] });

let seq = 0;
const signIn = (role = 'student') => { auth.user = { id: `user-${++seq}`, role, name: 'S', email: 's@x.dev' }; };

beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    __resetCatalogStore();
    getCatalog.mockResolvedValue(catalog);
    window.history.replaceState(null, '', '/student/courses');
});
afterEach(cleanup);

describe('filterCourses', () => {
    test('searches every word across title, description, category and tags', () => {
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, query: 'types js' }).map(c => c.title)).toEqual(['TypeScript Pro']);
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, query: 'HTML' }).map(c => c.title)).toEqual(['HTML Basics']);
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, query: 'web development' })).toHaveLength(2);
    });
    test('filters by category and difficulty, and sorts', () => {
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, category: 'dsa' }).map(c => c.id)).toEqual(['uuid-dsa']);
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, difficulty: 'advanced' }).map(c => c.id)).toEqual(['uuid-ts']);
        expect(filterCourses(catalog.courses, DEFAULT_FILTERS).map(c => c.id)).toEqual(['uuid-ts', 'uuid-dsa', 'uuid-html']);
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, sort: 'price-asc' }).map(c => c.price)).toEqual([500, 1000, 1500]);
        expect(filterCourses(catalog.courses, { ...DEFAULT_FILTERS, sort: 'popular-content' })[0].id).toBe('uuid-dsa');
    });
});

describe('PurchaseAction', () => {
    const product = { type: 'course' as const, id: html.id, mongoId: html._id, name: html.title, price: 1000 };

    test('signed out → log in, then back to this course in the store', async () => {
        render(<PurchaseAction product={product} />);
        const link = await screen.findByRole('link', { name: /Enroll now/ });
        expect(link.getAttribute('href')).toBe(loginHref(studentStoreHref({ course: html.id })));
        expect(link.getAttribute('href')).toBe('/login?next=%2Fstudent%2Fcourses%3Fcourse%3Duuid-html');
    });

    test('no purchase button while access loads; then checkout with the course UUID', async () => {
        signIn();
        let resolve!: (v: MyAccess) => void;
        getMyAccess.mockReturnValue(new Promise(r => { resolve = r; }));
        render(<PurchaseAction product={product} />);
        expect(await screen.findByLabelText('Checking your access')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Enroll now' })).toBeNull();
        resolve(access({}));
        const buy = await screen.findByRole('button', { name: 'Enroll now' });
        expect(buy.getAttribute('data-item')).toBe('uuid-html');
    });

    test('owned through a bundle → Go to course, never a second purchase', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ bundleIds: [bundle.id], courses: [entry(html, ['bundle'])] }));
        render(<PurchaseAction product={product} />);
        const link = await screen.findByRole('link', { name: /Go to course/ });
        expect(link.getAttribute('href')).toBe('/student/courses/uuid-html');
        expect(screen.queryByRole('button', { name: 'Enroll now' })).toBeNull();
    });

    test('staff get no buy button', async () => {
        signIn('admin');
        const { container } = render(<PurchaseAction product={product} />);
        await waitFor(() => expect(container.textContent).toBe(''));
    });
});

describe('CurriculumAccordion', () => {
    const modules: CurriculumModule[] = Array.from({ length: 8 }, (_, i) => ({
        id: `m${i}`, title: `Module title ${i + 1}`, description: '', lessonCount: 2,
        lessons: [{ id: `l${i}a`, title: `Lesson ${i + 1}.1` }, { id: `l${i}b`, title: `Lesson ${i + 1}.2` }],
    }));

    test('opens the first module, toggles others, and previews long outlines', () => {
        render(<CurriculumAccordion modules={modules} unit="lessons" kind="structured" />);
        expect(screen.getByText('Lesson 1.1')).toBeTruthy();
        expect(screen.queryByText('Lesson 2.1')).toBeNull(); // lessons render only when expanded
        fireEvent.click(screen.getByRole('button', { name: /Module title 2/ }));
        expect(screen.getByText('Lesson 2.1')).toBeTruthy();
        expect(screen.queryByText('Module title 7')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /View complete curriculum \(8 modules\)/ }));
        expect(screen.getByText('Module title 8')).toBeTruthy();
    });
});

describe('CatalogBundleCard', () => {
    test('shows savings only when the bundle is cheaper than its courses', () => {
        render(<CatalogBundleCard bundle={bundle} courses={[html, ts]} />);
        expect(screen.getByText(/Save ₹500 \(20%\)/)).toBeTruthy();
        cleanup();
        render(<CatalogBundleCard bundle={{ ...bundle, savings: 0, savingsPercent: 0, combinedPrice: 1500 }} courses={[html, ts]} />);
        expect(screen.queryByText(/Save/)).toBeNull();
    });
});

describe('CourseSellingPage (student store)', () => {
    test('lists every published course from the catalog', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({}));
        render(<CourseSellingPage />);
        const panel = await screen.findByRole('tabpanel', { name: /All courses/ });
        await waitFor(() => expect(within(panel).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['TypeScript Pro', 'DSA Sheet', 'HTML Basics']));
        expect(getCatalog).toHaveBeenCalledTimes(1);
    });

    test('full-access students are told so and offered nothing to buy', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ fullAccess: true, courses: [entry(html, ['full_access']), entry(ts, ['full_access']), entry(dsa, ['full_access'])] }));
        render(<CourseSellingPage />);
        expect(await screen.findByText('You have full access to every course')).toBeTruthy();
        await waitFor(() => expect(screen.getAllByRole('link', { name: /Go to course/ }).length).toBe(3));
        expect(screen.queryByRole('button', { name: 'Enroll now' })).toBeNull();
        fireEvent.click(screen.getByRole('tab', { name: /Bundles/ }));
        expect(screen.queryByRole('button', { name: /Get full access/ })).toBeNull();
        expect(screen.getByRole('link', { name: /Enrolled · Continue learning/ }).getAttribute('href')).toBe('/student');
        expect(screen.queryByRole('button', { name: /Request Admin Approval/ })).toBeNull();
    });

    test('bundle holders see the bundle as enrolled; owning one course does not mark the bundle owned', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ bundleIds: [bundle.id], courses: [entry(html, ['bundle']), entry(ts, ['bundle'])] }));
        render(<CourseSellingPage />);
        fireEvent.click(await screen.findByRole('tab', { name: /Bundles/ }));
        expect(await screen.findByText(/Enrolled · Continue learning/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Buy bundle' })).toBeNull();
        expect(screen.getByRole('button', { name: /Get full access/ })).toBeTruthy(); // still offered the upgrade

        cleanup();
        __resetCatalogStore();
        signIn();
        getMyAccess.mockResolvedValue(access({ courses: [entry(html)] }));
        render(<CourseSellingPage />);
        fireEvent.click(await screen.findByRole('tab', { name: /Bundles/ }));
        expect(await screen.findByRole('button', { name: 'Buy bundle' })).toBeTruthy();
    });

    test('My courses lists only what the student owns', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ courses: [entry(ts)] }));
        render(<CourseSellingPage />);
        fireEvent.click(await screen.findByRole('tab', { name: /My courses/ }));
        const panel = await screen.findByRole('tabpanel', { name: /My courses/ });
        await waitFor(() => expect(within(panel).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['TypeScript Pro']));
    });

    test('a ?course= link (the post-login return target) opens that course’s details', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({}));
        getCourse.mockResolvedValue({
            ...html, overview: '', learningObjectives: ['Write semantic markup'], bundles: [],
            curriculum: { unit: 'lessons', modules: [{ id: 'm1', title: 'Getting started', description: '', lessonCount: 1, lessons: [{ id: 'l1', title: 'Your first page' }] }] },
        });
        window.history.replaceState(null, '', '/student/courses?course=uuid-html');
        render(<CourseSellingPage />);
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Write semantic markup')).toBeTruthy();
        expect(within(dialog).getByText('Your first page')).toBeTruthy();
        expect(getCourse).toHaveBeenCalledWith('uuid-html');
    });
});
