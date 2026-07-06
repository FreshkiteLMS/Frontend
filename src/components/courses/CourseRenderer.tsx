"use client";

import { useState, useMemo, memo } from "react";
import {
    CheckSquare,
    Link as LinkIcon,
    Copy,
    Check,
    AlertCircle,
    Info,
    Lightbulb,
    CheckCircle2,
    ExternalLink,
} from "lucide-react";
import { getYouTubeEmbedUrl, isYouTubeUrl } from "@/lib/video-utils";

// ─── Exported types ─────────────────────────────────────────────────────────

export interface NormalizedSection {
    id: string;
    title: string;
    content: string;
    videos: string[];
    assignments: string[];
    resources: string[];
}

export interface Heading {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

// ─── Internal block types ────────────────────────────────────────────────────

type HeadingBlock = { type: "h1" | "h2" | "h3" | "h4"; text: string; id: string };

type ContentBlock =
    | HeadingBlock
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
    | { type: "ordered-list"; items: string[] }
    | { type: "blockquote"; text: string }
    | { type: "image"; src: string; alt: string }
    | { type: "code"; language: string; code: string }
    | { type: "table"; headers: string[]; rows: string[][] }
    | { type: "callout"; variant: "info" | "tip" | "warning" | "success"; text: string }
    | { type: "divider" };

// ─── Utilities ───────────────────────────────────────────────────────────────

export function normalizeSection(raw: any): NormalizedSection {
    const videos: string[] = [];
    const pushVideo = (v?: string) => {
        if (v && typeof v === "string" && v.trim() && !videos.includes(v.trim())) {
            videos.push(v.trim());
        }
    };
    (raw.youtube_videos || raw.youtubeVideos || []).forEach(pushVideo);
    pushVideo(raw.video_url || raw.videoUrl);

    return {
        id: raw.id,
        title: raw.title,
        content: raw.content || "",
        videos,
        assignments: raw.assignments || [],
        resources: raw.resources || [],
    };
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Extract h1/h2/h3 headings from raw content string for the TOC. */
export function extractHeadings(content: string): Heading[] {
    if (!content?.trim()) return [];
    return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^#{1,3}\s/.test(l))
        .map((l) => {
            const m = l.match(/^(#{1,3})\s+(.+)$/);
            if (!m) return null;
            const level = Math.min(m[1].length, 3) as 1 | 2 | 3;
            const text = m[2].trim();
            return { id: slugify(text), text, level };
        })
        .filter((h): h is Heading => h !== null);
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function detectCallout(line: string): { variant: "info" | "tip" | "warning" | "success"; text: string } | null {
    const patterns: { re: RegExp; variant: "info" | "tip" | "warning" | "success" }[] = [
        { re: /^(💡|Tip:|TIP:)\s*/i, variant: "tip" },
        { re: /^(⚠️|⚠|Warning:|WARNING:)\s*/i, variant: "warning" },
        { re: /^(ℹ️|Info:|INFO:|Note:|NOTE:)\s*/i, variant: "info" },
        { re: /^(✅|Best Practice:|BEST PRACTICE:)\s*/i, variant: "success" },
    ];
    for (const { re, variant } of patterns) {
        if (re.test(line)) return { variant, text: line.replace(re, "").trim() };
    }
    return null;
}

function parseTableRow(line: string): string[] {
    return line
        .split("|")
        .map((c) => c.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

function isTableSeparator(line: string): boolean {
    return /^\|?[\s\-:|]+\|/.test(line);
}

function parseContent(content: string): ContentBlock[] {
    if (!content?.trim()) return [];

    const lines = content.split("\n");
    const blocks: ContentBlock[] = [];
    let i = 0;
    let listBuf: string[] = [];
    let orderedBuf: string[] = [];

    const flushBuffers = () => {
        if (listBuf.length > 0) { blocks.push({ type: "list", items: [...listBuf] }); listBuf = []; }
        if (orderedBuf.length > 0) { blocks.push({ type: "ordered-list", items: [...orderedBuf] }); orderedBuf = []; }
    };

    while (i < lines.length) {
        const raw = lines[i];
        const line = raw.trim();

        if (!line) { flushBuffers(); i++; continue; }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            flushBuffers();
            blocks.push({ type: "divider" });
            i++; continue;
        }

        // Code fence
        if (line.startsWith("```")) {
            flushBuffers();
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            i++;
            blocks.push({ type: "code", language: lang || "text", code: codeLines.join("\n") });
            continue;
        }

        // Markdown table (requires next line to also start with |)
        if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
            flushBuffers();
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                tableLines.push(lines[i].trim());
                i++;
            }
            if (tableLines.length >= 2) {
                const headers = parseTableRow(tableLines[0]);
                const rows: string[][] = [];
                for (let r = 1; r < tableLines.length; r++) {
                    if (!isTableSeparator(tableLines[r])) rows.push(parseTableRow(tableLines[r]));
                }
                if (headers.length > 0) { blocks.push({ type: "table", headers, rows }); continue; }
            }
            continue;
        }

        // Image
        const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (img) {
            flushBuffers();
            blocks.push({ type: "image", src: img[2], alt: img[1] || "Course image" });
            i++; continue;
        }

        // Blockquote
        if (line.startsWith(">")) {
            flushBuffers();
            blocks.push({ type: "blockquote", text: line.replace(/^>\s*/, "") });
            i++; continue;
        }

        // Callout emoji/prefix
        const callout = detectCallout(line);
        if (callout) {
            flushBuffers();
            blocks.push({ type: "callout", ...callout });
            i++; continue;
        }

        // Headings
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushBuffers();
            const lvl = heading[1].length;
            const text = heading[2].trim();
            const hType: "h1" | "h2" | "h3" | "h4" = lvl <= 1 ? "h1" : lvl === 2 ? "h2" : lvl === 3 ? "h3" : "h4";
            blocks.push({ type: hType, text, id: slugify(text) });
            i++; continue;
        }

        // Unordered list
        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
            if (orderedBuf.length > 0) { blocks.push({ type: "ordered-list", items: [...orderedBuf] }); orderedBuf = []; }
            listBuf.push(bullet[1]);
            i++; continue;
        }

        // Ordered list
        const numbered = line.match(/^\d+[.)]\s+(.+)$/);
        if (numbered) {
            if (listBuf.length > 0) { blocks.push({ type: "list", items: [...listBuf] }); listBuf = []; }
            orderedBuf.push(numbered[1]);
            i++; continue;
        }

        // Paragraph
        flushBuffers();
        blocks.push({ type: "paragraph", text: line });
        i++;
    }

    flushBuffers();
    return blocks;
}

// ─── Inline markdown renderer ────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, [text](url)

function InlineText({ text }: { text: string }) {
    const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        const token = m[0];
        if (token.startsWith("**")) {
            parts.push(<strong key={m.index} className="font-semibold text-gray-900 dark:text-gray-100">{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("*")) {
            parts.push(<em key={m.index} className="italic">{token.slice(1, -1)}</em>);
        } else if (token.startsWith("`")) {
            parts.push(
                <code key={m.index} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[0.85em] font-mono text-rose-600 dark:text-rose-400 rounded-md">
                    {token.slice(1, -1)}
                </code>
            );
        } else {
            const lm = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (lm) {
                parts.push(
                    <a key={m.index} href={lm[2]} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        {lm[1]}
                    </a>
                );
            }
        }
        last = m.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));

    return <>{parts}</>;
}

// ─── Code block ──────────────────────────────────────────────────────────────

const CodeBlock = memo(function CodeBlock({ language, code }: { language: string; code: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-8 rounded-xl overflow-hidden border border-gray-700/60 shadow-md">
            {/* Tab bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e2e] border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-400 tracking-wide">
                        {language || "code"}
                    </span>
                </div>
                <button
                    onClick={copy}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-all"
                >
                    {copied
                        ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>
                    }
                </button>
            </div>
            {/* Code */}
            <pre className="p-5 bg-[#1e1e2e] text-slate-100 overflow-x-auto text-[13.5px] leading-[1.75] font-mono">
                <code>{code}</code>
            </pre>
        </div>
    );
});

// ─── Callout block ───────────────────────────────────────────────────────────

const calloutStyles = {
    info: {
        wrap: "bg-blue-50 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-800/50 border-l-4 border-l-blue-400 dark:border-l-blue-500",
        icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />,
        label: "Note",
        labelColor: "text-blue-700 dark:text-blue-400",
        textColor: "text-blue-900 dark:text-blue-200",
    },
    tip: {
        wrap: "bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 border-l-4 border-l-amber-400 dark:border-l-amber-500",
        icon: <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
        label: "Tip",
        labelColor: "text-amber-700 dark:text-amber-400",
        textColor: "text-amber-900 dark:text-amber-200",
    },
    warning: {
        wrap: "bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-800/50 border-l-4 border-l-red-400 dark:border-l-red-500",
        icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />,
        label: "Warning",
        labelColor: "text-red-700 dark:text-red-400",
        textColor: "text-red-900 dark:text-red-200",
    },
    success: {
        wrap: "bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-800/50 border-l-4 border-l-green-400 dark:border-l-green-500",
        icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />,
        label: "Best Practice",
        labelColor: "text-green-700 dark:text-green-400",
        textColor: "text-green-900 dark:text-green-200",
    },
};

// ─── Image block ─────────────────────────────────────────────────────────────
// Renders an embedded-image content block. Responsive (max-width, scales down
// on small viewports), lazy-loaded, rounded corners, and preserves aspect
// ratio via the image's own intrinsic dimensions (no layout shift once
// loaded). Shows a skeleton placeholder while loading and a graceful fallback
// if the image 404s or the R2 URL becomes unreachable.

const ImageBlock = memo(function ImageBlock({ src, alt }: { src: string; alt: string }) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

    return (
        <>
            <figure className="my-8">
                <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm">
                    {status === "loading" && (
                        <div className="absolute inset-0 animate-pulse bg-gray-100 dark:bg-gray-800" aria-hidden="true" />
                    )}

                    {status === "error" ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-600">
                            <AlertCircle className="w-8 h-8" />
                            <p className="text-sm">Image failed to load</p>
                        </div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={src}
                            alt={alt}
                            loading="lazy"
                            decoding="async"
                            onClick={() => status === "loaded" && setExpanded(true)}
                            onLoad={() => setStatus("loaded")}
                            onError={() => setStatus("error")}
                            className={`w-full h-auto max-h-[480px] object-contain transition-opacity duration-300 ${
                                status === "loaded" ? "opacity-100 cursor-zoom-in hover:opacity-95" : "opacity-0"
                            }`}
                        />
                    )}
                </div>
                {alt && alt !== "Course image" && alt !== "Embedded image" && (
                    <figcaption className="mt-2.5 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                        {alt}
                    </figcaption>
                )}
            </figure>

            {/* Lightbox */}
            {expanded && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
                    onClick={() => setExpanded(false)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    <button
                        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-light transition-colors"
                        onClick={() => setExpanded(false)}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            )}
        </>
    );
});

