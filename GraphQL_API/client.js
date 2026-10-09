// Contoh GraphQL client: mengirim query/mutation lewat HTTP POST biasa (fetch).
// Jalankan server terlebih dahulu (npm start), lalu: npm run client

const URL = 'http://localhost:4000/graphql';

async function graphql(query, variables = {}) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function main() {
  console.log('=== Query semuaBuku (hanya field judul & penulis) ===');
  let hasil = await graphql(`
    query {
      semuaBuku { id judul penulis }
    }
  `);
  console.log(JSON.stringify(hasil, null, 2));

  console.log('\n=== Mutation tambahBuku ===');
  hasil = await graphql(
    `mutation Tambah($input: BukuInput!) {
      tambahBuku(input: $input) { id judul penulis penerbit tahunTerbit isbn stok }
    }`,
    {
      input: {
        judul: 'Ronggeng Dukuh Paruk',
        penulis: 'Ahmad Tohari',
        penerbit: 'Gramedia',
        tahunTerbit: 1982,
        isbn: '9789792223477',
        stok: 2,
      },
    },
  );
  console.log(JSON.stringify(hasil, null, 2));
  const idBaru = hasil.data.tambahBuku.id;

  console.log(`\n=== Query buku(id: ${idBaru}) ===`);
  hasil = await graphql(`query Satu($id: Int!) { buku(id: $id) { id judul stok } }`, { id: idBaru });
  console.log(JSON.stringify(hasil, null, 2));

  console.log(`\n=== Mutation ubahBuku(id: ${idBaru}) ===`);
  hasil = await graphql(
    `mutation Ubah($id: Int!, $input: UbahBukuInput!) { ubahBuku(id: $id, input: $input) { id judul stok } }`,
    { id: idBaru, input: { stok: 10 } },
  );
  console.log(JSON.stringify(hasil, null, 2));

  console.log(`\n=== Mutation hapusBuku(id: ${idBaru}) ===`);
  hasil = await graphql(`mutation Hapus($id: Int!) { hapusBuku(id: $id) { id judul } }`, { id: idBaru });
  console.log(JSON.stringify(hasil, null, 2));

  console.log(`\n=== Mutation hapusBuku(id: ${idBaru}) lagi -> error ===`);
  hasil = await graphql(`mutation Hapus($id: Int!) { hapusBuku(id: $id) { id } }`, { id: idBaru });
  console.log(JSON.stringify(hasil, null, 2));
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
