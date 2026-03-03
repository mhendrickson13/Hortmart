declare const router: import("express-serve-static-core").Router;
export declare function createNotification(params: {
    userId: string;
    type: 'course' | 'review' | 'achievement' | 'system';
    title: string;
    description: string;
    link?: string;
    /** i18n key for title — if set, auto-translates based on user's language */
    titleKey?: string;
    /** i18n key for description */
    descKey?: string;
    /** Interpolation params for title/desc keys */
    i18nParams?: Record<string, string | number>;
}): Promise<void>;
export default router;
//# sourceMappingURL=notifications.d.ts.map