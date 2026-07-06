import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target } from 'lucide-react';
import type { CourseStats } from './stats';

function StatCard({
    label,
    value,
    sub,
    accent,
    children,
}: {
    label: string;
    value: string;
    sub?: string;
    accent: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">{label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums dark:text-slate-100">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
            {children}
        </div>
    );
}

/** Mini solved/total bar used by the difficulty cards. */
function MiniBar({ solved, total, color }: { solved: number; total: number; color: string }) {
    const pct = total ? Math.round((solved / total) * 100) : 0;
    return (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
            <motion.div
                className={`h-full rounded-full ${color}`}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            />
        </div>
    );
}

export const StatsDashboard = memo(function StatsDashboard({ stats }: { stats: CourseStats }) {
    const { total, solved, remaining, percentage, byDifficulty, accuracy, passed, failed } = stats;

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {/* Total solved */}
            <StatCard
                label="Total Solved"
                value={`${solved}`}
                sub={`${remaining} remaining · ${total} total`}
                accent="bg-blue-500"
            >
                <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                        <motion.div
                            className="h-full rounded-full bg-blue-500"
                            initial={false}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-blue-500 tabular-nums dark:text-blue-400">{percentage}%</span>
                </div>
            </StatCard>

            {/* Difficulty breakdown */}
            <StatCard label="Easy" value={`${byDifficulty.Easy.solved}/${byDifficulty.Easy.total}`} accent="bg-green-500">
                <MiniBar solved={byDifficulty.Easy.solved} total={byDifficulty.Easy.total} color="bg-green-500" />
            </StatCard>
            <StatCard label="Medium" value={`${byDifficulty.Medium.solved}/${byDifficulty.Medium.total}`} accent="bg-amber-500">
                <MiniBar solved={byDifficulty.Medium.solved} total={byDifficulty.Medium.total} color="bg-amber-500" />
            </StatCard>
            <StatCard label="Hard" value={`${byDifficulty.Hard.solved}/${byDifficulty.Hard.total}`} accent="bg-red-500">
                <MiniBar solved={byDifficulty.Hard.solved} total={byDifficulty.Hard.total} color="bg-red-500" />
            </StatCard>

            {/* Accuracy */}
            <StatCard
                label="Accuracy"
                value={`${accuracy}%`}
                sub={passed + failed > 0 ? `${passed} pass · ${failed} fail` : 'no attempts yet'}
                accent="bg-purple-500"
            >
                <div className="mt-2 flex items-center gap-1.5 text-purple-500 dark:text-purple-400">
                    {accuracy >= 50 ? <Trophy className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    <span className="text-xs text-gray-400 dark:text-slate-500">pass rate</span>
                </div>
            </StatCard>
        </div>
    );
});
