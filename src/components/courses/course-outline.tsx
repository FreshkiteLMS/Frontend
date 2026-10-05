'use client';

import type { Course, CourseSection } from '@/types/course';
import type { ContentBlockType, Lesson, StructuredCourse } from '@/types/structured-course';
import type { Heading } from './TableOfContents';
import { LessonContent } from './structured/ContentBlockRenderer';
import { blockAnchorId } from './structured/blocks/text';
import { LegacySectionRenderer, extractLegacyHeadings, normalizeLegacySection } from './legacy/LegacySectionRenderer';

/**
 * One navigable unit of a course, whichever format it is stored in:
 *   - structured: a lesson of `structured_content` (AI-processed courses)
 *   - legacy: a section of a course created before AI structuring
 * Its `id` is what student progress is recorded against.
 */
export type OutlineLesson =
    | { kind: 'structured'; id: string; title: string; moduleId: string; lesson: Lesson }
    | { kind: 'legacy'; id: string; title: string; moduleId: string; section: CourseSection };

export interface OutlineModule {
    id: string;
    /** Empty for the single implicit module of a legacy course. */
    title: string;
    description: string;
    lessons: OutlineLesson[];
}

export interface CourseOutline {
    format: 'structured' | 'legacy';
    structured: StructuredCourse | null;
    modules: OutlineModule[];
    /** All lessons in reading order. */
    lessons: OutlineLesson[];
}

const LEGACY_MODULE_ID = 'legacy';

export function buildCourseOutline(course: Pick<Course, 'sections' | 'structured_content'>): CourseOutline {
    const structured = course.structured_content;
    if (structured?.modules?.length) {
        const modules: OutlineModule[] = structured.modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            lessons: m.lessons.map((lesson) => ({ kind: 'structured', id: lesson.id, title: lesson.title, moduleId: m.id, lesson })),
        }));
        return { format: 'structured', structured, modules, lessons: modules.flatMap((m) => m.lessons) };
    }

    const lessons: OutlineLesson[] = (course.sections || []).map((section) => ({
        kind: 'legacy', id: section.id, title: section.title, moduleId: LEGACY_MODULE_ID, section,
    }));
    return {
        format: 'legacy',
        structured: null,
        modules: lessons.length ? [{ id: LEGACY_MODULE_ID, title: '', description: '', lessons }] : [],
        lessons,
    };
}

/** Table-of-contents entries for a lesson (its in-lesson headings). */
export function lessonHeadings(item: OutlineLesson | null | undefined): Heading[] {
    if (!item) return [];
    if (item.kind === 'legacy') return extractLegacyHeadings(item.section.content || '');
    return item.lesson.content.flatMap((b) =>
        b.type === 'heading' ? [{ id: blockAnchorId(b.id), text: b.text, level: b.level }] : []
    );
}

/** Count lesson content of a given kind (videos, exercises, …) across the outline. */
export function countContent(outline: CourseOutline, kind: 'video' | 'exercise'): number {
    if (outline.format === 'structured') {
        const types: ContentBlockType[] = kind === 'video' ? ['video'] : ['exercise'];
        return outline.lessons.reduce(
            (n, l) => n + (l.kind === 'structured' ? l.lesson.content.filter((b) => types.includes(b.type)).length : 0), 0
        );
    }
    return outline.lessons.reduce((n, l) => {
        if (l.kind !== 'legacy') return n;
        const s = normalizeLegacySection(l.section);
        return n + (kind === 'video' ? s.videos.length : s.assignments.length);
    }, 0);
}

/** Renders the body of one lesson with the renderer for its storage format. */
export function LessonBody({ item }: { item: OutlineLesson }) {
    if (item.kind === 'legacy') {
        return <div className="max-w-5xl"><LegacySectionRenderer section={item.section} /></div>;
    }
    return (
        <>
            {item.lesson.description && (
                <p className="max-w-[75ch] text-[18px] text-gray-600 dark:text-gray-400 leading-[1.75] mb-8">{item.lesson.description}</p>
            )}
            <LessonContent lesson={item.lesson} />
        </>
    );
}
