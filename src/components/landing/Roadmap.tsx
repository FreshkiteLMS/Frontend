'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Code, Network, Cpu, Bot, Container, Layers, Trophy } from 'lucide-react';


type activeCardType = 'ds' | 'sd' | 'fe' | 'ai' | 'ml' | 'do' | 'fs' | 'final' | null;

export function Roadmap() {
    const [activeCard, setActiveCard] = useState<activeCardType>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.3
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 25 }
        },
        hover: {
            scale: 1.08,
            y: -8,
            transition: { type: "spring" as const, stiffness: 400, damping: 10 }
        }
    };

    return (
        <div className="relative w-full max-w-lg mx-auto pt-0 pb-16 px-4">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[750px] bg-blue-600/20 dark:bg-blue-600/10 blur-[120px] rounded-full -z-10" />
            <motion.div
                className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full -z-10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
            />

            {/* Connection Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 400 750" fill="none" preserveAspectRatio="none">
                {[
                    { id: 'ds-sd', d: "M 200 90 L 200 105 Q 200 125 100 125 L 100 140", color: "#a855f7", active: ['sd', 'ai', 'do', 'final'].includes(activeCard as string) },
                    { id: 'ds-fe', d: "M 200 90 L 200 105 Q 200 125 300 125 L 300 140", color: "#3b82f6", active: ['fe', 'ml', 'fs', 'final'].includes(activeCard as string) },
                    { id: 'sd-ai', d: "M 100 220 L 100 245", color: "#06b6d4", active: ['ai', 'do', 'final'].includes(activeCard as string) },
                    { id: 'fe-ml', d: "M 300 220 L 300 245", color: "#f43f5e", active: ['ml', 'fs', 'final'].includes(activeCard as string) },
                    { id: 'ai-do', d: "M 100 330 L 100 355", color: "#f97316", active: ['do', 'final'].includes(activeCard as string) },
                    { id: 'ml-fs', d: "M 300 330 L 300 355", color: "#10b981", active: ['fs', 'final'].includes(activeCard as string) },
                    { id: 'do-dj', d: "M 100 440 Q 100 450 160 460", color: "#f97316", active: ['do', 'final'].includes(activeCard as string) },
                    { id: 'fs-dj', d: "M 300 440 Q 300 450 240 460", color: "#10b981", active: ['fs', 'final'].includes(activeCard as string) }
                ].map((path) => (
                    <g key={path.id}>
                        <path d={path.d} stroke={path.color} strokeWidth="2" strokeLinecap="round" className="opacity-60 dark:opacity-30" />
                        <motion.path
                            d={path.d}
                            stroke={path.color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: path.active ? 1 : 0,
                                opacity: path.active ? 1 : 0,
                                filter: path.active ? `drop-shadow(0 0 10px ${path.color})` : "none"
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                        />
                        {path.active && (
                            <motion.path
                                d={path.d}
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinecap="round"
                                className="opacity-60 text-white dark:text-white"
                                initial={{ pathLength: 1, pathOffset: 0, strokeDasharray: "5, 20" }}
                                animate={{ pathOffset: 1 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        )}
                    </g>
                ))}
            </svg>

            {isMounted && (
                <motion.div
                    className="flex flex-col gap-6 items-center"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {/* Level 1: Data Structures */}
                    <motion.div variants={cardVariants} whileHover="hover" className="relative z-10 w-full flex justify-center" onClick={() => setActiveCard('ds')}>
                        <motion.div
                            className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-64 cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'ds'
                                ? "border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.5)] dark:shadow-blue-500/20"
                                : "border-blue-300 dark:border-blue-500/30 dark:shadow-blue-500/10"
                                }`}
                            whileTap={{ scale: 0.96 }}
                            animate={{ y: [0, -10, 0] }}
                            transition={{ y: { duration: 4, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0 } }}
                            whileHover={{
                                borderColor: '#3b82f6',
                                boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 20px 40px rgba(59,130,246,0.2)',
                            }}
                        >
                            <motion.div
                                className="w-8 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mb-2"
                                animate={{ boxShadow: ['0 0 10px rgba(59,130,246,0.5)', '0 0 20px rgba(59,130,246,0.8)', '0 0 10px rgba(59,130,246,0.5)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <div className="flex items-center gap-2">
                                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                    <Brain className={`w-5 h-5 transition-colors ${activeCard === 'ds' ? "text-blue-600 dark:text-blue-200" : "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-200"}`} />
                                </motion.div>
                                <motion.h3
                                    animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className={`text-base font-bold tracking-tight transition-colors ${activeCard === 'ds' ? "text-blue-700 dark:text-blue-50" : "text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-50"}`}
                                >
                                    Data Structures
                                </motion.h3>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Level 2: Grid Row */}
                    <div className="grid grid-cols-2 gap-8 w-full px-2">
                        {/* System Design */}
                        <div className="flex justify-center" onClick={() => setActiveCard('sd')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'sd'
                                    ? "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.5)] dark:shadow-purple-500/20"
                                    : "border-purple-300 dark:border-purple-500/30 dark:shadow-purple-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -8, 0] }}
                                transition={{ y: { duration: 4.2, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.3 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#a855f7',
                                    boxShadow: '0 0 40px rgba(168,85,247,0.5), 0 20px 40px rgba(168,85,247,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(168,85,247,0.5)', '0 0 20px rgba(168,85,247,0.8)', '0 0 10px rgba(168,85,247,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-center gap-2">
                                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                        <Network className={`w-5 h-5 transition-colors ${activeCard === 'sd' ? "text-purple-600 dark:text-purple-200" : "text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-200"}`} />
                                    </motion.div>
                                    <motion.h3
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className={`text-sm font-bold tracking-tight leading-snug transition-colors ${activeCard === 'sd' ? "text-purple-700 dark:text-purple-50" : "text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-50"}`}
                                    >
                                        System Design
                                    </motion.h3>
                                </div>
                            </motion.div>
                        </div>

                        {/* Frontend Mastery */}
                        <div className="flex justify-center" onClick={() => setActiveCard('fe')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'fe'
                                    ? "border-sky-500 shadow-[0_0_40px_rgba(56,189,248,0.5)] dark:shadow-blue-500/20"
                                    : "border-sky-300 dark:border-blue-500/30 dark:shadow-blue-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -12, 0] }}
                                transition={{ y: { duration: 4.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.6 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#38bdf8',
                                    boxShadow: '0 0 40px rgba(56,189,248,0.5), 0 20px 40px rgba(56,189,248,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-sky-400 to-blue-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(59,130,246,0.5)', '0 0 20px rgba(59,130,246,0.8)', '0 0 10px rgba(59,130,246,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-start gap-2">
                                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                        <div className="mt-0.5"><Code className={`w-5 h-5 transition-colors ${activeCard === 'fe' ? "text-sky-600 dark:text-blue-200" : "text-sky-600 dark:text-blue-400 group-hover:text-sky-700 dark:group-hover:text-blue-200"}`} /></div>
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="flex flex-col"
                                    >
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'fe' ? "text-sky-700 dark:text-blue-50" : "text-gray-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-blue-50"}`}>Frontend</h3>
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'fe' ? "text-sky-700 dark:text-blue-50" : "text-gray-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-blue-50"}`}>Mastery</h3>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Level 3: Grid Row (AI & ML) */}
                    <div className="grid grid-cols-2 gap-8 w-full px-2">
                        {/* Artificial Intelligence */}
                        <div className="flex justify-center" onClick={() => setActiveCard('ai')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'ai'
                                    ? "border-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.5)] dark:shadow-cyan-500/20"
                                    : "border-cyan-300 dark:border-cyan-500/30 dark:shadow-cyan-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -9, 0] }}
                                transition={{ y: { duration: 4.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.9 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#22d3ee',
                                    boxShadow: '0 0 40px rgba(34,211,238,0.5), 0 20px 40px rgba(34,211,238,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(34,211,238,0.5)', '0 0 20px rgba(34,211,238,0.8)', '0 0 10px rgba(34,211,238,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5">
                                        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                            <Bot className={`w-5 h-5 transition-colors ${activeCard === 'ai' ? "text-cyan-600 dark:text-cyan-200" : "text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-200"}`} />
                                        </motion.div>
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="flex flex-col"
                                    >
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'ai' ? "text-cyan-700 dark:text-cyan-50" : "text-gray-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-50"}`}>Artificial</h3>
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'ai' ? "text-cyan-700 dark:text-cyan-50" : "text-gray-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-50"}`}>Intelligence</h3>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Machine Learning */}
                        <div className="flex justify-center" onClick={() => setActiveCard('ml')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'ml'
                                    ? "border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.5)] dark:shadow-rose-500/20"
                                    : "border-rose-300 dark:border-rose-500/30 dark:shadow-rose-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -11, 0] }}
                                transition={{ y: { duration: 5.2, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 1.2 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#f43f5e',
                                    boxShadow: '0 0 40px rgba(244,63,94,0.5), 0 20px 40px rgba(244,63,94,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(244,63,94,0.5)', '0 0 20px rgba(244,63,94,0.8)', '0 0 10px rgba(244,63,94,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-start gap-2">
                                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                        <div className="mt-0.5"><Cpu className={`w-5 h-5 transition-colors ${activeCard === 'ml' ? "text-rose-600 dark:text-rose-200" : "text-rose-600 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-200"}`} /></div>
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="flex flex-col"
                                    >
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'ml' ? "text-rose-700 dark:text-rose-50" : "text-gray-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-50"}`}>Machine</h3>
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'ml' ? "text-rose-700 dark:text-rose-50" : "text-gray-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-50"}`}>Learning</h3>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Level 4: Grid Row (DevOps & Full Stack) */}
                    <div className="grid grid-cols-2 gap-8 w-full px-2">
                        {/* DevOps */}
                        <div className="flex justify-center" onClick={() => setActiveCard('do')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'do'
                                    ? "border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.5)] dark:shadow-orange-500/20"
                                    : "border-orange-300 dark:border-orange-500/30 dark:shadow-orange-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -7, 0] }}
                                transition={{ y: { duration: 3.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 1.5 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#f97316',
                                    boxShadow: '0 0 40px rgba(249,115,22,0.5), 0 20px 40px rgba(249,115,22,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(249,115,22,0.5)', '0 0 20px rgba(249,115,22,0.8)', '0 0 10px rgba(249,115,22,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-start gap-2">
                                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                        <div className="mt-0.5"><Container className={`w-5 h-5 transition-colors ${activeCard === 'do' ? "text-orange-600 dark:text-orange-200" : "text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-200"}`} /></div>
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="flex flex-col"
                                    >
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'do' ? "text-orange-700 dark:text-orange-50" : "text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-50"}`}>DevOps</h3>
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'do' ? "text-orange-700 dark:text-orange-50" : "text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-50"}`}>Engineering</h3>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Full Stack */}
                        <div className="flex justify-center" onClick={() => setActiveCard('fs')}>
                            <motion.div
                                className={`relative bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group shadow-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === 'fs'
                                    ? "border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)] dark:shadow-emerald-500/20"
                                    : "border-emerald-300 dark:border-emerald-500/30 dark:shadow-emerald-500/10"
                                    }`}
                                whileTap={{ scale: 0.96 }}
                                animate={{ y: [0, -13, 0] }}
                                transition={{ y: { duration: 5.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 1.8 } }}
                                whileHover={{
                                    scale: 1.08,
                                    y: -8,
                                    borderColor: '#10b981',
                                    boxShadow: '0 0 40px rgba(16,185,129,0.5), 0 20px 40px rgba(16,185,129,0.2)',
                                }}
                            >
                                <motion.div className="w-8 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full mb-2" animate={{ boxShadow: ['0 0 10px rgba(16,185,129,0.5)', '0 0 20px rgba(16,185,129,0.8)', '0 0 10px rgba(16,185,129,0.5)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                <div className="flex items-start gap-2">
                                    <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                                        <div className="mt-0.5"><Layers className={`w-5 h-5 transition-colors ${activeCard === 'fs' ? "text-emerald-600 dark:text-emerald-200" : "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-200"}`} /></div>
                                    </motion.div>
                                    <motion.div
                                        animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="flex flex-col"
                                    >
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'fs' ? "text-emerald-700 dark:text-emerald-50" : "text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-50"}`}>Full Stack</h3>
                                        <h3 className={`text-sm font-bold tracking-tight leading-tight transition-colors ${activeCard === 'fs' ? "text-emerald-700 dark:text-emerald-50" : "text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-50"}`}>Developer</h3>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Level 5: Dream Job Roadmap */}
                    <motion.div
                        variants={cardVariants}
                        viewport={{ once: true }}
                        className="relative mt-0 w-full flex justify-center z-20"
                        onClick={() => setActiveCard('final')}
                    >
                        <motion.div
                            whileHover={{ scale: 1.08, y: -8 }}
                            whileTap={{ scale: 0.96 }}
                            className={`relative bg-gradient-to-br from-white/95 to-indigo-50/90 dark:from-[#020617]/95 dark:to-indigo-950/50 backdrop-blur-sm border-2 p-4 rounded-xl w-[190px] cursor-pointer group overflow-hidden shadow-xl transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeCard === null || activeCard === 'ds'
                                ? "border-indigo-300 dark:border-indigo-500/40 shadow-indigo-500/20"
                                : "border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)] dark:shadow-yellow-500/20"
                                }`}
                            animate={{
                                y: [0, -15, 0],
                                borderColor: activeCard === null ? ['#c7d2fe', '#a78bfa', '#c7d2fe'] : undefined,
                                boxShadow: activeCard === null ? [
                                    '0 0 30px rgba(99,102,241,0.3)',
                                    '0 0 50px rgba(168,85,247,0.4)',
                                    '0 0 30px rgba(99,102,241,0.3)'
                                ] : undefined,
                            }}
                            transition={{
                                y: { duration: 6, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 2.1 },
                                borderColor: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                            }}
                        >
                            {/* Animated gradient line */}
                            <motion.div
                                className="w-8 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full mb-2"
                                animate={{
                                    boxShadow: [
                                        '0 0 15px rgba(99,102,241,0.6)',
                                        '0 0 25px rgba(168,85,247,0.9)',
                                        '0 0 15px rgba(99,102,241,0.6)'
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />

                            <div className="flex items-start gap-2">
                                <motion.div
                                    className="mt-0.5"
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-300 transition-colors drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                                </motion.div>
                                <motion.div
                                    animate={{ scale: [1, 1.01, 1], rotate: [0, 0.5, -0.5, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="flex flex-col justify-center h-full"
                                >
                                    <motion.span
                                        className="text-[9px] font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-0.5"
                                        animate={{ opacity: [0.7, 1, 0.7] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        Final Destination
                                    </motion.span>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-50 transition-colors">FreshKite</h3>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-50 transition-colors">Roadmap</h3>
                                </motion.div>
                            </div>
                            {/* Subtle glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-xl rounded-xl -z-10" />
                        </motion.div>
                    </motion.div>


                </motion.div>
            )}
        </div>
    );
}
