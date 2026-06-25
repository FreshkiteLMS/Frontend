'use client';

import Image from 'next/image';
import { Linkedin } from 'lucide-react';
import siddharthImg from "../../assets/siddharth_profile.jpg";
import srikanthImg from "../../assets/srikanth_latest.jpg";
import vejeyImg from "../../assets/vejey_recopy.jpg";
import ragulImg from "../../assets/ragul_profile.jpg";
import saranyaImg from "../../assets/saranya_clean.png";

interface Member {
    name: string;
    role: string;
    image: any;
    description: string;
    skills: string[];
    linkedin: string;
    accentColor: string;
    accentBg: string;
}

const team: Member[] = [
    {
        name: 'Siddharth',
        role: 'Full Stack Developer',
        image: siddharthImg,
        description: 'Visionary Full Stack Developer with a passion for scalable web applications. Expert in modern JavaScript frameworks and cloud infrastructure.',
        skills: ['Next.js', 'Node.js', 'Cloud'],
        linkedin: 'https://www.linkedin.com/in/siddharth626/',
        accentColor: 'text-blue-600 dark:text-blue-400',
        accentBg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
        name: 'Sri Kanth',
        role: 'UI/UX Designer',
        image: srikanthImg,
        description: 'Creative UI/UX Designer and Full Stack Developer dedicated to crafting intuitive, visually stunning interfaces with strong technical foundations.',
        skills: ['Figma', 'Full Stack', 'Java'],
        linkedin: 'https://www.linkedin.com/in/srikanth-m-75a86235a',
        accentColor: 'text-purple-600 dark:text-purple-400',
        accentBg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
        name: 'Vejey Suriya',
        role: 'Backend Specialist',
        image: vejeyImg,
        description: 'Backend Specialist skilled in optimizing server-side logic and database architecture for high availability, security, and performance.',
        skills: ['Java', 'Spring Boot', 'Microservices'],
        linkedin: 'https://www.linkedin.com/in/vejey-suriya-profile',
        accentColor: 'text-orange-600 dark:text-orange-400',
        accentBg: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
        name: 'Ragul',
        role: 'DevOps Engineer',
        image: ragulImg,
        description: 'DevOps Engineer specializing in automation, CI/CD pipelines, and cloud infrastructure for high-performance application delivery.',
        skills: ['Docker', 'Kubernetes', 'AWS'],
        linkedin: 'https://www.linkedin.com/in/ragul-profile',
        accentColor: 'text-cyan-600 dark:text-cyan-400',
        accentBg: 'bg-cyan-50 dark:bg-cyan-950/50',
    },
    {
        name: 'Saranya',
        role: 'Frontend Engineer',
        image: saranyaImg,
        description: 'Frontend Engineer specializing in responsive, intuitive interfaces with modern frameworks and pixel-perfect design implementations.',
        skills: ['React', 'TypeScript', 'Tailwind'],
        linkedin: 'https://www.linkedin.com/in/saranya-s-53b840336',
        accentColor: 'text-pink-600 dark:text-pink-400',
        accentBg: 'bg-pink-50 dark:bg-pink-950/50',
    },
];

function MemberCard({ member }: { member: Member }) {
    return (
        <div className="group flex gap-5 p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-200 hover:-translate-y-0.5">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                <Image src={member.image} alt={member.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h4 className="font-bold text-gray-900 dark:text-white">{member.name}</h4>
                    <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all"
                    >
                        <Linkedin className="w-3.5 h-3.5" />
                    </a>
                </div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${member.accentColor} mb-2`}>{member.role}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
                    {member.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {member.skills.map((skill) => (
                        <span key={skill} className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${member.accentBg} ${member.accentColor}`}>
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function AboutSection() {
    return (
        <section id="about" className="py-20 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="max-w-xl mb-14">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        The Build Team
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        The Innovators
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        The engineering and design team that built FreshKite from the ground up.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.map((member) => (
                        <MemberCard key={member.name} member={member} />
                    ))}
                </div>
            </div>
        </section>
    );
}
