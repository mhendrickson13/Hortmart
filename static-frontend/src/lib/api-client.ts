/**
 * API Client for CXFlow Backend
 * 
 * Uses JWT token from localStorage for authentication.
 * Set VITE_API_URL in .env to configure the API endpoint.
 */

import { getStoredToken } from "./auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  body?: unknown;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function resolveToken(explicitToken?: string): string | undefined {
  if (explicitToken) return explicitToken;
  return getStoredToken() || undefined;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, body, ...fetchOptions } = options;
  const resolvedToken = resolveToken(token);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (resolvedToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${resolvedToken}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Auto-logout on 401 Unauthorized (expired/invalid token)
    if (response.status === 401 && resolvedToken) {
      // Only clear auth state if we actually had a token (avoid clearing during login)
      localStorage.removeItem('cxflow_token');
      localStorage.removeItem('cxflow_user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    throw new ApiError(data?.error || 'Request failed', response.status, data);
  }

  return data as T;
}

export function getApiUrl(): string {
  return API_BASE_URL || '';
}

// ==================== Auth ====================

export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ user: User; token?: string }>('/auth/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: data }),
  session: (token?: string) =>
    request<{ user: User }>('/auth/session', { token }),
};

// ==================== Users ====================

export const users = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string }, token?: string) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ users: User[]; pagination: Pagination }>(`/users?${query}`, { token });
  },
  get: (id: string, token?: string) =>
    request<{ user: User }>(`/users/${id}`, { token }),
  update: (id: string, data: Partial<User>, token?: string) =>
    request<{ user: User }>(`/users/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/users/${id}`, { method: 'DELETE', token }),
  getProfile: (token?: string) =>
    request<{ user: User }>('/users/profile', { token }),
  updateProfile: (data: Partial<User>, token?: string) =>
    request<{ user: User }>('/users/profile', { method: 'PATCH', body: data, token }),
  changePassword: (data: { currentPassword: string; newPassword: string }, token?: string) =>
    request<{ message: string }>('/users/password', { method: 'PATCH', body: data, token }),
  getEnrollments: (id: string, token?: string) =>
    request<{ enrollments: EnrollmentWithProgress[] }>(`/users/${id}/enrollments`, { token }),
  create: (data: { email: string; password: string; name?: string; role?: string }, token?: string) =>
    request<{ user: User }>('/users', { method: 'POST', body: data, token }),
  getProfileEnrollments: (token?: string) =>
    request<{ enrollments: EnrollmentWithProgress[] }>('/users/profile/enrollments', { token }),
  block: (id: string, token?: string) =>
    request<{ user: User }>(`/users/${id}/block`, { method: 'POST', token }),
  unblock: (id: string, token?: string) =>
    request<{ user: User }>(`/users/${id}/unblock`, { method: 'POST', token }),
};

// ==================== Courses ====================

