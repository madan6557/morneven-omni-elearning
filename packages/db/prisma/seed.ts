import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pwd = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { nim: "admin001" },
    update: {},
    create: { nim: "admin001", name: "Admin Omni", password: pwd, role: "ADMIN" },
  });
  const dosen = await prisma.user.upsert({
    where: { nim: "2024001" },
    update: {},
    create: { nim: "2024001", name: "Dr. Budi (Dosen)", password: pwd, role: "DOSEN" },
  });
  const mhs = await prisma.user.upsert({
    where: { nim: "2025001" },
    update: {},
    create: { nim: "2025001", name: "Ani Mahasiswa", password: pwd, role: "MAHASISWA" },
  });
  // extra mahasiswa for demo rekap
  for (let i = 2; i <= 5; i++) {
    await prisma.user.upsert({
      where: { nim: `202500${i}` },
      update: {},
      create: { nim: `202500${i}`, name: `Mhs ${i}`, password: pwd, role: "MAHASISWA" },
    });
  }

  const course = await prisma.course.upsert({
    where: { id: "course-demo" },
    update: {},
    create: {
      id: "course-demo",
      title: "Dasar Pemrograman Web",
      description: "HTML, CSS, JS, dan progres belajar terlacak.",
    },
  });
  await prisma.courseInstructor.upsert({
    where: { courseId_userId: { courseId: course.id, userId: dosen.id } },
    update: {},
    create: { courseId: course.id, userId: dosen.id },
  });

  const mod1 = await prisma.module.upsert({
    where: { id: "mod-1" },
    update: {},
    create: { id: "mod-1", courseId: course.id, title: "Modul 1 — Pengantar", order: 1 },
  });
  const mod2 = await prisma.module.upsert({
    where: { id: "mod-2" },
    update: {},
    create: { id: "mod-2", courseId: course.id, title: "Modul 2 — CSS & Layout", order: 2 },
  });

  await prisma.material.upsert({
    where: { id: "mat-vid-yt" },
    update: {},
    create: {
      id: "mat-vid-yt",
      moduleId: mod1.id,
      title: "Video: Pengantar Web (YouTube)",
      type: "VIDEO",
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: 212,
      order: 1,
    },
  });
  await prisma.material.upsert({
    where: { id: "mat-vid-upload" },
    update: {},
    create: {
      id: "mat-vid-upload",
      moduleId: mod1.id,
      title: "Video: Instalasi Tools (Upload)",
      type: "VIDEO",
      sourceType: "upload",
      sourceUrl: "/uploads/sample.mp4",
      duration: 600,
      order: 2,
    },
  });
  await prisma.material.upsert({
    where: { id: "mat-pdf" },
    update: {},
    create: {
      id: "mat-pdf",
      moduleId: mod1.id,
      title: "Slide: Pengantar HTML (PDF)",
      type: "PDF",
      sourceType: "upload",
      sourceUrl: "/uploads/intro.pdf",
      totalPages: 12,
      order: 3,
    },
  });
  await prisma.material.upsert({
    where: { id: "mat-ppt" },
    update: { totalPages: 10 },
    create: {
      id: "mat-ppt",
      moduleId: mod2.id,
      title: "Materi: Layout PPT",
      type: "PPT",
      sourceType: "upload",
      sourceUrl: "/uploads/layout.pptx",
      totalPages: 10,
      order: 1,
    },
  });

  // enroll semua mhs
  const mhsList = await prisma.user.findMany({ where: { role: "MAHASISWA" } });
  for (const u of mhsList) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: u.id, courseId: course.id } },
      update: {},
      create: { userId: u.id, courseId: course.id },
    });
  }

  // quiz
  const pre = await prisma.quiz.upsert({
    where: { id: "quiz-pre-1" },
    update: {},
    create: { id: "quiz-pre-1", moduleId: mod1.id, title: "Pretest Modul 1", kind: "PRETEST", passingScore: 60 },
  });
  const post = await prisma.quiz.upsert({
    where: { id: "quiz-post-1" },
    update: {},
    create: { id: "quiz-post-1", moduleId: mod1.id, title: "Posttest Modul 1", kind: "POSTTEST", passingScore: 60 },
  });
  for (const q of [pre, post]) {
    await prisma.question.deleteMany({ where: { quizId: q.id } });
    await prisma.question.createMany({
      data: [
        { quizId: q.id, order: 1, text: "HTML singkatan dari?", options: JSON.stringify(["Hyper Text Markup Language", "High Text Machine Language", "Hyperlink Text Marking Language", "Home Tool Markup Language"]), correctIndex: 0, points: 10 },
        { quizId: q.id, order: 2, text: "Tag untuk paragraf adalah?", options: JSON.stringify(["<p>", "<para>", "<pg>", "<text>"]), correctIndex: 0, points: 10 },
        { quizId: q.id, order: 3, text: "CSS digunakan untuk?", options: JSON.stringify(["Struktur", "Styling", "Database", "Server"]), correctIndex: 1, points: 10 },
      ],
    });
  }

  console.log({ admin: admin.nim, dosen: dosen.nim, mhs: mhs.nim, course: course.id });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
