"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApplyModal({ isOpen, onClose }: ApplyModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        experience: "",
        motivation: "",
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // WhatsApp message format
        const message = `Hi FreshKite! I want to apply for the Elite Engineering program.

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Experience: ${formData.experience}

Why I want to join: ${formData.motivation}`;

        const whatsappUrl = `https://wa.me/918489186717?text=${encodeURIComponent(message)}`;
        const mailtoUrl = `mailto:compsciuniv@gmail.com?subject=${encodeURIComponent("Elite Engineering Application: " + formData.name)}&body=${encodeURIComponent(message)}`;

        // Open WhatsApp in a new tab
        window.open(whatsappUrl, "_blank");
        // Open email client
        window.location.href = mailtoUrl;

        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity">
            <div
                className="w-full max-w-lg bg-white dark:bg-[#0a0a0c] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
            >
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-white/10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white font-sans tracking-tight">Apply for Elite</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111116] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <input
                                required
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111116] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone / WhatsApp</label>
                            <input
                                required
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                type="tel"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111116] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Role/Experience</label>
                            <select
                                required
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111116] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="" disabled>Select experience level</option>
                                <option value="Student">Student (College)</option>
                                <option value="Recent Graduate">Recent Graduate</option>
                                <option value="0-2 Years">0-2 Years Experience</option>
                                <option value="3+ Years">3+ Years Experience</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Why do you want to join Elite?</label>
                        <textarea
                            required
                            name="motivation"
                            value={formData.motivation}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111116] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Tell us about your learning goals and drive..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-3.5 rounded-lg font-bold text-white tracking-wider transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20 active:scale-95"
                            style={{ background: "linear-gradient(to right, #5b13ec, #3b82f6)" }}
                        >
                            SUBMIT APPLICATION
                        </button>
                        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-4">
                            By submitting, your details will be sent to FreshKite via WhatsApp and Email.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
