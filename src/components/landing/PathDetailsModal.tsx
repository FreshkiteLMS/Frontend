"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, ArrowRight } from 'lucide-react';

interface PathContent {
    title: string;
    description: string;
    duration: string;
    level: string;
    topics: string[];
    outcomes: string[];
}

const pathData: Record<string, PathContent> = {
    ds: {
        title: "Data Structures & Algorithms",
        description: "Master the building blocks of efficient software. Learn to solve complex problems with optimized data organization and algorithmic thinking.",
        duration: "12 Weeks",
        level: "Beginner to Advanced",
        topics: ["Memory Management & Pointers", "Advanced Linked Lists & Binary Trees", "Heaps, Tries & Balanced Trees", "Dynamic Programming Mastery", "Graph Theory & Pathfinding Algorithms"],
        outcomes: ["Ability to crack FAANG-level coding interviews", "Deep understanding of Time and Space complexity", "Skill to optimize production-level codebases"]
    },
    sd: {
        title: "System Design",
        description: "Learn to architect scalable, resilient, and high-performing distributed systems that can handle millions of users.",
        duration: "10 Weeks",
        level: "Intermediate to Expert",
        topics: ["Vertical vs Horizontal Scaling", "Database Sharding & Replication", "Caching Strategies (Redis, Memcached)", "Microservices & Event-Driven Architecture", "Load Balancing & API Gateways"],
        outcomes: ["Competence in designing large-scale web apps", "Knowledge of modern architecture patterns", "Clear understanding of CAP theorem and trade-offs"]
    },
    fe: {
        title: "Frontend Mastery",
        description: "Build stunning, fast, and accessible user interfaces. Master the modern frontend stack from core concepts to advanced patterns.",
        duration: "14 Weeks",
        level: "Intermediate",
        topics: ["Advanced React (Concurrent Mode, Server Components)", "State Management (Zustand, Redux Toolkit)", "High-Performance CSS & Animations", "Framework Mastery (Next.js, Remix)", "Web Performance & Core Web Vitals"],
        outcomes: ["Expertise in building premium web experiences", "Production-grade frontend architectural skills", "Mastery over responsive and fluid design"]
    },
    ai: {
        title: "Artificial Intelligence",
        description: "Dive into the future with Deep Learning and Neural Networks. Build intelligent systems that see, hear, and speak.",
        duration: "16 Weeks",
        level: "Advanced",
        topics: ["Neural Network Foundations", "Natural Language Processing (NLP)", "Computer Vision & Pattern Recognition", "Generative AI & Large Language Models", "AI Ethics & Sustainable Development"],
        outcomes: ["Ability to build and train neural networks", "Practical experience with LLMs and prompt engineering", "Deployment of AI models to production"]
    },
    ml: {
        title: "Machine Learning",
        description: "Discover the power of data. Learn statistical modeling and predictive analysis to find patterns and make data-driven decisions.",
        duration: "12 Weeks",
        level: "Intermediate",
        topics: ["Supervised & Unsupervised Learning", "Regression, Classification & Clustering", "Feature Engineering & Data Preprocessing", "Ensemble Methods (Random Forests, XGBoost)", "Model Evaluation & Hyperparameter Tuning"],
        outcomes: ["Expertise in statistical data analysis", "Ability to build predictive models for business", "Foundation for advanced AI research"]
    },
    do: {
        title: "DevOps Engineering",
        description: "Bridge the gap between development and operations. Automate infrastructure and master the art of continuous delivery.",
        duration: "10 Weeks",
        level: "Intermediate",
        topics: ["Docker & Container Orchestration (K8s)", "CI/CD Pipeline Automation", "Infrastructure as Code (Terraform, Ansible)", "Cloud Security & Compliance", "Site Reliability Engineering (SRE) Principles"],
        outcomes: ["Mastery over cloud infrastructure", "Zero-downtime deployment skills", "Ability to manage secure, scalable clusters"]
    },
    fs: {
        title: "Full Stack Developer",
        description: "Become a versatile engineer. Master both frontend and backend to build complete, end-to-end applications from scratch.",
        duration: "14 Weeks",
        level: "Beginner to Intermediate",
        topics: ["Backend Mastery (Node.js, Go, or Python)", "Advanced API Design (REST, GraphQL)", "Authentication & Security (OAuth, JWT)", "Real-time Systems (WebSockets, Socket.io)", "Serverless & Edge Computing Deployment"],
        outcomes: ["Complete end-to-end development confidence", "Architectural knowledge of full-stack apps", "Skill to lead and build startup products"]
    },
    final: {
        title: "FreshKite Career Roadmap",
        description: "Your journey doesn't end here. This roadmap is designed to transform you into a world-class engineer, ready to lead and innovate in the global tech landscape.",
        duration: "1 Year Program",
        level: "Comprehensive",
        topics: ["End-to-end Project Execution", "Collaborative Engineering Culture", "Advanced Problem Solving Lab", "Industry Mentorship & Networking", "Career Stealth & Personal Brand"],
        outcomes: ["Placement in top-tier global tech firms", "Strong foundation for entrepreneurial ventures", "Lifelong membership in an elite engineering circle"]
    }
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathId: string | null;
    color: string;
}

export function PathDetailsModal({ isOpen, onClose, pathId, color }: ModalProps) {
    const data = pathId ? pathData[pathId] : null;

    return (
        <AnimatePresence>
            {isOpen && data && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-white dark:bg-[#030712] rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/10"
                    >
                        {/* Header Gradient */}
                        <div
                            className="h-32 w-full relative overflow-hidden"
                            style={{ background: `linear-gradient(135deg, ${color}, #000)` }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10"
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        <div className="px-8 pb-8 -mt-10 relative">
                            {/* Icon */}
                            <div className="flex justify-between items-end mb-6">
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-4 border-white dark:border-[#030712]"
                                    style={{ background: color }}
                                >
                                    <GraduationCap className="text-white w-10 h-10" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
                                        {data.title}
                                    </h2>
                                </div>

                                {/* Action Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-4 rounded-2xl font-black text-white tracking-[0.2em] shadow-xl group relative overflow-hidden flex items-center justify-center gap-3 uppercase text-xs"
                                    style={{ background: `linear-gradient(to right, ${color}, #000)` }}
                                >
                                    <span className="relative z-10">Start This Path Now</span>
                                    <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
