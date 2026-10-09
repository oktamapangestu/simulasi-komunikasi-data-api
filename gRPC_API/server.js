// gRPC API - CRUD Buku Perpustakaan
// Alamat    : localhost:50051
// Format    : Protocol Buffers (biner) di atas HTTP/2
// Operasi   : memanggil fungsi (RPC) yang didefinisikan di perpustakaan.proto

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const store = require('./bukuStore');

const ADDRESS = `0.0.0.0:${process.env.PORT || 50051}`;

const packageDefinition = protoLoader.loadSync(path.join(__dirname, 'perpustakaan.proto'), {
  keepCase: false, // tahun_terbit di .proto menjadi tahunTerbit di JavaScript
  defaults: true,
  oneofs: true,
});
const { perpustakaan } = grpc.loadPackageDefinition(packageDefinition);

// Field "optional" yang tidak dikirim client akan bernilai undefined
function ambilField(request) {
  const data = {};
  for (const f of ['judul', 'penulis', 'penerbit', 'tahunTerbit', 'isbn', 'stok']) {
    if (request[f] !== undefined && request[f] !== null) data[f] = request[f];
  }
  return data;
}

function tidakDitemukan(id) {
  return { code: grpc.status.NOT_FOUND, details: `Buku dengan id ${id} tidak ditemukan` };
}

function validasiGagal(errors) {
  return { code: grpc.status.INVALID_ARGUMENT, details: `Validasi gagal: ${errors.join(', ')}` };
}

// Implementasi RPC: setiap fungsi menerima (call, callback)
const handlers = {
  // READ - ambil semua buku
  GetAllBuku(call, callback) {
    callback(null, { buku: store.getAll() });
  },

  // READ - ambil satu buku berdasarkan id
  GetBukuById(call, callback) {
    const buku = store.getById(call.request.id);
    if (!buku) return callback(tidakDitemukan(call.request.id));
    callback(null, buku);
  },

  // CREATE - tambah buku baru
  CreateBuku(call, callback) {
    const hasil = store.create(ambilField(call.request));
    if (hasil.errors) return callback(validasiGagal(hasil.errors));
    callback(null, hasil.buku);
  },

  // UPDATE - ubah data buku
  UpdateBuku(call, callback) {
    const hasil = store.update(call.request.id, ambilField(call.request));
    if (hasil.notFound) return callback(tidakDitemukan(call.request.id));
    if (hasil.errors) return callback(validasiGagal(hasil.errors));
    callback(null, hasil.buku);
  },

  // DELETE - hapus buku
  DeleteBuku(call, callback) {
    const buku = store.remove(call.request.id);
    if (!buku) return callback(tidakDitemukan(call.request.id));
    callback(null, buku);
  },
};

const server = new grpc.Server();
server.addService(perpustakaan.PerpustakaanService.service, handlers);
server.bindAsync(ADDRESS, grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) throw err;
  console.log(`gRPC API Perpustakaan berjalan di ${ADDRESS}`);
});
