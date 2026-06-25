"use client";

import { useState, useEffect } from "react";
import { AlignLeft } from "lucide-react";
import type { Heading } from "./CourseRenderer";

interface TableOfContentsProps {
    headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

    useEffect(() => {
        if (headings.length === 0) return;

        // Track which heading is currently in view by comparing scroll position
        const onScroll = () => {
            const offset = 100; // px below top of viewport to trigger change
            const scrollY = window.scrollY + offset;
            let current = headings[0]?.id ?? "";

            for (const { id } of headings) {
                const el = document.getElementById(id);
                if (el && el.offsetTop <= scrollY) current = id;
            }
            setActiveId(current);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // run once immediately
        return () => window.removeEventListener("scroll", onScroll);
    }, [headings]);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const navbarHeight = 64; // 4rem
        const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight - 16;
        window.scrollTo({ top, behavior: "smooth" });
    };

    // Don't render if there are fewer than 2 headings — not worth the column space
    if (headings.length < 2) return null;

    return (
        <nav aria-label="Table of contents">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <AlignLeft className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                    On this page
                </span>
            </div>

            <ul className="space-y-0.5">
                {headings.map(({ id, text, level }) => {
                    const isActive = activeId === id;
                    return (
                        <li
                            key={id}
                            style={{ paddingLeft: level === 1 ? 0 : level === 2 ? 12 : 24 }}
                        >
                            <button
                                onClick={() => scrollTo(id)}
                                title={text}
                                className={`w-full text-left py-1.5 px-2.5 rounded-lg text-[12.5px] leading-snug transition-all duration-150 ${
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                }`}
                            >
                                <span className="line-clamp-2">{text}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
