"use client";

import Link from 'next/link';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { categoryLabel } from '@/lib/catalog';

/**
 * Social profiles and legal pages. Left empty on purpose: the previous footer
 * only had placeholder ("#") social links and there are no Privacy Policy /
 * Terms pages yet. Add entries here and they appear in the footer.
 */
const SOCIAL_LINKS: { label: string; href: string }[] = [];
const LEGAL_LINKS: { label: string; href: string }[] = [];

const linkClass = 'text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors';

function Column({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-900 dark:text-white mb-4">{title}</h3>
            <ul className="space-y-2.5">{children}</ul>
        </div>
    );
}

/** Section 11 — footer. Category links come from the live catalog. */
export function HomeFooter({ categories = [] }: { categories?: { key: string; count: number }[] }) {
    return (
        <footer className="bg-white dark:bg-gray-950 border-t border-gray-200/70 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.3fr] gap-10">
                    <div className="col-span-2 md:col-span-4 lg:col-span-1">
                        <Link href="/" className="inline-flex flex-col">
                            <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                                fresh<span className="text-blue-600 dark:text-blue-400">kite</span>
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-semibold mt-1">Earn while you learn</span>
                        </Link>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                            Expert-led technology courses with structured curricula, hands-on practice and progress you can see.
                        </p>
                        {SOCIAL_LINKS.length > 0 && (
                            <ul className="mt-5 flex gap-3">
                                {SOCIAL_LINKS.map(s => <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{s.label}</a></li>)}
                            </ul>
                        )}
                    </div>

                    <Column title="Courses">
                        <li><Link href="/#courses" className={linkClass}>All courses</Link></li>
                        {categories.slice(0, 5).map(c => (
                            <li key={c.key}><Link href={`/catalog?category=${encodeURIComponent(c.key)}`} className={linkClass}>{categoryLabel(c.key)}</Link></li>
                        ))}
                    </Column>

                    <Column title="Explore">
                        <li><Link href="/catalog" className={linkClass}>Course catalog</Link></li>
                        <li><Link href="/#bundles" className={linkClass}>Bundles</Link></li>
                        <li><Link href="/#curriculum" className={linkClass}>Curriculum</Link></li>
                        <li><Link href="/success-stories" className={linkClass}>Success stories</Link></li>
                        <li><Link href="/team" className={linkClass}>Our team</Link></li>
                    </Column>

                    <Column title="Account">
                        <li><Link href="/signup" className={linkClass}>Create account</Link></li>
                        <li><Link href="/login" className={linkClass}>Log in</Link></li>
                        <li><Link href="/student" className={linkClass}>Student dashboard</Link></li>
                    </Column>

                    <Column title="Contact">
                        <li><a href="mailto:bala@freshkite.com" className={`${linkClass} inline-flex items-center gap-2`}><Mail className="w-3.5 h-3.5" aria-hidden="true" />bala@freshkite.com</a></li>
                        <li><a href="tel:+918489186717" className={`${linkClass} inline-flex items-center gap-2`}><Phone className="w-3.5 h-3.5" aria-hidden="true" />+91 84891 86717</a></li>
                        <li><a href="https://wa.me/918489186717" target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}><MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />Chat on WhatsApp</a></li>
                    </Column>
                </div>

                <div className="py-6 border-t border-gray-200/70 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">© {new Date().getFullYear()} FreshKite. All rights reserved.</p>
                    {LEGAL_LINKS.length > 0 && (
                        <ul className="flex gap-4">
                            {LEGAL_LINKS.map(l => <li key={l.label}><Link href={l.href} className="text-xs text-gray-400 hover:text-blue-600">{l.label}</Link></li>)}
                        </ul>
                    )}
                </div>
            </div>
        </footer>
    );
}
