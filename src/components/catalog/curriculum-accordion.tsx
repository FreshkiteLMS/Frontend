"use client";

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, CircleDot, FileQuestion, PlayCircle, Puzzle } from 'lucide-react';
import type { CatalogKind, CatalogUnit, CurriculumModule } from '@/types/catalog';
import { moduleWord, unitLabel } from '@/lib/catalog';
import { Pill } from './ui';

const LESSON_PREVIEW = 8;

const lessonIcon = (unit: CatalogUnit) => (unit === 'problems' ? Puzzle : unit === 'questions' ? FileQuestion : PlayCircle);
const problemTone = (d?: string) => (d === 'Easy' ? 'green' : d === 'Medium' ? 'amber' : d === 'Hard' ? 'red' : 'gray');

function ModuleItem({ module, index, unit, kind, defaultOpen }: { module: CurriculumModule; index: number; unit: CatalogUnit; kind: CatalogKind; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const [showAll, setShowAll] = useState(false);
    const reduce = useReducedMotion();
    const panelId = useId();
    const Icon = lessonIcon(unit);
    const lessons = showAll ? module.lessons : module.lessons.slice(0, LESSON_PREVIEW);
    const label = kind === 'problems' ? 'Section' : kind === 'aptitude' ? 'Topic' : 'Module';

    return (
        <li className={`rounded-2xl border transition-colors ${open ? 'border-blue-200 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
            <h4>
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${open ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label} {index + 1}</span>
                        <span className="block font-bold text-gray-900 dark:text-white leading-snug">{module.title}</span>
                    </span>
                    <span className="hidden sm:inline text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{unitLabel(unit, module.lessonCount)}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
            </h4>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={panelId}
                        key="panel"
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 sm:px-5 pb-4 sm:pl-[4.25rem]">
                            {module.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">{module.description}</p>}
                            <p className="sm:hidden text-xs font-semibold text-gray-500 mb-2">{unitLabel(unit, module.lessonCount)}</p>
                            {module.lessons.length > 0 ? (
                                <ol className="space-y-1">
                                    {lessons.map((l, i) => (
                                        <li key={`${l.id}-${i}`} className="flex items-center gap-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                                            <Icon className="w-4 h-4 text-blue-500/80 shrink-0" aria-hidden="true" />
                                            <span className="flex-1 min-w-0">{l.title}</span>
                                            {l.difficulty && <Pill tone={problemTone(l.difficulty)}>{l.difficulty}</Pill>}
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <CircleDot className="w-4 h-4" aria-hidden="true" />
                                    {unit === 'questions' ? `${unitLabel(unit, module.lessonCount)} to practise` : 'Details coming soon'}
                                </p>
                            )}
                            {module.lessons.length > LESSON_PREVIEW && (
                                <button type="button" onClick={() => setShowAll(s => !s)} className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                    {showAll ? 'Show fewer' : `Show all ${module.lessons.length}`}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
}

/**
 * The course's real module → lesson outline, from the catalog API. Lessons are
 * only rendered for expanded modules; long outlines start as a preview.
 */
export function CurriculumAccordion({ modules, unit, kind, previewModules = 6, openFirst = true }: {
    modules: CurriculumModule[];
    unit: CatalogUnit;
    kind: CatalogKind;
    previewModules?: number;
    openFirst?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    if (!modules.length) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">The curriculum for this course is being prepared.</p>;
    }
    const visible = expanded ? modules : modules.slice(0, previewModules);
    const total = modules.reduce((s, m) => s + m.lessonCount, 0);

    return (
        <div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {modules.length} {moduleWord(kind, modules.length)} · {unitLabel(unit, total)}
            </p>
            <ol className="space-y-3">
                {visible.map((m, i) => (
                    <ModuleItem key={`${m.id}-${i}`} module={m} index={i} unit={unit} kind={kind} defaultOpen={openFirst && i === 0} />
                ))}
            </ol>
            {modules.length > previewModules && (
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="mt-4 w-full h-11 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                    {expanded ? 'Show less' : `View complete curriculum (${modules.length} ${moduleWord(kind, modules.length)})`}
                </button>
            )}
        </div>
    );
}
