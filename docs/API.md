# API Spec — OMNI E-Learning

Base: `http://localhost:4000` / `https://morneven-omni-elearning-production.up.railway.app`

Auth: cookie sesi `omni_session` HttpOnly atau `Authorization: Bearer <JWT>` (kecuali login, health, integration API_KEY). Mahasiswa hanya menerima preview aman untuk konten yang belum tersedia.

---

## Auth

### POST /api/auth/login
```json
{ "nim": "2025001", "password": "password123" }
→ 200 { "token": "eyJ...", "user": {id,nim,name,role} }
→ 401 {message:"NIM atau password salah"}
```

### GET /api/auth/me
`Bearer` → `{id,nim,name,role}`

### POST /api/auth/register
`{nim,name,password,role}` → 201

### POST /api/auth/users (ADMIN)
`Bearer ADMIN` `{nim,name,password,role}` → 201

### GET /api/auth/users (ADMIN/DOSEN)
`Bearer` atau cookie sesi → `[{id,nim,name,role,lastSeenAt,online}]`. Parameter `role`, `search`, `page`, dan `limit` mengaktifkan response pagination `{items,page,limit,total,totalPages}`.

### POST /api/auth/logout
Menghapus cookie sesi browser. Register publik dinonaktifkan di production kecuali `ALLOW_PUBLIC_REGISTER=true`.

---

## Courses & Modules

### GET /api/courses
`Bearer` → MAHASISWA hanya enrolled, DOSEN/ADMIN semua. Include `modules{materials,quizzes}`

### GET /api/courses/:id
`Bearer` → `Course` dengan `modules order asc {materials order asc, quizzes {questions}}`

### POST /api/courses (ADMIN saja)
`{title,description}` → 201

### POST /api/courses/:courseId/modules (DOSEN/ADMIN)
`{title,order}`

### POST /api/courses/:id/enroll
`{userId?}` (kosong = self) → `Enrollment`. DOSEN/ADMIN bisa enroll orang lain.

### GET /api/courses/:id/enrollments (DOSEN/ADMIN)

---

## Materials

Konten materi, tugas, dan quiz mengikuti kontrak availability: `isOpen=false`, `availableFrom` di masa depan, atau `availableUntil` yang telah lewat membuat endpoint detail, file, progress, download, submit, dan start attempt mengembalikan `403 CONTENT_NOT_AVAILABLE` untuk mahasiswa. `deadline` hanya menutup aksi tugas/quiz; `archived=true` menyembunyikan item dari mahasiswa.

### POST /api/materials (DOSEN/ADMIN)
```json
{ "moduleId":"mod-1", "title":"Video Intro", "type":"VIDEO", "sourceType":"youtube", "sourceUrl":"https://youtu.be/...", "duration":212, "order":1 }
→ 201
```

### POST /api/materials/upload (DOSEN/ADMIN) `multipart/form-data`
`file, moduleId, title, type (VIDEO|PDF|PPT), duration?, totalPages?` → `sourceType:upload, sourceUrl:/uploads/...`

### GET /api/materials/:id
`Bearer`

### GET /api/materials/:id/download (MAHASISWA)
`Bearer` → log `MaterialDownload` lalu `redirect` (youtube/drive) atau `res.download` (upload)

### GET /api/materials/:id/downloads (DOSEN) → logs

---

## Progress

### POST /api/progress/video
```json
{ "materialId":"mat-vid-yt", "pos":30, "duration":212 }
→ {watchedSec:30, lastPosition:30, percent:14.15}  // upsert, watchedSec=max
```

### POST /api/progress/slide
```json
{ "materialId":"mat-pdf", "page":2 }
→ {viewedPages:"[1,2]", currentPage:2, percent:16.66}
```

### GET /api/progress/course/:courseId
`Bearer` → `{videos, slides, downloads, attempts}` untuk `course.modules.flatMap(materials)`

### GET /api/progress/rekap/:courseId (DOSEN/ADMIN)
→ `{course, rekap:[{user, videos, slides, downloads, attempts, submissions, overall}]}`. Semua progress diambil berdasarkan `userId` mahasiswa.

