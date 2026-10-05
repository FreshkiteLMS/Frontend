'use client';

import { memo, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { BlockOf } from '@/types/structured-course';

type HighlightJs = typeof import('highlight.js').default;
let hljsPromise: Promise<HighlightJs> | null = null;

/** highlight.js (common languages) is loaded on first use, only on pages that show code. */
function loadHighlighter(): Promise<HighlightJs> {
    hljsPromise ??= import('highlight.js/lib/common').then((m) => m.default);
    return hljsPromise;
}

/**
 * Highlighted HTML for `code`, or null to show plain text. Only a declared,
 * known language is highlighted — auto-detection guesses wrong too often on
 * short teaching snippets. highlight.js escapes the source, so the markup is
 * safe to inject.
 */
function useHighlightedHtml(code: string, language: string): string | null {
    const [html, setHtml] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        setHtml(null);
        if (!language) return;
        loadHighlighter()
            .then((hljs) => {
                if (cancelled || !hljs.getLanguage(language)) return;
                setHtml(hljs.highlight(code, { language, ignoreIllegals: true }).value);
            })
            .catch(() => { /* plain text fallback */ });
        return () => { cancelled = true; };
    }, [code, language]);
    return html;
}

/** Presentational code panel — shared by structured code blocks and legacy sections. */
export const CodeView = memo(function CodeView({ code, language, caption }: { code: string; language: string; caption?: string }) {
    const [copied, setCopied] = useState(false);
    const html = useHighlightedHtml(code, language.toLowerCase());

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable — nothing to do */
        }
    };

    return (
        <figure className="my-8">
            <div className="rounded-xl overflow-hidden border border-gray-700/60 shadow-md">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e2e] border-b border-white/10">
                    <span className="text-[11px] font-mono font-medium text-slate-400 tracking-wide">{language || 'code'}</span>
                    <button
                        type="button"
                        onClick={copy}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                        {copied
                            ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</>
                            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                </div>
                <pre className="code-highlight p-5 bg-[#1e1e2e] text-slate-100 overflow-x-auto text-[13.5px] leading-[1.75] font-mono">
                    {html !== null
                        ? <code dangerouslySetInnerHTML={{ __html: html }} />
                        : <code>{code}</code>}
                </pre>
            </div>
            {caption && (
                <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>
            )}
        </figure>
    );
});

export const CodeBlockView = memo(function CodeBlockView({ block }: { block: BlockOf<'code'> }) {
    return <CodeView code={block.code} language={block.language} caption={block.caption} />;
});
