import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BundleCard, nextBundleCourse, type BundleItem } from '../bundle-card';

afterEach(cleanup);

const bundle = (courses: BundleItem['courses']): BundleItem => ({ id: 'b1', name: 'Web & AI', progress: 6, courses });
const html = { id: 'c-html', title: 'HTML,CSS,GIT', progress: 0, completedSections: 0, totalSections: 12, status: 'not-started' };
const react = { id: 'c-react', title: 'React', progress: 11, completedSections: 2, totalSections: 18, status: 'in-progress' };

describe('nextBundleCourse', () => {
    test('prefers the first in-progress course, then the first unfinished one', () => {
        expect(nextBundleCourse([html, react])?.id).toBe('c-react');
        expect(nextBundleCourse([{ ...html, status: 'completed' }, { ...react, status: 'not-started' }])?.id).toBe('c-react');
        expect(nextBundleCourse([{ ...html, status: 'completed' }])).toBeNull();
        expect(nextBundleCourse([])).toBeNull();
    });
});

describe('BundleCard', () => {
    test('lists courses in the given order with numbered steps and the next one marked', () => {
        render(<BundleCard bundle={bundle([html, react])} collapsed={false} onToggle={vi.fn()} onOpenCourse={vi.fn()} />);
        const items = within(screen.getByRole('list')).getAllByRole('listitem');
        expect(items.map(li => li.textContent)).toEqual([
            expect.stringContaining('HTML,CSS,GIT'),
            expect.stringContaining('React'),
        ]);
        expect(items[1].textContent).toContain('Up next');
        expect(items[0].textContent).toContain('0 / 12 lessons');
        expect(screen.getByText('2 courses · 0 completed')).toBeTruthy();
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('6');
    });

    test('continue button and rows open the right course', () => {
        const open = vi.fn();
        render(<BundleCard bundle={bundle([html, react])} collapsed={false} onToggle={vi.fn()} onOpenCourse={open} />);
        fireEvent.click(screen.getByRole('button', { name: /Continue: React/ }));
        expect(open).toHaveBeenLastCalledWith('c-react');
        fireEvent.click(screen.getByRole('button', { name: /HTML,CSS,GIT/ }));
        expect(open).toHaveBeenLastCalledWith('c-html');
    });

    test('collapsing hides the list and reports state accessibly', () => {
        const toggle = vi.fn();
        render(<BundleCard bundle={bundle([html])} collapsed onToggle={toggle} onOpenCourse={vi.fn()} />);
        expect(screen.queryByRole('list')).toBeNull();
        const btn = screen.getByRole('button', { name: /Show courses/ });
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(btn);
        expect(toggle).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /Start: HTML,CSS,GIT/ })).toBeTruthy();
    });

    test('shows a completed state when every course is done', () => {
        render(<BundleCard bundle={bundle([{ ...html, status: 'completed', progress: 100 }])} collapsed={false} onToggle={vi.fn()} onOpenCourse={vi.fn()} />);
        expect(screen.getByText('Bundle completed')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Continue|Start:/ })).toBeNull();
    });
});