// ─── Table block ─────────────────────────────────────────────────────────────

const TableBlock = memo(function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="my-8 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-sm min-w-[500px]">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        {headers.map((h, i) => (
                            <th key={i} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${ri % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-800/25" : ""}`}>
                            {row.map((cell, ci) => (
                                <td key={ci} className="px-5 py-3.5 text-gray-700 dark:text-gray-300 leading-relaxed">
                                    <InlineText text={cell} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// ─── Course content ───────────────────────────────────────────────────────────

export const CourseContent = memo(function CourseContent({ content }: { content: string }) {
    const blocks = useMemo(() => parseContent(content), [content]);
    if (blocks.length === 0) return null;

    return (
        <div>
            {blocks.map((block, i) => {
                switch (block.type) {

                    // ── Headings ──────────────────────────────────────────
                    case "h1":
                        return (
                            <h2 key={i} id={block.id}
                                className="text-[26px] font-bold text-gray-900 dark:text-white mt-14 mb-4 leading-tight tracking-tight scroll-mt-24 pb-3 border-b border-gray-100 dark:border-gray-800">
                                {block.text}
                            </h2>
                        );
                    case "h2":
                        return (
                            <h3 key={i} id={block.id}
                                className="text-[21px] font-bold text-gray-900 dark:text-white mt-10 mb-3 leading-tight scroll-mt-24">
                                {block.text}
                            </h3>
                        );
                    case "h3":
                        return (
                            <h4 key={i} id={block.id}
                                className="text-[17px] font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-2.5 scroll-mt-24">
                                {block.text}
                            </h4>
                        );
                    case "h4":
                        return (
                            <h5 key={i} id={(block as HeadingBlock).id}
                                className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mt-6 mb-2 scroll-mt-24">
                                {block.text}
                            </h5>
                        );

                    // ── Paragraph ─────────────────────────────────────────
                    case "paragraph":
                        return (
                            <p key={i} className="text-[17px] text-gray-700 dark:text-gray-300 leading-[1.85] mb-5">
                                <InlineText text={block.text} />
                            </p>
                        );

                    // ── Bullet list ───────────────────────────────────────
                    case "list":
                        return (
                            <ul key={i} className="my-5 space-y-2.5 pl-0">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex items-start gap-3 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8]">
                                        <span className="flex-shrink-0 mt-[11px] w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500" />
                                        <span><InlineText text={item} /></span>
                                    </li>
                                ))}
                            </ul>
                        );

                    // ── Numbered / step list ──────────────────────────────
                    case "ordered-list":
                        return (
                            <ol key={i} className="my-6 space-y-3.5 pl-0">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex items-start gap-4">
                                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center leading-none mt-0.5 shadow-sm shadow-blue-100 dark:shadow-none">
                                            {j + 1}
                                        </span>
                                        <span className="flex-1 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8] pt-0.5">
                                            <InlineText text={item} />
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        );

                    // ── Blockquote ────────────────────────────────────────
                    case "blockquote":
                        return (
                            <blockquote key={i}
                                className="my-6 pl-5 pr-4 py-3.5 border-l-4 border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-950/20 rounded-r-xl">
                                <p className="text-[16px] text-gray-700 dark:text-gray-300 leading-[1.8] italic">
                                    <InlineText text={block.text} />
                                </p>
                            </blockquote>
                        );

                    // ── Image ─────────────────────────────────────────────
                    case "image":
                        return <ImageBlock key={i} src={block.src} alt={block.alt} />;

                    // ── Code ──────────────────────────────────────────────
                    case "code":
                        return <CodeBlock key={i} language={block.language} code={block.code} />;

                    // ── Table ─────────────────────────────────────────────
                    case "table":
                        return <TableBlock key={i} headers={block.headers} rows={block.rows} />;

                    // ── Callout ───────────────────────────────────────────
                    case "callout": {
                        const s = calloutStyles[block.variant];
                        return (
                            <div key={i} className={`my-6 flex gap-3.5 px-4 py-4 rounded-xl ${s.wrap}`}>
                                {s.icon}
                                <div>
                                    <p className={`text-[13px] font-bold mb-0.5 ${s.labelColor}`}>{s.label}</p>
                                    <p className={`text-sm leading-[1.75] ${s.textColor}`}>
                                        <InlineText text={block.text} />
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    // ── Divider ───────────────────────────────────────────
                    case "divider":
                        return <hr key={i} className="my-10 border-gray-200 dark:border-gray-800" />;

                    default:
                        return null;
                }
            })}
        </div>
    );
});

// ─── Video section ────────────────────────────────────────────────────────────

export const VideoSection = memo(function VideoSection({ videos }: { videos: string[] }) {
    if (!videos || videos.length === 0) return null;
    return (
        <div className="mb-10 space-y-6">
            {videos.map((url, i) => {
                const embed = isYouTubeUrl(url) ? getYouTubeEmbedUrl(url) : url;
                if (!embed) {
                    return (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-blue-600 transition-colors">{url}</a>
                        </div>
                    );
                }
                return (
                    <div key={i} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md bg-black">
                        <div className="relative aspect-video">
                            <iframe
                                src={embed}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title={`Lesson video ${i + 1}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// ─── Assignment section ───────────────────────────────────────────────────────

export const AssignmentSection = memo(function AssignmentSection({ assignments }: { assignments: string[] }) {
    if (!assignments || assignments.length === 0) return null;
    return (
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Practice Tasks
                </h4>
            </div>
            <div className="space-y-3">
                {assignments.map((task, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                        <span className="flex-shrink-0 w-7 h-7 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center mt-0.5 text-amber-700 dark:text-amber-400 font-bold text-sm leading-none">
                            {i + 1}
                        </span>
                        <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed flex-1">{task}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});

// ─── Resource section ─────────────────────────────────────────────────────────

export const ResourceSection = memo(function ResourceSection({ resources }: { resources: string[] }) {
    if (!resources || resources.length === 0) return null;
    const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
    return (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Further Reading
                </h4>
            </div>
            <div className="space-y-2">
                {resources.map((res, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        {isUrl(res) ? (
                            <a href={res.trim()} target="_blank" rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                                {res.trim()}
                            </a>
                        ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{res}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

// ─── Full section renderer ────────────────────────────────────────────────────

export function CourseRenderer({ section }: { section: any }) {
    const s = useMemo(() => normalizeSection(section), [section]);
    return (
        <div>
            <VideoSection videos={s.videos} />
            {/* Embedded images render inline, at their exact document position,
                as part of the block-based CourseContent parse below. */}
            <CourseContent content={s.content} />
            <AssignmentSection assignments={s.assignments} />
            <ResourceSection resources={s.resources} />
        </div>
    );
}

