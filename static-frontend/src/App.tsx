import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/components/shared/providers";

// Layouts
import { AdminLayout } from "@/layouts/AdminLayout";
import { LearnerLayout } from "@/layouts/LearnerLayout";
import { PublicLearnerLayout } from "@/layouts/PublicLearnerLayout";
import { PlayerLayout } from "@/layouts/PlayerLayout";
import { SharedLayout } from "@/layouts/SharedLayout";

// Pages
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ManageCoursesPage from "@/pages/ManageCoursesPage";
import NewCoursePage from "@/pages/NewCoursePage";
import EditCoursePage from "@/pages/EditCoursePage";
import CourseAnalyticsPage from "@/pages/CourseAnalyticsPage";
import AdminCoursePreviewPage from "@/pages/AdminCoursePreviewPage";
import LessonEditPage from "@/pages/LessonEditPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import CoursesPage from "@/pages/CoursesPage";
import CourseOverviewPage from "@/pages/CourseOverviewPage";
import MyCoursesPage from "@/pages/MyCoursesPage";
import PlayerPage from "@/pages/PlayerPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<HomePage />} />

          {/* Auth routes - no layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin routes */}
          <Route path="/dashboard" element={<AdminLayout><DashboardPage /></AdminLayout>} />
          <Route path="/analytics" element={<AdminLayout><AnalyticsPage /></AdminLayout>} />
          <Route path="/manage-courses" element={<AdminLayout><ManageCoursesPage /></AdminLayout>} />
          <Route path="/manage-courses/new" element={<AdminLayout><NewCoursePage /></AdminLayout>} />
          <Route path="/manage-courses/:id/edit" element={<AdminLayout><EditCoursePage /></AdminLayout>} />
          <Route path="/manage-courses/:id/analytics" element={<AdminLayout><CourseAnalyticsPage /></AdminLayout>} />
          <Route path="/manage-courses/:id/preview" element={<AdminCoursePreviewPage />} />
          <Route path="/manage-courses/:id/lessons/:lessonId/edit" element={<AdminLayout><LessonEditPage /></AdminLayout>} />
          <Route path="/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
          <Route path="/users/:id" element={<AdminLayout><UserDetailPage /></AdminLayout>} />

          {/* Public learner routes (browsable without login) */}
          <Route path="/courses" element={<PublicLearnerLayout><CoursesPage /></PublicLearnerLayout>} />
          <Route path="/course/:id" element={<PublicLearnerLayout><CourseOverviewPage /></PublicLearnerLayout>} />

          {/* Authenticated learner routes */}
          <Route path="/my-courses" element={<LearnerLayout><MyCoursesPage /></LearnerLayout>} />

          {/* Player route */}
          <Route path="/player/:id" element={<PlayerLayout><PlayerPage /></PlayerLayout>} />

          {/* Shared routes */}
          <Route path="/profile" element={<SharedLayout><ProfilePage /></SharedLayout>} />
          <Route path="/settings" element={<SharedLayout><SettingsPage /></SharedLayout>} />

          {/* 404 fallback */}
          <Route path="*" element={
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-display font-bold text-text-1 mb-2">404</h1>
                <p className="text-body text-text-2 mb-4">Page not found</p>
                <a href="/" className="text-primary font-semibold hover:underline">Go home</a>
              </div>
            </div>
          } />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
