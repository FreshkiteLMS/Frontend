"use client";

import { useState } from "react";
import { Linkedin, Instagram, Twitter, Mail, Phone } from "lucide-react";
import { ApplyModal } from "@/components/ui/ApplyModal";

export function LandingFooter() {
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    return (
        <footer className="relative border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#050507] transition-colors duration-500">
            {/* Subtle top glow */}
            <div
                className="absolute top-0 left-0 right-0 h-px dark:block hidden"
                style={{ background: "linear-gradient(to right, transparent, rgba(91,19,236,0.6), transparent)" }}
            />

            <div className="max-w-6xl mx-auto px-8 lg:px-20 pt-16 pb-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Brand */}
                <div className="md:col-span-1 flex flex-col gap-4">
                    <div>
                        <span className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white font-sans transition-colors">
                            FRESH<span className="text-blue-500">KITE</span>
                        </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-sans leading-relaxed">
                        Earn while you learn — expert-led courses and mentorship for elite engineers. Join our elite community of master engineers today.
                    </p>
                    <div className="flex gap-3 mt-1">
                        {[
                            { Icon: Linkedin, color: "hover:text-blue-500 dark:hover:text-blue-400" },
                            { Icon: Instagram, color: "hover:text-pink-500 dark:hover:text-pink-400" },
                            { Icon: Twitter, color: "hover:text-sky-500 dark:hover:text-sky-400" },
                        ].map(({ Icon, color }, i) => (
                            <button
                                key={i}
                                className={`w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 ${color} hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all`}
                            >
                                <Icon size={16} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resources */}
                <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-white font-sans transition-colors">Resources</h4>
                    {["Learning Paths", "Success Stories", "Team", "Events"].map((link) => (
                        <a
                            key={link}
                            href={link === "Team" ? "/team" : link === "Success Stories" ? "/success-stories" : "/#"}
                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white text-sm font-sans transition-all hover:translate-x-1 inline-block"
                        >
                            {link}
                        </a>
                    ))}
                </div>

                {/* Contact */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-white font-sans transition-colors">Contact Us</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Mail size={15} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-sans transition-colors">bala@freshkite.com</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                            <Phone size={15} className="text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-sans transition-colors">8489186717</span>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-900 dark:text-white font-sans transition-colors">Join Elite</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-sans leading-relaxed transition-colors">
                        Ready to transform your engineering career?
                    </p>
                    <button
                        onClick={() => setIsApplyModalOpen(true)}
                        className="w-full py-3 rounded-lg font-bold text-sm text-white tracking-wider transition-all hover:scale-105 font-sans shadow-lg shadow-blue-500/20"
                        style={{ background: "linear-gradient(to right, #5b13ec, #3b82f6)" }}
                    >
                        APPLY NOW
                    </button>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-200 dark:border-white/5 px-8 lg:px-20 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-gray-500 dark:text-gray-600 text-xs font-sans">© 2025 FreshKite. All rights reserved.</p>
                <p className="text-gray-500 dark:text-gray-600 text-xs font-sans">Earn while you learn.</p>
            </div>

            <ApplyModal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} />
        </footer>
    );
}
