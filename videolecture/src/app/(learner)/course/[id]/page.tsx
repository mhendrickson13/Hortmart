import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Clock,
  Users,
  Globe,
  BarChart3,
  CheckCircle,
  Lock,
} from "lucide-react";
import { formatDuration, formatPrice, getInitials } from "@/lib/utils";

async function getCourse(id: string) {
  const course = await db.course.findUnique({
    where: { id, status: "PUBLISHED" },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              isLocked: true,
              isFreePreview: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
          reviews: true,
        },
      },
    },
  });

  return course;
}

async function getEnrollment(userId: string, courseId: string) {
  return db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });
}

export default async function CourseOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const course = await getCourse(params.id);

  if (!course) {
    notFound();
  }

  const session = await auth();
  const enrollment = session?.user
    ? await getEnrollment(session.user.id, course.id)
    : null;

  type ModuleType = typeof course.modules[0];
  type LessonType = ModuleType['lessons'][0];

  const allLessons = course.modules.flatMap((m: ModuleType) => m.lessons);
  const totalDuration = allLessons.reduce((sum: number, l: LessonType) => sum + l.durationSeconds, 0);
  const totalLessons = allLessons.length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 lg:space-y-5">
        {/* Header - Mobile Optimized */}
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl gradient-primary border border-border/95 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-h3 lg:text-h1 font-bold text-text-1">{course.title}</h1>
            <p className="text-caption lg:text-body text-text-2 mt-0.5 lg:mt-1">
              by{" "}
              <Link href="#" className="text-primary-600 font-semibold">
                {course.creator.name}
              </Link>
            </p>
          </div>
        </div>

        {/* Cover Image */}
        <Card className="aspect-video overflow-hidden relative">
          {course.coverImage ? (
            <Image
              src={course.coverImage}
              alt={course.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full gradient-primary" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="w-20 h-20 rounded-full bg-white/70 backdrop-blur-sm border border-white/85 flex items-center justify-center shadow-soft-2 hover:bg-white/90 transition-colors">
              <Play className="w-8 h-8 text-text-1 ml-1" fill="currentColor" />
            </button>
          </div>
        </Card>

        {/* Course Stats - Mobile Compact */}
        <div className="grid grid-cols-2 gap-2 lg:gap-3">
          <Card className="p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
            <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-text-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] lg:text-overline text-text-3 uppercase">Level</div>
              <div className="text-caption lg:text-body-sm font-semibold text-text-1 truncate">
                {course.level.replace("_", " ")}
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
            <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-text-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] lg:text-overline text-text-3 uppercase">Length</div>
              <div className="text-caption lg:text-body-sm font-semibold text-text-1">
                {formatDuration(totalDuration)}
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
            <Users className="w-4 h-4 lg:w-5 lg:h-5 text-text-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] lg:text-overline text-text-3 uppercase">Students</div>
              <div className="text-caption lg:text-body-sm font-semibold text-text-1">
                {course._count.enrollments}
              </div>
            </div>
          </Card>
          <Card className="p-3 lg:p-4 flex items-center gap-2 lg:gap-3">
            <Globe className="w-4 h-4 lg:w-5 lg:h-5 text-text-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] lg:text-overline text-text-3 uppercase">Language</div>
              <div className="text-caption lg:text-body-sm font-semibold text-text-1">
                {course.language}
              </div>
            </div>
          </Card>
        </div>

        {/* Description */}
        <Card className="p-4 lg:p-6">
          <h2 className="text-body lg:text-h3 font-semibold text-text-1 mb-2 lg:mb-3">About this course</h2>
          <p className="text-caption lg:text-body text-text-2 whitespace-pre-line">
            {course.description || "No description available."}
          </p>
        </Card>

        {/* Instructor */}
        <Card className="p-4 lg:p-6">
          <h2 className="text-body lg:text-h3 font-semibold text-text-1 mb-3 lg:mb-4">Instructor</h2>
          <div className="flex items-start gap-3 lg:gap-4">
            <Avatar className="w-12 h-12 lg:w-16 lg:h-16">
              <AvatarImage src={course.creator.image || undefined} />
              <AvatarFallback>{getInitials(course.creator.name || "I")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-body-sm lg:text-body font-semibold text-text-1">
                {course.creator.name}
              </h3>
              <p className="text-caption lg:text-body-sm text-text-2 mt-0.5 lg:mt-1">
                {course.creator.bio || "Course instructor"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-[360px] flex-shrink-0 space-y-4 order-first lg:order-none">
        {/* Enroll Card - Sticky on mobile */}
        <Card className="p-3 lg:p-4 lg:sticky lg:top-0">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="text-h3 lg:text-h2 font-bold text-text-1">
              {course.price === 0 ? "Free" : formatPrice(course.price)}
            </div>
            {enrollment && <Pill variant="completed" size="sm">Enrolled</Pill>}
          </div>

          {enrollment ? (
            <Button asChild className="w-full" size="default">
              <Link href={`/player/${course.id}`}>Continue Learning</Link>
            </Button>
          ) : (
            <form action={`/api/courses/${course.id}/enroll`} method="POST">
              <Button type="submit" className="w-full" size="default">
                {course.price === 0 ? "Enroll for Free" : "Buy Now"}
              </Button>
            </form>
          )}
        </Card>

        {/* Curriculum */}
        <Card className="p-3 lg:p-4">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="text-body-sm lg:text-body font-bold text-text-1">Course content</h3>
            <span className="text-caption text-text-3">
              {totalLessons} lessons
            </span>
          </div>

          <div className="space-y-3">
            {course.modules.map((module: ModuleType) => (
              <div key={module.id}>
                <div className="text-caption font-semibold text-text-2 mb-2">
                  {module.title}
                </div>
                <div className="space-y-1.5 lg:space-y-2">
                  {module.lessons.map((lesson: LessonType) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl border border-border/95 bg-white/95"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-text-3/50 flex items-center justify-center flex-shrink-0">
                        {lesson.isLocked ? (
                          <Lock className="w-3 h-3 text-text-3" />
                        ) : lesson.isFreePreview ? (
                          <Play className="w-3 h-3 text-primary" fill="currentColor" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption font-semibold text-text-1 truncate">
                          {lesson.title}
                        </p>
                        <p className="text-[10px] lg:text-[11px] text-text-3">
                          {formatDuration(lesson.durationSeconds)}
                        </p>
                      </div>
                      {lesson.isFreePreview && (
                        <Pill size="sm">Preview</Pill>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
