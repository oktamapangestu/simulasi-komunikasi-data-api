// Skenario 1: REST API (REST_API/server.js)
(function () {
  const { BUKU, BUKU_BARU } = SIM;
  const routes = ['GET /buku', 'GET /buku/:id', 'POST /buku', 'PUT /buku/:id', 'DELETE /buku/:id'];

  SIM.register(
    'rest',
    {
      index: 1,
      title: 'REST API',
      accent: '#38bdf8',
      chips: ['HTTP/1.1', 'JSON', 'Port 3000', 'Stateless'],
      ...SIM.layout.single({
        client: { title: 'Client', subtitle: 'curl / aplikasi frontend' },
        server: { title: 'Server REST', subtitle: 'Node.js + Express · :3000', idle: 'menunggu request…' },
      }),
      tables: { buku: BUKU },
      linkState: { net: { open: false, label: 'belum terhubung' } },
      nodeState: { server: { extra: { title: 'Routing  (prefix /api)', items: routes, at: -9 } } },
    },
    (s) => {
      s.intro({
        title: 'REST API',
        subtitle: 'Representational State Transfer',
        bullets: [
          'Setiap data adalah resource dengan URL sendiri: /api/buku/1',
          'Operasi ditentukan oleh HTTP method: GET, POST, PUT, DELETE',
          'Pesan berformat JSON dan stateless: tiap request berdiri sendiri',
        ],
      });

      // 1. TCP handshake
      s.step('Membuka koneksi TCP', 'Sebelum HTTP dikirim, client dan server melakukan three-way handshake TCP ke port 3000.');
      s.wait(0.8);
      s.inspect({
        kind: 'net',
        title: 'TCP three-way handshake',
        dir: 'lapisan transport',
        lines: [
          'Client → Server   SYN        seq = x',
          'Server → Client   SYN-ACK    seq = y, ack = x + 1',
          'Client → Server   ACK        ack = y + 1',
          '',
          '# Koneksi terbentuk. Express memakai keep-alive,',
          '# jadi koneksi ini dipakai ulang untuk request berikutnya.',
        ],
      });
      s.packet({ label: 'SYN', kind: 'net', dur: 1 });
      s.packet({ dir: 'back', label: 'SYN-ACK', kind: 'net', dur: 1 });
      s.packet({ label: 'ACK', kind: 'net', dur: 1 });
      s.openLink('net', 'TCP :3000 · keep-alive');
      s.wait(2.2);

      // 2. GET semua
      s.step('READ: ambil semua buku', 'Method GET ke URL resource /api/buku. GET hanya meminta data, jadi tidak membawa body.');
      s.wait(0.8);
      s.log('client', '→ GET /api/buku');
      s.packet({
        label: 'GET /api/buku',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: ['GET /api/buku HTTP/1.1', 'Host: localhost:3000', 'Accept: application/json', '', '# (tanpa body)'],
        },
      });
      s.activate('server', 0);
      s.process('server', 'router: GET /api/buku → getAll()');
      s.flash('buku', 'req');
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: '200 OK',
        kind: 'res',
        sub: '442 byte JSON',
        inspect: {
          title: 'HTTP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            'HTTP/1.1 200 OK',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: 442',
            '',
            '{"status":"sukses","data":[',
            '  {"id":1,"judul":"Laskar Pelangi","penulis":"Andrea Hirata",...,"stok":5},',
            '  {"id":2,"judul":"Bumi Manusia","penulis":"Pramoedya Ananta Toer",...,"stok":3},',
            '  {"id":3,"judul":"Negeri 5 Menara","penulis":"Ahmad Fuadi",...,"stok":4}',
            ']}',
          ],
        },
      });
      s.log('client', '← 200 OK · 3 buku', 'res');
      s.wait(2.6);

      // 3. POST
      s.step('CREATE: tambah buku', 'POST mengirim data buku baru di body JSON. Server memvalidasi, menyimpan, lalu membalas 201 Created.');
      s.wait(0.8);
      s.log('client', '→ POST /api/buku');
      s.packet({
        label: 'POST /api/buku',
        sub: 'body JSON 130 byte',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: [
            'POST /api/buku HTTP/1.1',
            'Host: localhost:3000',
            'Content-Type: application/json',
            'Content-Length: 130',
            '',
            '{"judul":"Ronggeng Dukuh Paruk","penulis":"Ahmad Tohari",',
            ' "penerbit":"Gramedia","tahunTerbit":1982,',
            ' "isbn":"9789792223477","stok":2}',
          ],
        },
      });
      s.activate('server', 2);
      s.process('server', 'express.json() → parse body', 1);
      s.process('server', 'validasi 6 field → create()', 1);
      s.addRow('buku', BUKU_BARU);
      s.wait(0.6);
      s.packet({
        dir: 'back',
        label: '201 Created',
        kind: 'res',
        inspect: {
          title: 'HTTP Response',
          dir: 'Server → Client',
          badge: '201 Created',
          lines: [
            'HTTP/1.1 201 Created',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: 200',
            '',
            '{"status":"sukses","pesan":"Buku berhasil ditambahkan",',
            ' "data":{"id":4,"judul":"Ronggeng Dukuh Paruk","penulis":"Ahmad Tohari",',
            '         "penerbit":"Gramedia","tahunTerbit":1982,',
            '         "isbn":"9789792223477","stok":2}}',
          ],
        },
      });
      s.log('client', '← 201 Created · id 4', 'res');
      s.wait(2.6);

      // 4. PUT
      s.step('UPDATE: ubah stok', 'PUT ke URL buku tertentu (/api/buku/4). Cukup kirim field yang ingin diubah.');
      s.wait(0.8);
      s.log('client', '→ PUT /api/buku/4');
      s.packet({
        label: 'PUT /api/buku/4',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: ['PUT /api/buku/4 HTTP/1.1', 'Host: localhost:3000', 'Content-Type: application/json', 'Content-Length: 11', '', '{"stok":10}'],
        },
      });
      s.activate('server', 3);
      s.process('server', 'req.params.id = 4 → update()');
      s.updateRow('buku', 4, { stok: 10 });
      s.wait(0.6);
      s.packet({
        dir: 'back',
        label: '200 OK',
        kind: 'res',
        inspect: {
          title: 'HTTP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            'HTTP/1.1 200 OK',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: 200',
            '',
            '{"status":"sukses","pesan":"Buku berhasil diperbarui",',
            ' "data":{"id":4,"judul":"Ronggeng Dukuh Paruk",...,"stok":10}}',
          ],
        },
      });
      s.log('client', '← 200 OK · stok = 10', 'res');
      s.wait(2.4);

      // 5. DELETE
      s.step('DELETE: hapus buku', 'Method DELETE ke URL /api/buku/4. Server menghapus data lalu mengembalikan buku yang dihapus.');
      s.wait(0.8);
      s.log('client', '→ DELETE /api/buku/4');
      s.packet({
        label: 'DELETE /api/buku/4',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: ['DELETE /api/buku/4 HTTP/1.1', 'Host: localhost:3000', '', '# (tanpa body)'],
        },
      });
      s.activate('server', 4);
      s.process('server', 'req.params.id = 4 → remove()');
      s.removeRow('buku', 4);
      s.wait(0.8);
      s.packet({
        dir: 'back',
        label: '200 OK',
        kind: 'res',
        inspect: {
          title: 'HTTP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            'HTTP/1.1 200 OK',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: 197',
            '',
            '{"status":"sukses","pesan":"Buku berhasil dihapus",',
            ' "data":{"id":4,"judul":"Ronggeng Dukuh Paruk",...}}',
          ],
        },
      });
      s.log('client', '← 200 OK · terhapus', 'res');
      s.wait(2.4);

      // 6. 404
      s.step('Error: resource tidak ada', 'Buku id 4 sudah dihapus. REST memakai status code HTTP untuk memberi tahu hasilnya: 404 Not Found.');
      s.wait(0.8);
      s.log('client', '→ GET /api/buku/4');
      s.packet({
        label: 'GET /api/buku/4',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: ['GET /api/buku/4 HTTP/1.1', 'Host: localhost:3000', 'Accept: application/json'],
        },
      });
      s.activate('server', 1, 'err');
      s.process('server', 'getById(4) → null', 1.2, 'err');
      s.packet({
        dir: 'back',
        label: '404 Not Found',
        kind: 'err',
        inspect: {
          title: 'HTTP Response',
          dir: 'Server → Client',
          badge: '404 Not Found',
          lines: [
            'HTTP/1.1 404 Not Found',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: 61',
            '',
            '{"status":"gagal","pesan":"Buku dengan id 4 tidak ditemukan"}',
          ],
        },
      });
      s.log('client', '← 404 Not Found', 'err');
      s.wait(3);

      s.outro({
        title: 'REST API',
        bullets: [
          'URL menunjuk resource, HTTP method menentukan operasinya',
          'Hasil dibaca dari status code: 200, 201, 400, 404',
          'Stateless: setiap request membawa semua informasi yang dibutuhkan',
          'Ringan dan mudah diuji: curl, browser, Postman',
        ],
        footer: 'Kode: REST_API/server.js',
      });
    },
  );
})();
