"use client";

import Link from 'next/link';
import { ArrowRight, CheckCircle2, BookOpen, Users, Award } from 'lucide-react';

export function HeroSection() {
    return (
        <section className="relative pt-28 pb-24 overflow-hidden bg-white dark:bg-gray-950">
                {/* Subtle ambient gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-50 dark:bg-blue-950/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4 opacity-60" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50 dark:bg-indigo-950/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/4 opacity-40" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 xl:gap-24 items-center">

                        {/* Left: Content */}
                        <div>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-full mb-8">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide">
                                    Expert-Led Tech Education Platform
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-5xl sm:text-6xl lg:text-[66px] font-black tracking-tight text-gray-900 dark:text-white leading-[1.04] mb-6">
                                Build Your Dream
                                <span className="block mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                    Tech Career
                                </span>
                            </h1>

                            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg mb-10">
                                Structured learning paths, elite mentorship from industry veterans with 20+ years of experience, and a proven track record of placing engineers at top tech companies.
                            </p>

                            {/* Feature bullets */}
                            <div className="space-y-3.5 mb-10">
                                {[
                                    '7+ specialized tech learning tracks',
                                    'Mentors from Qualcomm, Amdocs & global tech leaders',
                                    'Proven placements — highest package 57 LPA',
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-wrap gap-3 mb-12">
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="#programs"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:-translate-y-0.5"
                                >
                                    View Programs
                                </Link>
                            </div>

                            {/* Alumni trust */}
                            <div className="flex items-center gap-6 pt-6 border-t border-gray-100 dark:border-gray-800/80">
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
                                        Alumni placed at
                                    </p>
                                    <div className="flex items-center gap-6">
                                        {['Qualcomm', 'Netgear', 'Avasoft'].map((company) => (
                                            <span key={company} className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                                {company}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Dashboard Mockup */}
                        <div className="hidden lg:block relative">
                            <LMSDashboardMockup />
                        </div>
                    </div>
                </div>
            </section>

    );
}

function LMSDashboardMockup() {
    return (
        <div className="relative">
            {/* Ambient glow */}
            <div className="absolute -inset-8 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 dark:from-blue-500/6 dark:to-indigo-500/6 rounded-[40px] blur-3xl" />

            {/* Main card */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">freshkite.com/dashboard</span>
                    </div>
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-black">FK</span>
                    </div>
                </div>

                {/* Dashboard content */}
                <div className="p-4 space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">Welcome back!</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Continue Your Journey</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900/60 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <span className="text-[9px] font-bold text-green-700 dark:text-green-400">12-Day Streak</span>
                        </div>
                    </div>

                    {/* Active course */}
                    <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">In Progress</span>
                                <h4 className="text-sm font-bold mt-0.5 leading-tight">Data Structures &<br />Algorithms</h4>
                                <p className="text-[11px] text-blue-200 mt-1">Module 7 of 12 · Binary Trees</p>
                            </div>
                            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-blue-100">Progress</span>
                                <span className="text-[10px] font-bold text-white">58% complete</span>
                            </div>
                            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full" style={{ width: '58%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Modules', value: '6', sub: 'completed' },
                            { label: 'Tasks', value: '4', sub: 'pending' },
                            { label: 'Score', value: '94', sub: 'avg pts' },
                        ].map((s) => (
                            <div key={s.label} className="bg-gray-50 dark:bg-gray-800/70 rounded-xl p-3 text-center">
                                <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{s.value}</p>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Upcoming sessions */}
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                            Upcoming Sessions
                        </p>
                        <div className="space-y-1.5">
                            {[
                                { title: 'System Design Masterclass', time: 'Today · 6:00 PM', badge: 'LIVE', badgeStyle: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60', bar: 'bg-red-500' },
                                { title: 'DSA Problem Solving', time: 'Tomorrow · 8:00 PM', badge: 'BATCH', badgeStyle: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60', bar: 'bg-blue-500' },
                            ].map((s) => (
                                <div key={s.title} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/60">
                                    <div className={`w-0.5 h-8 rounded-full shrink-0 ${s.bar}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{s.title}</p>
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{s.time}</p>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${s.badgeStyle}`}>{s.badge}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating achievement badge */}
            <div className="absolute -bottom-5 -left-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl px-4 py-3 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2 mb-1">
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alumni Achievement</span>
                </div>
                <p className="text-sm font-black text-gray-900 dark:text-white">57 LPA Package</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Nishok · Qualcomm</p>
            </div>

            {/* Floating batch card */}
            <div className="absolute -top-4 -right-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl px-3.5 py-3 shadow-xl shadow-black/10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-900 dark:text-white">Active Batch</p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500">12 learners enrolled</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
