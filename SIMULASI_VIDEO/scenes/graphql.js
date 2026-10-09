// Skenario 3: GraphQL API (GraphQL_API/server.js + schema.graphql)
(function () {
  const { BUKU, BUKU_BARU } = SIM;
  const resolvers = ['semuaBuku', 'buku(id)', 'tambahBuku', 'ubahBuku', 'hapusBuku'];
  const httpReq = ['POST /graphql HTTP/1.1', 'Host: localhost:4000', 'Content-Type: application/json', ''];
  const httpRes = ['HTTP/1.1 200 OK', 'Content-Type: application/json; charset=utf-8', ''];

  // Tiga tahap eksekusi GraphQL di server
  function eksekusi(s, resolver) {
    s.process('server', 'parse: teks query → AST', 0.9);
    s.process('server', 'validasi terhadap schema.graphql', 0.9);
    s.process('server', `resolver ${resolver}`, 0.9);
  }

  SIM.register(
    'graphql',
    {
      index: 3,
      title: 'GraphQL API',
      accent: '#e535ab',
      chips: ['HTTP POST', 'JSON', 'Skema bertipe', 'Port 4000'],
      ...SIM.layout.single({
        client: { title: 'Client', subtitle: 'fetch() / GraphiQL' },
        server: {
          title: 'Server GraphQL',
          subtitle: 'Node.js + graphql-yoga · /graphql',
          idle: 'menunggu query…',
          columns: [
            { key: 'id', label: 'ID', w: 50 },
            { key: 'judul', label: 'JUDUL' },
            { key: 'penulis', label: 'PENULIS' },
            { key: 'stok', label: 'STOK', w: 70, align: 'right' },
          ],
        },
      }),
      tables: { buku: BUKU },
      linkState: { net: { open: true, label: 'HTTP/1.1 · TCP :4000', at: -9 } },
      nodeState: { server: { extra: { title: 'Resolver', items: resolvers, at: -9 } } },
    },
    (s) => {
      s.intro({
        title: 'GraphQL',
        subtitle: 'Query Language untuk API',
        bullets: [
          'Satu endpoint untuk semua operasi: POST /graphql',
          'Client menulis query dan memilih sendiri field yang dibutuhkan',
          'Skema bertipe menjadi kontrak: Query (baca) & Mutation (ubah)',
        ],
      });

      // 1. Query semuaBuku { id judul }
      s.step('READ: client memilih field', 'Client hanya meminta id dan judul. Server menjalankan query melalui tiga tahap: parse, validasi skema, lalu resolver.');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['semuaBuku', 'id', 'judul'] });
      s.log('client', '→ query semuaBuku');
      s.packet({
        label: 'query { semuaBuku }',
        inspect: {
          title: 'GraphQL Query',
          dir: 'Client → Server',
          lines: [...httpReq, '{', '  "query": "query { semuaBuku { id judul } }"', '}'],
        },
      });
      s.activate('server', 0);
      eksekusi(s, 'semuaBuku()');
      s.flash('buku', 'req');
      s.wait(0.4);
      s.packet({
        dir: 'back',
        label: 'data.semuaBuku',
        kind: 'res',
        sub: '125 byte (REST: 442)',
        inspect: {
          title: 'Respons: hanya field yang diminta',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            ...httpRes,
            '{"data":{"semuaBuku":[',
            '  {"id":1,"judul":"Laskar Pelangi"},',
            '  {"id":2,"judul":"Bumi Manusia"},',
            '  {"id":3,"judul":"Negeri 5 Menara"}',
            ']}}',
            '',
            '# penulis, penerbit, tahunTerbit, isbn, stok TIDAK dikirim',
          ],
        },
      });
      s.log('client', '← 3 buku (id, judul)', 'res');
      s.wait(3);

      // 2. Mutation tambahBuku
      s.step('CREATE: mutation tambahBuku', 'Perubahan data memakai mutation. Data dikirim lewat variables, dan client tetap memilih field yang ingin dikembalikan.');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['tambahBuku', 'id', 'judul'] });
      s.log('client', '→ mutation tambahBuku');
      s.packet({
        label: 'mutation tambahBuku',
        inspect: {
          title: 'GraphQL Mutation',
          dir: 'Client → Server',
          lines: [
            ...httpReq,
            '{',
            '  "query": "mutation($input: BukuInput!) { tambahBuku(input: $input) { id judul } }",',
            '  "variables": { "input": {',
            '    "judul": "Ronggeng Dukuh Paruk", "penulis": "Ahmad Tohari", "penerbit": "Gramedia",',
            '    "tahunTerbit": 1982, "isbn": "9789792223477", "stok": 2 } }',
            '}',
          ],
        },
      });
      s.activate('server', 2);
      eksekusi(s, 'tambahBuku() → create()');
      s.addRow('buku', BUKU_BARU);
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: 'data.tambahBuku',
        kind: 'res',
        inspect: {
          title: 'Respons Mutation',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [...httpRes, '{"data":{"tambahBuku":{"id":4,"judul":"Ronggeng Dukuh Paruk"}}}'],
        },
      });
      s.log('client', '← tambahBuku · id 4', 'res');
      s.wait(2.6);

      // 3. Mutation ubahBuku
      s.step('UPDATE: mutation ubahBuku', 'Input UbahBukuInput semua field-nya opsional, jadi cukup kirim stok. Client hanya meminta id dan stok kembali.');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['ubahBuku', 'id', 'stok'] });
      s.log('client', '→ mutation ubahBuku');
      s.packet({
        label: 'mutation ubahBuku',
        inspect: {
          title: 'GraphQL Mutation',
          dir: 'Client → Server',
          lines: [...httpReq, '{', '  "query": "mutation { ubahBuku(id: 4, input: { stok: 10 }) { id stok } }"', '}'],
        },
      });
      s.activate('server', 3);
      eksekusi(s, 'ubahBuku() → update(4)');
      s.updateRow('buku', 4, { stok: 10 });
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: 'data.ubahBuku',
        kind: 'res',
        inspect: {
          title: 'Respons Mutation',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [...httpRes, '{"data":{"ubahBuku":{"id":4,"stok":10}}}'],
        },
      });
      s.log('client', '← ubahBuku · stok 10', 'res');
      s.wait(2.4);

      // 4. Mutation hapusBuku
      s.step('DELETE: mutation hapusBuku', 'Menghapus buku id 4. Semua operasi tetap dikirim ke URL yang sama: POST /graphql.');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['hapusBuku', 'judul'] });
      s.log('client', '→ mutation hapusBuku');
      s.packet({
        label: 'mutation hapusBuku',
        inspect: {
          title: 'GraphQL Mutation',
          dir: 'Client → Server',
          lines: [...httpReq, '{', '  "query": "mutation { hapusBuku(id: 4) { judul } }"', '}'],
        },
      });
      s.activate('server', 4);
      eksekusi(s, 'hapusBuku() → remove(4)');
      s.removeRow('buku', 4);
      s.wait(0.7);
      s.packet({
        dir: 'back',
        label: 'data.hapusBuku',
        kind: 'res',
        inspect: {
          title: 'Respons Mutation',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [...httpRes, '{"data":{"hapusBuku":{"judul":"Ronggeng Dukuh Paruk"}}}'],
        },
      });
      s.log('client', '← hapusBuku', 'res');
      s.wait(2.4);

      // 5. Error validasi skema
      s.step('Error: query tidak sesuai skema', 'Field "harga" tidak ada di tipe Buku. Query ditolak saat validasi, sehingga resolver tidak pernah dijalankan.');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['semuaBuku', 'judul', 'harga ?'] });
      s.log('client', '→ query { judul harga }');
      s.packet({
        label: 'query { … harga }',
        inspect: {
          title: 'GraphQL Query',
          dir: 'Client → Server',
          lines: [...httpReq, '{', '  "query": "{ semuaBuku { judul harga } }"', '}'],
        },
      });
      s.process('server', 'parse: teks query → AST', 0.9);
      s.process('server', 'validasi: field "harga" tidak ada ✗', 1.3, 'err');
      s.packet({
        dir: 'back',
        label: 'errors[ ]',
        kind: 'err',
        sub: 'tetap HTTP 200',
        inspect: {
          title: 'Respons Error Validasi',
          dir: 'Server → Client',
          badge: '200 OK + errors',
          kind: 'err',
          lines: [
            ...httpRes,
            '{"errors":[{',
            '  "message":"Cannot query field \\"harga\\" on type \\"Buku\\".",',
            '  "locations":[{"line":1,"column":21}],',
            '  "extensions":{"code":"GRAPHQL_VALIDATION_FAILED"}',
            '}]}',
          ],
        },
      });
      s.log('client', '← errors: VALIDATION_FAILED', 'err');
      s.wait(2.8);

      // 6. Error dari resolver
      s.step('Error: data tidak ditemukan', 'Kali ini query valid, tetapi resolver melempar error karena buku id 4 sudah dihapus. Error tetap dilaporkan di array "errors".');
      s.wait(0.8);
      s.extra('client', { title: 'Field yang diminta', items: ['hapusBuku', 'id'] });
      s.log('client', '→ mutation hapusBuku(4)');
      s.packet({
        label: 'mutation hapusBuku',
        inspect: {
          title: 'GraphQL Mutation',
          dir: 'Client → Server',
          lines: [...httpReq, '{', '  "query": "mutation { hapusBuku(id: 4) { id } }"', '}'],
        },
      });
      s.activate('server', 4, 'err');
      s.process('server', 'parse: teks query → AST', 0.8);
      s.process('server', 'validasi terhadap schema.graphql ✓', 0.8);
      s.process('server', 'resolver hapusBuku(4) → NOT_FOUND', 1.1, 'err');
      s.packet({
        dir: 'back',
        label: 'errors[ ]',
        kind: 'err',
        inspect: {
          title: 'Respons Error Resolver',
          dir: 'Server → Client',
          badge: '200 OK + errors',
          kind: 'err',
          lines: [
            ...httpRes,
            '{"errors":[{',
            '  "message":"Buku dengan id 4 tidak ditemukan",',
            '  "path":["hapusBuku"],',
            '  "extensions":{"code":"NOT_FOUND"}',
            '}],',
            ' "data":null}',
          ],
        },
      });
      s.log('client', '← errors: NOT_FOUND', 'err');
      s.wait(3);

      s.outro({
        title: 'GraphQL',
        bullets: [
          'Satu endpoint; isi query menentukan data yang dikembalikan',
          'Client memilih field sendiri, jadi tidak ada over-fetching',
          'Query untuk membaca, Mutation untuk mengubah data',
          'Query divalidasi dengan skema; error ada di "errors" (HTTP 200)',
        ],
        footer: 'Kode: GraphQL_API/server.js · GraphQL_API/schema.graphql',
      });
    },
  );
})();
