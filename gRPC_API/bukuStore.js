// Penyimpanan data buku (in-memory).
// Logika bisnis ini SAMA PERSIS di semua folder (REST, SOAP, GraphQL, gRPC, WebSocket),
// sehingga perbedaan antar proyek hanya terletak pada protokol komunikasinya.

let bukuList = [
  { id: 1, judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', penerbit: 'Bentang Pustaka', tahunTerbit: 2005, isbn: '9789793062792', stok: 5 },
  { id: 2, judul: 'Bumi Manusia', penulis: 'Pramoedya Ananta Toer', penerbit: 'Hasta Mitra', tahunTerbit: 1980, isbn: '9789799731234', stok: 3 },
  { id: 3, judul: 'Negeri 5 Menara', penulis: 'Ahmad Fuadi', penerbit: 'Gramedia', tahunTerbit: 2009, isbn: '9789792248616', stok: 4 },
];
let nextId = 4;

const FIELD_WAJIB = ['judul', 'penulis', 'penerbit', 'tahunTerbit', 'isbn', 'stok'];

function validasi(data, parsial = false) {
  const errors = [];
  for (const f of FIELD_WAJIB) {
    // Saat update (parsial), field yang tidak dikirim boleh dilewati, tapi tidak boleh dikosongkan
    if (parsial && data[f] === undefined) continue;
    if (data[f] === undefined || data[f] === null || data[f] === '') errors.push(`${f} wajib diisi`);
  }
  if (data.tahunTerbit !== undefined && !Number.isInteger(Number(data.tahunTerbit))) errors.push('tahunTerbit harus berupa angka bulat');
  if (data.stok !== undefined && (!Number.isInteger(Number(data.stok)) || Number(data.stok) < 0)) errors.push('stok harus angka bulat >= 0');
  return errors;
}

function normalisasi(data) {
  const hasil = {};
  for (const f of FIELD_WAJIB) {
    if (data[f] === undefined) continue;
    hasil[f] = f === 'tahunTerbit' || f === 'stok' ? Number(data[f]) : String(data[f]);
  }
  return hasil;
}

function getAll() {
  return bukuList;
}

function getById(id) {
  return bukuList.find((b) => b.id === Number(id)) || null;
}

function create(data) {
  const errors = validasi(data);
  if (errors.length) return { errors };
  const buku = { id: nextId++, ...normalisasi(data) };
  bukuList.push(buku);
  return { buku };
}

function update(id, data) {
  const buku = getById(id);
  if (!buku) return { notFound: true };
  const errors = validasi(data, true);
  if (errors.length) return { errors };
  Object.assign(buku, normalisasi(data));
  return { buku };
}

function remove(id) {
  const index = bukuList.findIndex((b) => b.id === Number(id));
  if (index === -1) return null;
  return bukuList.splice(index, 1)[0];
}

module.exports = { getAll, getById, create, update, remove };
