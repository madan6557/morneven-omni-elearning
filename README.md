# OMNI E-Learning — Monorepo (Vite + Express)

Monorepo `pnpm workspaces + Turborepo` untuk kolaborasi 2 dev (FE Vite, BE Express). Goal: materi tersampaikan & progress terlacak (download, slide, video, quiz pre/post).

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
- DB: `Course → Module → Material (VIDEO/PDF/PPT)` + `Enrollment` + `MaterialDownload` + `VideoProgress` + `SlideProgress` + `Quiz/Question/QuizAttempt`
- Auth: NIM/password (bcrypt), role ADMIN/DOSEN/MAHASISWA, JWT httpOnly
- Tracking: `timeupdate` 5s (upload video), YT/Drive est., `viewedPages` JSON, download via `/download` endpoint
- Quiz: PG 4 opsi, auto-nilai, pretest/posttest per modul

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
- `GET /api/courses` | `GET /api/courses/:id` | `POST /api/courses` (DOSEN/ADMIN)
- `POST /api/materials` | `POST /api/materials/upload` (multipart) | `GET /api/materials/:id` | `GET /api/materials/:id/download` (track)
- `POST /api/progress/video` `{materialId,pos,duration}` | `POST /api/progress/slide` `{materialId,page}` | `GET /api/progress/course/:id` | `GET /api/progress/rekap/:id` (DOSEN)
- `POST /api/quizzes` | `GET /api/quizzes` | `POST /api/quizzes/:id/start` | `POST /api/quizzes/:id/submit` `{answers}`
- `POST /api/integration/auth/sso` (JWT shared secret) | `GET /api/progress/integration/export/:courseId` (X-API-Key)

## FE Routes
`/login`, `/` (dashboard), `/courses`, `/courses/:id`, `/material/:id` (video/pdf/ppt), `/quiz/:id`, `/rekap` (DOSEN), `/manage` (DOSEN), `/users` (ADMIN)

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
- Upload: `UPLOAD_DIR` → ganti `saveFile()` ke R2/S3 (1 fungsi)
- FE `VITE_API_URL` → URL BE

# ponytail: global lock, viewedPages JSON O(n) scan — per-row JSON add index when >10k rows, S3 add when >100GB
