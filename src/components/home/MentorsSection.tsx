"use client";

import Image from "next/image";
import { Linkedin } from "lucide-react";
import balaImg from "../../assets/bala-ceo.jpg";
import balamuruganImg from "../../assets/balamurugan.jpg";
import saravananImg from "../../assets/saravanan.jpg";
import muthuImg from "../../assets/muthu.jpg";
import srinivasanImg from "../../assets/srinivasan.jpg";

interface Mentor {
    name: string;
    role: string;
    organization: string;
    experience: string;
    image: any;
    linkedIn: string;
    featured?: boolean;
}

const mentors: Mentor[] = [
    {
        name: 'Bala Shanmugam',
        role: 'Founder & CEO',
        organization: 'FreshKite',
        experience: '20+ yrs · Qualcomm, Amdocs',
        image: balaImg,
        linkedIn: 'https://www.linkedin.com/in/balashanmugam',
        featured: true,
    },
    {
        name: 'Balamurugan',
        role: 'Director, Technology',
        organization: 'FreshKite',
        experience: '20+ yrs · AI/ML & Gen AI',
        image: balamuruganImg,
        linkedIn: '#',
    },
    {
        name: 'Saravanan',
        role: 'Technical Leader',
        organization: 'FreshKite',
        experience: '20+ yrs · Wipro, Oracle, SAP',
        image: saravananImg,
        linkedIn: '#',
    },
    {
        name: 'Muthu',
        role: 'Founder',
        organization: 'Squarks Solutions',
        experience: '24+ yrs · DevOps, Cloud, AI',
        image: muthuImg,
        linkedIn: '#',
    },
    {
        name: 'Srinivasan',
        role: 'Strategic Advisor',
        organization: 'FreshKite',
        experience: '18+ yrs · AI/ML Search Systems',
        image: srinivasanImg,
        linkedIn: '#',
    },
];

export function MentorsSection() {
    const featured = mentors.find((m) => m.featured)!;
    const rest = mentors.filter((m) => !m.featured);

    return (
        <section id="team" className="py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Leadership
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Learn from the Best
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Our mentors are industry veterans who have built and shipped software at the world's leading tech companies. They don't just teach — they guide.
                    </p>
                </div>

                {/* Featured mentor */}
                <div className="mb-6">
                    <FeaturedMentorCard mentor={featured} />
                </div>

                {/* Mentor grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rest.map((mentor) => (
                        <MentorCard key={mentor.name} mentor={mentor} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeaturedMentorCard({ mentor }: { mentor: Mentor }) {
    return (
        <div className="flex flex-col md:flex-row gap-8 p-8 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200">
            {/* Photo */}
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                <Image
                    src={mentor.image}
                    alt={mentor.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    unoptimized
                />
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                        <span className="inline-block text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
                            FreshKite Leadership
                        </span>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{mentor.name}</h3>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                            {mentor.role} · {mentor.organization}
                        </p>
                    </div>
                    {mentor.linkedIn !== '#' && (
                        <a
                            href={mentor.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shrink-0"
                        >
                            <Linkedin className="w-4 h-4" />
                        </a>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{mentor.experience}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
                    BE graduate from NIT Trichy with over 20 years of experience at Qualcomm, Amdocs, and other global tech leaders. Passionate about fostering independent thinking and empowering the next generation of engineers through technology and innovation.
                </p>
            </div>
        </div>
    );
}

function MentorCard({ mentor }: { mentor: Mentor }) {
    return (
        <div className="group flex flex-col p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200">
            {/* Photo */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                <Image
                    src={mentor.image}
                    alt={mentor.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                />
            </div>

            {/* Name & Role */}
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-0.5">
                {mentor.name}
            </h4>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                {mentor.role}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                {mentor.organization}
            </p>

            {/* Experience tag */}
            <div className="mt-auto">
                <span className="inline-block text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 px-2.5 py-1 rounded-full">
                    {mentor.experience}
                </span>
            </div>
        </div>
    );
}
