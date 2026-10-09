# Perbandingan Protokol API — Studi Kasus CRUD Buku Perpustakaan

Lima implementasi untuk kasus yang sama. Semua folder memakai `bukuStore.js` yang **identik** (data & validasi), jadi perbedaannya murni di cara client dan server berkomunikasi.

| Folder | Port | Menjalankan |
|---|---|---|
| `REST_API` | 3000 | `npm install && npm start` |
| `SOAP_API` | 8000 | `npm install && npm start`, lalu `npm run client` |
| `GraphQL_API` | 4000 | `npm install && npm start`, lalu `npm run client` |
| `gRPC_API` | 50051 | `npm install && npm start`, lalu `npm run client` |
| `WebSocket_API` | 8080 | `npm install && npm start`, lalu `npm run client` |

Contoh request lengkap ada di README masing-masing folder.

Video animasi simulasi tiap protokol ada di `SIMULASI_VIDEO/output/`. Versi web interaktifnya ada di `SIMULASI_VIDEO/web/simulasi.html`.

## Perbandingan

| | REST | SOAP | GraphQL | gRPC | WebSocket |
|---|---|---|---|---|---|
| Format data | JSON | XML | JSON | Protobuf (biner) | JSON (bebas) |
| Transport | HTTP | HTTP | HTTP | HTTP/2 | TCP (diawali HTTP upgrade) |
| Endpoint | Banyak URL (per resource) | 1 URL | 1 URL | 1 alamat, banyak method | 1 koneksi |
| Penentu operasi | HTTP method + URL | Elemen di SOAP Body | `query` / `mutation` | Nama RPC | Field `aksi` di pesan |
| Kontrak | Opsional (mis. OpenAPI) | Wajib: WSDL | Wajib: skema GraphQL | Wajib: file `.proto` | Tidak ada (protokol pesan dibuat sendiri) |
| Penanda error | HTTP status (400, 404) | SOAP Fault (HTTP 500) | Array `errors` (HTTP 200) | Status gRPC (`NOT_FOUND`, …) | Field `status: "gagal"` |
| Arah komunikasi | Client → server | Client → server | Client → server | Client → server (+ mendukung streaming) | Dua arah, server bisa push |
| Pilih field yang diambil | Tidak | Tidak | **Ya** | Tidak | Tidak |

## Pemetaan operasi CRUD

| CRUD | REST | SOAP | GraphQL | gRPC | WebSocket |
|---|---|---|---|---|---|
| Read semua | `GET /api/buku` | `GetAllBuku` | `query semuaBuku` | `GetAllBuku` | `aksi: getAll` |
| Read satu | `GET /api/buku/:id` | `GetBukuById` | `query buku(id)` | `GetBukuById` | `aksi: getById` |
| Create | `POST /api/buku` | `CreateBuku` | `mutation tambahBuku` | `CreateBuku` | `aksi: create` |
| Update | `PUT /api/buku/:id` | `UpdateBuku` | `mutation ubahBuku` | `UpdateBuku` | `aksi: update` |
| Delete | `DELETE /api/buku/:id` | `DeleteBuku` | `mutation hapusBuku` | `DeleteBuku` | `aksi: delete` |
