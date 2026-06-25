"use client";

import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle } from 'lucide-react';

export function CTASection() {
    return (
        <section className="py-24 bg-gray-50 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-indigo-800/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                    {/* Content */}
                    <div className="relative">
                        <p className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-4">
                            Ready to Start?
                        </p>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                            Transform Your
                            <span className="block">Engineering Career</span>
                        </h2>
                        <p className="text-lg text-blue-100 max-w-xl mx-auto mb-10 leading-relaxed">
                            Join the community of elite engineers who've landed offers at Qualcomm, Netgear, and top tech companies with FreshKite's expert mentorship.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                            <Link
                                href="/signup"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-blue-600 font-bold rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-sm"
                            >
                                Create Free Account
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="https://wa.me/918489186717"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 border border-white/20 text-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Chat on WhatsApp
                            </a>
                        </div>

                        {/* Contact strip */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <a
                                href="mailto:bala@freshkite.com"
                                className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors text-sm"
                            >
                                <Mail className="w-4 h-4" />
                                bala@freshkite.com
                            </a>
                            <span className="hidden sm:block w-px h-4 bg-white/20" />
                            <a
                                href="tel:+918489186717"
                                className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors text-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                +91 84891 86717
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
