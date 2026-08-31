# OMNI E-Learning — Panduan Pengguna Lengkap

Dokumen ini adalah referensi operasional untuk mahasiswa, dosen, dan admin. Label dan istilah di sini mengikuti antarmuka aplikasi.

## 1. Role dan batas akses

| Fitur | Mahasiswa | Dosen | Admin |
|---|---:|---:|---:|
| Login, dashboard, tema, Help | ✓ | ✓ | ✓ |
| Melihat mata kuliah yang diikuti | ✓ | ✓ | ✓ |
| Membaca materi dan mengerjakan evaluasi | ✓ | ✓ | ✓ |
| Mengumpulkan tugas | ✓ | - | - |
| Mengelola mata kuliah, modul, materi, tugas, quiz | - | ✓ | ✓ |
| Melihat rekap dan menilai | - | ✓ | ✓ |
| Mengelola user, edit data, dan reset password | - | - | ✓ |
| Backup/restore dan integrasi | - | - | ✓ |

Server tetap memvalidasi role pada setiap endpoint. Mengetahui alamat URL tidak memberikan akses tambahan.

## 2. Istilah

Untuk arti istilah secara cepat, buka artikel **Glosarium istilah OMNI** pada menu Help.

- **Mata kuliah**: ruang pembelajaran utama.
- **Modul**: kelompok materi, tugas, dan evaluasi.
- **Materi**: video, PDF, atau PPT.
- **Tugas**: aktivitas yang menerima submission file atau link.
- **Quiz**: evaluasi pada modul reguler; dapat berisi pilihan ganda dan essay.
- **Pretest/Posttest**: variasi Quiz biasa.
- **UTS/UAS**: modul ujian khusus yang hanya berisi konfigurasi dan bank soal.
- **Attempt**: jumlah percobaan menjawab evaluasi.
- **Archive**: menonaktifkan item tanpa menghapusnya.
- **Progress**: persentase tontonan/bacaan yang dilacak server.
- **Submission**: jawaban atau file/link yang dikirim mahasiswa.

## 3. Login dan navigasi

1. Masukkan NIM/identifier dan password.
2. Gunakan menu sesuai role: Dashboard, Matkul, Rekap, Kelola, User, dan Help.
3. Gunakan tombol tema untuk mode terang/gelap.
4. Tekan Keluar pada perangkat bersama.

Reset password saat ini dilakukan oleh Admin. User juga dapat mengganti password sendiri melalui panel **Akun aktif → Ganti password**. Password baru minimal 8 karakter dan maksimal 128 karakter. NIM/NIDN/identifier boleh berupa huruf dan angka (contoh `2025001`, `admin001`), dengan panjang 3–50 karakter; spasi dan simbol selain titik, garis bawah, atau tanda minus ditolak. Jangan membagikan password atau token sesi.

## 4. Panduan mahasiswa

### Mata kuliah dan modul

Buka **Matkul Saya**, pilih card mata kuliah, lalu pilih modul. Aktivitas tampil sesuai urutan yang ditentukan dosen/admin.

### Materi dan progress

Video dijalankan langsung di player e-learning jika sumbernya mendukung. PDF/PPT dibuka dari halaman materi. Posisi video dikirim berkala; halaman PDF/PPT yang sudah dilihat dicatat di server; download juga dicatat. Membuka halaman tanpa membaca seluruh materi tidak otomatis menjadi 100%.

### Download setelah selesai

Jika aturan completion aktif, video harus mencapai 100% atau seluruh halaman PDF/PPT harus selesai dibaca. Sebelum itu tombol download dinonaktifkan dan API menolak permintaan. Jika aturan nonaktif, download berjalan sesuai akses materi.

### Status buka, jadwal, deadline, dan archive

Pengaturan konten memiliki arti yang berbeda:

- **Buka untuk mahasiswa** (`isOpen`): sakelar manual. Jika mati, mahasiswa hanya melihat preview aman.
- **Jadwal mulai tersedia** (`availableFrom`): konten baru dapat dibuka setelah waktu server tercapai. Kosong berarti langsung tersedia.
- **Jadwal akses berakhir** (`availableUntil`): setelah waktu server tercapai, konten kembali menjadi preview aman. Kosong berarti tidak dibatasi jadwal akses.
- **Deadline**: hanya batas pengumpulan tugas atau pengiriman jawaban quiz/ujian. Deadline kosong berarti tidak ada batas aksi kalender.
- **Archive**: item disembunyikan dari mahasiswa tetapi tetap terlihat oleh admin/dosen dan dapat dipulihkan.

