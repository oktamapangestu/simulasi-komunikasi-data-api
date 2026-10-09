# REST API — CRUD Buku Perpustakaan

Node.js + Express, format data **JSON**, port **3000**.

## Menjalankan

```bash
npm install
npm start
```

## Endpoint

| Operasi | Method | URL | Status sukses |
|---|---|---|---|
| Ambil semua buku | `GET` | `/api/buku` | 200 |
| Ambil satu buku | `GET` | `/api/buku/:id` | 200 |
| Tambah buku | `POST` | `/api/buku` | 201 |
| Ubah buku | `PUT` | `/api/buku/:id` | 200 |
| Hapus buku | `DELETE` | `/api/buku/:id` | 200 |

Error: `400` (validasi / JSON tidak valid), `404` (buku tidak ditemukan).

## Contoh request (curl)

```bash
# READ semua
curl http://localhost:3000/api/buku

# READ satu
curl http://localhost:3000/api/buku/1

# CREATE
curl -X POST http://localhost:3000/api/buku \
  -H "Content-Type: application/json" \
  -d '{"judul":"Ronggeng Dukuh Paruk","penulis":"Ahmad Tohari","penerbit":"Gramedia","tahunTerbit":1982,"isbn":"9789792223477","stok":2}'

# UPDATE (cukup kirim field yang ingin diubah)
curl -X PUT http://localhost:3000/api/buku/4 \
  -H "Content-Type: application/json" \
  -d '{"stok":10}'

# DELETE
curl -X DELETE http://localhost:3000/api/buku/4
```

## Contoh respons

```json
{
  "status": "sukses",
  "data": {
    "id": 1,
    "judul": "Laskar Pelangi",
    "penulis": "Andrea Hirata",
    "penerbit": "Bentang Pustaka",
    "tahunTerbit": 2005,
    "isbn": "9789793062792",
    "stok": 5
  }
}
```

Data disimpan di memori (`bukuStore.js`), jadi kembali ke data awal setiap server di-restart.