export const courses = {
  list: (params?: { page?: number; limit?: number; status?: string; creatorId?: string; mine?: string }, token?: string) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ courses: CourseWithStats[]; pagination: Pagination }>(`/courses?${query}`, { token });
  },
  search: (params?: { q?: string; category?: string; level?: string; priceRange?: string; sort?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ courses: CourseWithStats[]; pagination: Pagination }>(`/courses/search?${query}`);
  },
  getCategories: () => request<{ categories: string[] }>('/courses/categories'),
  get: (id: string, token?: string) =>
    request<{ course: CourseWithDetails }>(`/courses/${id}`, { token }),
  create: (data: CreateCourseData, token?: string) =>
    request<{ course: Course }>('/courses', { method: 'POST', body: data, token }),
  update: (id: string, data: Partial<CreateCourseData>, token?: string) =>
    request<{ course: Course }>(`/courses/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/courses/${id}`, { method: 'DELETE', token }),
  enroll: (id: string, token?: string) =>
    request<{ enrollment: Enrollment }>(`/courses/${id}/enroll`, { method: 'POST', token }),
  checkEnrollment: (id: string, token?: string) =>
    request<{ enrolled: boolean; enrollment: Enrollment | null }>(`/courses/${id}/enroll`, { token }),
  unenroll: (id: string, token?: string) =>
    request<{ message: string }>(`/courses/${id}/enroll`, { method: 'DELETE', token }),
  getProgress: (id: string, token?: string) =>
    request<{ progress: CourseProgress }>(`/courses/${id}/progress`, { token }),
  createModule: (courseId: string, data: { title: string; position?: number }, token?: string) =>
    request<{ module: Module }>(`/courses/${courseId}/modules`, { method: 'POST', body: data, token }),
  createLesson: (courseId: string, data: CreateLessonData, token?: string) =>
    request<{ lesson: Lesson }>(`/courses/${courseId}/lessons`, { method: 'POST', body: data, token }),
  reorderModules: (id: string, moduleOrder: string[], token?: string) =>
    request<{ message: string }>(`/courses/${id}/reorder`, { method: 'PATCH', body: { moduleOrder }, token }),
  publish: (id: string, token?: string) =>
    request<{ course: Course }>(`/courses/${id}/publish`, { method: 'POST', token }),
  unpublish: (id: string, token?: string) =>
    request<{ course: Course }>(`/courses/${id}/publish`, { method: 'DELETE', token }),
  getReviews: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ reviews: ReviewWithUser[]; pagination: Pagination; stats: ReviewStats }>(`/courses/${id}/reviews?${query}`);
  },
  createReview: (id: string, data: { rating: number; comment?: string }, token?: string) =>
    request<{ review: Review }>(`/courses/${id}/reviews`, { method: 'POST', body: data, token }),
  getMyReview: (id: string, token?: string) =>
    request<{ review: Review | null }>(`/courses/${id}/my-review`, { token }),
  getAnalytics: (id: string, token?: string) =>
    request<{ analytics: CourseAnalytics }>(`/courses/${id}/analytics`, { token }),
};

// ==================== Modules ====================

export const modules = {
  get: (id: string) => request<{ module: ModuleWithLessons }>(`/modules/${id}`),
  update: (id: string, data: { title?: string; position?: number }, token?: string) =>
    request<{ module: Module }>(`/modules/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/modules/${id}`, { method: 'DELETE', token }),
  reorderLessons: (id: string, lessonOrder: string[], token?: string) =>
    request<{ message: string }>(`/modules/${id}/reorder`, { method: 'PATCH', body: { lessonOrder }, token }),
};

// ==================== Lessons ====================

export const lessons = {
  get: (id: string, token?: string) => request<{ lesson: LessonWithDetails }>(`/lessons/${id}`, { token }),
  update: (id: string, data: Partial<CreateLessonData>, token?: string) =>
    request<{ lesson: Lesson }>(`/lessons/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/lessons/${id}`, { method: 'DELETE', token }),
  getProgress: (id: string, token?: string) =>
    request<{ progress: LessonProgress }>(`/lessons/${id}/progress`, { token }),
  updateProgress: (id: string, data: { progressPercent: number; lastWatchedTimestamp: number }, token?: string) =>
    request<{ progress: LessonProgress }>(`/lessons/${id}/progress`, { method: 'POST', body: data, token }),
  getNotes: (id: string, token?: string) =>
    request<{ notes: Note[] }>(`/lessons/${id}/notes`, { token }),
  createNote: (id: string, data: { content: string; timestampSeconds?: number }, token?: string) =>
    request<{ note: Note }>(`/lessons/${id}/notes`, { method: 'POST', body: data, token }),
  getQuestions: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ questions: QuestionWithAnswers[]; pagination: Pagination }>(`/lessons/${id}/questions?${query}`);
  },
  createQuestion: (id: string, data: { content: string }, token?: string) =>
    request<{ question: Question }>(`/lessons/${id}/questions`, { method: 'POST', body: data, token }),
  getResources: (id: string) =>
    request<{ resources: Resource[] }>(`/lessons/${id}/resources`),
  createResource: (id: string, data: CreateResourceData, token?: string) =>
    request<{ resource: Resource }>(`/lessons/${id}/resources`, { method: 'POST', body: data, token }),
};

