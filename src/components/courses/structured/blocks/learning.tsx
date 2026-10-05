'use client';

import { memo, useId, useState } from 'react';
import { BookMarked, CheckCircle2, ChevronDown, ClipboardList, FlaskConical, HelpCircle, ListChecks } from 'lucide-react';
import type { BlockOf } from '@/types/structured-course';

export const ExampleBlockView = memo(function ExampleBlockView({ block }: { block: BlockOf<'example'> }) {
    return (
        <section className="my-7 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20 px-5 py-4">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 mb-1.5">
                <FlaskConical className="w-4 h-4" aria-hidden="true" />
                {block.title || 'Example'}
            </p>
            <p className="text-[16px] text-gray-800 dark:text-gray-200 leading-[1.8] whitespace-pre-line">{block.text}</p>
        </section>
    );
});

export const DefinitionBlockView = memo(function DefinitionBlockView({ block }: { block: BlockOf<'definition'> }) {
    return (
        <dl className="my-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-5 py-4">
            <dt className="flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-white">
                <BookMarked className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                {block.term}
            </dt>
            <dd className="mt-1.5 text-[16px] text-gray-700 dark:text-gray-300 leading-[1.75] whitespace-pre-line">{block.definition}</dd>
        </dl>
    );
});

const DIFFICULTY_STYLES = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
} as const;

export const ExerciseBlockView = memo(function ExerciseBlockView({ block }: { block: BlockOf<'exercise'> }) {
    return (
        <section className="my-8 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/15 p-5 sm:p-6">
            <header className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                </span>
                <h4 className="text-[16px] font-bold text-gray-900 dark:text-white">{block.title || 'Exercise'}</h4>
                {block.difficulty && (
                    <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${DIFFICULTY_STYLES[block.difficulty]}`}>
                        {block.difficulty}
                    </span>
                )}
            </header>
            <p className="text-[16px] text-gray-800 dark:text-gray-200 leading-[1.8] whitespace-pre-line">{block.instructions}</p>
        </section>
    );
});

export const QuestionBlockView = memo(function QuestionBlockView({ block }: { block: BlockOf<'question'> }) {
    return (
        <section className="my-7 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-white dark:bg-gray-900/40 px-5 py-4">
            <p className="flex items-start gap-2.5 text-[16px] font-semibold text-gray-900 dark:text-white leading-[1.7]">
                <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="whitespace-pre-line">{block.question}</span>
            </p>
            {block.options.length > 0 && (
                <ol className="mt-3 ml-7 space-y-2">
                    {block.options.map((option, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[15px] text-gray-700 dark:text-gray-300">
                            <span className="flex-shrink-0 w-6 h-6 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-semibold flex items-center justify-center">
                                {String.fromCharCode(65 + i)}
                            </span>
                            <span className="pt-0.5">{option}</span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
});

/** Answers start hidden so students can attempt the preceding question first. */
export const AnswerBlockView = memo(function AnswerBlockView({ block }: { block: BlockOf<'answer'> }) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    return (
        <div className="-mt-4 mb-7">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                {open ? 'Hide answer' : 'Show answer'}
            </button>
            <div id={panelId} hidden={!open} className="mt-2 flex gap-2.5 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" aria-hidden="true" />
                <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-[1.75] whitespace-pre-line">{block.text}</p>
            </div>
        </div>
    );
});

export const SummaryBlockView = memo(function SummaryBlockView({ block }: { block: BlockOf<'summary'> }) {
    return (
        <section className="my-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-5 sm:p-6">
            <h4 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                <ListChecks className="w-4 h-4" aria-hidden="true" />
                Key takeaways
            </h4>
            {block.text && <p className="text-[16px] text-gray-700 dark:text-gray-300 leading-[1.8] whitespace-pre-line mb-3">{block.text}</p>}
            {block.points.length > 0 && (
                <ul className="space-y-2">
                    {block.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[15.5px] text-gray-800 dark:text-gray-200 leading-[1.7]">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" aria-hidden="true" />
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
});
