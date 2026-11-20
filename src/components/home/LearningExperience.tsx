"use client";

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Brain, Check, Circle, Mic, PlayCircle, Square } from 'lucide-react';
import type { CatalogStats } from '@/types/catalog';
import { Reveal, SectionHeading } from '@/components/catalog/ui';

/* Simplified renderings of real screens (lesson view, problem tracker, speaking
   practice, dashboard). Labelled as previews; they show how the features work,
   not anyone's real data. */

function LessonPreview() {
    return (
        <div className="grid grid-cols-[150px_1fr] h-full">
            <div className="border-r border-gray-100 dark:border-gray-800 p-3 space-y-1.5 bg-gray-50/70 dark:bg-gray-900/60">
                {['Module 1', 'Module 2', 'Module 3'].map((m, i) => (
                    <div key={m}>
                        <p className={`text-[10px] font-black uppercase tracking-wider ${i === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{m}</p>
                        {i === 1 && [0, 1, 2].map(l => (
                            <div key={l} className={`mt-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 ${l === 1 ? 'bg-blue-100/80 dark:bg-blue-900/40' : ''}`}>
                                {l === 0 ? <Check className="w-3 h-3 text-emerald-500" /> : <Circle className="w-3 h-3 text-gray-300" />}
                                <span className="h-1.5 flex-1 rounded bg-gray-300/80 dark:bg-gray-700" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="p-4 space-y-3">
                <div className="h-3 w-2/3 rounded bg-gray-800/80 dark:bg-gray-200/80" />
                <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-800 to-indigo-900 flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white/90" />
                </div>
                {[90, 75, 82].map(w => <div key={w} className="h-2 rounded bg-gray-200 dark:bg-gray-800" style={{ width: `${w}%` }} />)}
            </div>
        </div>
    );
}

function ProblemsPreview() {
    const rows = [
        { d: 'Easy', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', s: 'Completed', st: 'text-emerald-600' },
        { d: 'Medium', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', s: 'In progress', st: 'text-blue-600' },
        { d: 'Medium', tone: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', s: 'Not started', st: 'text-gray-400' },
        { d: 'Hard', tone: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30', s: 'Not started', st: 'text-gray-400' },
    ];
    return (
        <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-28 rounded bg-gray-800/80 dark:bg-gray-200/80" />
                <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full w-1/4 bg-emerald-500" /></div>
            </div>
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5">
                    <Brain className="w-4 h-4 text-violet-500 shrink-0" />
                    <span className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800" />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.tone}`}>{r.d}</span>
                    <span className={`text-[10px] font-bold w-16 text-right ${r.st}`}>{r.s}</span>
                </div>
            ))}
        </div>
    );
}

function SpeakingPreview() {
    const reduce = useReducedMotion();
    const bars = [6, 14, 22, 12, 28, 18, 30, 10, 24, 16, 26, 8, 20, 14, 28, 12, 18, 24, 10, 16];
    return (
        <div className="p-5 flex flex-col h-full">
            <div className="h-3 w-3/4 rounded bg-gray-800/80 dark:bg-gray-200/80" />
            <div className="mt-2 h-2 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 flex items-center justify-center gap-1 my-4" aria-hidden="true">
                {bars.map((h, i) => (
                    <motion.span
                        key={i}
                        className="w-1.5 rounded-full bg-gradient-to-t from-fuchsia-500 to-violet-500"
                        style={{ height: h }}
                        animate={reduce ? undefined : { scaleY: [1, 0.4, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.05, ease: 'easeInOut' }}
                    />
                ))}
            </div>
            <div className="flex items-center justify-center gap-3">
                <span className="w-11 h-11 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30"><Square className="w-4 h-4 text-white fill-white" /></span>
                <span className="text-xs font-semibold text-gray-500">Recording your answer…</span>
            </div>
        </div>
    );
}

function ProgressPreview() {
    return (
        <div className="p-5 space-y-4">
            {[72, 45, 20].map((p, i) => (
                <div key={p} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="h-2.5 rounded bg-gray-300 dark:bg-gray-700" style={{ width: `${55 - i * 10}%` }} />
                        <span className="text-[10px] font-bold text-gray-400">{i === 0 ? 'Continue' : i === 1 ? 'Resume' : 'Start'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${p}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Section 8 — how learning works on the platform, as simplified previews of the real screens. */
export function LearningExperience({ stats }: { stats: CatalogStats | null }) {
    const tabs = [
        { key: 'lessons', icon: PlayCircle, label: 'Lessons & video', title: 'Read, watch, then move on', text: 'Each lesson sits in its module with notes and in-platform video, and the outline shows what you’ve finished.', view: <LessonPreview /> },
        stats && stats.problems > 0 && { key: 'problems', icon: Brain, label: 'Problem solving', title: 'Practise problem by problem', text: 'Problems are grouped by topic with a difficulty level. Mark your status as you go and watch the section fill up.', view: <ProblemsPreview /> },
        stats && stats.audioQuestions > 0 && { key: 'speaking', icon: Mic, label: 'Speaking practice', title: 'Answer out loud, get feedback', text: 'Record your answer to a question in the browser and receive a scored report you can learn from.', view: <SpeakingPreview /> },
        { key: 'progress', icon: BarChart3, label: 'Progress', title: 'Always know where you are', text: 'Your dashboard tracks every course and bundle and points you to the next thing to do.', view: <ProgressPreview /> },
    ].filter(Boolean) as { key: string; icon: typeof Mic; label: string; title: string; text: string; view: React.ReactNode }[];
    const [active, setActive] = useState(tabs[0].key);
    const tab = tabs.find(t => t.key === active) ?? tabs[0];
    const reduce = useReducedMotion();

    return (
        <section id="experience" aria-labelledby="experience-title" className="scroll-mt-20 py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading id="experience-title" eyebrow="The learning experience" title={<>Built for <span className="text-blue-600 dark:text-blue-400">practice</span>, not just watching</>} />
                <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 lg:gap-14 items-center">
                    <div>
                        <div role="tablist" aria-label="Learning features" className="grid grid-cols-2 gap-2">
                            {tabs.map(t => {
                                const on = t.key === tab.key;
                                return (
                                    <button
                                        key={t.key}
                                        role="tab"
                                        type="button"
                                        aria-selected={on}
                                        aria-controls="experience-panel"
                                        onClick={() => setActive(t.key)}
                                        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-left border transition-all ${on ? 'bg-white dark:bg-gray-950 border-blue-300 dark:border-blue-800 text-gray-900 dark:text-white shadow-md' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-950/60'}`}
                                    >
                                        <t.icon className={`w-4 h-4 shrink-0 ${on ? 'text-blue-600 dark:text-blue-400' : ''}`} aria-hidden="true" /> {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div key={tab.key} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.25 }} className="mt-8">
                                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{tab.title}</h3>
                                <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">{tab.text}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <Reveal>
                        <figure id="experience-panel" role="tabpanel" aria-label={`${tab.label} preview`} className="relative">
                            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-fuchsia-500/15 blur-2xl" aria-hidden="true" />
                            <div className="relative rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl shadow-gray-900/10 overflow-hidden">
                                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800" aria-hidden="true">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div key={tab.key} className="h-[300px]" initial={reduce ? false : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }} aria-hidden="true">
                                        {tab.view}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                            <figcaption className="mt-3 text-center text-xs text-gray-400">Simplified preview of the student workspace</figcaption>
                        </figure>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
