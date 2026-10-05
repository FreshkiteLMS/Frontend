'use client';

import { memo, type ComponentType } from 'react';
import type { BlockOf, ContentBlock, ContentBlockType, Lesson } from '@/types/structured-course';
import { HeadingBlockView, ParagraphBlockView, QuoteBlockView, RichTextBlockView } from './blocks/text';
import { BulletListBlockView, NumberedListBlockView } from './blocks/lists';
import { CodeBlockView } from './blocks/code';
import { CalloutBlockView, TipBlockView, WarningBlockView } from './blocks/callouts';
import { ImageBlockView, LinkBlockView, VideoBlockView } from './blocks/media';
import { TableBlockView } from './blocks/table';
import {
    AnswerBlockView,
    DefinitionBlockView,
    ExampleBlockView,
    ExerciseBlockView,
    QuestionBlockView,
    SummaryBlockView,
} from './blocks/learning';

/**
 * One renderer per semantic block type. Typed as a complete map, so adding a
 * type to `ContentBlock` without a renderer here is a compile error — the
 * only frontend change a new content type needs is one entry in this map.
 */
export const BLOCK_RENDERERS: { [K in ContentBlockType]: ComponentType<{ block: BlockOf<K> }> } = {
    heading: HeadingBlockView,
    paragraph: ParagraphBlockView,
    rich_text: RichTextBlockView,
    bullet_list: BulletListBlockView,
    numbered_list: NumberedListBlockView,
    code: CodeBlockView,
    quote: QuoteBlockView,
    callout: CalloutBlockView,
    example: ExampleBlockView,
    definition: DefinitionBlockView,
    table: TableBlockView,
    image: ImageBlockView,
    video: VideoBlockView,
    link: LinkBlockView,
    exercise: ExerciseBlockView,
    question: QuestionBlockView,
    answer: AnswerBlockView,
    warning: WarningBlockView,
    tip: TipBlockView,
    summary: SummaryBlockView,
};

export const ContentBlockRenderer = memo(function ContentBlockRenderer({ block }: { block: ContentBlock }) {
    const Renderer = BLOCK_RENDERERS[block.type] as ComponentType<{ block: ContentBlock }> | undefined;
    // Unknown type (e.g. data from a newer backend): skip it rather than crash the lesson.
    return Renderer ? <Renderer block={block} /> : null;
});

/**
 * Running text stays at a comfortable line length (~75 characters) however
 * wide the screen is; visual blocks (code, tables, images, video, cards) use
 * the full available width.
 */
const PROSE_TYPES: ReadonlySet<ContentBlockType> = new Set<ContentBlockType>([
    'heading', 'paragraph', 'rich_text', 'bullet_list', 'numbered_list', 'quote', 'definition',
]);

export function LessonContent({ lesson }: { lesson: Lesson }) {
    return (
        <div className="w-full">
            {lesson.content.map((block) => (
                <div key={block.id} className={PROSE_TYPES.has(block.type) ? 'max-w-[75ch]' : undefined}>
                    <ContentBlockRenderer block={block} />
                </div>
            ))}
        </div>
    );
}
