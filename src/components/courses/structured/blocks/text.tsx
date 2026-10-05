import { memo } from 'react';
import type { BlockOf } from '@/types/structured-course';

/** Only http(s) targets are ever rendered as links (defence in depth; the backend already enforces this). */
export function safeHref(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
    } catch {
        return null;
    }
}

/** DOM id for a block, used as the anchor target by the table of contents. */
export const blockAnchorId = (blockId: string) => `block-${blockId}`;

export const HeadingBlockView = memo(function HeadingBlockView({ block }: { block: BlockOf<'heading'> }) {
    if (block.level === 2) {
        return (
            <h2 id={blockAnchorId(block.id)} className="text-[22px] font-bold text-gray-900 dark:text-white mt-12 mb-4 leading-snug tracking-tight scroll-mt-24">
                {block.text}
            </h2>
        );
    }
    return (
        <h3 id={blockAnchorId(block.id)} className="text-[18px] font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-3 leading-snug scroll-mt-24">
            {block.text}
        </h3>
    );
});

export const ParagraphBlockView = memo(function ParagraphBlockView({ block }: { block: BlockOf<'paragraph'> }) {
    return (
        <p className="text-[17px] text-gray-700 dark:text-gray-300 leading-[1.85] mb-5 whitespace-pre-line">
            {block.text}
        </p>
    );
});

export const RichTextBlockView = memo(function RichTextBlockView({ block }: { block: BlockOf<'rich_text'> }) {
    return (
        <p className="text-[17px] text-gray-700 dark:text-gray-300 leading-[1.85] mb-5 whitespace-pre-line">
            {block.segments.map((segment, i) => {
                let node: React.ReactNode = segment.text;
                if (segment.code) {
                    node = (
                        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[0.85em] font-mono text-rose-600 dark:text-rose-400 rounded-md">
                            {node}
                        </code>
                    );
                }
                if (segment.italic) node = <em>{node}</em>;
                if (segment.bold) node = <strong className="font-semibold text-gray-900 dark:text-gray-100">{node}</strong>;
                const href = safeHref(segment.link);
                if (href) {
                    node = (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300">
                            {node}
                        </a>
                    );
                }
                return <span key={i}>{node}</span>;
            })}
        </p>
    );
});

export const QuoteBlockView = memo(function QuoteBlockView({ block }: { block: BlockOf<'quote'> }) {
    return (
        <figure className="my-7 pl-5 pr-4 py-3.5 border-l-4 border-gray-300 dark:border-gray-600">
            <blockquote className="text-[17px] text-gray-700 dark:text-gray-300 leading-[1.8] italic whitespace-pre-line">
                {block.text}
            </blockquote>
            {block.attribution && (
                <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">— {block.attribution}</figcaption>
            )}
        </figure>
    );
});
