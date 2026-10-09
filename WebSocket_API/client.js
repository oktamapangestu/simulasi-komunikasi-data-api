// Contoh WebSocket client (Node.js).
// Membuka DUA koneksi:
//   - "admin"    : menjalankan operasi CRUD
//   - "pengamat" : tidak mengirim apa pun, hanya menerima notifikasi dari server
// Jalankan server terlebih dahulu (npm start), lalu: npm run client

const { WebSocket } = require('ws');

const URL = 'ws://localhost:8080/ws';

function hubungkan(nama) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(URL);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
    socket.on('message', (raw) => {
      const pesan = JSON.parse(raw);
      if (pesan.tipe === 'notifikasi') console.log(`  [${nama}] notifikasi ${pesan.event}:`, pesan.data.judul);
    });
  });
}

// Kirim permintaan dan tunggu balasan dengan requestId yang sama
let requestId = 0;
function minta(socket, pesan) {
  const id = ++requestId;
  return new Promise((resolve) => {
    const onMessage = (raw) => {
      const balasan = JSON.parse(raw);
      if (balasan.tipe === 'respons' && balasan.requestId === id) {
        socket.off('message', onMessage);
        resolve(balasan);
      }
    };
    socket.on('message', onMessage);
    socket.send(JSON.stringify({ requestId: id, ...pesan }));
  });
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

// Jalankan satu langkah, beri jeda agar notifikasi untuk "pengamat" sempat tercetak
async function langkah(socket, judul, pesan) {
  console.log(`\n=== ${judul} ===`);
  const balasan = await minta(socket, pesan);
  console.log(balasan);
  await jeda(100);
  return balasan;
}

async function main() {
  const admin = await hubungkan('admin');
  await hubungkan('pengamat');

  await langkah(admin, 'getAll', { aksi: 'getAll' });

  const baru = await langkah(admin, 'create', {
    aksi: 'create',
    data: {
      judul: 'Ronggeng Dukuh Paruk',
      penulis: 'Ahmad Tohari',
      penerbit: 'Gramedia',
      tahunTerbit: 1982,
      isbn: '9789792223477',
      stok: 2,
    },
  });
  const idBaru = baru.data.id;

  await langkah(admin, `getById (id=${idBaru})`, { aksi: 'getById', id: idBaru });
  await langkah(admin, `update (id=${idBaru})`, { aksi: 'update', id: idBaru, data: { stok: 10 } });
  await langkah(admin, `delete (id=${idBaru})`, { aksi: 'delete', id: idBaru });
  await langkah(admin, `getById (id=${idBaru}) setelah dihapus -> gagal`, { aksi: 'getById', id: idBaru });

  process.exit(0);
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
