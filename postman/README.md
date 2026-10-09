# Postman — Perpustakaan API

## 1. Import collection (REST, SOAP, GraphQL)

1. Buka Postman, klik **Import**.
2. Pilih file `Perpustakaan_API.postman_collection.json`.
3. Collection **Perpustakaan API - Komunikasi Data** muncul dengan 3 folder:

| Folder | Server | Isi |
|---|---|---|
| REST API | `REST_API` · port 3000 | 7 request: CRUD + error 404 + error validasi 400 |
| SOAP API | `SOAP_API` · port 8000 | 7 request: WSDL + 5 operasi + SOAP Fault |
| GraphQL API | `GraphQL_API` · port 4000 | 7 request: query, mutation, error NOT_FOUND, error validasi skema |

Alamat server disimpan di variabel collection (`rest_url`, `soap_url`, `graphql_url`). Ubah di tab **Variables** jika port-nya berbeda. Tidak perlu import environment terpisah.

### Cara menjalankan

1. Jalankan server di folder masing-masing: `npm install && npm start`.
2. Jalankan request **berurutan dari atas** di setiap folder. Request "tambah buku" menyimpan id buku baru ke variabel (`bukuIdRest`, `bukuIdSoap`, `bukuIdGraphql`), lalu request ubah, hapus, dan error memakai id tersebut.
3. Atau klik kanan collection/folder → **Run** untuk menjalankan semuanya sekaligus. Setiap request punya test otomatis, dan hasilnya terlihat di tab **Test Results**.

Collection ini sudah diuji dengan Newman: 21 request dan 37 test lolos semua, termasuk saat dijalankan dua kali berturut-turut.

```bash
npx newman run Perpustakaan_API.postman_collection.json
```

## 2. gRPC (manual)

File collection Postman hanya bisa memuat request HTTP, jadi request gRPC dibuat sendiri:

1. Jalankan server: `cd gRPC_API && npm start`.
2. Di Postman klik **New → gRPC**.
3. Isi URL: `localhost:50051` (tanpa `http://`, TLS dimatikan).
4. Klik **Select a method → Import a .proto file**, lalu pilih `gRPC_API/perpustakaan.proto`.
5. Pilih method, tempel pesan di bawah ke tab **Message**, lalu klik **Invoke**.

| Method | Message |
|---|---|
| `GetAllBuku` | `{}` |
| `GetBukuById` | `{ "id": 1 }` |
| `CreateBuku` | `{ "judul": "Ronggeng Dukuh Paruk", "penulis": "Ahmad Tohari", "penerbit": "Gramedia", "tahun_terbit": 1982, "isbn": "9789792223477", "stok": 2 }` |
| `UpdateBuku` | `{ "id": 4, "stok": 10 }` |
| `DeleteBuku` | `{ "id": 4 }` |

Coba panggil `GetBukuById` dengan id yang tidak ada: Postman menampilkan status **5 NOT_FOUND**.

## 3. WebSocket (manual)

1. Jalankan server: `cd WebSocket_API && npm start`.
2. Di Postman klik **New → WebSocket**.
3. Isi URL `ws://localhost:8080/ws`, lalu klik **Connect**.
4. Tempel pesan di bawah ke kolom **Message** (format JSON), lalu klik **Send**.

```json
{ "requestId": 1, "aksi": "getAll" }
```
```json
{ "requestId": 2, "aksi": "getById", "id": 1 }
```
```json
{ "requestId": 3, "aksi": "create", "data": { "judul": "Ronggeng Dukuh Paruk", "penulis": "Ahmad Tohari", "penerbit": "Gramedia", "tahunTerbit": 1982, "isbn": "9789792223477", "stok": 2 } }
```
```json
{ "requestId": 4, "aksi": "update", "id": 4, "data": { "stok": 10 } }
```
```json
{ "requestId": 5, "aksi": "delete", "id": 4 }
```

Untuk melihat **server push**, buka dua tab WebSocket di Postman yang terhubung ke URL yang sama. Kirim `create` dari tab pertama: tab kedua langsung menerima pesan `"tipe": "notifikasi"` tanpa mengirim apa pun. Pesan yang sering dipakai bisa disimpan dengan tombol **Save message**.
