# gRPC API — CRUD Buku Perpustakaan

Node.js + `@grpc/grpc-js`, format data **Protocol Buffers (biner) di atas HTTP/2**, port **50051**.

## Menjalankan

```bash
npm install
npm start          # menjalankan server
npm run client     # (terminal lain) contoh client yang memanggil semua RPC
```

Kontrak layanan ada di `perpustakaan.proto`. Server dan client **sama-sama memuat file .proto ini**, jadi keduanya selalu sepakat soal struktur data.

## RPC

| Operasi | RPC | Request | Response |
|---|---|---|---|
| Ambil semua buku | `GetAllBuku` | `Kosong` | `DaftarBuku` |
| Ambil satu buku | `GetBukuById` | `BukuId` | `Buku` |
| Tambah buku | `CreateBuku` | `BukuInput` | `Buku` |
| Ubah buku | `UpdateBuku` | `UpdateBukuRequest` | `Buku` |
| Hapus buku | `DeleteBuku` | `BukuId` | `Buku` |

Error dikirim sebagai **status code gRPC**: `NOT_FOUND` (5) dan `INVALID_ARGUMENT` (3).

## Menguji tanpa menulis kode

Karena datanya biner, gRPC tidak bisa dites dengan curl biasa. Pilihannya:

**1. Postman** — New → gRPC, isi URL `localhost:50051`, import `perpustakaan.proto`, pilih method, lalu isi message dalam format JSON.

**2. grpcurl** (`brew install grpcurl`):

```bash
# READ semua
grpcurl -plaintext -proto perpustakaan.proto -d '{}' \
  localhost:50051 perpustakaan.PerpustakaanService/GetAllBuku

# READ satu
grpcurl -plaintext -proto perpustakaan.proto -d '{"id": 1}' \
  localhost:50051 perpustakaan.PerpustakaanService/GetBukuById

# CREATE
grpcurl -plaintext -proto perpustakaan.proto \
  -d '{"judul":"Ronggeng Dukuh Paruk","penulis":"Ahmad Tohari","penerbit":"Gramedia","tahun_terbit":1982,"isbn":"9789792223477","stok":2}' \
  localhost:50051 perpustakaan.PerpustakaanService/CreateBuku

# UPDATE
grpcurl -plaintext -proto perpustakaan.proto -d '{"id": 4, "stok": 10}' \
  localhost:50051 perpustakaan.PerpustakaanService/UpdateBuku

# DELETE
grpcurl -plaintext -proto perpustakaan.proto -d '{"id": 4}' \
  localhost:50051 perpustakaan.PerpustakaanService/DeleteBuku
```

> Catatan penamaan: di `.proto` field ditulis `tahun_terbit` (konvensi protobuf). Di JavaScript otomatis menjadi `tahunTerbit` (opsi `keepCase: false`).

Data disimpan di memori (`bukuStore.js`), jadi kembali ke data awal setiap server di-restart.
