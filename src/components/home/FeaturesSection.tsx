"use client";

import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Brain, Calculator, CalendarClock, FileCheck2, Layers, MessagesSquare, Mic, PlayCircle } from 'lucide-react';
import type { CatalogStats } from '@/types/catalog';
import { Reveal, SectionHeading } from '@/components/catalog/ui';

interface Feature { icon: typeof Layers; title: string; description: string; accent: string }

/**
 * Section 6 — platform capabilities. Each one exists in the app; the
 * content-dependent ones only appear while published courses actually use them.
 */
export function platformFeatures(stats: CatalogStats | null): Feature[] {
    const s = stats;
    return [
        s && s.modules > 0 && { icon: Layers, title: 'Structured learning paths', description: 'Courses are organised into modules and lessons, so you always know what comes next and how far you’ve come.', accent: 'from-blue-500 to-indigo-500' },
        { icon: PlayCircle, title: 'Video lessons, in the LMS', description: 'Lesson and solution videos play inside the platform, right next to the notes they explain.', accent: 'from-sky-500 to-blue-500' },
        s && s.problems > 0 && { icon: Brain, title: 'Guided problem solving', description: 'Work through curated coding problems by topic and difficulty, track your status, and explain your approach for scored feedback.', accent: 'from-violet-500 to-fuchsia-500' },
        s && s.audioQuestions > 0 && { icon: Mic, title: 'Speaking practice with AI feedback', description: 'Record spoken answers to interview-style questions and get an AI-scored report on your answer.', accent: 'from-fuchsia-500 to-rose-500' },
        s && s.aptitudeQuestions > 0 && { icon: Calculator, title: 'Aptitude practice', description: 'Topic-wise aptitude questions with instant checking, so you can find and fix weak areas.', accent: 'from-emerald-500 to-teal-500' },
        s && s.assignments > 0 && { icon: FileCheck2, title: 'Assignments', description: 'Hands-on assignments inside courses turn what you read into something you’ve built.', accent: 'from-amber-500 to-orange-500' },
        { icon: BarChart3, title: 'Progress tracking', description: 'Your dashboard shows progress for every course and bundle, and where to pick up next.', accent: 'from-indigo-500 to-violet-500' },
        { icon: CalendarClock, title: 'Live sessions with your batch', description: 'Scheduled meetings with mentors and your batch, with reminders, right inside the platform.', accent: 'from-cyan-500 to-sky-500' },
        { icon: MessagesSquare, title: 'Doubt channels & chat', description: 'Ask doubts, discuss with peers and message mentors without leaving the LMS.', accent: 'from-rose-500 to-pink-500' },
    ].filter(Boolean) as Feature[];
}

export function FeaturesSection({ stats }: { stats: CatalogStats | null }) {
    const reduce = useReducedMotion();
    const features = platformFeatures(stats);
    return (
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-20 sm:py-24 bg-gray-50 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading
                    id="features-title"
                    align="center"
                    eyebrow="Why learn with us"
                    title={<>Everything you need to <span className="text-blue-600 dark:text-blue-400">learn by doing</span></>}
                    description="Not just videos to watch — a platform built around practice, feedback and steady progress."
                />
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <Reveal as="li" key={f.title} delay={(i % 3) * 0.07}>
                            <motion.div
                                whileHover={reduce ? undefined : { y: -4 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                className="group h-full rounded-2xl bg-white dark:bg-gray-950 border border-gray-200/80 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xl hover:shadow-gray-900/5 transition-[border-color,box-shadow]"
                            >
                                <span className={`relative inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br ${f.accent} items-center justify-center shadow-lg shadow-gray-900/10`}>
                                    <f.icon className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none" aria-hidden="true" />
                                </span>
                                <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">{f.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.description}</p>
                            </motion.div>
                        </Reveal>
                    ))}
                </ul>
            </div>
        </section>
    );
}
