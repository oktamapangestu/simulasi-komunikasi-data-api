// GraphQL API - CRUD Buku Perpustakaan
// Endpoint  : http://localhost:4000/graphql  (satu endpoint untuk semua operasi)
// Format    : JSON, isi request berupa query/mutation GraphQL
// Operasi   : READ lewat Query, CREATE/UPDATE/DELETE lewat Mutation

const fs = require('fs');
const path = require('path');
const http = require('http');
const { createSchema, createYoga } = require('graphql-yoga');
const { GraphQLError } = require('graphql');
const store = require('./bukuStore');

const PORT = process.env.PORT || 4000;
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

function tidakDitemukan(id) {
  return new GraphQLError(`Buku dengan id ${id} tidak ditemukan`, { extensions: { code: 'NOT_FOUND' } });
}

function validasiGagal(errors) {
  return new GraphQLError(`Validasi gagal: ${errors.join(', ')}`, { extensions: { code: 'BAD_USER_INPUT', errors } });
}

// Resolver: fungsi yang mengisi setiap field pada Query dan Mutation
const resolvers = {
  Query: {
    // READ - ambil semua buku
    semuaBuku: () => store.getAll(),

    // READ - ambil satu buku (null jika tidak ada)
    buku: (_, { id }) => store.getById(id),
  },

  Mutation: {
    // CREATE - tambah buku baru
    tambahBuku: (_, { input }) => {
      const hasil = store.create(input);
      if (hasil.errors) throw validasiGagal(hasil.errors);
      return hasil.buku;
    },

    // UPDATE - ubah data buku
    ubahBuku: (_, { id, input }) => {
      const hasil = store.update(id, input);
      if (hasil.notFound) throw tidakDitemukan(id);
      if (hasil.errors) throw validasiGagal(hasil.errors);
      return hasil.buku;
    },

    // DELETE - hapus buku
    hapusBuku: (_, { id }) => {
      const buku = store.remove(id);
      if (!buku) throw tidakDitemukan(id);
      return buku;
    },
  },
};

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  maskedErrors: false, // tampilkan pesan error apa adanya (untuk pembelajaran)
});

http.createServer(yoga).listen(PORT, () => {
  console.log(`GraphQL API Perpustakaan berjalan di http://localhost:${PORT}/graphql`);
  console.log('Buka URL tersebut di browser untuk mencoba query lewat GraphiQL');
});
