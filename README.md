# OMNI E-Learning — Monorepo (Vite + Express)

> **Dokumentasi lengkap:** `docs/README.md` · **Integrasi SI Utama:** `docs/INTEGRATION.md` · **API:** `docs/API.md`

Monorepo `pnpm workspaces + Turborepo` untuk kolaborasi FE Vite dan BE Express. OMNI menyediakan mata kuliah bertingkat modul, materi, tugas, Quiz/Pretest/Posttest, modul ujian UTS/UAS, progress individual, penilaian, import Excel, backup, Help berbasis role, dan kontrol availability.

## Struktur
```
apps/
  web  - FE Vite + React + Tailwind (port 5173) — owns UI, omni-logo.svg placeholder
  api  - BE Express + Prisma + JWT (port 4000) — owns auth, tracking, quiz
packages/
  db      - Prisma schema + seed
  shared  - Zod DTOs (kontrak FE↔BE)
  config  - shared eslint/tsconfig
```

## Stack
- FE: Vite 6, React 18, React Router, TanStack Query, Tailwind, axios
- BE: Express 4, Prisma 5, PostgreSQL (SQLite fallback dev), Zod, JWT, multer
- DB: `Course → Module → Material/Assignment/Quiz` + enrollment, progress individual, download, submission, essay grading, notification, audit log, dan metadata publikasi hasil
- Auth: NIM/password (bcrypt), role ADMIN/DOSEN/MAHASISWA, cookie JWT HttpOnly untuk browser, Bearer untuk integrasi
- Tracking: `timeupdate` 5s (upload video), YT/Drive est., `viewedPages` JSON, download via `/download` endpoint
- Quiz: pilihan ganda dinamis dan essay, auto/manual grading, attempt, timer, jadwal, publikasi nilai, dan gambar soal

## Quick Start (Tanpa Docker — SQLite)
```bash
pnpm install
# BE .env sudah ada (SQLite dev.db)
# Jika mau Postgres, ganti di apps/api/.env: DATABASE_URL="postgresql://..."
pnpm --filter @repo/db exec prisma migrate dev --name init  # atau pnpm db:migrate
pnpm --filter @repo/db exec prisma db seed   # atau pnpm db:seed
pnpm dev  # web 5173 + api 4000
# atau
pnpm --filter web dev
pnpm --filter api dev
```

Seed akun:
- admin001 / password123 (ADMIN)
- 2024001 / password123 (DOSEN)
- 2025001..2025005 / password123 (MAHASISWA)

Course demo: `course-demo` dengan Modul 1 (YT video, upload video, PDF 12 hal), Modul 2 (PPT), Pretest & Posttest (3 soal).

## API
- `POST /api/auth/login` `{nim,password}` → `{token,user}`
- `GET /api/courses` | `GET /api/courses/:id` | `POST /api/courses` (ADMIN)
- `POST /api/materials` | `POST /api/materials/upload` (multipart) | `GET /api/materials/:id` | `GET /api/materials/:id/download` (track)
- `POST /api/progress/video` `{materialId,pos,duration}` | `POST /api/progress/slide` `{materialId,page}` | `GET /api/progress/course/:id` | `GET /api/progress/rekap/:id` (DOSEN/ADMIN, data per mahasiswa)
- `POST /api/quizzes` | `GET /api/quizzes` | `POST /api/quizzes/:id/start` | `POST /api/quizzes/:id/submit` `{answers}` | result release, schedule, essay grading, import/template; pilihan ganda minimal 2 opsi atau essay
- `POST /api/integration/auth/sso` (JWT shared secret) | `GET /api/progress/integration/export/:courseId` (X-API-Key)
- `GET /api/reports/courses/:courseId` | `GET /api/reports/courses/:courseId/export.xlsx` | `GET /api/reports/courses/:courseId/export.csv`
- `GET /api/notifications` | `PATCH /api/notifications/:id/read` | `PATCH /api/notifications/read-all` | `GET /api/calendar`

## FE Routes
`/login`, `/` (dashboard), `/courses`, `/courses/:id`, `/material/:id` (video/pdf/ppt), `/assignment/:id`, `/quiz/:id`, `/rekap` (DOSEN/ADMIN), `/manage` (DOSEN/ADMIN), `/users` (ADMIN), `/backup` (ADMIN), `/help` (semua user login)

## Integrasi SI Utama (Nanti)
- `externalId` nullable di User/Course/Material — sync tanpa refactor
- SSO: SI Utama issue JWT HS256 `{nim,role}` pakai `JWT_SECRET` sama → POST `/api/integration/auth/sso`
- Export rekap: `X-API-Key` → `GET /api/progress/integration/export/:courseId`

## Build
```
pnpm build        # turbo build web + api
pnpm --filter web build
pnpm --filter api build
```

## Deploy Nanti
- Ganti `DATABASE_URL` ke Postgres (Neon/Supabase), `CORS_ORIGIN`, `JWT_SECRET`, `API_KEY`
- Railway sudah dikonfigurasi otomatis memakai **Railpack**: build, pre-deploy schema sync PostgreSQL, start API, dan health check. Konfigurasi ada di `railway.json`.
- Untuk Railway saat ini gunakan pre-deploy schema sync otomatis melalui `scripts/railway-db-push.mjs`; migration repository masih SQLite dan belum kompatibel langsung dengan `prisma migrate deploy` PostgreSQL.
- Backup/restore tersedia di menu **Backup / Restore** untuk ADMIN. ZIP logical backup kompatibel dengan PostgreSQL Railway dan SQLite lokal, serta mencakup data aplikasi dan `UPLOAD_DIR`. Pengurutan modul dan konten memakai drag-and-drop handle enam titik (2 kolom × 3 baris) di kiri tombol naik, dengan tombol naik/turun sebagai fallback.
- Upload: `UPLOAD_DIR` → ganti `saveFile()` ke R2/S3 (1 fungsi)
- FE `VITE_API_URL` → URL BE

# ponytail: global lock, viewedPages JSON O(n) scan — per-row JSON add index when >10k rows, S3 add when >100GB
