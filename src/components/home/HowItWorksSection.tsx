"use client";

import { MousePointerClick, BookOpen, FlaskConical, Briefcase } from 'lucide-react';

const steps = [
    {
        step: '01',
        icon: MousePointerClick,
        title: 'Choose Your Track',
        description: 'Select the learning path that matches your goals — from Data Structures to Full Stack, AI, or our complete career roadmap.',
    },
    {
        step: '02',
        icon: BookOpen,
        title: 'Learn from Experts',
        description: 'Attend live sessions and access recorded content taught by mentors with 20+ years of real-world industry experience.',
    },
    {
        step: '03',
        icon: FlaskConical,
        title: 'Practice & Build',
        description: 'Reinforce your knowledge with hands-on projects, coding assessments, and regular mock interviews to sharpen your skills.',
    },
    {
        step: '04',
        icon: Briefcase,
        title: 'Launch Your Career',
        description: "Get placement support, referrals, and direct connections to top companies. We're with you until you land the offer.",
    },
];

export function HowItWorksSection() {
    return (
        <section className="py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        The Process
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        A clear, proven journey from learner to employed engineer — in four straightforward steps.
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connector line (desktop) */}
                    <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+32px)] right-[calc(12.5%+32px)] h-px bg-gradient-to-r from-transparent via-blue-200 dark:via-blue-800/60 to-transparent" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <div key={i} className="relative flex flex-col items-center text-center">
                                    {/* Step number + icon */}
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-900/60 rounded-2xl flex items-center justify-center shadow-sm relative z-10">
                                            <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-black text-white z-20">
                                            {i + 1}
                                        </span>
                                    </div>

                                    {/* Step label */}
                                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                                        {step.step}
                                    </span>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                        {step.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[220px]">
                                        {step.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
