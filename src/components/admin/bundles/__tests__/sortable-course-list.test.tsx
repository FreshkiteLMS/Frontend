import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { SortableCourseList, type SortableCourse } from '../sortable-course-list';

afterEach(cleanup);

const start: SortableCourse[] = [
    { _id: 'a', title: 'Java Fundamentals' },
    { _id: 'b', title: 'OOP Concepts' },
    { _id: 'c', title: 'Collections', status: 'inactive' },
];

function Harness() {
    const [items, setItems] = useState(start);
    return <SortableCourseList items={items} onChange={setItems} onRemove={(id) => setItems((xs) => xs.filter((x) => x._id !== id))} />;
}

const titles = () => within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent?.replace(/^\d+/, ''));

describe('SortableCourseList', () => {
    test('move-up / move-down buttons reorder and announce the change', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Move Collections up' }));
        expect(titles()[1]).toContain('Collections');
        expect(screen.getByText(/Collections moved to position 2 of 3/)).toBeTruthy();
        expect((screen.getByRole('button', { name: 'Move Java Fundamentals up' }) as HTMLButtonElement).disabled).toBe(true);
    });

    test('the drag handle moves a course with the arrow keys', () => {
        render(<Harness />);
        const handle = screen.getByRole('button', { name: /Reorder Java Fundamentals/ });
        fireEvent.keyDown(handle, { key: 'ArrowDown' });
        expect(titles()[0]).toContain('OOP Concepts');
        expect(titles()[1]).toContain('Java Fundamentals');
    });

    test('removing a course drops only that course and drafts are flagged', () => {
        render(<Harness />);
        expect(screen.getByText(/Draft — hidden from students/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Remove OOP Concepts from the bundle' }));
        expect(titles()).toHaveLength(2);
        expect(titles().join()).not.toContain('OOP');
    });
});
