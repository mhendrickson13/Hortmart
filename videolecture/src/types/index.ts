import type {
  User,
  Course,
  Module,
  Lesson,
  Enrollment,
  LessonProgress,
  Note,
  Question,
  Answer,
  Review,
  Resource,
} from "@prisma/client";

// Extended types with relations
export type CourseWithModules = Course & {
  modules: ModuleWithLessons[];
  creator: Pick<User, "id" | "name" | "image">;
  _count?: {
    enrollments: number;
    reviews: number;
  };
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
