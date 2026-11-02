import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const replace = vi.hoisted(() => vi.fn());
const getDashboardStats = vi.hoisted(() => vi.fn());
const getMyAccess = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: '' }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace, push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(search.value),
}));
vi.mock('@/services/api/student.api', () => ({ studentService: { getDashboardStats, getMyAccess } }));
vi.mock('@/components/dashboard/student-dashboard', () => ({ StudentDashboard: () => <p>student dashboard</p> }));
vi.mock('@/components/layout/header', () => ({ Header: () => null }));

import StudentPage from '../page';

const access = (over: Record<string, unknown> = {}) => ({ fullAccess: false, bundleIds: [], courses: [], grants: [], ...over });

afterEach(() => { cleanup(); vi.clearAllMocks(); search.value = ''; });

describe('/student workspace gate', () => {
    test('lets in a student whose access comes from a bundle or full access, even when the stats count none', async () => {
        getDashboardStats.mockResolvedValue({ enrolledCourses: 0 });
        getMyAccess.mockResolvedValue(access({ fullAccess: true }));
        render(<StudentPage />);
        expect(await screen.findByText('student dashboard')).toBeTruthy();
        expect(replace).not.toHaveBeenCalled();
    });

    test('lets in an enrolled student even if the access check fails', async () => {
        getDashboardStats.mockResolvedValue({ enrolledCourses: 2 });
        getMyAccess.mockRejectedValue(new Error('network'));
        render(<StudentPage />);
        expect(await screen.findByText('student dashboard')).toBeTruthy();
    });

    test('sends a student with no courses to the catalogue', async () => {
        getDashboardStats.mockResolvedValue({ enrolledCourses: 0 });
        getMyAccess.mockResolvedValue(access());
        render(<StudentPage />);
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/student/courses'));
        expect(screen.queryByText('student dashboard')).toBeNull();
    });

    test('right after payment the student is let in without waiting for access', async () => {
        search.value = 'success=true';
        render(<StudentPage />);
        expect(await screen.findByText('student dashboard')).toBeTruthy();
        expect(getDashboardStats).not.toHaveBeenCalled();
    });
});
