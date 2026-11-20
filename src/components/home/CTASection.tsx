"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Reveal, useMounted } from '@/components/catalog/ui';

/** Section 10 — final call to action. */
export function CTASection() {
    const mounted = useMounted();
    const { user } = useAuth();
    const signedIn = mounted && !!user;

    return (
        <section aria-labelledby="cta-title" className="py-20 sm:py-24 bg-white dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Reveal>
                    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 px-6 py-16 sm:px-12 sm:py-20 text-center">
                        <div className="hero-blob absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
                        <div className="hero-blob hero-blob--alt absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-fuchsia-400/20 blur-3xl" aria-hidden="true" />
                        <div
                            className="absolute inset-0 opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
                            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
                            aria-hidden="true"
                        />
                        <div className="relative max-w-2xl mx-auto">
                            <h2 id="cta-title" className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.08]">
                                Your next opportunity starts with the right skills.
                            </h2>
                            <p className="mt-5 text-lg text-blue-100/85">
                                Create your free account, explore the full curriculum, and enroll when you’re ready.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                                {signedIn ? (
                                    <Link href={user?.role === 'admin' ? '/admin' : '/student'} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-indigo-700 font-black shadow-xl shadow-indigo-950/30 hover:-translate-y-0.5 transition-all">
                                        Go to your dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </Link>
                                ) : (
                                    <Link href="/signup" className="cta-shine relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-indigo-700 font-black shadow-xl shadow-indigo-950/30 hover:-translate-y-0.5 transition-all">
                                        Create your free account <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </Link>
                                )}
                                <a href="#courses" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white/10 text-white font-bold ring-1 ring-white/30 hover:bg-white/20 transition-colors">
                                    Explore courses
                                </a>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