// ==================== Questions & Answers ====================

export const questions = {
  get: (id: string) => request<{ question: QuestionWithAnswers }>(`/questions/${id}`),
  update: (id: string, data: { content: string }, token?: string) =>
    request<{ question: Question }>(`/questions/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/questions/${id}`, { method: 'DELETE', token }),
  createAnswer: (id: string, data: { content: string }, token?: string) =>
    request<{ answer: Answer }>(`/questions/${id}/answers`, { method: 'POST', body: data, token }),
};

export const answers = {
  get: (id: string) => request<{ answer: Answer }>(`/answers/${id}`),
  update: (id: string, data: { content: string }, token?: string) =>
    request<{ answer: Answer }>(`/answers/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/answers/${id}`, { method: 'DELETE', token }),
  accept: (id: string, token?: string) =>
    request<{ answer: Answer }>(`/answers/${id}/accept`, { method: 'POST', token }),
};

// ==================== Notes ====================

export const notes = {
  get: (id: string, token?: string) => request<{ note: Note }>(`/notes/${id}`, { token }),
  update: (id: string, data: { content?: string; timestampSeconds?: number }, token?: string) =>
    request<{ note: Note }>(`/notes/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/notes/${id}`, { method: 'DELETE', token }),
};

// ==================== Resources ====================

export const resources = {
  get: (id: string) => request<{ resource: Resource }>(`/resources/${id}`),
  update: (id: string, data: Partial<CreateResourceData>, token?: string) =>
    request<{ resource: Resource }>(`/resources/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/resources/${id}`, { method: 'DELETE', token }),
};

// ==================== Reviews ====================

export const reviews = {
  get: (id: string) => request<{ review: ReviewWithUser }>(`/reviews/${id}`),
  update: (id: string, data: { rating?: number; comment?: string }, token?: string) =>
    request<{ review: Review }>(`/reviews/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/reviews/${id}`, { method: 'DELETE', token }),
};

// ==================== Video Encoding ====================

export interface VideoSignedUrlResponse {
  signedManifestUrl: string;
  signingParams: {
    Policy: string;
    Signature: string;
    KeyPairId: string;
    expires: number;
  };
  cfDomain: string;
}

export interface VideoStatusResponse {
  videoStatus: 'none' | 'encoding' | 'ready' | 'error';
  hlsUrl?: string;
  jobProgress?: number;
  errorMessage?: string;
}

export const video = {
  encode: (lessonId: string, token?: string) =>
    request<{ message: string; jobId: string; videoStatus: string }>(`/video/encode/${lessonId}`, { method: 'POST', token }),
  getStatus: (lessonId: string, token?: string) =>
    request<VideoStatusResponse>(`/video/status/${lessonId}`, { token }),
  getSignedUrl: (lessonId: string, token?: string) =>
    request<VideoSignedUrlResponse>(`/video/signed-url/${lessonId}`, { token }),
};

// ==================== Uploads ====================

export const uploads = {
  getPresignedUrl: (data: { fileName: string; fileType: 'image' | 'video' | 'document'; fileSize?: number }, token?: string) =>
    request<{ uploadUrl: string; fileUrl: string; key: string }>('/uploads/presigned', { method: 'POST', body: data, token }),

  /** Upload a file to S3 via presigned URL, returns the public file URL */
  uploadFile: async (file: File, fileType: 'image' | 'video' | 'document', token?: string): Promise<string> => {
    // 1. Get presigned URL from backend
    const { uploadUrl, fileUrl } = await uploads.getPresignedUrl(
      { fileName: file.name, fileType, fileSize: file.size },
      token,
    );

    // 2. Upload file directly to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    if (!uploadResponse.ok) {
      throw new ApiError('Failed to upload file to storage', uploadResponse.status);
    }

    // 3. Return the public URL
    return fileUrl;
  },

};

