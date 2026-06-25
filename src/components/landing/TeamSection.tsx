"use client";

import Image from "next/image";
import { Linkedin, Twitter, Mail } from "lucide-react";
import balaImg from "../../assets/bala-ceo.jpg";
import balamuruganImg from "../../assets/balamurugan.jpg";
import saravananImg from "../../assets/saravanan.jpg";
import muthuImg from "../../assets/muthu.jpg";
import srinivasanImg from "../../assets/srinivasan.jpg";
import { useState } from 'react';
import { X } from 'lucide-react';

export interface Mentor {
    name: string;
    role: string;
    image: any;
    description: string;
    socials: { linkedin: string; twitter: string; email: string };
    featured?: boolean;
    accentColor: string;
    accentBg: string;
}

const mentors: Mentor[] = [
    {
        name: 'Bala Shanmugam',
        role: 'Founder & CEO',
        image: balaImg,
        description: 'Bala Shanmugam, a BE graduate from NIT Trichy, brings over 20 years of experience from Qualcomm, Amdocs, and other leading firms. Passionate about fostering independent thinking and learning, he empowers individuals through technology and innovation.',
        socials: { linkedin: 'https://www.linkedin.com/in/balashanmugam', twitter: '#', email: '#' },
        featured: true,
        accentColor: 'text-blue-600 dark:text-blue-400',
        accentBg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
        name: 'Balamurugan',
        role: 'Director — Technology',
        image: balamuruganImg,
        description: 'A NIT Trichy graduate with 20+ years of experience in application development, maintenance, and support, Balamurugan specializes in problem analysis and has designed multiple productivity tools for development, testing, and project management. In recent years, he has focused on building Generative AI and AI/ML solutions for diverse business challenges.',
        socials: { linkedin: '#', twitter: '#', email: '#' },
        accentColor: 'text-purple-600 dark:text-purple-400',
        accentBg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
        name: 'Saravanan',
        role: 'Technical Leader',
        image: saravananImg,
        description: 'With 20+ years of expertise across air cargo, stock exchange, and energy sectors, Saravanan specializes in enterprise-level solutions using Java, Python, and cloud DevOps. Having worked with global leaders like Wipro, Oracle, SAP, and Emirates Dubai, he brings international experience from Dubai and Frankfurt, leading projects, building teams, and driving innovation.',
        socials: { linkedin: '#', twitter: '#', email: '#' },
        accentColor: 'text-emerald-600 dark:text-emerald-400',
        accentBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
        name: 'Muthu',
        role: 'Founder, Squarks Solutions',
        image: muthuImg,
        description: 'Muthu, founder of Squarks Solutions and SMAC Academy, has 24+ years of experience in DevOps, AI, and Cloud. Specializing in CI/CD, Kubernetes, and Big Data, he drives innovation through next-gen tech, corporate training, and startup incubation.',
        socials: { linkedin: '#', twitter: '#', email: '#' },
        accentColor: 'text-orange-600 dark:text-orange-400',
        accentBg: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
        name: 'Srinivasan',
        role: 'Strategic Advisor',
        image: srinivasanImg,
        description: 'A UC Berkeley School of Information graduate with a Management of Technology certificate from Haas School of Business, Srinivasan brings 18+ years of expertise in building cutting-edge AI/ML-powered search and recommendation systems. Passionate about technology-driven innovation.',
        socials: { linkedin: '#', twitter: '#', email: '#' },
        accentColor: 'text-violet-600 dark:text-violet-400',
        accentBg: 'bg-violet-50 dark:bg-violet-950/50',
    },
];

function MentorModal({ mentor, onClose }: { mentor: Mentor; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start gap-5 p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                        <Image src={mentor.image} alt={mentor.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-0.5">{mentor.name}</h2>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${mentor.accentColor}`}>{mentor.role}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">{mentor.description}</p>
                    <div className="flex gap-2">
                        {[
                            { Icon: Linkedin, href: mentor.socials.linkedin, label: 'LinkedIn' },
                            { Icon: Twitter, href: mentor.socials.twitter, label: 'Twitter' },
                            { Icon: Mail, href: mentor.socials.email, label: 'Email' },
                        ].map(({ Icon, href, label }) => (
                            <a
                                key={label}
                                href={href}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-semibold border border-gray-100 dark:border-gray-700"
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeaturedMentorCard({ mentor }: { mentor: Mentor }) {
    const [showModal, setShowModal] = useState(false);
    return (
        <>
            <div
                onClick={() => setShowModal(true)}
                className="group relative flex flex-col md:flex-row items-start gap-8 p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-200 cursor-pointer mb-6"
            >
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                    <Image src={mentor.image} alt={mentor.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                </div>
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${mentor.accentColor} mb-1.5 block`}>
                                FreshKite Leadership
                            </span>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{mentor.name}</h3>
                            <p className={`text-sm font-semibold ${mentor.accentColor} mt-0.5`}>{mentor.role}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg ${mentor.accentBg} ${mentor.accentColor}`}>
                            Founder
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl line-clamp-3 group-hover:line-clamp-none transition-all">
                        {mentor.description}
                    </p>
                    <div className="flex items-center gap-3 mt-5">
                        {[
                            { Icon: Linkedin, href: mentor.socials.linkedin },
                            { Icon: Twitter, href: mentor.socials.twitter },
                            { Icon: Mail, href: mentor.socials.email },
                        ].map(({ Icon, href }, i) => (
                            <a
                                key={i}
                                href={href}
                                onClick={(e) => e.stopPropagation()}
                                className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                            >
                                <Icon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            {showModal && <MentorModal mentor={mentor} onClose={() => setShowModal(false)} />}
        </>
    );
}

function MentorCard({ mentor }: { mentor: Mentor }) {
    const [showModal, setShowModal] = useState(false);
    return (
        <>
            <div
                onClick={() => setShowModal(true)}
                className="group flex gap-5 p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
            >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                    <Image src={mentor.image} alt={mentor.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">{mentor.name}</h4>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${mentor.accentColor} mb-2`}>{mentor.role}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {mentor.description}
                    </p>
                </div>
            </div>
            {showModal && <MentorModal mentor={mentor} onClose={() => setShowModal(false)} />}
        </>
    );
}

export function TeamSection({ showBackground = true }: { showBackground?: boolean }) {
    const featured = mentors.filter((m) => m.featured);
    const rest = mentors.filter((m) => !m.featured);

    return (
        <section id="team" className="py-20 bg-white dark:bg-gray-950">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="max-w-xl mb-14">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Our Mentors
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Meet the Experts
                        <span className="block text-blue-600 dark:text-blue-400">Behind FreshKite</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Industry veterans with 20+ years at Qualcomm, Amdocs, Oracle, and global tech leaders — now dedicated to your growth.
                    </p>
                </div>

                {featured.map((m) => (
                    <FeaturedMentorCard key={m.name} mentor={m} />
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rest.map((m) => (
                        <MentorCard key={m.name} mentor={m} />
                    ))}
                </div>
            </div>
        </section>
    );
}
