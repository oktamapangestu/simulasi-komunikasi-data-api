# GraphQL API — CRUD Buku Perpustakaan

Node.js + `graphql-yoga`, format data **JSON**, port **4000**.

## Menjalankan

```bash
npm install
npm start          # menjalankan server
npm run client     # (terminal lain) contoh client yang memanggil semua operasi
```

- Endpoint : `http://localhost:4000/graphql`
- Buka URL tersebut di **browser** untuk mencoba query langsung lewat **GraphiQL** (ada autocomplete dan dokumentasi skema).
- Skema lengkap ada di `schema.graphql`.

## Operasi

Semua request dikirim dengan `POST` ke **satu endpoint**. Jenis operasi ditentukan oleh isi query:

| Operasi | Jenis | Nama |
|---|---|---|
| Ambil semua buku | `query` | `semuaBuku` |
| Ambil satu buku | `query` | `buku(id)` |
| Tambah buku | `mutation` | `tambahBuku(input)` |
| Ubah buku | `mutation` | `ubahBuku(id, input)` |
| Hapus buku | `mutation` | `hapusBuku(id)` |

Keunggulan GraphQL: **client menentukan sendiri field yang dibutuhkan**, jadi tidak ada data berlebih (*over-fetching*).

## Contoh query (tempel di GraphiQL)

```graphql
# READ semua - hanya ambil judul & stok
query {
  semuaBuku { id judul stok }
}

# READ satu
query {
  buku(id: 1) { judul penulis penerbit tahunTerbit isbn stok }
}

# CREATE
mutation {
  tambahBuku(input: {
    judul: "Ronggeng Dukuh Paruk"
    penulis: "Ahmad Tohari"
    penerbit: "Gramedia"
    tahunTerbit: 1982
    isbn: "9789792223477"
    stok: 2
  }) { id judul }
}

# UPDATE (kirim hanya field yang diubah)
mutation {
  ubahBuku(id: 4, input: { stok: 10 }) { id judul stok }
}

# DELETE
mutation {
  hapusBuku(id: 4) { id judul }
}
```

## Contoh lewat curl

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ semuaBuku { id judul stok } }"}'
```

## Error

GraphQL tetap membalas HTTP 200, lalu error dimasukkan ke array `errors` beserta kode di `extensions.code` (`NOT_FOUND`, `BAD_USER_INPUT`):

```json
{
  "errors": [{ "message": "Buku dengan id 99 tidak ditemukan", "path": ["hapusBuku"], "extensions": { "code": "NOT_FOUND" } }],
  "data": null
}
```

Data disimpan di memori (`bukuStore.js`), jadi kembali ke data awal setiap server di-restart.