Sebelum materi, tugas, atau quiz tersedia, mahasiswa tidak dapat melihat isi, player, soal, attachment, progress, download, submit, atau memulai attempt. Endpoint mengembalikan status `CONTENT_NOT_AVAILABLE` beserta preview aman. Semua waktu divalidasi menggunakan waktu server.

### Mengumpulkan tugas

1. Buka tugas dari modul.
2. Baca instruksi dan deadline.
3. Pilih file yang aman atau masukkan link Drive/penyimpanan lain.
4. Tekan **Serahkan tugas** dan pastikan waktu/status kirim muncul.

File sangat besar dapat diserahkan melalui link yang dapat dibuka dosen/admin. Jangan mengirim executable, script, atau arsip mencurigakan.

### Quiz, Pretest, dan Posttest

Pretest dan Posttest adalah variasi Quiz biasa pada modul reguler. Baca passing score, attempt, jadwal, deadline, dan timer sebelum mengirim jawaban.

- Toggle attempt mati = unlimited (`-1`).
- Attempt `0` = evaluasi ditutup.
- Attempt `1` = satu kali.
- Attempt `N` = maksimal N kali.
- Jadwal buka kosong = langsung terbuka.
- Deadline kosong = tidak ada batas kalender.

Pilihan ganda menggunakan radio button; essay menggunakan textarea. Jawaban terkunci setelah dikirim.

### UTS dan UAS

UTS/UAS adalah modul khusus, bukan tipe Quiz. Modul hanya berisi ujian dan bank soal. Konfigurasi dapat meliputi attempt, passing score, timer, jadwal buka, deadline, randomisasi, jumlah soal, essay, dan publikasi nilai.

### Mode timer

- **Independen dari deadline**: attempt yang sudah dimulai mendapat durasi penuh. Contoh: deadline lima menit lagi dan timer dua jam, mahasiswa tetap mendapat dua jam.
- **Serentak dengan deadline**: waktu berhenti pada batas yang lebih cepat antara timer dan deadline kalender.

Mahasiswa yang belum mulai setelah jadwal tutup tidak dapat memulai. Timer divalidasi server.

### Hasil

Hasil memiliki empat mode. `AUTO` (default) langsung menampilkan hasil setelah mahasiswa selesai mengirim jawaban. `HIDDEN` menyimpan hasil hanya untuk dosen/admin sampai dirilis. `MANUAL` menunggu tombol publikasi. `SCHEDULED` mengikuti waktu rilis. Jawaban benar tidak dibocorkan sebelum diizinkan.

Untuk publikasi manual, dosen/admin membuka `Kelola → pilih mata kuliah → pilih modul → Quiz dan soal/Bank soal`, lalu memilih `Edit` pada quiz. Pada field `Publikasi nilai`, pilih `Manual` dan tekan `Simpan`. Setelah kembali ke daftar, tekan tombol `Publikasikan hasil` pada quiz yang berstatus Manual dan konfirmasi bila diminta. Untuk UTS/UAS, tombol yang sama tersedia pada daftar Bank soal modul ujian. Tombol publikasi hanya tersedia untuk ADMIN atau DOSEN yang berwenang; mahasiswa baru dapat melihat nilai setelah publikasi.

## 5. Panduan dosen

### Mata kuliah dan modul

1. Buka **Kelola** dan pilih card mata kuliah.
2. Kelola dosen pengampu dan mahasiswa pada pengaturan.
3. Buat modul reguler, UTS, atau UAS.
4. Pilih card modul untuk mengelola isinya.
5. Gunakan tombol naik/turun untuk mengubah urutan tanpa membuat ulang item.

Modul UTS/UAS hanya boleh memiliki bank soal dan konfigurasi ujian. Materi/tugas dibuat pada modul reguler.

### User dan peserta

Picker dosen/mahasiswa menggunakan pencarian server-side berdasarkan nama atau NIM/NIDN, pagination, dan ringkasan jumlah pilihan. User terpilih tetap dipertahankan saat berpindah halaman.

### Materi, tugas, dan Quiz

Gunakan **Tambah**, **Edit**, **Arsipkan/Pulihkan**, dan tombol reorder pada detail modul. Form hanya dibuka saat diperlukan. Jadwal buka kosong berarti langsung tersedia; deadline kosong berarti terus terbuka.

### Konfigurasi evaluasi

