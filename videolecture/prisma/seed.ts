import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sample video URLs (using Big Buck Bunny - open source video)
const SAMPLE_VIDEOS = [
  "https://www.youtube.com/embed/aqz-KE-bpKQ", // Big Buck Bunny
  "https://www.youtube.com/embed/YE7VzlLtp-4", // Sintel
  "https://www.youtube.com/embed/gWw23EYM9VM", // Elephants Dream
];

async function main() {
  console.log("🌱 Starting seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@videolecture.com" },
    update: {},
    create: {
      email: "admin@videolecture.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create creator user
  const creatorPassword = await bcrypt.hash("creator123", 12);
  const creator = await prisma.user.upsert({
    where: { email: "creator@videolecture.com" },
    update: {},
    create: {
      email: "creator@videolecture.com",
      name: "Fabio Sanches Lozada",
      password: creatorPassword,
      role: "CREATOR",
      bio: "Design instructor with 10+ years of experience in print and digital design.",
    },
  });
  console.log("✅ Creator user created:", creator.email);

  // Create learner user
  const learnerPassword = await bcrypt.hash("learner123", 12);
  const learner = await prisma.user.upsert({
    where: { email: "learner@videolecture.com" },
    update: {},
    create: {
      email: "learner@videolecture.com",
      name: "John Learner",
      password: learnerPassword,
      role: "LEARNER",
    },
  });
  console.log("✅ Learner user created:", learner.email);

  // Create sample course
  const course = await prisma.course.upsert({
    where: { id: "tshirt-design-essentials" },
    update: {},
    create: {
      id: "tshirt-design-essentials",
      title: "T-shirt Design Essentials",
      subtitle: "Learn print-ready graphics with practical constraints",
      description:
        "Master the art of t-shirt design with practical constraints: fabrics, inks, contrast, and layout. This comprehensive course covers everything you need to know to create professional print-ready designs.\n\nWhat you'll learn:\n• Understand different fabric types and their print compatibility\n• Master color theory for print design\n• Create designs that scale across sizes\n• Work with industry-standard print methods",
      coverImage: "/images/courses/tshirt-design.jpg",
      price: 0, // Free course for testing
      status: "PUBLISHED",
      level: "ALL_LEVELS",
      category: "Design",
      language: "English",
      creatorId: creator.id,
      publishedAt: new Date(),
    },
  });
  console.log("✅ Course created:", course.title);

  // Create modules
  const modules = [
    { title: "Introduction to T-Shirt Design", position: 0 },
    { title: "Understanding Fabrics & Printing", position: 1 },
    { title: "Creating Your First Design", position: 2 },
  ];

  for (const moduleData of modules) {
    const module = await prisma.module.upsert({
      where: { id: `${course.id}-module-${moduleData.position}` },
      update: {},
      create: {
        id: `${course.id}-module-${moduleData.position}`,
        title: moduleData.title,
        position: moduleData.position,
        courseId: course.id,
      },
    });
    console.log("✅ Module created:", module.title);

    // Create lessons for each module
    const lessons =
      moduleData.position === 0
        ? [
            { title: "Every T-shirt has a Story", duration: 480, position: 0 },
            { title: "History of the T-Shirt", duration: 720, position: 1 },
            { title: "What Makes a Good Graphic", duration: 600, position: 2 },
          ]
        : moduleData.position === 1
        ? [
            { title: "The Kinds of Fabric", duration: 840, position: 0 },
            { title: "T-Shirt Construction", duration: 1620, position: 1, isLocked: false },
            { title: "Understanding Print Methods", duration: 900, position: 2, isLocked: false },
          ]
        : [
            { title: "Color Theory for Print", duration: 720, position: 0, isLocked: false },
            { title: "Designing for Different Sizes", duration: 540, position: 1, isLocked: false },
            { title: "Final Project: Your First Design", duration: 1200, position: 2, isLocked: false },
          ];

    for (const lessonData of lessons) {
      const videoIndex = (moduleData.position * 3 + lessonData.position) % SAMPLE_VIDEOS.length;
      const lesson = await prisma.lesson.upsert({
        where: { id: `${module.id}-lesson-${lessonData.position}` },
        update: {},
        create: {
          id: `${module.id}-lesson-${lessonData.position}`,
          title: lessonData.title,
          description: `Learn about ${lessonData.title.toLowerCase()} in this comprehensive lesson. This lesson covers practical techniques and industry best practices.`,
          videoUrl: SAMPLE_VIDEOS[videoIndex],
          durationSeconds: lessonData.duration,
          position: lessonData.position,
          isLocked: lessonData.isLocked || false,
          isFreePreview: lessonData.position === 0 && moduleData.position === 0,
          moduleId: module.id,
        },
      });
      console.log("  ✅ Lesson created:", lesson.title);
    }
  }

  // Create enrollment for learner
  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: learner.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: learner.id,
      courseId: course.id,
    },
  });
  console.log("✅ Enrollment created for learner");

  // Create some progress for the learner
  const firstModule = await prisma.module.findFirst({
    where: { courseId: course.id },
    include: { lessons: true },
    orderBy: { position: "asc" },
  });

  if (firstModule) {
    for (let i = 0; i < 2; i++) {
      const lesson = firstModule.lessons[i];
      if (lesson) {
        await prisma.lessonProgress.upsert({
          where: {
            enrollmentId_lessonId: {
              enrollmentId: enrollment.id,
              lessonId: lesson.id,
            },
          },
          update: {},
          create: {
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
            progressPercent: 100,
            completedAt: new Date(),
          },
        });
        console.log("  ✅ Progress created for lesson:", lesson.title);
      }
    }

    // Third lesson in progress
    const thirdLesson = firstModule.lessons[2];
    if (thirdLesson) {
      await prisma.lessonProgress.upsert({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId: thirdLesson.id,
          },
        },
        update: {},
        create: {
          enrollmentId: enrollment.id,
          lessonId: thirdLesson.id,
          progressPercent: 45,
          lastWatchedTimestamp: 270,
          lastWatchedAt: new Date(),
        },
      });
      console.log("  ✅ In-progress created for lesson:", thirdLesson.title);
    }
  }

  // Create a second course
  const course2 = await prisma.course.upsert({
    where: { id: "branding-basics" },
    update: {},
    create: {
      id: "branding-basics",
      title: "Branding Basics for Creators",
      subtitle: "Build a memorable brand identity",
      description:
        "Learn the fundamentals of branding and create a cohesive brand identity that resonates with your audience.",
      coverImage: "/images/courses/branding.jpg",
      price: 39.99,
      status: "PUBLISHED",
      level: "BEGINNER",
      category: "Design",
      language: "English",
      creatorId: creator.id,
      publishedAt: new Date(),
    },
  });
  console.log("✅ Course created:", course2.title);

  // Create a draft course
  const draftCourse = await prisma.course.upsert({
    where: { id: "advanced-print" },
    update: {},
    create: {
      id: "advanced-print",
      title: "Advanced Print Techniques",
      subtitle: "Take your designs to the next level",
      description: "Master advanced printing techniques for professional results.",
      price: 79.99,
      status: "DRAFT",
      level: "ADVANCED",
      category: "Design",
      language: "English",
      creatorId: creator.id,
    },
  });
  console.log("✅ Draft course created:", draftCourse.title);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