// ==================== Favourites / Bookmarks ====================

export const favourites = {
  list: (token?: string) =>
    request<{ favourites: any[]; bookmarks: any[] }>('/favourites/list', { token }),
  status: (courseId: string, token?: string) =>
    request<{ isFavourite: boolean; isBookmarked: boolean }>(`/favourites/${courseId}/status`, { token }),
  toggleFavourite: (courseId: string, token?: string) =>
    request<{ isFavourite: boolean }>(`/favourites/${courseId}/favourite`, { method: 'POST', token }),
  toggleBookmark: (courseId: string, token?: string) =>
    request<{ isBookmarked: boolean }>(`/favourites/${courseId}/bookmark`, { method: 'POST', token }),
};

// ==================== Notifications ====================

export const notifications = {
  list: (params?: { limit?: number }, token?: string) => {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<{ notifications: Notification[]; unreadCount: number }>(`/notifications?${query}`, { token });
  },
  unreadCount: (token?: string) =>
    request<{ count: number }>('/notifications/unread-count', { token }),
  markAllRead: (token?: string) =>
    request<{ message: string }>('/notifications/read-all', { method: 'PATCH', token }),
  markRead: (id: string, token?: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH', token }),
  delete: (id: string, token?: string) =>
    request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE', token }),
};

// ==================== Analytics ====================

export const analytics = {
  getDashboard: (token?: string) =>
    request<{ analytics: DashboardAnalytics }>('/analytics', { token }),
  getLearnerStats: (token?: string) =>
    request<LearnerStats>('/analytics/learner-stats', { token }),
  getCreatorStats: (token?: string) =>
    request<CreatorStats>('/analytics/creator-stats', { token }),
};

// ==================== Types ====================

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  role: 'LEARNER' | 'CREATOR' | 'ADMIN';
  createdAt: string;
  updatedAt?: string;
  blockedAt?: string | null;
  lastActiveAt?: string | null;
  completedCoursesCount?: number;
  _count?: { enrollments?: number; courses?: number; reviews?: number };
}

export interface Course {
  id: string; title: string; subtitle: string | null; description: string | null;
  whatYouWillLearn: string | null; coverImage: string | null; thumbnail?: string | null;
  price: number; currency: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  category: string | null; language: string; creatorId: string;
  createdAt: string; updatedAt: string; publishedAt: string | null;
}

export interface CourseWithStats extends Course {
  creator: Pick<User, 'id' | 'name' | 'image'> & { bio?: string | null };
  _count: { modules: number; enrollments: number; reviews: number };
  avgRating: number | null; averageRating?: number | null; totalDuration: number;
  lessonsCount?: number;
}

export interface CourseWithDetails extends CourseWithStats {
  modules: ModuleWithLessons[]; totalLessons: number;
  enrolledStudents?: Array<{ id: string; name: string | null; image: string | null }>;
}

export interface Module {
  id: string; title: string; position: number; courseId: string;
  createdAt: string; updatedAt: string;
}

export interface ModuleWithLessons extends Module { lessons: Lesson[]; }

export interface Lesson {
  id: string; title: string; description: string | null; videoUrl: string | null;
  hlsUrl?: string | null; videoStatus?: string | null;
  durationSeconds: number; position: number; isLocked: boolean; isFreePreview: boolean;
  moduleId: string; createdAt: string; updatedAt: string;
}

export interface LessonWithDetails extends Lesson {
  resources: Resource[];
  module: { id: string; title: string; course: { id: string; title: string; creatorId: string; status: string } };
}

export interface Resource {
  id: string; title: string; type: string; url: string; fileSize: number | null;
  lessonId: string; createdAt: string;
}

export interface Enrollment { id: string; userId: string; courseId: string; enrolledAt: string; }

