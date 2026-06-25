
"use client";

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/layout/theme-provider';
import { useState, useEffect } from 'react';
import { Sun, Moon, Settings, LogOut } from 'lucide-react';

export function SellingNavbar() {
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayUser = mounted ? user : null;

    return (
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors duration-200 sticky top-0 z-50 h-16">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
                <Link href="/student" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform shadow-md">
                        <span className="text-white font-black text-xs leading-none">🪁</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-black text-xl tracking-tight">Freshkite</span>
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    {displayUser && <ProfileDropdown user={displayUser} logout={logout} />}
                </div>
            </div>
        </nav>
    );
}


function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="w-9 h-9" />;

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}

function ProfileDropdown({ user, logout }: { user: any, logout: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && !(event.target as Element).closest('.profile-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const displayInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.username ? user.username.charAt(0).toUpperCase() : '?');

    return (
        <div className="relative profile-dropdown">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
                {displayInitial}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-3 z-50 overflow-hidden translate-y-0 opacity-100 transition-all">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.name || user?.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <div className="py-2">
                        <Link href="/student" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <Settings className="w-4 h-4" />
                            Account Settings
                        </Link>
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
