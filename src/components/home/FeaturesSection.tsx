"use client";

import {
    Route, Users, Video, ClipboardCheck, BarChart3,
    ShieldCheck, Smartphone, Calendar
} from 'lucide-react';

const features = [
    {
        icon: Route,
        title: 'Structured Learning Roadmap',
        description: 'Clear, sequential curriculum from fundamentals to advanced topics. Every module builds on the last — no gaps, no confusion.',
    },
    {
        icon: Users,
        title: 'Expert Mentorship',
        description: 'Learn directly from industry veterans with 20+ years at Qualcomm, Wipro, Oracle, and global tech leaders.',
    },
    {
        icon: Video,
        title: 'Live Sessions & Recordings',
        description: 'Attend live classes with your batch or catch up anytime with recorded content. Learning fits your schedule.',
    },
    {
        icon: ClipboardCheck,
        title: 'Assessments & Tests',
        description: 'Regular tests, coding challenges, and mock interviews to validate your understanding and build interview confidence.',
    },
    {
        icon: BarChart3,
        title: 'Progress Analytics',
        description: 'Track your learning velocity, module completion, scores, and streaks. Stay motivated with data-driven insights.',
    },
    {
        icon: Calendar,
        title: 'Batch & Meeting Management',
        description: 'Organized batch schedules, mentor meetings, and group sessions to keep you consistently engaged and accountable.',
    },
    {
        icon: ShieldCheck,
        title: 'Placement Support',
        description: 'Resume reviews, mock interviews, and direct referrals to top-tier companies. We stay with you until you land the offer.',
    },
    {
        icon: Smartphone,
        title: 'Learn Anywhere',
        description: 'Mobile-optimized platform so you can study from any device. Access your courses, sessions, and progress on the go.',
    },
];

export function FeaturesSection() {
    return (
        <section className="py-24 bg-gray-50 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Platform Features
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Why Choose FreshKite
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Everything you need to learn, grow, and land your dream role — built into one cohesive platform.
                    </p>
                </div>

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={i}
                                className="group p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-blue-100 dark:hover:border-blue-900/60 hover:shadow-md hover:shadow-blue-500/5 dark:hover:shadow-blue-500/5 transition-all duration-200"
                            >
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/80 transition-colors duration-200">
                                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
