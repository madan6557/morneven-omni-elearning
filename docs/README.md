# OMNI E-Learning — Dokumentasi Lengkap

> **Goal:** Materi ajar tersampaikan & progress mahasiswa terlacak (download, slide dilihat, durasi tonton, quiz pre/post). Monorepo `pnpm workspaces + Turbo` untuk kolaborasi FE (Vite) + BE (Express), deploy terpisah FE Vercel + BE Railway.

**Live:** FE `https://omni.morneven.com` (Vercel) → BE `https://morneven-omni-elearning-production.up.railway.app` (Railway) → DB Postgres + Volume `500MB` di `/app/apps/api/uploads`

**Repo:** `https://github.com/madan6557/morneven-omni-elearning` branch `main`

---

## 1. Fitur

| Kategori | Detail |
|---------|--------|
| **Materi** | Video YouTube / Drive embed + upload (multer, 500MB), PDF (12 hal demo), PPT (download-tracking). `Material.type: VIDEO\|PDF\|PPT`, `sourceType: youtube\|drive\|upload` |
| **Tracking Progress** | **Download** via `GET /api/materials/:id/download` → `MaterialDownload`; **Slide PDF** `viewedPages JSON` + `percent` via `POST /api/progress/slide {page}` (PdfViewer throttle); **Video** `watchedSec/lastPosition/percent` via `POST /api/progress/video {pos,duration}` (`<video> timeupdate 5s`, YT est.) |
| **Quiz** | Pretest/Posttest/Quiz per modul, PG 4 opsi, auto-nilai, `passingScore`, `attemptLimit`, `QuizAttempt` |
| **Rekap Dosen** | `GET /api/progress/rekap/:courseId` → per NIM: `overall = avg(video%+slide%+download)`, `Export CSV` |
| **Role** | `ADMIN` (kelola user), `DOSEN` (CRUD course/module/material/quiz, lihat rekap), `MAHASISWA` (enroll, baca materi, kerjakan quiz). Tombol `Rekap`/`Kelola` hidden untuk MAHASISWA |
| **Auth** | NIM/password (bcrypt), JWT 7d `Authorization: Bearer`, `iron-session` style httpOnly via `next-auth`/`jsonwebtoken` |
| **Integrasi SI Utama** | `externalId` nullable, SSO JWT `HS256`, `X-API-Key` untuk export, `docs/INTEGRATION.md` |

---

## 2. Arsitektur

```
[Browser: Vite 5173] --fetch--> [Express API:4000] --> [Prisma] --> [Postgres (Railway) / SQLite dev.db]
   |  <video> native, pdfjs iframe, IntersectionObserver      |  S3/R2 nanti (1 fungsi saveFile)
   +-- omni-logo.svg (placeholder, /public/omni-logo.svg)      +-- Volume /app/apps/api/uploads 500MB
```

**Monorepo:**
```
/
 apps/web          FE Vite + React + Tailwind, React Router, TanStack Query
   vercel.json     rewrites SPA /login → /index.html
 apps/api          BE Express + Prisma + JWT, src/app.ts CORS, src/lib/prisma.ts
 packages/db       prisma/schema.prisma (sqlite dev, postgresql prod via sed), seed.ts
 packages/shared   Zod DTOs (LoginSchema, VideoProgressSchema, etc.)
 packages/config   shared tsconfig/eslint
 vercel.json       root build pnpm --filter web build → apps/web/dist
 railway.json      build: pnpm install + sed sqlite→postgresql + prisma generate, deploy: migrate deploy + seed
 docker-compose.yml Postgres 16 (lokal, opsional)
```

---

## 3. Stack

