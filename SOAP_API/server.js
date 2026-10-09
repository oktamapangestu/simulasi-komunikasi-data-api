// SOAP API - CRUD Buku Perpustakaan
// Endpoint  : http://localhost:8000/soap/perpustakaan  (satu endpoint untuk semua operasi)
// WSDL      : http://localhost:8000/soap/perpustakaan?wsdl
// Format    : XML (SOAP Envelope)
// Operasi   : ditentukan oleh nama operasi di dalam SOAP Body, bukan oleh HTTP method

const fs = require('fs');
const path = require('path');
const http = require('http');
const soap = require('soap');
const store = require('./bukuStore');

const PORT = process.env.PORT || 8000;
const wsdl = fs.readFileSync(path.join(__dirname, 'perpustakaan.wsdl'), 'utf8');

// Membuat SOAP Fault (setara dengan respons error 4xx pada REST)
function fault(kode, pesan) {
  return { Fault: { faultcode: `soap:${kode}`, faultstring: pesan, statusCode: 500 } };
}

function tidakDitemukan(id) {
  return fault('Client', `Buku dengan id ${id} tidak ditemukan`);
}

// Implementasi operasi sesuai portType di WSDL
const service = {
  PerpustakaanService: {
    PerpustakaanPort: {
      // READ - ambil semua buku
      GetAllBuku() {
        return { buku: store.getAll() };
      },

      // READ - ambil satu buku berdasarkan id
      GetBukuById(args) {
        const buku = store.getById(args.id);
        if (!buku) throw tidakDitemukan(args.id);
        return { buku };
      },

      // CREATE - tambah buku baru
      CreateBuku(args) {
        const hasil = store.create(args);
        if (hasil.errors) throw fault('Client', `Validasi gagal: ${hasil.errors.join(', ')}`);
        return { pesan: 'Buku berhasil ditambahkan', buku: hasil.buku };
      },

      // UPDATE - ubah data buku
      UpdateBuku(args) {
        const { id, ...data } = args;
        const hasil = store.update(id, data);
        if (hasil.notFound) throw tidakDitemukan(id);
        if (hasil.errors) throw fault('Client', `Validasi gagal: ${hasil.errors.join(', ')}`);
        return { pesan: 'Buku berhasil diperbarui', buku: hasil.buku };
      },

      // DELETE - hapus buku
      DeleteBuku(args) {
        const buku = store.remove(args.id);
        if (!buku) throw tidakDitemukan(args.id);
        return { pesan: 'Buku berhasil dihapus', buku };
      },
    },
  },
};

const server = http.createServer((req, res) => {
  res.statusCode = 404;
  res.end('Gunakan endpoint /soap/perpustakaan');
});

server.listen(PORT, () => {
  soap.listen(server, '/soap/perpustakaan', service, wsdl);
  console.log(`SOAP API Perpustakaan berjalan di http://localhost:${PORT}/soap/perpustakaan`);
  console.log(`WSDL tersedia di http://localhost:${PORT}/soap/perpustakaan?wsdl`);
});
