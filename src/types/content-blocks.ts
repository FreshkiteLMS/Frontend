// Mirrors Backend/src/types/content-blocks.ts — the structured, ordered
// representation of a section's content produced by the Google Doc parser.
// Rendering uses the `content` markdown-ish string (see CourseRenderer); this
// type exists for consumers that want typed blocks instead of a string.

export type ContentBlockType =
    | 'heading'
    | 'paragraph'
    | 'bullet-list'
    | 'ordered-list'
    | 'code'
    | 'video'
    | 'image';

export interface HeadingBlock {
    type: 'heading';
    text: string;
    level?: 1 | 2 | 3;
}

export interface ParagraphBlock {
    type: 'paragraph';
    text: string;
}

export interface BulletListBlock {
    type: 'bullet-list';
    items: string[];
}

export interface OrderedListBlock {
    type: 'ordered-list';
    items: string[];
}

export interface CodeBlockContent {
    type: 'code';
    language?: string;
    code: string;
}

export interface VideoBlock {
    type: 'video';
    url: string;
}

export interface ImageBlockContent {
    type: 'image';
    url: string;
    alt: string;
    key?: string;
    width?: number;
    height?: number;
}

export type ContentBlock =
    | HeadingBlock
    | ParagraphBlock
    | BulletListBlock
    | OrderedListBlock
    | CodeBlockContent
    | VideoBlock
    | ImageBlockContent;
