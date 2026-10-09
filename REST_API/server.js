// REST API - CRUD Buku Perpustakaan
// Resource  : /api/buku
// Format    : JSON
// Operasi   : ditentukan oleh HTTP method (GET, POST, PUT, DELETE)

const express = require('express');
const store = require('./bukuStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// READ - ambil semua buku
app.get('/api/buku', (req, res) => {
  res.status(200).json({ status: 'sukses', data: store.getAll() });
});

// READ - ambil satu buku berdasarkan id
app.get('/api/buku/:id', (req, res) => {
  const buku = store.getById(req.params.id);
  if (!buku) {
    return res.status(404).json({ status: 'gagal', pesan: `Buku dengan id ${req.params.id} tidak ditemukan` });
  }
  res.status(200).json({ status: 'sukses', data: buku });
});

// CREATE - tambah buku baru
app.post('/api/buku', (req, res) => {
  const hasil = store.create(req.body || {});
  if (hasil.errors) {
    return res.status(400).json({ status: 'gagal', pesan: 'Validasi gagal', errors: hasil.errors });
  }
  res.status(201).json({ status: 'sukses', pesan: 'Buku berhasil ditambahkan', data: hasil.buku });
});

// UPDATE - ubah data buku
app.put('/api/buku/:id', (req, res) => {
  const hasil = store.update(req.params.id, req.body || {});
  if (hasil.notFound) {
    return res.status(404).json({ status: 'gagal', pesan: `Buku dengan id ${req.params.id} tidak ditemukan` });
  }
  if (hasil.errors) {
    return res.status(400).json({ status: 'gagal', pesan: 'Validasi gagal', errors: hasil.errors });
  }
  res.status(200).json({ status: 'sukses', pesan: 'Buku berhasil diperbarui', data: hasil.buku });
});

// DELETE - hapus buku
app.delete('/api/buku/:id', (req, res) => {
  const buku = store.remove(req.params.id);
  if (!buku) {
    return res.status(404).json({ status: 'gagal', pesan: `Buku dengan id ${req.params.id} tidak ditemukan` });
  }
  res.status(200).json({ status: 'sukses', pesan: 'Buku berhasil dihapus', data: buku });
});

// Body JSON tidak valid
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'gagal', pesan: 'Format JSON tidak valid' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`REST API Perpustakaan berjalan di http://localhost:${PORT}/api/buku`);
});
