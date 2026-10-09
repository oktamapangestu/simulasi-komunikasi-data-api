// Contoh SOAP client: membaca WSDL lalu memanggil semua operasi CRUD.
// Jalankan server terlebih dahulu (npm start), lalu: npm run client

const soap = require('soap');

const WSDL_URL = 'http://localhost:8000/soap/perpustakaan?wsdl';

async function main() {
  const client = await soap.createClientAsync(WSDL_URL);

  console.log('=== GetAllBuku ===');
  const [semua] = await client.GetAllBukuAsync({});
  console.log(semua.buku);

  console.log('\n=== CreateBuku ===');
  const [baru] = await client.CreateBukuAsync({
    judul: 'Ronggeng Dukuh Paruk',
    penulis: 'Ahmad Tohari',
    penerbit: 'Gramedia',
    tahunTerbit: 1982,
    isbn: '9789792223477',
    stok: 2,
  });
  console.log(baru);
  const idBaru = baru.buku.id;

  console.log(`\n=== GetBukuById (id=${idBaru}) ===`);
  const [satu] = await client.GetBukuByIdAsync({ id: idBaru });
  console.log(satu.buku);

  console.log(`\n=== UpdateBuku (id=${idBaru}) ===`);
  const [ubah] = await client.UpdateBukuAsync({ id: idBaru, stok: 10 });
  console.log(ubah);

  console.log(`\n=== DeleteBuku (id=${idBaru}) ===`);
  const [hapus] = await client.DeleteBukuAsync({ id: idBaru });
  console.log(hapus);

  console.log(`\n=== GetBukuById (id=${idBaru}) setelah dihapus -> SOAP Fault ===`);
  try {
    await client.GetBukuByIdAsync({ id: idBaru });
  } catch (err) {
    console.log(err.root.Envelope.Body.Fault);
  }
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
