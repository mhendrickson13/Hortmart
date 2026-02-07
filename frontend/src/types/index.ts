// Base types (replacing @prisma/client types)
export type UserRole = "LEARNER" | "CREATOR" | "ADMIN";
export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  bio?: string | null;
  role: UserRole;
  createdAt: string;
  emailVerified?: string | null;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  coverImage?: string | null;
  price: number;
  status: CourseStatus | string;
  level: string | null;
  category: string | null;
  language?: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt: string | null;
  creatorId: string;
  creator?: Pick<User, "id" | "name" | "image" | "bio">;
}

export interface Module {
  id: string;
  title: string;
  position: number;
  order?: number;
  courseId: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  position: number;
  order?: number;
  moduleId: string;
  isLocked?: boolean;
  isFreePreview?: boolean;
  isFree?: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  lessonId: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  enrollmentId: string;
  progressPercent: number;
  completedAt: string | null;
  lastWatchedAt: string | null;
  lastWatchedTimestamp?: number;
}

export interface Note {
  id: string;
  content: string;
  timestamp: number;
  lessonId: string;
  userId: string;
  createdAt: string;
}

export interface Question {
  id: string;
  content: string;
  timestamp?: number | null;
  lessonId: string;
  userId: string;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "image">;
}

export interface Answer {
  id: string;
  content: string;
  questionId: string;
  userId: string;
  isAccepted?: boolean;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "image">;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  courseId: string;
  user?: Pick<User, "id" | "name" | "image">;
}

// Extended types with relations
export type CourseWithModules = Course & {
  modules: ModuleWithLessons[];
  creator: Pick<User, "id" | "name" | "image">;
  _count?: {
    enrollments: number;
    reviews: number;
  };
  averageRating?: number;
  totalDuration?: number;
  lessonsCount?: number;
};

export type ModuleWithLessons = Module & {
  lessons: LessonWithProgress[];
};

export type LessonWithProgress = Lesson & {
  progress?: LessonProgress | null;
  resources?: Resource[];
};

export type EnrollmentWithProgress = Enrollment & {
  course: Course;
  lessonProgress: LessonProgress[];
};

export type CourseWithProgress = Course & {
  modules: ModuleWithLessons[];
  enrollment?: EnrollmentWithProgress | null;
  progress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
    lastPlayedLessonId?: string;
    lastPlayedTimestamp?: number;
  };
};

export type QuestionWithAnswers = Question & {
  user: Pick<User, "id" | "name" | "image">;
  answers: AnswerWithUser[];
};

export type AnswerWithUser = Answer & {
  user: Pick<User, "id" | "name" | "image">;
};

export type NoteWithTimestamp = Note & {
  formattedTimestamp?: string;
};

export type ReviewWithUser = Review & {
  user: Pick<User, "id" | "name" | "image">;
};

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Course catalog filters
export interface CourseFilters {
  search?: string;
  category?: string;
  level?: string;
  priceRange?: "free" | "paid" | "all";
  sort?: "newest" | "popular" | "price-low" | "price-high";
}

// Analytics types
export interface DashboardStats {
  revenue: {
    total: number;
    change: number;
  };
  enrollments: {
    total: number;
    change: number;
  };
  activeLearners: {
    total: number;
    period: string;
  };
  completionRate: {
    average: number;
  };
}

export interface SalesData {
  date: string;
  revenue: number;
  enrollments: number;
}

export interface ProgressDistribution {
  range: string;
  count: number;
}

// Form types
export interface CourseFormData {
  title: string;
  subtitle?: string;
  description?: string;
  coverImage?: string;
  price: number;
  level: string;
  category?: string;
  language: string;
}

export interface LessonFormData {
  title: string;
  description?: string;
  videoUrl?: string;
  durationSeconds?: number;
  isLocked?: boolean;
  isFreePreview?: boolean;
}

export interface ModuleFormData {
  title: string;
}
