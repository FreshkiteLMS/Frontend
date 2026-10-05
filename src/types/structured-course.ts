// Mirrors Backend/src/schemas/structuredCourse.ts (the source of truth, where
// the data is validated before it is stored). The frontend only renders it:
// presentation is chosen from `block.type`, never from document formatting.

export interface HeadingBlock { type: 'heading'; text: string; level: 2 | 3 }
export interface ParagraphBlock { type: 'paragraph'; text: string }
export interface RichTextSegment { text: string; bold: boolean; italic: boolean; code: boolean; link: string | null }
export interface RichTextBlock { type: 'rich_text'; segments: RichTextSegment[] }
export interface BulletListBlock { type: 'bullet_list'; items: string[] }
export interface NumberedListBlock { type: 'numbered_list'; items: string[] }
export interface CodeBlock { type: 'code'; language: string; code: string; caption: string }
export interface QuoteBlock { type: 'quote'; text: string; attribution: string }
export interface CalloutBlock { type: 'callout'; title: string; text: string }
export interface ExampleBlock { type: 'example'; title: string; text: string }
export interface DefinitionBlock { type: 'definition'; term: string; definition: string }
export interface TableBlock { type: 'table'; caption: string; headers: string[]; rows: string[][] }
export interface ImageBlock { type: 'image'; url: string; alt: string; caption: string }
export interface VideoBlock { type: 'video'; url: string; title: string }
export interface LinkBlock { type: 'link'; url: string; title: string; description: string }
export interface ExerciseBlock { type: 'exercise'; title: string; instructions: string; difficulty: 'easy' | 'medium' | 'hard' | null }
export interface QuestionBlock { type: 'question'; question: string; options: string[] }
export interface AnswerBlock { type: 'answer'; text: string }
export interface WarningBlock { type: 'warning'; title: string; text: string }
export interface TipBlock { type: 'tip'; title: string; text: string }
export interface SummaryBlock { type: 'summary'; text: string; points: string[] }

type BlockData =
    | HeadingBlock
    | ParagraphBlock
    | RichTextBlock
    | BulletListBlock
    | NumberedListBlock
    | CodeBlock
    | QuoteBlock
    | CalloutBlock
    | ExampleBlock
    | DefinitionBlock
    | TableBlock
    | ImageBlock
    | VideoBlock
    | LinkBlock
    | ExerciseBlock
    | QuestionBlock
    | AnswerBlock
    | WarningBlock
    | TipBlock
    | SummaryBlock;

export type ContentBlock = BlockData & { id: string };
export type ContentBlockType = ContentBlock['type'];
export type BlockOf<T extends ContentBlockType> = Extract<ContentBlock, { type: T }>;

export interface Lesson {
    id: string;
    title: string;
    description: string;
    content: ContentBlock[];
}

export interface Module {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
}

export interface StructuredCourse {
    version: number;
    title: string;
    description: string;
    learningObjectives: string[];
    modules: Module[];
}

// ─── Processing status (GET /courses/:id/processing) ─────────────────────────

export type ProcessingStatus =
    | 'uploaded'
    | 'processing'
    | 'extracting'
    | 'structuring'
    | 'validating'
    | 'completed'
    | 'failed';

export interface ProcessingState {
    status: ProcessingStatus;
    active: boolean;
    document_url: string;
    error: { code: string; message: string } | null;
    warnings: string[];
    chunks_total: number | null;
    chunks_done: number | null;
    model: string | null;
    started_at: string;
    finished_at: string | null;
    updated_at: string;
}
