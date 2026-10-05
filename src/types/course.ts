import type { ProcessingStatus, StructuredCourse } from './structured-course';

export interface CourseSection {
    id: string;
    title: string;
    description: string;
    content: string;
    video_url?: string;
    youtube_videos?: string[];
    assignments?: string[];
    resources?: string[];
    duration: number;
    created_at?: string;
}

export interface Course {
    _id: string; // From MongoDB
    id?: string;  // Internal UUID if used
    title: string;
    description?: string;
    template?: string;
    enrolled?: number;
    avgProgress?: number;
    status?: string;
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    price: number;
    thumbnail_url?: string;
    tags?: string[];
    estimated_duration?: number;
    group?: { _id: string; name: string } | string;
    template_type?: string;
    sections?: CourseSection[];
    /**
     * Original source document the course was processed from. Shown to students
     * as an external "Open Document" link next to the processed notes — never
     * re-processed. Null/absent for courses with no source document, including
     * every course created before this field existed.
     */
    document_url?: string | null;
    /**
     * AI-structured content. When present it is what students see; legacy
     * `sections` are kept on the record but not rendered. Absent on courses
     * created before AI structuring (they render through the legacy renderer).
     */
    structured_content?: StructuredCourse | null;
    /** Raw processing record; poll GET /courses/:id/processing for the live view. */
    content_processing?: { status: ProcessingStatus; error_message?: string | null } | null;
    // Problem-solving template only (present when template_type === 'problem-solving').
    problem_sections?: Array<{ id: string; title: string; icon: string; problems: unknown[] }>;
    problem_sheet?: { url: string; spreadsheet_id: string; last_synced_at?: string; last_warnings?: string[] };
}

export interface CourseEntry {
    courseId: Course | string;  // populated => full Course object, unpopulated => string id
    name: string;
}

export interface CourseGroup {
    _id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    status: 'active' | 'inactive';
    courses: CourseEntry[];
    /**
     * Reference document for the bundle (syllabus, roadmap, …). A link only — it
     * is never parsed or processed into notes. Served to admins and to enrolled
     * students; omitted from the public discovery listing.
     */
    document_url?: string | null;
}
