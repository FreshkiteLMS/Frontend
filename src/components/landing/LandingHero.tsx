"use client";

import { LogIn, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import SplashCursor from '../animations/SplashCursor';

export function LandingHero() {
    return (
        <>
            <SplashCursor />
            <section className="relative z-10 pt-8 lg:pt-16" data-purpose="hero-content">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-6 tracking-tight font-sans">
                    <span className="text-gradient">MASTER YOUR</span><br />
                    <span className="text-brand-dark dark:text-white">FUTURE</span>
                </h1>
                <h2 className="text-xl md:text-2xl font-semibold mb-6 text-brand-dark dark:text-white font-sans">
                    with <span className="underline decoration-blue-500 underline-offset-4">Expert-Led Courses</span>
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mb-10 leading-relaxed font-sans">
                    Boost your skills with expert-led courses designed to help you succeed in your career and beyond. Join a community of elite engineers today.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                        href="/login"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 font-sans"
                    >
                        LOGIN
                        <LogIn size={16} />
                    </Link>
                    <Link
                        href="/signup"
                        className="bg-white hover:bg-gray-50 dark:bg-[#1a1a24] dark:hover:bg-[#252535] text-brand-dark dark:text-white px-6 py-2.5 rounded-full font-semibold text-sm border border-gray-200 dark:border-white/10 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-black/5 dark:shadow-black/20 font-sans"
                    >
                        SIGNUP
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>
        </>
    );
}
