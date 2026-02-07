/**
 * Server-side API helpers for fetching data from the backend
 * Use these in Server Components and Server Actions
 */

import { getAccessToken } from "./auth";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

export class ServerApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.data = data;
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function serverFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, ...fetchOptions } = options;

  const token = await getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", // Don't cache server-side requests
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ServerApiError(
      data?.error || "Request failed",
      response.status,
      data
    );
  }

  return data as T;
}

// Types for API responses
export interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  whatYouWillLearn: string | null;
  thumbnail: string | null;
  coverImage?: string | null;
  language?: string | null;
  currency?: string;
  price: number;
  status: string;
  level: string | null;
  category: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt: string | null;
  creatorId: string;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
    bio?: string | null;
  };
  modules?: Module[];
  _count?: {
    enrollments: number;
    reviews: number;
    modules?: number;
  };
  avgRating?: number | null;
  averageRating?: number;
  totalDuration?: number;
  totalLessons?: number;
  lessonsCount?: number;
  reviews?: Review[];
}

export interface Module {
  id: string;
  title: string;
  order: number;
  position: number;
  courseId: string;
  createdAt?: string;
  updatedAt?: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  order: number;
  position: number;
  moduleId: string;
  isFree: boolean;
  isLocked: boolean;
  isFreePreview: boolean;
  createdAt?: string;
  updatedAt?: string;
  resources?: Resource[];
}

export interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  lessonId: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "LEARNER" | "CREATOR" | "ADMIN";
  createdAt: string;
  lastActiveAt?: string | null;
  completedCoursesCount?: number;
  _count?: {
    enrollments: number;
    courses: number;
  };
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  course?: Course;
  lessonProgress?: LessonProgress[];
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  enrollmentId: string;
  progressPercent: number;
  completedAt: string | null;
  lastWatchedAt: string | null;
  lesson?: Lesson;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  courseId: string;
  user?: User;
}

export interface DashboardTopCourse {
  id: string;
  title: string;
  enrollments: number;
  revenue: number;
  rating: number | null;
}

export interface DashboardStats {
  totalRevenue: number;
  totalEnrollments: number;
  activeLearners: number;
  completionRate: number;
  revenueChange: number;
  enrollmentChange: number;
  totalCourses: number;
  totalUsers: number;
  topCourses: DashboardTopCourse[];
  progressBuckets: Record<string, number>;
  revenueTrends: Array<{ label: string; value: number }>;
  enrollmentTrends: Array<{ label: string; value: number }>;
  userDistribution?: Record<string, number>;
  categoryDistribution?: Array<{ category: string; count: number }>;
}

export interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalEnrollments: number;
    activeLearners: number;
    completionRate: number;
    revenueChange: number;
    enrollmentChange: number;
  };
  charts: {
    revenue: { date: string; value: number }[];
    enrollments: { date: string; value: number }[];
    completions: { date: string; value: number }[];
  };
  topCourses: Course[];
  progressBuckets?: Record<string, number>;
  topLearners?: Array<{
    email: string;
    name: string | null;
    lastActive: string | null;
    course: string;
    progress: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Backend returns courses in a 'courses' field
export interface CoursesResponse {
  courses: Course[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Course player data
export interface CoursePlayerData {
  id: string;
  title: string;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  modules: Array<{
    id: string;
    title: string;
    position: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      videoUrl: string | null;
      durationSeconds: number;
      position: number;
      isLocked?: boolean;
      isFreePreview?: boolean;
      resources?: Resource[];
      progress?: LessonProgress | null;
    }>;
  }>;
  currentLessonId?: string;
  initialTime?: number;
  enrollmentId?: string;
  otherStudents?: Array<{ id: string; name: string | null; image: string | null }>;
  totalOtherStudents?: number;
}

// User profile stats
export interface CreatorStats {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalReviews: number;
  avgRating: string;
}

export interface LearnerStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLessonsCompleted: number;
  totalWatchHours: number;
  enrollments: Enrollment[];
}

// API methods
export const serverApi = {
  // Dashboard (backend: GET /e/analytics returns { analytics: { overview, topCourses, ... } })
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      const data = await serverFetch<{
        analytics?: {
          overview?: {
            totalUsers?: number;
            totalRevenue?: number;
            totalEnrollments?: number;
            activeUsers?: number;
            completionRate?: number;
            totalCourses?: number;
          };
          trends?: {
            revenue?: Array<{ date: string; amount: number }>;
            enrollments?: Array<{ date: string; count: number }>;
          };
          topCourses?: Array<{
            id: string;
            title: string;
            enrollments: number;
            revenue: number;
            rating: number | null;
          }>;
          progressBuckets?: Record<string, number>;
          userDistribution?: Record<string, number>;
          categoryDistribution?: Array<{ category: string; count: number }>;
        };
      }>("/analytics");
      const overview = data.analytics?.overview;
      const trends = data.analytics?.trends;
      const topCourses = data.analytics?.topCourses ?? [];
      const backendBuckets = data.analytics?.progressBuckets;

      return {
        totalRevenue: overview?.totalRevenue ?? 0,
        totalEnrollments: overview?.totalEnrollments ?? 0,
        activeLearners: overview?.activeUsers ?? 0,
        completionRate: overview?.completionRate ?? 0,
        revenueChange: 0,
        enrollmentChange: 0,
        totalCourses: overview?.totalCourses ?? 0,
        totalUsers: overview?.totalUsers ?? 0,
        topCourses: topCourses.map((c) => ({
          id: c.id,
          title: c.title,
          enrollments: c.enrollments,
          revenue: c.revenue,
          rating: c.rating,
        })),
        progressBuckets: backendBuckets && Object.keys(backendBuckets).length > 0
          ? backendBuckets
          : { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0, completed: 0 },
        revenueTrends: (trends?.revenue ?? []).map((r) => ({
          label: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: r.amount,
        })),
        enrollmentTrends: (trends?.enrollments ?? []).map((e) => ({
          label: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: e.count,
        })),
        userDistribution: data.analytics?.userDistribution,
        categoryDistribution: data.analytics?.categoryDistribution,
      };
    },
  },

  // Analytics (backend returns { analytics: { overview, trends, topCourses } }; we normalize to AnalyticsData)
  analytics: {
    getOverview: async (params?: { period?: string }): Promise<AnalyticsData> => {
      const query = params?.period ? `?period=${params.period}` : "";
      const data = await serverFetch<{
        analytics?: {
          overview?: {
            totalRevenue?: number;
            totalEnrollments?: number;
            activeUsers?: number;
            completionRate?: number;
            totalCourses?: number;
          };
          trends?: {
            revenue?: Array<{ date: string; amount: number }>;
            enrollments?: Array<{ date: string; count: number }>;
          };
          topCourses?: Array<{
            id: string;
            title: string;
            enrollments: number;
            revenue: number;
            rating: number | null;
          }>;
          progressBuckets?: Record<string, number>;
          topLearners?: Array<{
            email: string;
            name: string | null;
            lastActive: string | null;
            course: string;
            progress: number;
          }>;
        };
      }>(`/analytics${query}`);
      const overview = data.analytics?.overview;
      const trends = data.analytics?.trends;
      const topCoursesRaw = data.analytics?.topCourses ?? [];
      return {
        overview: {
          totalRevenue: overview?.totalRevenue ?? 0,
          totalEnrollments: overview?.totalEnrollments ?? 0,
          activeLearners: overview?.activeUsers ?? 0,
          completionRate: overview?.completionRate ?? 0,
          revenueChange: 0,
          enrollmentChange: 0,
        },
        charts: {
          revenue: (trends?.revenue ?? []).map((r) => ({ date: r.date, value: r.amount })),
          enrollments: (trends?.enrollments ?? []).map((e) => ({ date: e.date, value: e.count })),
          completions: [],
        },
        topCourses: topCoursesRaw.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: null,
          description: null,
          whatYouWillLearn: null,
          thumbnail: null,
          price: 0,
          status: "PUBLISHED",
          level: null,
          category: null,
          createdAt: "",
          publishedAt: null,
          creatorId: "",
          _count: { enrollments: c.enrollments, reviews: 0 },
          lessonsCount: 0,
        })),
        progressBuckets: data.analytics?.progressBuckets ?? {},
        topLearners: data.analytics?.topLearners ?? [],
      };
    },
  },

  // Courses
  courses: {
    list: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      category?: string;
      level?: string;
      q?: string;
      priceRange?: string;
      sort?: string;
      creatorId?: string;
    }): Promise<PaginatedResponse<Course>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.status) searchParams.set("status", params.status);
      if (params?.category) searchParams.set("category", params.category);
      if (params?.level) searchParams.set("level", params.level);
      if (params?.q) searchParams.set("q", params.q);
      if (params?.priceRange) searchParams.set("priceRange", params.priceRange);
      if (params?.sort) searchParams.set("sort", params.sort);
      if (params?.creatorId) searchParams.set("creatorId", params.creatorId);
      const query = searchParams.toString();
      const response = await serverFetch<CoursesResponse>(
        `/courses${query ? `?${query}` : ""}`
      );
      // Transform backend response to match frontend interface
      return {
        data: response.courses,
        pagination: response.pagination,
      };
    },

    get: async (id: string) => {
      const response = await serverFetch<{ course: Course }>(`/courses/${id}`);
      return response.course;
    },

    getMyCourses: async () => {
      const response = await serverFetch<CoursesResponse>("/courses?mine=true");
      return { data: response.courses, pagination: response.pagination };
    },

    getEnrolled: async () => {
      const response = await serverFetch<{ enrollments: Enrollment[] }>("/users/profile/enrollments");
      return { data: response.enrollments };
    },

    getCategories: () => serverFetch<{ categories: string[] }>("/courses/categories"),
  },

  // Users (backend returns { users, pagination }; we normalize to { data, pagination })
  users: {
    list: async (params?: {
      page?: number;
      limit?: number;
      role?: string;
      q?: string;
    }): Promise<PaginatedResponse<User>> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.role) searchParams.set("role", params.role);
      if (params?.q) searchParams.set("search", params.q);
      const query = searchParams.toString();
      const response = await serverFetch<{
        users: User[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/users${query ? `?${query}` : ""}`);
      return {
        data: response.users,
        pagination: response.pagination,
      };
    },

    get: async (id: string) => {
      const response = await serverFetch<{ user: User }>(`/users/${id}`);
      return response.user;
    },

    getProfile: async () => {
      const response = await serverFetch<{ user: User }>("/users/profile");
      return response.user;
    },
  },

  // Enrollments (for my-courses)
  enrollments: {
    getMine: async () => {
      const response = await serverFetch<{ enrollments: Enrollment[] }>("/users/profile/enrollments");
      return { data: response.enrollments };
    },
  },

  // Lessons
  lessons: {
    get: async (id: string) => {
      const response = await serverFetch<{ lesson: Lesson & { resources?: Resource[]; module?: { id: string; title: string; course: { id: string; title: string; creatorId: string; status: string } } } }>(`/lessons/${id}`);
      return response.lesson;
    },
  },

  // Course player
  player: {
    getCourseWithProgress: (courseId: string) =>
      serverFetch<CoursePlayerData>(`/courses/${courseId}/progress`),
  },

  // Course analytics (for creators/admins)
  courseAnalytics: {
    get: async (courseId: string) => {
      const data = await serverFetch<{
        analytics: {
          courseId: string;
          overview: {
            totalEnrollments: number;
            activeStudents: number;
            completionRate: number;
            averageProgress: number;
            averageRating: number;
            totalRevenue: number;
          };
          enrollmentTrend: Array<{ date: string; count: number }>;
          lessonStats: Array<{
            lessonId: string;
            title: string;
            completionRate: number;
            averageWatchTime: number;
            dropOffRate: number;
          }>;
          topStudents: Array<{
            userId: string;
            name: string | null;
            progress: number;
            completedAt: string | null;
          }>;
        };
      }>(`/courses/${courseId}/analytics`);
      return data.analytics;
    },
  },

  // Profile stats
  profile: {
    getCreatorStats: () => serverFetch<CreatorStats>("/analytics/creator-stats"),
    getLearnerStats: () => serverFetch<LearnerStats>("/analytics/learner-stats"),
  },
};