Field yang tersedia meliputi judul, jenis evaluasi, passing score, attempt, time limit, mode timer, jadwal buka, deadline, randomisasi soal/opsi, jumlah soal, tampilkan jawaban, dan publikasi hasil. Mode publikasi `AUTO` langsung menampilkan hasil setelah submit, `HIDDEN` menyembunyikan hasil, `MANUAL` menunggu tombol publikasi, dan `SCHEDULED` mengikuti waktu rilis. UTS/UAS ditentukan oleh tipe modul, bukan pilihan kind Quiz.

Pilihan ganda membutuhkan minimal dua opsi dan jawaban benar. Essay tidak membutuhkan opsi maupun correctIndex. Gambar dapat berasal dari URL atau upload gambar valid.

### Import Excel

Download template dari halaman pengelolaan Quiz/ujian. Isi satu baris untuk setiap soal. Kolom yang digunakan:

`title`, `module`, `passingScore`, `timeLimit`, `timerMode`, `attemptLimit`, `showAnswers`, `randomizeQuestions`, `randomizeOptions`, `questionCount`, `questionType`, `question`, `options`, `correctIndex`, `points`, `imageUrl`

Gunakan `||` sebagai pemisah opsi, misalnya `A||B||C`. Essay mengosongkan options dan correctIndex. Pada modul UTS/UAS, modul aktif menentukan konteks ujian. Import transaksional; satu baris invalid membatalkan seluruh import dan mengembalikan nomor baris.

### Penilaian dan rekap

Buka **Rekap** atau submission tugas. Periksa file/link, beri nilai dan feedback, lalu simpan. Pilihan ganda dinilai otomatis; essay dinilai manual per soal. Nilai akhir diperbarui setelah essay dinilai. Hasil UTS/UAS dapat dipublikasikan manual atau terjadwal.

## 6. Panduan admin

Admin memiliki seluruh kemampuan dosen, ditambah membuat/mengelola user, mengedit NIM/identifier, nama dan role, mengganti password user, menghapus akun lain, mengatur role, mengelola semua assignment dosen/enrollment mahasiswa, backup ZIP, restore, storage, SSO, API key, dan export integrasi. Akun admin yang sedang login tidak dapat dihapus.

### Pengelolaan akun dan aktivitas

Pada **Kelola User**, Admin dapat memilih **Edit**, **Password**, atau **Hapus**. Penghapusan akun aktif yang sedang digunakan ditolak oleh server. Status **Online** berarti terdapat aktivitas dalam lima menit terakhir; kolom **Terakhir akses** menunjukkan waktu aktivitas terakhir yang tercatat. Data aktivitas ini hanya tersedia untuk Admin.

### Backup dan restore

Menu **Backup / Restore** hanya terlihat oleh **ADMIN**. Tekan **Download backup ZIP** untuk membuat logical backup OMNI yang berisi manifest, seluruh data database (akun, mata kuliah, modul, materi, tugas, quiz, progress, attempt, submission, nilai, notifikasi, dan audit log), serta folder `UPLOAD_DIR`. Format ini dapat dipakai pada PostgreSQL Railway maupun SQLite lokal.

Untuk pemulihan, pilih file `.zip` resmi lalu tekan **Restore ZIP** dan konfirmasi peringatan. Restore mengganti seluruh data aktif dan file upload dengan isi ZIP, memakai transaksi database. ZIP yang rusak, tidak lengkap, atau bukan backup OMNI akan ditolak. Setelah selesai, uji login, mata kuliah, materi, upload, quiz, progress, dan rekap. Selalu buat backup terbaru sebelum restore, simpan backup di lokasi berbeda, dan gunakan volume persisten untuk `UPLOAD_DIR` di Railway. File backup berisi password hash dan data akademik sensitif.

### Storage

File materi, gambar soal, dan submission menggunakan `UPLOAD_DIR`. Sistem memeriksa referensi sebelum menghapus attachment agar file yang masih dipakai tidak ikut terhapus. Deployment wajib menggunakan persistent volume.

## 7. Referensi konfigurasi dan API

Dokumentasi endpoint ada di [API.md](./API.md), integrasi di [INTEGRATION.md](./INTEGRATION.md), dan deployment di [README.md](../README.md).

Environment API: `DATABASE_URL`, `JWT_SECRET`, `API_KEY`, `CORS_ORIGIN`, `PORT`, `UPLOAD_DIR`. Frontend menggunakan `VITE_API_URL`. Health check: `GET /api/health`.

Perintah lokal:

```powershell
pnpm install
pnpm --filter @repo/db exec prisma migrate deploy
pnpm --filter @repo/db exec prisma generate
pnpm dev
pnpm build
pnpm lint
```

## 8. Troubleshooting

