export interface CourseSection {
    id: string;
    title: string;
    description: string;
    content: string;
    video_url?: string;
    image_url?: string;
    youtube_videos?: string[];
    assignments?: string[];
    resources?: string[];
    duration: number;
    created_at?: string;
}

/** Shape returned by POST /docs/parse */
export interface ParsedSection {
    title: string;
    content: string;
    images: string[];
    youtubeVideos: string[];
    assignments: string[];
    resources: string[];
}

export interface ParsedCourse {
    metadata: {
        title?: string;
        description?: string;
        category?: string;
        difficulty?: string;
        price?: number;
        estimated_duration?: number;
        template_type?: string;
    };
    sections: ParsedSection[];
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
}
