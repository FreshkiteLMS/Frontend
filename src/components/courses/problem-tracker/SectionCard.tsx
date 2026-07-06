import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { TrackerSection, ProblemStatus } from '@/types/problem-course';
import { getSectionIcon } from './sectionIcons';
import { sectionStats } from './stats';
import { ProblemList } from './ProblemList';

interface SectionCardProps {
    section: TrackerSection;
    expanded: boolean;
    onToggle: (sectionId: string) => void;
    busyId: string | null;
    onStatusChange: (problemId: string, status: ProblemStatus) => void;
}

function SectionCardInner({ section, expanded, onToggle, busyId, onStatusChange }: SectionCardProps) {
    const Icon = getSectionIcon(section.icon);
    const stats = useMemo(() => sectionStats(section), [section]);
    const complete = stats.total > 0 && stats.solved === stats.total;

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            {/* Header (always visible, click to expand) */}
            <button
                type="button"
                onClick={() => onToggle(section.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:gap-4 sm:px-5 dark:hover:bg-slate-800/40"
            >
                <span
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                        complete
                            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400'
                            : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">{section.title}</h3>
                        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                            {stats.total}
                        </span>
                    </div>

                    {/* progress bar */}
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                            <motion.div
                                className={`h-full rounded-full ${complete ? 'bg-green-500' : 'bg-blue-500'}`}
                                initial={false}
                                animate={{ width: `${stats.percentage}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                        <span className="flex-shrink-0 text-xs font-medium tabular-nums text-gray-500 dark:text-slate-400">
                            {stats.solved}/{stats.total}
                        </span>
                        <span className="hidden w-9 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700 sm:block dark:text-slate-300">
                            {stats.percentage}%
                        </span>
                    </div>
                </div>

                <motion.span
                    className="flex-shrink-0 text-gray-400 dark:text-slate-500"
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.span>
            </button>

            {/* Body — lazily mounted only while expanded */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-gray-100 dark:border-slate-800"
                    >
                        <ProblemList problems={section.problems} busyId={busyId} onStatusChange={onStatusChange} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export const SectionCard = memo(SectionCardInner);
