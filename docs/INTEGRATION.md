# Integrasi E-Learning ↔ SI Utama

> E-Learning standalone sekarang (`pnpm dev`), siap jadi modul SI Utama tanpa rewrite. 1 kolom `externalId` + 2 endpoint + JWT `HS256` + `X-API-Key`.

---

## 1. Prinsip

- **Terpisah sekarang:** E-Learning punya DB & auth sendiri (NIM/password). SI Utama tidak perlu ubah.
- **Integratable nanti:** Tambah `externalId` nullable di `User/Course/Material` → sync idempotent `upsert by externalId || nim`.
- **1 pintu API:** `X-API-Key` + JWT SSO, bukan OAuth penuh.

---

## 2. Data Model Jembatan

```prisma
model User { id nim @unique name password role String externalId String? @unique }
model Course { id title externalId String? @unique }
model Material { id externalId String? @unique }
```

- Jika `externalId` null → data manual di E-Learning (jalan).
- Jika SI Utama push `externalId="siak-123"` → `upsert` tidak duplikat.
- Alternatif fallback: match by `nim` (User) atau `title` (Course) jika `externalId` belum ada.

---

## 3. Env & Secret Bersama

| E-Learning (`apps/api/.env` Railway) | SI Utama |
|---|---|
| `JWT_SECRET=32+char-random` (sama) | `JWT_SECRET` sama |
| `API_KEY=32+char-random` (beda dari JWT) | `ELEARNING_API_KEY` sama |
| `CORS_ORIGIN=https://si-utama.campus.ac.id,https://omni.morneven.com` | - |

Generate:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# JWT_SECRET=abc...  API_KEY=xyz...
```

---

## 4. SSO — Login Sekali dari SI Utama

**Flow:** Mahasiswa klik “E-Learning” di SI Utama → SI Utama `sign JWT` `HS256` `{nim, role, exp: +5m}` pakai `JWT_SECRET` sama → `POST` ke E-Learning → E-Learning verify → `set cookie / return token` → redirect.

**E-Learning endpoint (sudah ada):**
```
POST /api/integration/auth/sso
Body: { "token": "eyJ..." }
Header: X-API-Key: <API_KEY>  (opsional, tapi disarankan)
→ 200 { "token": "new-jwt-7d", "user": {id, nim, role} }
```

**SI Utama (Node/Express contoh):**
```ts
import jwt from "jsonwebtoken";
const payload = { nim: "2025001", role: "MAHASISWA" };
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "5m" });
// redirect atau POST
await fetch("https://morneven-omni-elearning-production.up.railway.app/api/integration/auth/sso", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key": process.env.ELEARNING_API_KEY },
  body: JSON.stringify({ token })
});
// → dapat new token 7d, set cookie atau redirect ke https://omni.morneven.com/?token=...
```

**E-Learning FE:** `apps/web/src/context/AuthContext.tsx` bisa ditambah `?token=` auto-login (skipped, add when SI Utama minta SSO).

---

## 5. Sync Data Master (SI Utama → E-Learning)

**Opsi A — SI Utama push (rekom, idempotent):**
```
POST /api/courses/sync  (buat nanti, sekarang pakai POST /api/courses + externalId)
Body: { "externalId": "mk-if123", "title": "Dasar Web", "description": "..." }
Header: X-API-Key
→ BE: prisma.course.upsert({ where:{externalId}, update:{title}, create:{externalId,title} })

POST /api/courses/:courseId/modules/sync
POST /api/materials/sync
POST /api/auth/users/sync  {nim, name, password, role, externalId}
```

**Opsi B — E-Learning pull (cron):**
SI Utama expose `GET /si/api/courses`, E-Learning `fetch` tiap jam.

**Untuk sekarang (tanpa endpoint sync baru):** pakai endpoint existing dengan `externalId`:
```bash
curl -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Dasar Web","description":"...","externalId":"mk-if123"}' \
  https://.../api/courses
# BE akan create Course dengan externalId, jika sudah ada update
```

---

## 6. Export Progress (E-Learning → SI Utama)

**Endpoint (sudah ada, API_KEY):**
```
GET /api/progress/integration/export/:courseId
Header: X-API-Key: <API_KEY>
→ 200 {
  course: {id, title, modules},
  data: [
    {
      nim: "2025001", name: "Ani",
      videos: [{materialId, watchedSec, lastPosition, percent}],
      slides: [{materialId, viewedPages: "[1,2]", currentPage, percent}],
      downloads: [{materialId, downloadedAt}]
    }
  ]
}
```

**Rekap agregat (untuk SIAKAD):**
```
GET /api/progress/rekap/:courseId  (butuh JWT DOSEN/ADMIN, atau buat versi API_KEY)
→ { course, rekap: [{user:{nim,name}, overall, videos, slides, downloads, attempts}] }
`overall` dihitung per mahasiswa dari aktivitas aktif: materi selesai, Quiz yang sudah disubmit, dan tugas yang sudah dikumpulkan. Gunakan endpoint Reports untuk laporan lengkap per materi, attempt, submission, dan download.
```

**SI Utama contoh tarik:**
```ts
const res = await fetch(`https://.../api/progress/integration/export/${courseId}`, {
  headers: { "X-API-Key": process.env.ELEARNING_API_KEY }
});
const { data } = await res.json();
// simpan ke SI Utama: data.forEach(mhs => update SIAKAD)
```

**Quiz:** `GET /api/quizzes?courseId=&moduleId=` + `GET /api/quizzes/:id/attempts` (X-API-Key, DOSEN).

---

## 7. Contoh Full Flow

```mermaid
SI Utama (nim 2025001 login) --JWT 5m--> POST /api/integration/auth/sso --> E-Learning set JWT 7d --> redirect omni.morneven.com
SI Utama --POST /api/courses (externalId)--> E-Learning upsert Course
E-Learning --tracking--> VideoProgress/SlideProgress/MaterialDownload
SI Utama --GET /api/progress/integration/export/course-demo + X-API-Key--> E-Learning JSON → SI Utama simpan nilai
```

---

## 8. Keamanan

- `JWT_SECRET` sama di kedua service, rotate tiap semester.
- `API_KEY` beda dari `JWT_SECRET`, rotate via Railway Variables → SI Utama env.
- `CORS_ORIGIN` di E-Learning harus include `https://si-utama.campus.ac.id`.
- `externalId` unique + index, `nim` unique.

---

## 9. Checklist Integrasi

- [ ] Set `JWT_SECRET` & `API_KEY` sama di Railway & SI Utama
- [ ] SI Utama bisa `POST /api/integration/auth/sso` → 200
- [ ] `CORS_ORIGIN` include SI Utama domain
- [ ] `upsert` Course/User dengan `externalId` → tidak duplikat
- [ ] `GET /api/progress/integration/export/:courseId` dengan `X-API-Key` → 200
- [ ] Cron SI Utama tarik rekap tiap malam (opsional)

---

## 10. Yang Belum (add when diminta SI Utama)

- `POST /api/courses/sync` bulk (skipped, pakai `POST /api/courses` satu-satu)
- `webhook` `progress.updated` ke SI Utama (skipped, SI Utama pull saja)
- `shared DB` (skipped, API lebih aman)
- `OAuth2` provider (skipped, JWT HS256 cukup)

Build mode on.
