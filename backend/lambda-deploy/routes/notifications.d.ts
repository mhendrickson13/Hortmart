declare const router: import("express-serve-static-core").Router;
export declare function createNotification(params: {
    userId: string;
    type: 'course' | 'review' | 'achievement' | 'system';
    title: string;
    description: string;
    link?: string;
}): Promise<void>;
export default router;
//# sourceMappingURL=notifications.d.ts.map