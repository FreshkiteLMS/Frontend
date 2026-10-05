'use client';

import { CheckCircle, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import type { CourseOutline } from '../course-outline';

interface CourseOverviewProps {
    title: string;
    description: string;
    outline: CourseOutline;
    completed: ReadonlySet<string>;
    onOpenLesson: (lessonId: string) => void;
}

/** Landing view of an AI-structured course: what it covers and how it is organised. */
export function CourseOverview({ title, description, outline, completed, onOpenLesson }: CourseOverviewProps) {
    const objectives = outline.structured?.learningObjectives || [];

    return (
        <div>
            <header className="mb-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-500 dark:text-blue-400 mb-3">Course overview</p>
                <h1 className="text-3xl sm:text-[34px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{title}</h1>
                {description && (
                    <p className="mt-4 text-[18px] text-gray-600 dark:text-gray-400 leading-[1.75] whitespace-pre-line">{description}</p>
                )}
            </header>

            {objectives.length > 0 && (
                <section className="mb-12 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/15 p-6">
                    <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-4">
                        <Target className="w-4 h-4" aria-hidden="true" />
                        What you will learn
                    </h2>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {objectives.map((objective, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[15.5px] text-gray-800 dark:text-gray-200 leading-[1.6]">
                                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" aria-hidden="true" />
                                <span>{objective}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section>
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Course content</h2>
                <ol className="space-y-4">
                    {outline.modules.map((module, mi) => {
                        const done = module.lessons.filter((l) => completed.has(l.id)).length;
                        return (
                            <li key={module.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/60">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">
                                            <span className="text-gray-400 dark:text-gray-500 mr-2">{mi + 1}.</span>{module.title}
                                        </h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{done}/{module.lessons.length} lessons</span>
                                    </div>
                                    {module.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{module.description}</p>}
                                </div>
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {module.lessons.map((lesson) => (
                                        <li key={lesson.id}>
                                            <button
                                                type="button"
                                                onClick={() => onOpenLesson(lesson.id)}
                                                className="group w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                                            >
                                                {completed.has(lesson.id)
                                                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-label="Completed" />
                                                    : <span className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0" aria-hidden="true" />}
                                                <span className="flex-1 text-[14.5px] text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{lesson.title}</span>
                                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                </ol>
            </section>
        </div>
    );
}
