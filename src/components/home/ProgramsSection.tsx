"use client";

import Link from 'next/link';
import {
    Brain, Network, Code2, Bot, Cpu, Container, Layers, Trophy,
    ArrowRight
} from 'lucide-react';

interface Program {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    description: string;
    skills: string[];
    color: string;
    iconBg: string;
    featured?: boolean;
}

const programs: Program[] = [
    {
        icon: Brain,
        title: 'Data Structures & Algorithms',
        subtitle: 'Foundation',
        description: 'Master the core building blocks of computer science. Arrays, trees, graphs, dynamic programming — the foundation every top engineer needs.',
        skills: ['Arrays', 'Trees & Graphs', 'DP', 'Problem Solving'],
        color: 'blue',
        iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    },
    {
        icon: Network,
        title: 'System Design',
        subtitle: 'Architecture',
        description: 'Design scalable, fault-tolerant distributed systems. From load balancers to microservices — think like a senior engineer.',
        skills: ['Microservices', 'Caching', 'Load Balancing', 'Databases'],
        color: 'purple',
        iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    },
    {
        icon: Code2,
        title: 'Frontend Mastery',
        subtitle: 'Web Development',
        description: 'Build stunning, performant web applications with modern JavaScript frameworks, design systems, and responsive interfaces.',
        skills: ['React', 'Next.js', 'TypeScript', 'UI/UX'],
        color: 'sky',
        iconBg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
    },
    {
        icon: Bot,
        title: 'Artificial Intelligence',
        subtitle: 'AI Engineering',
        description: 'Explore the frontier of AI — from natural language processing and computer vision to building production-ready AI applications.',
        skills: ['NLP', 'Computer Vision', 'Transformers', 'LLMs'],
        color: 'cyan',
        iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',
    },
    {
        icon: Cpu,
        title: 'Machine Learning',
        subtitle: 'ML Engineering',
        description: 'From classical ML algorithms to deep learning — train models, build pipelines, and deploy intelligent systems at scale.',
        skills: ['Supervised Learning', 'Neural Networks', 'MLOps', 'Python'],
        color: 'rose',
        iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
    },
    {
        icon: Container,
        title: 'DevOps Engineering',
        subtitle: 'Infrastructure',
        description: 'Automate everything. Master CI/CD pipelines, containerization, cloud infrastructure, and the entire software delivery lifecycle.',
        skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
        color: 'orange',
        iconBg: 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400',
    },
    {
        icon: Layers,
        title: 'Full Stack Development',
        subtitle: 'End-to-End',
        description: 'Own the entire product. Build robust APIs, scalable databases, and polished UIs — become the engineer every team wants.',
        skills: ['Node.js', 'Spring Boot', 'React', 'Databases'],
        color: 'emerald',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    },
    {
        icon: Trophy,
        title: 'FreshKite Complete Roadmap',
        subtitle: 'Full Career Program',
        description: 'Our flagship program. Start from fundamentals and advance through every track — guided by expert mentors at every step of your journey.',
        skills: ['All Tracks', 'Mentorship', 'Projects', 'Placement Support'],
        color: 'indigo',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
        featured: true,
    },
];

export function ProgramsSection() {
    return (
        <section id="programs" className="py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Learning Tracks
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Expert Programs for
                        <span className="block text-blue-600 dark:text-blue-400">Every Tech Role</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Choose your path. Each track is crafted by industry veterans and structured to take you from foundations to job-ready expertise.
                    </p>
                </div>

                {/* Programs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {programs.slice(0, 7).map((program) => (
                        <ProgramCard key={program.title} program={program} />
                    ))}

                    {/* Featured full-width card */}
                    <div className="sm:col-span-2 lg:col-span-4">
                        <FeaturedProgramCard program={programs[7]} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProgramCard({ program }: { program: Program }) {
    const Icon = program.icon;

    return (
        <div className="group relative flex flex-col p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${program.iconBg}`}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Label */}
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                {program.subtitle}
            </span>

            {/* Title */}
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                {program.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5 flex-1">
                {program.description}
            </p>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mb-5">
                {program.skills.map((skill) => (
                    <span key={skill} className="text-[10px] font-semibold px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700/60">
                        {skill}
                    </span>
                ))}
            </div>

            {/* CTA */}
            <Link
                href="/signup"
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-2.5 transition-all duration-200"
            >
                Enroll Now
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

function FeaturedProgramCard({ program }: { program: Program }) {
    const Icon = program.icon;

    return (
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-[200px] h-[200px] bg-white/5 rounded-full blur-2xl translate-y-1/3 pointer-events-none" />

            {/* Icon */}
            <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
                <Icon className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 relative">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1.5 block">
                    {program.subtitle}
                </span>
                <h3 className="text-2xl font-black text-white mb-3">{program.title}</h3>
                <p className="text-blue-100 text-sm leading-relaxed max-w-2xl mb-5">
                    {program.description}
                </p>
                <div className="flex flex-wrap gap-2">
                    {program.skills.map((skill) => (
                        <span key={skill} className="text-xs font-semibold px-3 py-1 bg-white/15 text-white rounded-full border border-white/20">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="relative shrink-0">
                <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                    Start Your Roadmap
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
