"use client";

/**
 * LEGACY renderer — only for courses created before AI structuring, whose
 * sections store content as a free-form string. It re-derives blocks from
 * that string (the old `#` / ``` / `|` conventions) because that is the only
 * structure those records have.
 *
 * New courses never come through here: they carry `structured_content` and
 * render via structured/ContentBlockRenderer. Do not extend this parser —
 * upgrade a legacy course by reprocessing its source document instead.
 * Presentation is shared with the structured renderer (CodeView, TableView, …).
 */

import { useMemo, memo } from "react";
import { CheckSquare, Link as LinkIcon, ExternalLink } from "lucide-react";
import type { Heading } from "../TableOfContents";
import { CodeView } from "../structured/blocks/code";
import { CalloutView, type CalloutVariant } from "../structured/blocks/callouts";
import { ImageView, VideoView } from "../structured/blocks/media";
import { TableView } from "../structured/blocks/table";

export interface LegacySection {
    id: string;
    title: string;
    content: string;
    videos: string[];
    assignments: string[];
    resources: string[];
}

type LegacyBlock =
    | { type: "h1" | "h2" | "h3" | "h4"; text: string; id: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
    | { type: "ordered-list"; items: string[] }
    | { type: "blockquote"; text: string }
    | { type: "image"; src: string; alt: string }
    | { type: "code"; language: string; code: string }
    | { type: "table"; headers: string[]; rows: string[][] }
    | { type: "callout"; variant: CalloutVariant; label?: string; text: string }
    | { type: "divider" };

export function normalizeLegacySection(raw: any): LegacySection {
    const videos: string[] = [];
    const pushVideo = (v?: string) => {
        if (v && typeof v === "string" && v.trim() && !videos.includes(v.trim())) videos.push(v.trim());
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
    return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

/** h1–h3 headings of a legacy content string, for the table of contents. */
export function extractLegacyHeadings(content: string): Heading[] {
    if (!content?.trim()) return [];
    return content
        .split("\n")
        .map((l) => l.trim().match(/^(#{1,3})\s+(.+)$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => ({ id: slugify(m[2].trim()), text: m[2].trim(), level: Math.min(m[1].length, 3) as 1 | 2 | 3 }));
}

function detectCallout(line: string): { variant: CalloutVariant; label?: string; text: string } | null {
    const patterns: { re: RegExp; variant: CalloutVariant; label?: string }[] = [
        { re: /^(💡|Tip:|TIP:)\s*/i, variant: "tip" },
        { re: /^(⚠️|⚠|Warning:|WARNING:)\s*/i, variant: "warning" },
        { re: /^(ℹ️|Info:|INFO:|Note:|NOTE:)\s*/i, variant: "note" },
        { re: /^(✅|Best Practice:|BEST PRACTICE:)\s*/i, variant: "tip", label: "Best Practice" },
    ];
    for (const { re, variant, label } of patterns) {
        if (re.test(line)) return { variant, label, text: line.replace(re, "").trim() };
    }
    return null;
}

function parseTableRow(line: string): string[] {
    return line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

function parseLegacyContent(content: string): LegacyBlock[] {
    if (!content?.trim()) return [];

    const lines = content.split("\n");
    const blocks: LegacyBlock[] = [];
    let i = 0;
    let listBuf: string[] = [];
    let orderedBuf: string[] = [];

    const flushBuffers = () => {
        if (listBuf.length > 0) { blocks.push({ type: "list", items: [...listBuf] }); listBuf = []; }
        if (orderedBuf.length > 0) { blocks.push({ type: "ordered-list", items: [...orderedBuf] }); orderedBuf = []; }
    };

    while (i < lines.length) {
        const line = lines[i].trim();

        if (!line) { flushBuffers(); i++; continue; }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
            flushBuffers();
            blocks.push({ type: "divider" });
            i++; continue;
        }

        if (line.startsWith("```")) {
            flushBuffers();
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
            i++;
            blocks.push({ type: "code", language: lang, code: codeLines.join("\n") });
            continue;
        }

        if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
            flushBuffers();
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i].trim()); i++; }
            const headers = parseTableRow(tableLines[0]);
            const rows = tableLines.slice(1).filter((l) => !/^\|?[\s\-:|]+\|/.test(l)).map(parseTableRow);
            if (headers.length > 0) blocks.push({ type: "table", headers, rows });
            continue;
        }

        const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (img) {
            flushBuffers();
            blocks.push({ type: "image", src: img[2], alt: img[1] || "Course image" });
            i++; continue;
        }

        if (line.startsWith(">")) {
            flushBuffers();
            blocks.push({ type: "blockquote", text: line.replace(/^>\s*/, "") });
            i++; continue;
        }

        const callout = detectCallout(line);
        if (callout) {
            flushBuffers();
            blocks.push({ type: "callout", ...callout });
            i++; continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushBuffers();
            const lvl = heading[1].length;
            const text = heading[2].trim();
            blocks.push({ type: lvl <= 1 ? "h1" : lvl === 2 ? "h2" : lvl === 3 ? "h3" : "h4", text, id: slugify(text) });
            i++; continue;
        }

        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
            if (orderedBuf.length > 0) { blocks.push({ type: "ordered-list", items: [...orderedBuf] }); orderedBuf = []; }
            listBuf.push(bullet[1]);
            i++; continue;
        }

        const numbered = line.match(/^\d+[.)]\s+(.+)$/);
        if (numbered) {
            if (listBuf.length > 0) { blocks.push({ type: "list", items: [...listBuf] }); listBuf = []; }
            orderedBuf.push(numbered[1]);
            i++; continue;
        }

        flushBuffers();
        blocks.push({ type: "paragraph", text: line });
        i++;
    }

    flushBuffers();
    return blocks;
}

