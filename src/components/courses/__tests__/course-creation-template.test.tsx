import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/services/api/courseGroupService', () => ({ courseGroupService: { getAllGroups: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/services/api/course.api', () => ({ courseService: { create: vi.fn(), update: vi.fn(), getCourseById: vi.fn() } }));
vi.mock('@/services/api/problem-course.api', () => ({ problemCourseService: {} }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../CourseProcessingPanel', () => ({ CourseProcessingPanel: () => <div>Document processing panel</div> }));

import { CourseCreation } from '../course-creation';

afterEach(cleanup);

function fillDetails() {
    fireEvent.change(screen.getByPlaceholderText('e.g., React Fundamentals'), { target: { value: 'React Prep' } });
    fireEvent.change(screen.getByPlaceholderText('Describe what students will learn'), { target: { value: 'desc' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 999'), { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('https://images.unsplash.com/...'), { target: { value: 'https://x.dev/a.png' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 8'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: Add Content' }));
}

describe('Course creation — Structured Course template', () => {
    test('offers the template and shows document processing AND the question import', () => {
        render(<CourseCreation />);
        fireEvent.click(screen.getByRole('button', { name: /Structured Course/ }));
        fillDetails();
        expect(screen.getByText('Document processing panel')).toBeTruthy();
        expect(screen.getByText(/Import questions & assignments/)).toBeTruthy();
    });

    test('other templates do not show the question import', () => {
        render(<CourseCreation />);
        fireEvent.click(screen.getByRole('button', { name: /Text and Video/ }));
        fillDetails();
        expect(screen.getByText('Document processing panel')).toBeTruthy();
        expect(screen.queryByText(/Import questions & assignments/)).toBeNull();
    });
});
