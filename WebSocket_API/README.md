# WebSocket API — CRUD Buku Perpustakaan

Node.js + `ws`, format pesan **JSON**, port **8080**.

## Menjalankan

```bash
npm install
npm start          # menjalankan server
npm run client     # (terminal lain) contoh client Node.js
```

- WebSocket    : `ws://localhost:8080/ws`
- Halaman demo : `http://localhost:8080` → **buka di 2 tab browser**. Tambah, ubah, atau hapus buku di satu tab, lalu lihat tab lain ikut ter-update tanpa refresh.

## Cara kerja

Berbeda dengan REST (request → response → koneksi selesai), WebSocket membuka **satu koneksi yang tetap terhubung dan bisa dipakai dua arah**. Ada dua jenis pesan dari server:

1. **respons**: balasan untuk client yang mengirim permintaan (dicocokkan lewat `requestId`)
2. **notifikasi**: dikirim server ke **semua client** setiap kali data berubah (*server push*)

### Pesan dari client

| Operasi | Pesan |
|---|---|
| Ambil semua buku | `{"requestId":1,"aksi":"getAll"}` |
| Ambil satu buku | `{"requestId":2,"aksi":"getById","id":1}` |
| Tambah buku | `{"requestId":3,"aksi":"create","data":{"judul":"...","penulis":"...","penerbit":"...","tahunTerbit":1982,"isbn":"...","stok":2}}` |
| Ubah buku | `{"requestId":4,"aksi":"update","id":4,"data":{"stok":10}}` |
| Hapus buku | `{"requestId":5,"aksi":"delete","id":4}` |

### Pesan dari server

```json
// respons (hanya ke client pengirim)
{ "tipe": "respons", "requestId": 4, "aksi": "update", "status": "sukses", "pesan": "Buku berhasil diperbarui", "data": { "id": 4, "stok": 10, "...": "..." } }

// notifikasi (ke SEMUA client yang terhubung)
{ "tipe": "notifikasi", "event": "buku.diperbarui", "data": { "id": 4, "stok": 10, "...": "..." } }
```

Event notifikasi: `buku.ditambahkan`, `buku.diperbarui`, `buku.dihapus`.
Jika gagal, respons berisi `"status": "gagal"` beserta `pesan` (dan `errors` untuk validasi).

## Menguji manual

- **Postman**: New → WebSocket, URL `ws://localhost:8080/ws`, lalu kirim pesan JSON di atas.
- **wscat** (`npx wscat -c ws://localhost:8080/ws`), lalu ketik pesan JSON.

Data disimpan di memori (`bukuStore.js`), jadi kembali ke data awal setiap server di-restart.
