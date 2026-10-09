// Contoh gRPC client: memuat file .proto yang sama lalu memanggil semua RPC.
// Jalankan server terlebih dahulu (npm start), lalu: npm run client

const path = require('path');
const { promisify } = require('util');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(path.join(__dirname, 'perpustakaan.proto'), {
  keepCase: false,
  defaults: true,
  oneofs: true,
});
const { perpustakaan } = grpc.loadPackageDefinition(packageDefinition);

const client = new perpustakaan.PerpustakaanService('localhost:50051', grpc.credentials.createInsecure());

// Ubah RPC berbasis callback menjadi Promise agar bisa memakai await
const rpc = (nama) => promisify(client[nama]).bind(client);

async function main() {
  console.log('=== GetAllBuku ===');
  const semua = await rpc('GetAllBuku')({});
  console.log(semua.buku);

  console.log('\n=== CreateBuku ===');
  const baru = await rpc('CreateBuku')({
    judul: 'Ronggeng Dukuh Paruk',
    penulis: 'Ahmad Tohari',
    penerbit: 'Gramedia',
    tahunTerbit: 1982,
    isbn: '9789792223477',
    stok: 2,
  });
  console.log(baru);

  console.log(`\n=== GetBukuById (id=${baru.id}) ===`);
  console.log(await rpc('GetBukuById')({ id: baru.id }));

  console.log(`\n=== UpdateBuku (id=${baru.id}) ===`);
  console.log(await rpc('UpdateBuku')({ id: baru.id, stok: 10 }));

  console.log(`\n=== DeleteBuku (id=${baru.id}) ===`);
  console.log(await rpc('DeleteBuku')({ id: baru.id }));

  console.log(`\n=== GetBukuById (id=${baru.id}) setelah dihapus -> error ===`);
  try {
    await rpc('GetBukuById')({ id: baru.id });
  } catch (err) {
    console.log({ code: err.code, status: grpc.status[err.code], details: err.details });
  }

  client.close();
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