// Inline **bold**, *italic*, `code`, [text](url) — legacy content only.
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
            parts.push(<em key={m.index}>{token.slice(1, -1)}</em>);
        } else if (token.startsWith("`")) {
            parts.push(
                <code key={m.index} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[0.85em] font-mono text-rose-600 dark:text-rose-400 rounded-md">
                    {token.slice(1, -1)}
                </code>
            );
        } else {
            const lm = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (lm && /^https?:\/\//i.test(lm[2])) {
                parts.push(
                    <a key={m.index} href={lm[2]} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300">
                        {lm[1]}
                    </a>
                );
            } else if (lm) {
                parts.push(lm[1]);
            }
        }
        last = m.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts}</>;
}

const LegacyContent = memo(function LegacyContent({ content }: { content: string }) {
    const blocks = useMemo(() => parseLegacyContent(content), [content]);
    if (blocks.length === 0) return null;

    return (
        <div>
            {blocks.map((block, i) => {
                switch (block.type) {
                    case "h1":
                        return <h2 key={i} id={block.id} className="text-[26px] font-bold text-gray-900 dark:text-white mt-14 mb-4 leading-tight tracking-tight scroll-mt-24 pb-3 border-b border-gray-100 dark:border-gray-800">{block.text}</h2>;
                    case "h2":
                        return <h3 key={i} id={block.id} className="text-[21px] font-bold text-gray-900 dark:text-white mt-10 mb-3 leading-tight scroll-mt-24">{block.text}</h3>;
                    case "h3":
                        return <h4 key={i} id={block.id} className="text-[17px] font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-2.5 scroll-mt-24">{block.text}</h4>;
                    case "h4":
                        return <h5 key={i} id={block.id} className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mt-6 mb-2 scroll-mt-24">{block.text}</h5>;
                    case "paragraph":
                        return <p key={i} className="text-[17px] text-gray-700 dark:text-gray-300 leading-[1.85] mb-5"><InlineText text={block.text} /></p>;
                    case "list":
                        return (
                            <ul key={i} className="my-5 space-y-2.5">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex items-start gap-3 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8]">
                                        <span className="flex-shrink-0 mt-[11px] w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500" />
                                        <span><InlineText text={item} /></span>
                                    </li>
                                ))}
                            </ul>
                        );
                    case "ordered-list":
                        return (
                            <ol key={i} className="my-6 space-y-3.5">
                                {block.items.map((item, j) => (
                                    <li key={j} className="flex items-start gap-4">
                                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                                        <span className="flex-1 text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8] pt-0.5"><InlineText text={item} /></span>
                                    </li>
                                ))}
                            </ol>
                        );
                    case "blockquote":
                        return (
                            <blockquote key={i} className="my-6 pl-5 pr-4 py-3.5 border-l-4 border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-950/20 rounded-r-xl">
                                <p className="text-[16px] text-gray-700 dark:text-gray-300 leading-[1.8] italic"><InlineText text={block.text} /></p>
                            </blockquote>
                        );
                    case "image":
                        return <ImageView key={i} src={block.src} alt={block.alt} caption={block.alt !== "Course image" && block.alt !== "Embedded image" ? block.alt : undefined} />;
                    case "code":
                        return <CodeView key={i} language={block.language} code={block.code} />;
                    case "table":
                        return <TableView key={i} headers={block.headers} rows={block.rows} />;
                    case "callout":
                        return <CalloutView key={i} variant={block.variant} title={block.label}><InlineText text={block.text} /></CalloutView>;
                    case "divider":
                        return <hr key={i} className="my-10 border-gray-200 dark:border-gray-800" />;
                    default:
                        return null;
                }
            })}
        </div>
    );
});

const AssignmentList = memo(function AssignmentList({ assignments }: { assignments: string[] }) {
    if (assignments.length === 0) return null;
    return (
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Practice Tasks</h4>
            </div>
            <div className="space-y-3">
                {assignments.map((task, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                        <span className="flex-shrink-0 w-7 h-7 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center mt-0.5 text-amber-700 dark:text-amber-400 font-bold text-sm">{i + 1}</span>
                        <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed flex-1">{task}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});

const ResourceList = memo(function ResourceList({ resources }: { resources: string[] }) {
    if (resources.length === 0) return null;
    const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
    return (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Further Reading</h4>
            </div>
            <div className="space-y-2">
                {resources.map((res, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-xl">
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        {isUrl(res) ? (
                            <a href={res.trim()} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{res.trim()}</a>
                        ) : (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{res}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

export function LegacySectionRenderer({ section }: { section: any }) {
    const s = useMemo(() => normalizeLegacySection(section), [section]);
    return (
        <div>
            {s.videos.length > 0 && (
                <div className="mb-10">
                    {s.videos.map((url, i) => <VideoView key={i} url={url} title="" />)}
                </div>
            )}
            <LegacyContent content={s.content} />
            <AssignmentList assignments={s.assignments} />
            <ResourceList resources={s.resources} />
        </div>
    );
}
