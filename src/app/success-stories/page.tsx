"use client";

import { Navbar } from '@/components/layout/Navbar';
import { HomeFooter } from '@/components/home/HomeFooter';
import { SuccessStories } from '@/components/landing/SuccessStories';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SuccessStoriesPage() {
    return (
        <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans min-h-screen">
            <Navbar />

            <main className="pt-20">
                {/* Page hero */}
                <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 py-16">
                    <div className="max-w-6xl mx-auto px-6 lg:px-8">
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                            Alumni Results
                        </p>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                            Success Stories
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed mb-8">
                            Engineers who trusted FreshKite's mentorship and landed life-changing offers at top global tech companies.
                        </p>
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                        >
                            Start Your Journey
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                <SuccessStories />
            </main>

            <HomeFooter />
        </div>
    );
}
