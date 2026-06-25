"use client";

import Link from "next/link";
import { Linkedin, Instagram, Twitter, Mail, Phone, ArrowRight } from "lucide-react";

const navigation = {
    programs: [
        { name: 'Data Structures & Algorithms', href: '#programs' },
        { name: 'System Design', href: '#programs' },
        { name: 'Frontend Mastery', href: '#programs' },
        { name: 'Artificial Intelligence', href: '#programs' },
        { name: 'Machine Learning', href: '#programs' },
        { name: 'DevOps Engineering', href: '#programs' },
        { name: 'Full Stack Development', href: '#programs' },
    ],
    company: [
        { name: 'Success Stories', href: '/success-stories' },
        { name: 'Our Team', href: '/team' },
        { name: 'About FreshKite', href: '#team' },
    ],
    resources: [
        { name: 'Learning Paths', href: '#programs' },
        { name: 'Live Sessions', href: '#' },
        { name: 'Events', href: '#' },
    ],
};

const socials = [
    { Icon: Linkedin, label: 'LinkedIn', href: '#' },
    { Icon: Instagram, label: 'Instagram', href: '#' },
    { Icon: Twitter, label: 'Twitter / X', href: '#' },
];

export function HomeFooter() {
    return (
        <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    {/* Main footer content */}
                    <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-12">
                        {/* Brand column */}
                        <div className="space-y-5">
                            <Link href="/" className="inline-flex flex-col gap-0.5 group">
                                <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    fresh<span className="text-blue-600 dark:text-blue-400">kite</span>
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold">
                                    Earn while you learn
                                </span>
                            </Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                                Expert-led tech education platform. Structured learning paths, elite mentorship, and proven placement results at top tech companies.
                            </p>
                            <div className="flex gap-2">
                                {socials.map(({ Icon, label, href }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        aria-label={label}
                                        className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800/60 transition-all duration-200"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Programs */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white mb-5">
                                Programs
                            </h4>
                            <ul className="space-y-3">
                                {navigation.programs.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white mb-5">
                                Company
                            </h4>
                            <ul className="space-y-3">
                                {navigation.company.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Resources */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white mb-5">
                                Resources
                            </h4>
                            <ul className="space-y-3">
                                {navigation.resources.map((item) => (
                                    <li key={item.name}>
                                        <a
                                            href={item.href}
                                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {item.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>

                            {/* Contact */}
                            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white mt-8 mb-4">
                                Contact
                            </h4>
                            <div className="space-y-2.5">
                                <a
                                    href="mailto:bala@freshkite.com"
                                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                    bala@freshkite.com
                                </a>
                                <a
                                    href="tel:+918489186717"
                                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                    +91 84891 86717
                                </a>
                            </div>
                        </div>

                        {/* CTA column */}
                        <div className="space-y-5">
                            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white">
                                Ready to Join?
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Apply today and take the first step toward your dream tech career.
                            </p>
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 w-full justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                            >
                                Sign Up Free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="https://wa.me/918489186717"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 w-full justify-center px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-all duration-200"
                            >
                                Chat on WhatsApp
                            </a>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="py-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            © 2025 FreshKite. All rights reserved.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Earn while you learn.
                        </p>
                    </div>
                </div>
            </footer>
    );
}
