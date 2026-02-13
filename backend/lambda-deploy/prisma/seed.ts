import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cxflow.io' },
    update: {},
    create: {
      email: 'admin@cxflow.io',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      bio: 'Platform administrator',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create creator user
  const creatorPassword = await bcrypt.hash('creator123', 10);
  const creator = await prisma.user.upsert({
    where: { email: 'creator@cxflow.io' },
    update: {},
    create: {
      email: 'creator@cxflow.io',
      password: creatorPassword,
      name: 'María García',
      role: 'CREATOR',
      bio: 'Instructora con 10+ años de experiencia en desarrollo web y diseño UX/UI.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });
  console.log('✅ Created creator user:', creator.email);

  // Create learner users
  const learnerPassword = await bcrypt.hash('learner123', 10);
  const learners = await Promise.all([
    prisma.user.upsert({
      where: { email: 'juan@example.com' },
      update: {},
      create: {
        email: 'juan@example.com',
        password: learnerPassword,
        name: 'Juan Pérez',
        role: 'LEARNER',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@example.com' },
      update: {},
      create: {
        email: 'ana@example.com',
        password: learnerPassword,
        name: 'Ana Martínez',
        role: 'LEARNER',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@example.com' },
      update: {},
      create: {
        email: 'carlos@example.com',
        password: learnerPassword,
        name: 'Carlos López',
        role: 'LEARNER',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
    }),
  ]);
  console.log('✅ Created', learners.length, 'learner users');

  // Create courses
  const course1 = await prisma.course.upsert({
    where: { id: 'course-react-fundamentals' },
    update: {
      whatYouWillLearn: JSON.stringify([
        'Crear aplicaciones web modernas con React y hooks',
        'Gestionar el estado de forma eficiente con useState y useContext',
        'Implementar navegación con React Router',
        'Aplicar patrones de diseño y mejores prácticas',
        'Escribir tests unitarios con Jest y Testing Library',
        'Desplegar aplicaciones React en producción',
      ]),
    },
    create: {
      id: 'course-react-fundamentals',
      title: 'React: De Cero a Experto',
      subtitle: 'Domina React.js y construye aplicaciones modernas',
      description: `Aprende React desde los fundamentos hasta técnicas avanzadas. 
      
Este curso cubre:
- Componentes y props
- Estado y ciclo de vida
- Hooks (useState, useEffect, useContext, etc.)
- React Router
- Gestión de estado con Redux
- Testing con Jest y React Testing Library
- Mejores prácticas y patrones de diseño`,
      whatYouWillLearn: JSON.stringify([
        'Crear aplicaciones web modernas con React y hooks',
        'Gestionar el estado de forma eficiente con useState y useContext',
        'Implementar navegación con React Router',
        'Aplicar patrones de diseño y mejores prácticas',
        'Escribir tests unitarios con Jest y Testing Library',
        'Desplegar aplicaciones React en producción',
      ]),
      coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
      price: 49.99,
      currency: 'USD',
      status: 'PUBLISHED',
      level: 'BEGINNER',
      category: 'Desarrollo Web',
      language: 'Español',
      creatorId: creator.id,
      publishedAt: new Date(),
    },
  });

  const course2 = await prisma.course.upsert({
    where: { id: 'course-node-backend' },
    update: {
      whatYouWillLearn: JSON.stringify([
        'Construir APIs RESTful escalables con Express.js',
        'Implementar autenticación segura con JWT',
        'Trabajar con bases de datos SQL y NoSQL',
        'Crear sistemas de tiempo real con WebSockets',
        'Aplicar patrones de arquitectura backend',
        'Desplegar aplicaciones en la nube',
      ]),
    },
    create: {
      id: 'course-node-backend',
      title: 'Node.js: Backend Profesional',
      subtitle: 'Construye APIs robustas y escalables',
      description: `Domina el desarrollo backend con Node.js y Express.

Aprenderás:
- Fundamentos de Node.js
- Express.js y middlewares
- Bases de datos SQL y NoSQL
- Autenticación y autorización
- APIs RESTful
- WebSockets
- Despliegue y DevOps`,
      whatYouWillLearn: JSON.stringify([
        'Construir APIs RESTful escalables con Express.js',
        'Implementar autenticación segura con JWT',
        'Trabajar con bases de datos SQL y NoSQL',
        'Crear sistemas de tiempo real con WebSockets',
        'Aplicar patrones de arquitectura backend',
        'Desplegar aplicaciones en la nube',
      ]),
      coverImage: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
      price: 59.99,
      currency: 'USD',
      status: 'PUBLISHED',
      level: 'INTERMEDIATE',
      category: 'Desarrollo Web',
      language: 'Español',
      creatorId: creator.id,
      publishedAt: new Date(),
    },
  });

  const course3 = await prisma.course.upsert({
    where: { id: 'course-ux-design' },
    update: {
      whatYouWillLearn: JSON.stringify([
        'Dominar los principios fundamentales de UX/UI',
        'Realizar investigación de usuarios efectiva',
        'Crear wireframes y prototipos interactivos',
        'Diseñar interfaces accesibles e inclusivas',
        'Usar Figma como un profesional',
        'Construir y documentar design systems',
      ]),
    },
    create: {
      id: 'course-ux-design',
      title: 'UX/UI Design Masterclass',
      subtitle: 'Diseña experiencias de usuario excepcionales',
      description: `Aprende a diseñar interfaces intuitivas y atractivas.

Contenido:
- Principios de UX
- Investigación de usuarios
- Wireframing y prototipos
- Diseño visual
- Figma avanzado
- Design systems
- Accesibilidad`,
      whatYouWillLearn: JSON.stringify([
        'Dominar los principios fundamentales de UX/UI',
        'Realizar investigación de usuarios efectiva',
        'Crear wireframes y prototipos interactivos',
        'Diseñar interfaces accesibles e inclusivas',
        'Usar Figma como un profesional',
        'Construir y documentar design systems',
      ]),
      coverImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
      price: 39.99,
      currency: 'USD',
      status: 'PUBLISHED',
      level: 'ALL_LEVELS',
      category: 'Diseño',
      language: 'Español',
      creatorId: creator.id,
      publishedAt: new Date(),
    },
  });

  const course4 = await prisma.course.upsert({
    where: { id: 'course-python-ml' },
    update: {},
    create: {
      id: 'course-python-ml',
      title: 'Python para Machine Learning',
      subtitle: 'Introducción a la inteligencia artificial',
      description: 'Aprende los fundamentos de Machine Learning con Python, NumPy, Pandas y Scikit-learn.',
      coverImage: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
      price: 79.99,
      currency: 'USD',
      status: 'DRAFT',
      level: 'ADVANCED',
      category: 'Data Science',
      language: 'Español',
      creatorId: creator.id,
    },
  });

  console.log('✅ Created 4 courses');

  // Create modules and lessons for course 1
  const module1 = await prisma.module.create({
    data: {
      title: 'Introducción a React',
      position: 0,
      courseId: course1.id,
      lessons: {
        create: [
          {
            title: 'Bienvenida al curso',
            description: 'Conoce lo que aprenderás en este curso y cómo está estructurado.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 300,
            position: 0,
            isFreePreview: true,
          },
          {
            title: '¿Qué es React?',
            description: 'Introducción a React y por qué es tan popular.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 720,
            position: 1,
            isFreePreview: true,
          },
          {
            title: 'Configuración del entorno',
            description: 'Instala Node.js, npm y crea tu primer proyecto con Vite.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 900,
            position: 2,
          },
        ],
      },
    },
  });

  const module2 = await prisma.module.create({
    data: {
      title: 'Componentes y JSX',
      position: 1,
      courseId: course1.id,
      lessons: {
        create: [
          {
            title: 'Tu primer componente',
            description: 'Crea tu primer componente de React.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 600,
            position: 0,
          },
          {
            title: 'Entendiendo JSX',
            description: 'Aprende la sintaxis JSX y sus particularidades.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 840,
            position: 1,
          },
          {
            title: 'Props: Pasando datos',
            description: 'Cómo pasar datos entre componentes usando props.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 780,
            position: 2,
          },
          {
            title: 'Renderizado condicional',
            description: 'Muestra contenido basado en condiciones.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 660,
            position: 3,
          },
        ],
      },
    },
  });

  const module3 = await prisma.module.create({
    data: {
      title: 'Estado y Hooks',
      position: 2,
      courseId: course1.id,
      lessons: {
        create: [
          {
            title: 'useState: Estado local',
            description: 'Maneja el estado en tus componentes funcionales.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 900,
            position: 0,
          },
          {
            title: 'useEffect: Efectos secundarios',
            description: 'Ejecuta código en diferentes momentos del ciclo de vida.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 1080,
            position: 1,
          },
          {
            title: 'useContext: Estado global',
            description: 'Comparte estado entre componentes sin prop drilling.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationSeconds: 960,
            position: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Created modules and lessons for React course');

  // Get lesson IDs for progress
  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId: course1.id } },
    orderBy: [{ module: { position: 'asc' } }, { position: 'asc' }],
  });

  // Create enrollments
  const enrollment1 = await prisma.enrollment.create({
    data: {
      userId: learners[0].id,
      courseId: course1.id,
    },
  });

  const enrollment2 = await prisma.enrollment.create({
    data: {
      userId: learners[1].id,
      courseId: course1.id,
    },
  });

  const enrollment3 = await prisma.enrollment.create({
    data: {
      userId: learners[2].id,
      courseId: course1.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: learners[0].id,
      courseId: course2.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: learners[1].id,
      courseId: course3.id,
    },
  });

  console.log('✅ Created enrollments');

  // Create lesson progress
  // User 1 has completed first module
  for (let i = 0; i < 3; i++) {
    await prisma.lessonProgress.create({
      data: {
        enrollmentId: enrollment1.id,
        lessonId: lessons[i].id,
        progressPercent: 100,
        lastWatchedTimestamp: lessons[i].durationSeconds,
        lastWatchedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }
  // User 1 is in progress on lesson 4
  await prisma.lessonProgress.create({
    data: {
      enrollmentId: enrollment1.id,
      lessonId: lessons[3].id,
      progressPercent: 45,
      lastWatchedTimestamp: 270,
      lastWatchedAt: new Date(),
    },
  });

  // User 2 has completed lessons 1-2
  for (let i = 0; i < 2; i++) {
    await prisma.lessonProgress.create({
      data: {
        enrollmentId: enrollment2.id,
        lessonId: lessons[i].id,
        progressPercent: 100,
        lastWatchedTimestamp: lessons[i].durationSeconds,
        lastWatchedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  // User 3 just started
  await prisma.lessonProgress.create({
    data: {
      enrollmentId: enrollment3.id,
      lessonId: lessons[0].id,
      progressPercent: 30,
      lastWatchedTimestamp: 90,
      lastWatchedAt: new Date(),
    },
  });

  console.log('✅ Created lesson progress');

  // Add resources to lessons
  await prisma.resource.createMany({
    data: [
      {
        title: 'Slides de la introducción',
        type: 'pdf',
        url: 'https://example.com/slides/intro.pdf',
        fileSize: 2048000,
        lessonId: lessons[0].id,
      },
      {
        title: 'Documentación oficial de React',
        type: 'link',
        url: 'https://react.dev',
        lessonId: lessons[1].id,
      },
      {
        title: 'Código fuente del proyecto',
        type: 'link',
        url: 'https://github.com/example/react-starter',
        lessonId: lessons[2].id,
      },
    ],
  });

  console.log('✅ Created resources');

  // Create reviews
  await prisma.review.createMany({
    data: [
      {
        rating: 5,
        comment: 'Excelente curso! María explica todo de manera muy clara. Totalmente recomendado.',
        userId: learners[0].id,
        courseId: course1.id,
      },
      {
        rating: 4,
        comment: 'Muy buen contenido, aunque me gustaría ver más ejercicios prácticos.',
        userId: learners[1].id,
        courseId: course1.id,
      },
    ],
  });

  console.log('✅ Created reviews');

  // Create Q&A
  const question1 = await prisma.question.create({
    data: {
      content: '¿Cuál es la diferencia entre state y props?',
      userId: learners[0].id,
      lessonId: lessons[3].id,
    },
  });

  await prisma.answer.create({
    data: {
      content: 'Props son datos que se pasan de padre a hijo y son inmutables. State es el estado interno de un componente que puede cambiar con el tiempo. Props fluyen hacia abajo, el state se maneja localmente.',
      userId: creator.id,
      questionId: question1.id,
      isAccepted: true,
    },
  });

  const question2 = await prisma.question.create({
    data: {
      content: '¿Por qué mi useEffect se ejecuta dos veces?',
      userId: learners[1].id,
      lessonId: lessons[5].id,
    },
  });

  await prisma.answer.create({
    data: {
      content: 'En desarrollo con React 18 y StrictMode, los efectos se ejecutan dos veces intencionalmente para detectar problemas. En producción solo se ejecuta una vez.',
      userId: creator.id,
      questionId: question2.id,
      isAccepted: true,
    },
  });

  console.log('✅ Created Q&A');

  // Create notes
  await prisma.note.createMany({
    data: [
      {
        content: 'Importante: React usa un Virtual DOM para optimizar el renderizado',
        timestampSeconds: 180,
        userId: learners[0].id,
        lessonId: lessons[1].id,
      },
      {
        content: 'Recordar: siempre instalar las extensiones de VS Code recomendadas',
        timestampSeconds: 420,
        userId: learners[0].id,
        lessonId: lessons[2].id,
      },
    ],
  });

  console.log('✅ Created notes');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Test accounts:');
  console.log('   Admin: admin@cxflow.io / admin123');
  console.log('   Creator: creator@cxflow.io / creator123');
  console.log('   Learner: juan@example.com / learner123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
