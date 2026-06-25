"use client";

import { useState } from 'react';
import { Lock, User, Mail, AlertCircle, AtSign, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/api/auth.api';
import { useAuth } from '@/hooks/use-auth';

const benefits = [
    '7+ expert-crafted learning tracks',
    'Live mentorship from Qualcomm & Amdocs veterans',
    'Real projects, not just theory',
    'Placement support until you land your offer',
];

export function SignupForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await authService.signup({ firstName, lastName, username, email, password });
            if (!result.success) {
                setError(result.error || 'Signup failed');
                setLoading(false);
            } else {
                try {
                    const loginResult = await login(username, password);
                    if (loginResult.success) {
                        window.location.href = '/student';
                    } else {
                        router.push('/login');
                    }
                } catch {
                    router.push('/login');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex">
            {/* Left: Brand panel */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-900/40 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="relative">
                    <Link href="/" className="inline-flex flex-col gap-0.5 group mb-12">
                        <span className="text-2xl font-black tracking-tight text-white">
                            fresh<span className="text-blue-200">kite</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-blue-200/70 font-semibold">
                            Earn while you learn
                        </span>
                    </Link>

                    <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
                        Start your tech career transformation today
                    </h2>
                    <p className="text-blue-100 text-base leading-relaxed mb-10">
                        Join hundreds of engineers who've landed top roles at Qualcomm, Netgear, and global tech companies.
                    </p>

                    <ul className="space-y-3.5">
                        {benefits.map((b) => (
                            <li key={b} className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-blue-200 mt-0.5 shrink-0" />
                                <span className="text-sm text-blue-100">{b}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Stats strip */}
                <div className="relative grid grid-cols-3 gap-4">
                    {[
                        { value: '57 LPA', label: 'Highest Package' },
                        { value: '100+', label: 'Engineers Placed' },
                        { value: '7+', label: 'Learning Tracks' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white/10 rounded-xl p-4 border border-white/15 text-center">
                            <p className="text-xl font-black text-white">{stat.value}</p>
                            <p className="text-[11px] text-blue-200 mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <Link href="/" className="lg:hidden inline-flex flex-col gap-0.5 mb-8">
                        <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                            fresh<span className="text-blue-600">kite</span>
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1.5">Create your free account</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    First Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                        placeholder="First"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                        placeholder="Last (optional)"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <AtSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                    placeholder="Choose a username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-11 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                    placeholder="Create a strong password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                        >
                            {loading ? 'Creating Account…' : (
                                <>
                                    Create Free Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                            By signing up you agree to our{' '}
                            <Link href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms</Link>
                            {' '}and{' '}
                            <Link href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