## Reports, notifications, and calendar

- `GET /api/reports/courses/:courseId` (ADMIN/DOSEN) menghasilkan report terstruktur.
- `GET /api/reports/courses/:courseId/export.xlsx` mengunduh sheet Ringkasan, Progress Materi, Attempt Quiz, Submission Tugas, dan Riwayat Download.
- `GET /api/reports/courses/:courseId/export.csv` mengunduh ringkasan CSV.
- Report menerima filter `moduleId`, `kind`, `from`, dan `to`.
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` hanya mengembalikan notifikasi user aktif.
- `GET /api/calendar` hanya mengembalikan event dari mata kuliah yang dapat diakses user.

## Production security

Browser menggunakan cookie `omni_session` HttpOnly; Bearer token tetap didukung untuk integrasi. User nonaktif dan token yang sudah dibatalkan ditolak. Password reset menaikkan `tokenVersion`. Login dibatasi 10 kegagalan per 15 menit per client. `/api/health` memeriksa API, database, dan storage.

### GET /api/progress/integration/export/:courseId
`Header X-API-Key` → `{course, data:[{nim,name,videos,slides,downloads}]}` (untuk SI Utama)

---

## Quizzes

### GET /api/quizzes?courseId=&moduleId=
`Bearer`

### GET /api/quizzes/:id
→ `{id,title,kind,passingScore,questions:[{id,text,options:[],correctIndex,points}]}` (options sudah JSON.parse)

### POST /api/quizzes (DOSEN/ADMIN)
```json
{
  "title":"Pretest Modul 1", "kind":"PRETEST", "moduleId":"mod-1",
  "questions":[{"text":"HTML?","options":["A","B","C","D"],"correctIndex":0,"points":10}]
}
```

### POST /api/quizzes/:id/start
`Bearer` → 201 `{attempt}` atau 400 `Batas percobaan`

### POST /api/quizzes/:id/submit
```json
{ "answers":[{"questionId":"q1","chosen":0}] }
→ {id, score:100, passed:true, maxScore:30, rawScore:30}
```

### GET /api/quizzes/:id/attempts
`Bearer` (MAHASISWA hanya self, DOSEN semua)

### PATCH /api/quizzes/:id/result-release
`ADMIN/DOSEN` mengatur `resultReleaseMode` (`AUTO`, `HIDDEN`, `MANUAL`, `SCHEDULED`), `resultReleaseAt`, dan `publish`. Mode AUTO langsung membuat hasil terlihat setelah submit. Mode HIDDEN tidak menampilkan hasil kepada mahasiswa.

### PATCH /api/quizzes/:id/schedule
`ADMIN/DOSEN` mengatur `isOpen`, `availableFrom`, `availableUntil`, `deadline`, dan `timerMode` (`INDEPENDENT` atau `SYNC_DEADLINE`).

### PATCH /api/quizzes/attempts/:attemptId/questions/:questionId/grade
`ADMIN/DOSEN` menilai jawaban essay dengan `{score,feedback}`. Nilai harus finite, minimal 0, dan tidak melebihi poin soal.

---

## Integration

### POST /api/integration/auth/sso
```json
{ "token": "jwt HS256 {nim,role} dari SI Utama" }
Header: X-API-Key (opsional)
→ {token: "jwt 7d", user}
```

### GET /api/health
→ `{ok:true}`

---

## Errors

`400 Zod`, `401 Unauthorized`, `403 Forbidden (role)`, `404 Not found`, `500`

Curl contoh:
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type:application/json" -d '{"nim":"2025001","password":"password123"}' | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/courses
curl -H "Authorization: Bearer $TOKEN" -H "Content-Type:application/json" -d '{"materialId":"mat-vid-yt","pos":30,"duration":212}' http://localhost:4000/api/progress/video
curl -H "X-API-Key: $API_KEY" http://localhost:4000/api/progress/integration/export/course-demo | jq
```
