// WebSocket API - CRUD Buku Perpustakaan
// Alamat    : ws://localhost:8080/ws  (koneksi dua arah yang tetap terbuka)
// Format    : pesan JSON
// Operasi   : ditentukan oleh field "aksi" di dalam pesan
//
// Bentuk pesan dari client:
//   { "requestId": 1, "aksi": "getAll" | "getById" | "create" | "update" | "delete", "id": 1, "data": { ... } }
// Balasan ke client pengirim:
//   { "tipe": "respons", "requestId": 1, "aksi": "...", "status": "sukses" | "gagal", "data": ..., "pesan": "..." }
// Notifikasi ke SEMUA client saat data berubah (server push):
//   { "tipe": "notifikasi", "event": "buku.ditambahkan" | "buku.diperbarui" | "buku.dihapus", "data": { ... } }

const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const store = require('./bukuStore');

const PORT = process.env.PORT || 8080;

// Server HTTP hanya untuk menyajikan halaman demo (index.html)
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  res.writeHead(404);
  res.end('Tidak ditemukan');
});

const wss = new WebSocketServer({ server, path: '/ws' });

function kirim(socket, pesan) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(pesan));
}

// Kirim notifikasi ke semua client yang sedang terhubung
function broadcast(event, data) {
  for (const client of wss.clients) kirim(client, { tipe: 'notifikasi', event, data });
}

function tidakDitemukan(id) {
  return { status: 'gagal', pesan: `Buku dengan id ${id} tidak ditemukan` };
}

// Menjalankan aksi CRUD, mengembalikan isi balasan untuk client pengirim
function prosesAksi({ aksi, id, data = {} }) {
  switch (aksi) {
    // READ - ambil semua buku
    case 'getAll':
      return { status: 'sukses', data: store.getAll() };

    // READ - ambil satu buku berdasarkan id
    case 'getById': {
      const buku = store.getById(id);
      return buku ? { status: 'sukses', data: buku } : tidakDitemukan(id);
    }

    // CREATE - tambah buku baru
    case 'create': {
      const hasil = store.create(data);
      if (hasil.errors) return { status: 'gagal', pesan: 'Validasi gagal', errors: hasil.errors };
      broadcast('buku.ditambahkan', hasil.buku);
      return { status: 'sukses', pesan: 'Buku berhasil ditambahkan', data: hasil.buku };
    }

    // UPDATE - ubah data buku
    case 'update': {
      const hasil = store.update(id, data);
      if (hasil.notFound) return tidakDitemukan(id);
      if (hasil.errors) return { status: 'gagal', pesan: 'Validasi gagal', errors: hasil.errors };
      broadcast('buku.diperbarui', hasil.buku);
      return { status: 'sukses', pesan: 'Buku berhasil diperbarui', data: hasil.buku };
    }

    // DELETE - hapus buku
    case 'delete': {
      const buku = store.remove(id);
      if (!buku) return tidakDitemukan(id);
      broadcast('buku.dihapus', buku);
      return { status: 'sukses', pesan: 'Buku berhasil dihapus', data: buku };
    }

    default:
      return { status: 'gagal', pesan: `Aksi "${aksi}" tidak dikenal` };
  }
}

wss.on('connection', (socket) => {
  console.log(`Client terhubung (total: ${wss.clients.size})`);

  socket.on('message', (raw) => {
    let pesan;
    try {
      pesan = JSON.parse(raw);
    } catch {
      return kirim(socket, { tipe: 'respons', status: 'gagal', pesan: 'Format JSON tidak valid' });
    }
    const balasan = prosesAksi(pesan);
    kirim(socket, { tipe: 'respons', requestId: pesan.requestId, aksi: pesan.aksi, ...balasan });
  });

  socket.on('close', () => console.log(`Client terputus (total: ${wss.clients.size})`));
});

server.listen(PORT, () => {
  console.log(`WebSocket API Perpustakaan berjalan di ws://localhost:${PORT}/ws`);
  console.log(`Halaman demo: http://localhost:${PORT}  (buka di 2 tab untuk melihat notifikasi realtime)`);
});
