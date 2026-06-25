"use client";

import { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';

const perks = [
    'Access 7+ structured learning tracks',
    'Live sessions with industry mentors',
    'Track your progress with analytics',
    'Placement support until you land the job',
];

export function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, googleLogin } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || 'Login failed');
                setLoading(false);
            } else {
                if (result.user?.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    const redirectPath = result.user?.hasPurchasedCourses ? '/student' : '/student/courses';
                    setTimeout(() => { window.location.href = redirectPath; }, 100);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setLoading(true);
        try {
            const result = await googleLogin(credentialResponse.credential);
            if (!result.success) {
                setError(result.error || 'Google Login failed');
                setLoading(false);
            } else {
                if (result.user?.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    const redirectPath = result.user?.hasPurchasedCourses ? '/student' : '/student/courses';
                    setTimeout(() => { window.location.href = redirectPath; }, 100);
                }
            }
        } catch (err) {
            setError('Google Login failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex">
            {/* Left: Brand panel */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorations */}
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
                        Welcome back to your learning journey
                    </h2>
                    <p className="text-blue-100 text-base leading-relaxed mb-10">
                        Continue where you left off. Your mentors, live sessions, and progress are waiting for you.
                    </p>

                    <ul className="space-y-3.5">
                        {perks.map((perk) => (
                            <li key={perk} className="flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-blue-200 mt-0.5 shrink-0" />
                                <span className="text-sm text-blue-100">{perk}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bottom quote */}
                <div className="relative bg-white/10 rounded-2xl p-6 border border-white/15">
                    <p className="text-sm text-blue-50 leading-relaxed italic mb-4">
                        "Cracking a 57 LPA offer at Qualcomm felt impossible until FreshKite's structured roadmap made it real."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-400/30 flex items-center justify-center text-xs font-bold text-white">N</div>
                        <div>
                            <p className="text-xs font-semibold text-white">Nishok</p>
                            <p className="text-[11px] text-blue-200">Software Engineer · Qualcomm</p>
                        </div>
                    </div>
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
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1.5">Sign in to your account</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                Sign up free
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Username or Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-gray-400"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Password
                                </label>
                                <Link href="#" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
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
                                    placeholder="Enter your password"
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
                            {loading ? 'Signing in…' : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-100 dark:border-gray-800" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 text-xs text-gray-400 bg-white dark:bg-gray-950">or continue with</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            theme="outline"
                            text="continue_with"
                            width="100%"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
