"use client";

import { Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '@/components/layout/theme-provider';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

const navLinks = [
    { label: 'Programs', href: '/#programs' },
    { label: 'Success Stories', href: '/success-stories' },
    { label: 'Team', href: '/team' },
];

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Only trust auth state after mount to avoid SSR/hydration mismatch
    const isLoggedIn = mounted && !!user;
    const dashboardHref = user?.role === 'admin' ? '/admin' : '/student';

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => setScrolled(window.scrollY > 16);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    return (
        <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60 shadow-sm shadow-black/5'
                        : 'bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex flex-col group shrink-0">
                            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                                fresh<span className="text-blue-600 dark:text-blue-400">kite</span>
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold -mt-0.5">
                                Earn while you learn
                            </span>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-lg transition-all duration-150"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
                            {mounted && (
                                <button
                                    onClick={toggleTheme}
                                    aria-label="Toggle theme"
                                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-150"
                                >
                                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                            )}

                            {isLoggedIn ? (
                                /* Logged in → go to the right dashboard */
                                <Link
                                    href={dashboardHref}
                                    className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 hover:shadow-md hover:shadow-blue-500/25"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    {/* Login */}
                                    <Link
                                        href="/login"
                                        className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded-lg transition-all duration-150"
                                    >
                                        Login
                                    </Link>

                                    {/* Sign Up CTA */}
                                    <Link
                                        href="/signup"
                                        className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 hover:shadow-md hover:shadow-blue-500/25"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}

                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle mobile menu"
                                className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-150"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-6 py-4 space-y-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-lg transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="pt-3 pb-1 flex flex-col gap-2">
                            {isLoggedIn ? (
                                <Link
                                    href={dashboardHref}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block text-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/signup"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
        </nav>
    );
}
