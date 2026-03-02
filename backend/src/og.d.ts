/**
 * Generate and upload an OG page for a course to S3.
 * Call this on course publish, and on course update (title/description/cover).
 */
export declare function upsertCourseOgPage(course: {
    id: string;
    title: string;
    description?: string | null;
    subtitle?: string | null;
    coverImage?: string | null;
}): Promise<void>;
/**
 * Delete the OG page for a course from S3 (on course delete or unpublish).
 */
export declare function deleteCourseOgPage(courseId: string): Promise<void>;
//# sourceMappingURL=og.d.ts.map