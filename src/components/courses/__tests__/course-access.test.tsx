import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { MyAccess } from '@/types/student';

const auth = vi.hoisted(() => ({ user: null as null | { id: string; role: string; name: string; email: string } }));
const getMyAccess = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock('@/services/api/student.api', () => ({ studentService: { getMyAccess } }));
vi.mock('@/components/payment/PaymentButton', () => ({
    default: ({ label }: { label?: string }) => <button type="button">{label ?? 'Buy Now'}</button>,
}));
vi.mock('../../payment/PaymentButton', () => ({
    default: ({ label }: { label?: string }) => <button type="button">{label ?? 'Buy Now'}</button>,
}));
vi.mock('@/components/layout/selling-navbar', () => ({ SellingNavbar: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const groups = vi.hoisted(() => vi.fn());
const courses = vi.hoisted(() => vi.fn());
vi.mock('@/services/api/courseGroupService', () => ({ courseGroupService: { getGroupedCourses: groups } }));
vi.mock('@/services/api/course.api', () => ({ courseService: { getAllCourses: courses } }));
vi.mock('@/services/api/config.api', () => ({ configService: { getPublicConfig: vi.fn().mockResolvedValue({ subscriptionPrice: 60000, totalCourseCount: 3, currency: 'INR' }) } }));
vi.mock('@/services/api/enrollment-request.api', () => ({ enrollmentRequestService: { getMine: vi.fn().mockResolvedValue([]) } }));

import { CourseCard } from '../course-card';
import { CourseSellingPage } from '../course-selling-page';

const html = { id: 'uuid-html', _id: 'oid-html', title: 'HTML', price: 1000, status: 'active' };
const ts = { id: 'uuid-ts', _id: 'oid-ts', title: 'TypeScript', price: 1500, status: 'active' };
const bundle = { _id: 'bundle-web', name: 'Web Development', price: 5000, courses: [{ courseId: html, name: 'HTML' }, { courseId: ts, name: 'TypeScript' }] };

const access = (over: Partial<MyAccess>): MyAccess => ({ fullAccess: false, bundleIds: [], courses: [], grants: [], ...over });
const entry = (c: typeof html, via: ('bundle' | 'direct' | 'full_access')[] = ['bundle']) => ({ id: c.id, _id: c._id, title: c.title, status: 'active', via, bundleIds: via.includes('bundle') ? [bundle._id] : [] });

// The access store is shared module state keyed by user, so each test signs in a new user.
let seq = 0;
const signIn = () => { auth.user = { id: `student-${++seq}`, role: 'student', name: 'S', email: 's@x.dev' }; };

beforeEach(() => {
    vi.clearAllMocks();
    groups.mockResolvedValue([bundle]);
    courses.mockResolvedValue([html, ts]);
});
afterEach(cleanup);

describe('CourseCard access state', () => {
    test('a bundle holder sees Open course for a course added to the bundle later, never Enroll Now', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ bundleIds: [bundle._id], courses: [entry(html), entry(ts)] }));
        render(<CourseCard course={ts as any} />);
        const link = await screen.findByRole('link', { name: /Open course/ });
        expect(link.getAttribute('href')).toBe('/student/courses/uuid-ts');
        expect(screen.queryByRole('button', { name: 'Enroll Now' })).toBeNull();
    });

    test('matches a course owned under its legacy Mongo id', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ courses: [{ ...entry(html, ['direct']), id: 'other-form' }] }));
        render(<CourseCard course={{ ...html, id: undefined } as any} />);
        expect(await screen.findByRole('link', { name: /Open course/ })).toBeTruthy();
    });

    test('a student without access is offered enrollment once access has loaded', async () => {
        signIn();
        let resolve!: (v: MyAccess) => void;
        getMyAccess.mockReturnValue(new Promise(r => { resolve = r; }));
        render(<CourseCard course={html as any} />);
        // No purchase button while access is unknown — prevents paying for something owned.
        expect(screen.getByLabelText('Checking your access')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Enroll Now' })).toBeNull();
        resolve(access({}));
        expect(await screen.findByRole('button', { name: 'Enroll Now' })).toBeTruthy();
    });
});

describe('CourseSellingPage access state', () => {
    test('full-access students see Continue learning instead of buy or request buttons', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ fullAccess: true, courses: [entry(html, ['full_access']), entry(ts, ['full_access'])] }));
        render(<CourseSellingPage />);
        expect(await screen.findByText('You have full access to every course')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Get Full Access/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Request Admin Approval/ })).toBeNull();
        // Hero and the bundle card both lead to the student's courses.
        await waitFor(() => expect(screen.getAllByRole('link', { name: /Continue learning/ }).length).toBe(2));
        expect(screen.queryByRole('button', { name: 'Enroll in Bundle' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Enroll Now' })).toBeNull();
    });

    test('bundle holders see the bundle as enrolled; owning one course does not mark the bundle owned', async () => {
        signIn();
        getMyAccess.mockResolvedValue(access({ bundleIds: [bundle._id], courses: [entry(html), entry(ts)] }));
        render(<CourseSellingPage />);
        expect(await screen.findByText(/Enrolled · Continue learning/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Enroll in Bundle' })).toBeNull();
        // Still offered the All-In-One upgrade.
        expect(screen.getByRole('button', { name: /Get Full Access/ })).toBeTruthy();

        cleanup();
        signIn();
        getMyAccess.mockResolvedValue(access({ courses: [entry(html, ['direct'])] }));
        render(<CourseSellingPage />);
        expect(await screen.findByRole('button', { name: 'Enroll in Bundle' })).toBeTruthy();
    });
});
