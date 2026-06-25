"use client";

import Image from "next/image";
import manikandanImg from "../../assets/manikandan.jpg";
import nishokImg from "../../assets/nishok.jpg";
import dhilipanImg from "../../assets/dhilipan_pro.png";
import { TrendingUp, Quote } from "lucide-react";

const testimonials = [
    {
        name: "Manikandan",
        role: "Software Engineer",
        company: "Netgear",
        package: "20 LPA",
        image: manikandanImg,
        quote: "FreshKite's mentorship was the key. The structured approach and hands-on guidance helped me crack a 20 LPA offer at Netgear — something I wouldn't have achieved on my own.",
        accentColor: "blue",
    },
    {
        name: "Nishok",
        role: "Software Engineer",
        company: "Qualcomm",
        package: "57 LPA",
        image: nishokImg,
        quote: "The structured roadmap at FreshKite helped me master system architecture from the ground up. Cracking a 57 LPA offer at Qualcomm was an unbelievable result — but the preparation made all the difference.",
        accentColor: "indigo",
        featured: true,
    },
    {
        name: "Dhilipan",
        role: "Software Developer",
        company: "Avasoft",
        package: "13 LPA",
        image: dhilipanImg,
        quote: "The hands-on projects and elite mentorship at FreshKite transformed my technical thinking completely. I went from struggling with concepts to confidently building and shipping real-world solutions.",
        accentColor: "emerald",
    },
];

export function TestimonialsSection() {
    return (
        <section id="success-stories" className="py-24 bg-gray-50 dark:bg-gray-900/40">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                        Success Stories
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
                        Engineers Who Made It
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Real people, real placements. Hear from our alumni who landed roles at top tech companies after training with FreshKite.
                    </p>
                </div>

                {/* Testimonials grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, i) => (
                        <TestimonialCard key={i} testimonial={testimonial} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
    const isFeatured = testimonial.featured;

    return (
        <div className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
            isFeatured
                ? 'bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-black/5 dark:hover:shadow-black/30'
        }`}>
            {/* Quote icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${
                isFeatured
                    ? 'bg-white/20'
                    : 'bg-blue-50 dark:bg-blue-950/50'
            }`}>
                <Quote className={`w-5 h-5 ${isFeatured ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>

            {/* Quote text */}
            <p className={`text-sm leading-relaxed mb-8 flex-1 ${
                isFeatured
                    ? 'text-blue-50'
                    : 'text-gray-600 dark:text-gray-400'
            }`}>
                "{testimonial.quote}"
            </p>

            {/* Divider */}
            <div className={`h-px mb-6 ${isFeatured ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`} />

            {/* Author */}
            <div className="flex items-center gap-4">
                {/* Photo */}
                <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ${
                    isFeatured ? 'ring-white/30' : 'ring-gray-100 dark:ring-gray-800'
                }`}>
                    <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isFeatured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {testimonial.name}
                    </p>
                    <p className={`text-xs ${isFeatured ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {testimonial.role} · {testimonial.company}
                    </p>
                </div>

                {/* Package badge */}
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full shrink-0 ${
                    isFeatured
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                }`}>
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-bold">{testimonial.package}</span>
                </div>
            </div>
        </div>
    );
}
