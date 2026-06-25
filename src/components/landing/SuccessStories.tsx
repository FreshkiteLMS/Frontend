"use client";

import Image from "next/image";
import { TrendingUp, Building2, Quote } from "lucide-react";
import manikandanImg from "../../assets/manikandan.jpg";
import nishokImg from "../../assets/nishok.jpg";
import dhilipanImg from "../../assets/dhilipan_pro.png";

const stories = [
    {
        name: "Manikandan",
        company: "Netgear",
        lpa: "20 LPA",
        image: manikandanImg,
        featured: false,
        quote: "FreshKite's mentorship was the key. Securing a 20 LPA offer at Netgear felt like a dream come true for my career.",
        role: "Software Engineer",
    },
    {
        name: "Nishok",
        company: "Qualcomm",
        lpa: "57 LPA",
        image: nishokImg,
        featured: true,
        quote: "The structured roadmap at FreshKite helped me master architecture. Cracking a massive 57 LPA offer at Qualcomm is an unbelievable result!",
        role: "Software Engineer",
    },
    {
        name: "Dhilipan",
        company: "Avasoft",
        lpa: "13 LPA",
        image: dhilipanImg,
        featured: false,
        quote: "The hands-on projects and elite mentorship at FreshKite transformed my technical thinking completely.",
        role: "Software Developer",
    },
];

export function SuccessStories() {
    return (
        <section id="success-stories" className="py-24 bg-white dark:bg-gray-950">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Alumni Success
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Real Engineers.
                        <span className="block text-blue-600 dark:text-blue-400">Real Offers.</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Our alumni have cracked roles at Qualcomm, Netgear, and top global tech companies — with packages that speak for themselves.
                    </p>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-4 mb-16 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    {[
                        { value: '57 LPA', label: 'Highest Package' },
                        { value: '20+ LPA', label: 'Average Package' },
                        { value: '100+', label: 'Engineers Placed' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Story cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stories.map((s) => (
                        <div
                            key={s.name}
                            className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                                s.featured
                                    ? 'bg-blue-600 border-blue-500 hover:shadow-blue-500/20'
                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-black/5 dark:hover:shadow-black/30'
                            }`}
                        >
                            {/* Quote icon */}
                            <Quote className={`w-8 h-8 mb-5 opacity-30 ${s.featured ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />

                            {/* Quote text */}
                            <p className={`text-sm leading-relaxed mb-7 flex-1 ${s.featured ? 'text-blue-50' : 'text-gray-600 dark:text-gray-300'}`}>
                                "{s.quote}"
                            </p>

                            {/* Profile */}
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 border-white/20">
                                    <Image src={s.image} alt={s.name} fill className="object-cover" unoptimized />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm ${s.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                        {s.name}
                                    </p>
                                    <p className={`text-xs ${s.featured ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {s.role}
                                    </p>
                                </div>
                                <div className={`shrink-0 flex flex-col items-end`}>
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                        s.featured ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                                    }`}>
                                        <TrendingUp className="w-3 h-3" />
                                        {s.lpa}
                                    </div>
                                    <div className={`flex items-center gap-1 mt-1 text-[11px] ${s.featured ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                        <Building2 className="w-3 h-3" />
                                        {s.company}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