- **FE:** Vite 6, React 18, React Router 6, Tailwind 3, axios, @tanstack/react-query
- **BE:** Express 4, TypeScript 5, Prisma 5, Zod, jsonwebtoken, bcryptjs, multer, cors, dotenv, tsx
- **DB:** Course → Module → Material → Enrollment, MaterialDownload, VideoProgress (watchedSec,lastPosition,percent), SlideProgress (viewedPages String JSON), Quiz/Question/QuizAttempt
- **Auth:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/users` (ADMIN)
- **Tracking:** `timeupdate` 5s (upload), YT `setInterval 5s getCurrentTime` est., Drive `visibility` est.
- **Infra:** pnpm 10, turbo 2, Node 20, Vercel (FE), Railway (BE + Postgres + Volume), SQLite fallback dev

---

## 4. Struktur DB (Prisma)

```prisma
// provider sqlite (dev) / postgresql (prod via sed)
model User { id nim name password role String @default("MAHASISWA") externalId? }
model Course { id title description externalId? modules enrollments quizzes }
model Module { id courseId title order materials quizzes }
model Material { id moduleId title type String sourceType sourceUrl duration? totalPages? }
model Enrollment { userId courseId @@id([userId,courseId]) }
model MaterialDownload { id userId materialId downloadedAt }
model VideoProgress { userId materialId watchedSec lastPosition percent @@id([userId,materialId]) }
model SlideProgress { userId materialId viewedPages String @default("[]") currentPage percent @@id([userId,materialId]) }
model Quiz { id courseId? moduleId? title kind String passingScore attemptLimit questions attempts }
model Question { id quizId text options String correctIndex points }
model QuizAttempt { id userId quizId score passed answers String startedAt submittedAt? }
```

`viewedPages`, `options`, `answers` = `String` JSON.stringify untuk sqlite compat (postgres juga Text, ponytail: 360GB-hrs add index when >10k).

---

## 5. Instalasi & Lokal

**Prasyarat:** Node 20, pnpm `npm i -g pnpm`, (opsional Docker untuk Postgres)

```powershell
git clone https://github.com/madan6557/morneven-omni-elearning.git
cd ELearning
pnpm install

# env (sudah ada, cek .env.example)
# apps/api/.env: DATABASE_URL="file:./packages/db/prisma/dev.db" (dev) atau postgresql://...
# apps/web/.env: VITE_API_URL="http://localhost:4000"

# DB (SQLite, tanpa docker)
pnpm --filter @repo/db exec prisma migrate dev   # generate packages/db/prisma/dev.db
pnpm --filter @repo/db seed                      # admin001/2024001/2025001 pass:password123

# dev
pnpm dev                  # turbo: web 5173 + api 4000
# atau
pnpm --filter web dev     # http://localhost:5173
pnpm --filter api dev     # http://localhost:4000/api/health

# build
pnpm build
pnpm --filter api lint; pnpm --filter web lint
```

**Seed:** `course-demo` Modul 1 (YT video dQw4w9W, upload sample.mp4 600s, PDF 12 hal), Modul 2 (PPT), Quiz pre/post 3 soal.

**Docker Postgres (jika mau, bukan SQLite):**
```powershell
docker compose up -d
# ganti apps/api/.env DATABASE_URL="postgresql://postgres:postgres@localhost:5432/elearning"
# ganti packages/db/prisma/schema.prisma provider postgresql
pnpm --filter @repo/db exec prisma migrate dev
pnpm --filter @repo/db seed
```

---

## 6. Deployment

### FE Vercel (`apps/web`)
- Vercel → Import `morneven-omni-elearning` → **Root Directory `apps/web`** → Framework Vite → Build `pnpm build` → Output `dist`
- Env: `VITE_API_URL=https://morneven-omni-elearning-production.up.railway.app` (tanpa /api)
- `apps/web/vercel.json` sudah ada `rewrites: [{source:"/(.*)", destination:"/index.html"}]` untuk SPA `/login` 404

### BE Railway (`apps/api`)
- Railway → New Project → Deploy from GitHub → Service `api` (Root kosong, pakai `railway.json` di root)
- Add **Postgres** plugin → `DATABASE_URL` auto `${{Postgres.DATABASE_URL}}`
- Variables:
  ```
  DATABASE_URL=${{Postgres.DATABASE_URL}}  # tanpa "
  JWT_SECRET=32+char random
  API_KEY=32+char random (beda dari JWT)
  CORS_ORIGIN=https://omni.morneven.com,http://localhost:5173
  PORT= # kosongkan, Railway auto-inject (8080)
  ```
- `railway.json` build: `sed sqlite→postgresql && prisma generate && pnpm --filter api build`; deploy: `sed + generate + prisma db push --accept-data-loss + seed || true; pnpm --filter api start`, healthcheck `/api/health`
- Volume: Railway → Service `api` → Settings → Volumes → Mount `/app/apps/api/uploads` Size `500MB` (Live resize)

**Prod Postgres:** `prisma migrate deploy` via `railway.json` deploy, `provider` di-switch `sed` saat build/deploy.

---

## 7. Environment Variables