export interface EnrollmentWithProgress extends Enrollment {
  course: Pick<Course, 'id' | 'title' | 'coverImage'> & { creator: Pick<User, 'name'>; modules?: ModuleWithLessons[] };
  progress: number;
  lessonProgress?: LessonProgress[];
}

export interface LessonProgress {
  id?: string; progressPercent: number; lastWatchedTimestamp: number;
  lastWatchedAt: string | null; completedAt: string | null; lessonId?: string;
}

export interface CourseProgress {
  courseId: string; enrollmentId: string; overallProgress: number;
  completedLessons: number; totalLessons: number;
  modules: { id: string; title: string; progress: number; completedLessons: number; totalLessons: number;
    lessons: { id: string; title: string; progressPercent: number; completedAt: string | null; lastWatchedTimestamp: number }[];
  }[];
  lastAccessedLesson: { id: string; title: string } | null;
}

export interface Question { id: string; content: string; userId: string; lessonId: string; createdAt: string; updatedAt: string; }
export interface QuestionWithAnswers extends Question { user: Pick<User, 'id' | 'name' | 'image'>; answers: AnswerWithUser[]; _count: { answers: number }; }
export interface Answer { id: string; content: string; userId: string; questionId: string; isAccepted: boolean; createdAt: string; updatedAt: string; }
export interface AnswerWithUser extends Answer { user: Pick<User, 'id' | 'name' | 'image'>; }
export interface Note { id: string; content: string; timestampSeconds: number; userId: string; lessonId: string; createdAt: string; updatedAt: string; }
export interface Review { id: string; rating: number; comment: string | null; userId: string; courseId: string; createdAt: string; updatedAt: string; }
export interface ReviewWithUser extends Review { user: Pick<User, 'id' | 'name' | 'image'>; }
export interface ReviewStats { averageRating: number; totalReviews: number; distribution: Record<string, number>; }

export interface CourseAnalytics {
  courseId: string;
  overview: { totalEnrollments: number; activeStudents: number; completionRate: number; averageProgress: number; averageRating: number; totalRevenue: number };
  enrollmentTrend: { date: string; count: number }[];
  lessonStats: { lessonId: string; title: string; completionRate: number; averageWatchTime: number; dropOffRate: number }[];
  topStudents: { userId: string; name: string | null; progress: number; completedAt: string | null }[];
}

export interface DashboardAnalytics {
  overview: { totalUsers: number; totalCourses: number; totalEnrollments: number; totalRevenue: number; activeUsers: number; completionRate: number };
  trends: { users: { date: string; count: number }[]; enrollments: { date: string; count: number }[]; revenue: { date: string; amount: number }[] };
  topCourses: { id: string; title: string; enrollments: number; revenue: number; rating: number | null }[];
  userDistribution: Record<string, number>;
  categoryDistribution: { category: string; count: number }[];
  progressBuckets?: Record<string, number>;
}

export interface Notification {
  id: string; userId: string; type: 'course' | 'review' | 'achievement' | 'system';
  title: string; description: string | null; link: string | null;
  isRead: boolean; createdAt: string;
}
export interface CreatorStats { totalCourses: number; publishedCourses: number; totalEnrollments: number; totalRevenue: number; totalReviews: number; avgRating: string; }
export interface LearnerStats { totalCourses: number; completedCourses: number; inProgressCourses: number; totalLessonsCompleted: number; totalWatchHours: number; enrollments: EnrollmentWithProgress[]; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface CreateCourseData { title: string; subtitle?: string; description?: string; coverImage?: string; price?: number; currency?: string; level?: Course['level']; category?: string; language?: string; }
export interface CreateLessonData { title: string; description?: string; videoUrl?: string; durationSeconds?: number; position?: number; isLocked?: boolean; isFreePreview?: boolean; moduleId: string; }
export interface CreateResourceData { title: string; type: string; url: string; fileSize?: number; }

export const apiClient = { auth, users, courses, modules, lessons, questions, answers, notes, resources, reviews, analytics, uploads, notifications, video };
export default apiClient;
