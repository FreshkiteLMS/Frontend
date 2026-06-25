"use client";

import { Navbar } from '@/components/layout/Navbar';
import { HomeFooter } from '@/components/home/HomeFooter';
import { TeamSection } from '@/components/landing/TeamSection';

export default function TeamPageClient() {
    return (
        <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-sans min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        "mainEntity": {
                            "@type": "Organization",
                            "name": "FreshKite",
                            "url": "https://freshkite.com",
                            "employee": [
                                { "@type": "Person", "name": "Bala Shanmugam", "jobTitle": "Founder and CEO" },
                                { "@type": "Person", "name": "Balamurugan", "jobTitle": "Director - Technology" },
                                { "@type": "Person", "name": "Siddharth", "jobTitle": "Full Stack Developer" },
                                { "@type": "Person", "name": "Sri Kanth", "jobTitle": "UI/UX Designer" },
                                { "@type": "Person", "name": "Vejey Suriya", "jobTitle": "Backend Specialist" },
                                { "@type": "Person", "name": "Ragul", "jobTitle": "DevOps Engineer" },
                                { "@type": "Person", "name": "Saranya", "jobTitle": "Frontend Engineer" }
                            ]
                        }
                    })
                }}
            />

            <Navbar />

            <main className="pt-20">
                {/* Page hero */}
                <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 py-16">
                    <div className="max-w-5xl mx-auto px-6 lg:px-8">
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                            Our People
                        </p>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                            The Team at FreshKite
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                            A team of 20+ year veterans and passionate builders dedicated to your engineering career growth.
                        </p>
                    </div>
                </div>

                <TeamSection showBackground={false} />
            </main>

            <HomeFooter />
        </div>
    );
}