| Masalah | Tindakan awal |
|---|---|
| Login gagal | Cek NIM/password atau minta Admin reset password. |
| API tidak terhubung | Cek `VITE_API_URL`, service API, dan `/api/health`. |
| CORS error | Pastikan origin frontend ada di `CORS_ORIGIN`. |
| Migration gagal | Cek `DATABASE_URL`, provider Prisma, generate client, lalu deploy migration. |
| Upload gagal | Cek MIME type, ukuran, `UPLOAD_DIR`, dan volume. |
| File tidak terbuka | Pastikan file masih tersedia dan URL storage benar. |
| Quiz tidak dapat dimulai | Cek jadwal buka, archive, attempt 0, dan enrollment. |
| Timer/deadline bermasalah | Cek waktu server, mode timer, dan status attempt. |
| Hasil belum terlihat | Periksa publikasi manual atau jadwal rilis. |
| Restore gagal | Gunakan ZIP backup resmi dan buat backup sebelum mencoba lagi. |

## 9. Keamanan

- Gunakan password unik dan jangan membagikan JWT/token.
- Simpan `JWT_SECRET` dan `API_KEY` hanya di environment server.
- Jangan mengunggah executable, script, atau file berbahaya.

## 10. FAQ ringkas

| Pertanyaan | Jawaban |
|---|---|
| Mengapa materi belum bisa dibuka? | Periksa enrollment dan jadwal buka materi. |
| Mengapa download belum aktif? | Selesaikan video atau seluruh halaman PDF/PPT jika aturan completion diaktifkan. |
| Bagaimana progress direkam? | Video dikirim berkala; halaman PDF/PPT dan download dicatat server. |
| Bagaimana mengirim tugas besar? | Gunakan link Drive atau storage lain yang dapat dibuka dosen/admin. |
| Mengapa quiz tidak dapat dimulai? | Periksa jadwal, deadline, archive, attempt, dan akses mata kuliah. |
| Apa arti `-1`, `0`, dan angka positif? | `-1` unlimited, `0` ditutup, angka positif adalah batas percobaan. |
| Apa beda deadline dan timer? | Deadline adalah batas kalender; timer adalah durasi attempt. |
| Apa beda timer independen dan serentak? | Independen memberi durasi penuh setelah mulai; serentak memotong durasi pada deadline yang lebih cepat. |
| Mengapa hasil belum terlihat? | Hasil mungkin masih HIDDEN, menunggu publikasi MANUAL, atau belum mencapai jadwal SCHEDULED. |
| Bagaimana menilai essay dan tugas? | Dosen/admin membuka submission atau attempt, mengisi skor dan feedback, lalu menyimpan. |
| Mengapa akses ditolak? | Endpoint memvalidasi role serta kewenangan terhadap mata kuliah. Hubungi admin jika akses seharusnya tersedia. |

Gunakan halaman **Help / Panduan** untuk mencari artikel berdasarkan judul, isi, kategori, atau keyword. Artikel admin tidak ditampilkan kepada role lain.
- Gunakan link submission dengan akses minimum yang diperlukan.
- Jawaban benar dan `correctIndex` tidak boleh bocor ke mahasiswa.
- Backup berisi data sensitif dan harus dibatasi aksesnya.
- Semua perubahan data tetap divalidasi di backend.

## 10. FAQ

**Mengapa progress video belum 100%?** Video harus mencapai durasi selesai dan progress dikirim ke server.

**Mengapa download belum aktif?** Materi mungkin mewajibkan completion; selesaikan materi terlebih dahulu.

**Apakah file tugas universal?** Tidak. File harus melewati validasi tipe dan ukuran; gunakan link untuk file besar.

**Apa beda deadline dan timer?** Deadline adalah batas kalender; timer adalah durasi attempt.

**Mengapa hasil ujian belum muncul?** Hasil mungkin masih tersembunyi, menunggu publikasi manual, atau belum mencapai jadwal rilis.

**Apakah UTS/UAS tipe Quiz?** Tidak. UTS/UAS ditentukan oleh tipe modul; Quiz, Pretest, dan Posttest berada pada modul reguler.

**Apa yang terjadi jika satu baris Excel salah?** Import dibatalkan seluruhnya tanpa data parsial.

**Apa beda archive dan delete?** Archive dapat dipulihkan; delete menghapus data sesuai aturan relasi.

**Bagaimana mencari banyak mahasiswa?** Gunakan pencarian nama/NIM dan pagination.

**Bagaimana melaporkan bug?** Sertakan role, halaman, langkah reproduksi, waktu kejadian, dan pesan error kepada Admin/pengelola sistem.