| File | Var | Deskripsi |
|------|-----|-----------|
| `apps/api/.env` | `DATABASE_URL` | `file:./packages/db/prisma/dev.db` (dev) / `postgresql://...` (prod) |
|  | `JWT_SECRET` | 32+ char untuk `signToken` |
|  | `API_KEY` | `X-API-Key` untuk SI Utama integration |
|  | `PORT` | `4000` lokal, kosong di Railway (auto) |
|  | `CORS_ORIGIN` | `http://localhost:5173,https://omni.morneven.com` (comma-separated, `app.ts:13` handle `"` ) |
|  | `UPLOAD_DIR` | `./uploads` (dev) / `/app/apps/api/uploads` (Railway Volume) |
| `apps/web/.env` | `VITE_API_URL` | `http://localhost:4000` (dev via proxy) / `https://...up.railway.app` (prod) |

---

## 8. API Spec

Base `http://localhost:4000` / `https://...up.railway.app`

**Auth** `POST /api/auth/login` `{nim,password}` → `{token,user:{id,nim,name,role}}` ; `GET /api/auth/me` Bearer ; `POST /api/auth/register` / `POST /api/auth/users` (ADMIN) ; `GET /api/auth/users` (ADMIN/DOSEN)

**Courses** `GET /api/courses` (MAHASISWA hanya enrolled), `GET /api/courses/:id` (include modules.materials/quizzes), `POST /api/courses` (DOSEN/ADMIN), `POST /api/courses/:courseId/modules`, `POST /api/courses/:id/enroll`

**Materials** `POST /api/materials` `CreateMaterialSchema`, `POST /api/materials/upload` `multipart file`, `GET /api/materials/:id`, `GET /api/materials/:id/download` (log `MaterialDownload` lalu redirect/stream), `GET /api/materials/:id/downloads` (DOSEN)

**Progress** `POST /api/progress/video` `{materialId,pos,duration}` → `VideoProgress` upsert `watchedSec=max`, `percent`, `POST /api/progress/slide` `{materialId,page}` → `viewedPages JSON`, `GET /api/progress/course/:courseId` (self), `GET /api/progress/rekap/:courseId` (DOSEN, `overall` avg), `GET /api/progress/integration/export/:courseId` `X-API-Key`

**Quizzes** `GET /api/quizzes?moduleId=&courseId=`, `GET /api/quizzes/:id`, `POST /api/quizzes` `CreateQuizSchema`, `POST /api/quizzes/:id/start`, `POST /api/quizzes/:id/submit` `{answers:[{questionId,chosen}]}` → `{score,passed,maxScore}`, `GET /api/quizzes/:id/attempts`

**Integration** `POST /api/integration/auth/sso` `{token: JWT SI Utama}` → `{token: new, user}`

**Health** `GET /api/health` → `{ok:true}`

Semua `requireAuth`, `requireRole`, `requireApiKey` di `apps/api/src/middleware/auth.ts`.

---

## 9. Frontend Routes

`/login`, `/` (Dashboard `Halo, name` + cards), `/courses` (list), `/courses/:id` (modules → materials + quiz pre/post, `Rekap`/`Kelola` hidden untuk MAHASISWA), `/material/:id` (`VideoPlayer` YT/Drive/upload + `PdfViewer` iframe + PPT download), `/quiz/:id` (radio, `Kirim` → score), `/rekap` (DOSEN, tabel `NIM|Nama|Overall|Download|Video|Slide|Quiz` + Export CSV), `/manage` (DOSEN, tambah modul/materi/quiz + upload), `/users` (ADMIN)

---

## 10. Troubleshooting

- `404 /login` → Vercel `apps/web/vercel.json` rewrites belum deploy, tunggu redeploy `5448aff`.
- `CORS No Access-Control-Allow-Origin` → `CORS_ORIGIN` di Railway harus `https://omni.morneven.com` tanpa `"` (sudah handle di `app.ts:13`).
- `P1001 Can't reach DB` → `prisma migrate` di build (build tidak bisa jangkau `postgres.railway.internal`), sudah fix `railway.json` pindah `migrate` ke `deploy`.
- `P1012 empty DATABASE_URL` → Railway Variables `DATABASE_URL=${{Postgres.DATABASE_URL}}` tanpa `"` dan service `Postgres` Online.
- `P3019 provider sqlite ≠ postgresql` → `railway.json` sekarang `sed migration_lock.toml` + `db push`.
- `502 Bad Gateway` di `POST /api/auth/login` → cek **Deploy Logs** `prisma` error sebelum `API listening`.

---

## 11. Next (ponytail)

Skipped: S3/R2 (add when `uploads >500MB`), Redis (when 1000 concurrent), per-account lock, O(n²) viewedPages index when >10k. `build` mode on.
