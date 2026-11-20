"use client";

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { BookOpenCheck, CreditCard, LineChart, Search, Trophy, UserPlus } from 'lucide-react';
import { SectionHeading } from '@/components/catalog/ui';

const steps = [
    { icon: UserPlus, title: 'Create your account', description: 'Sign up free in under a minute — or continue with Google from the login page.' },
    { icon: Search, title: 'Explore the courses', description: 'Browse every course and bundle and read the full curriculum.' },
    { icon: CreditCard, title: 'Enroll securely', description: 'Pay with Razorpay — apply a coupon if you have one. Access is instant.' },
    { icon: BookOpenCheck, title: 'Learn module by module', description: 'Lessons, videos and notes in a clear, structured order.' },
    { icon: Trophy, title: 'Practise and get assessed', description: 'Problems, assignments and assessments test what you learned.' },
    { icon: LineChart, title: 'Track your progress', description: 'See your progress on every course and pick up where you left off.' },
];

/** Section 7 — the student journey: horizontal timeline on desktop, vertical on mobile. */
export function HowItWorksSection() {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLOListElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 60%'] });
    const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

    return (
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-24 bg-white dark:bg-gray-950 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeading id="how-title" align="center" eyebrow="How it works" title="From sign-up to skilled, in six steps" />

                <ol ref={ref} className="relative grid gap-8 lg:grid-cols-6 lg:gap-4">
                    {/* Track + animated fill */}
                    <div className="absolute left-[23px] top-2 bottom-2 w-0.5 lg:left-[8%] lg:right-[8%] lg:top-[23px] lg:bottom-auto lg:w-auto lg:h-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-blue-600 to-fuchsia-500 origin-top lg:origin-left"
                            style={reduce ? undefined : { scaleY: progress, scaleX: progress }}
                        />
                    </div>
                    {steps.map((s, i) => (
                        <motion.li
                            key={s.title}
                            className="relative flex lg:flex-col items-start lg:items-center gap-5 lg:gap-4 lg:text-center"
                            initial={reduce ? false : { opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                        >
                            <span className="relative z-10 w-12 h-12 rounded-2xl bg-white dark:bg-gray-950 border-2 border-blue-500/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-900/10 shrink-0">
                                <s.icon className="w-5 h-5" aria-hidden="true" />
                            </span>
                            <div className="pt-1 lg:pt-0">
                                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Step {i + 1}</p>
                                <h3 className="mt-1 font-bold text-gray-900 dark:text-white">{s.title}</h3>
                                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.description}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
