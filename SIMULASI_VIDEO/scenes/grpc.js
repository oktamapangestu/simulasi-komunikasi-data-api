// Skenario 4: gRPC API (gRPC_API/server.js + perpustakaan.proto)
(function () {
  const { BUKU, BUKU_BARU } = SIM;
  const rpc = ['GetAllBuku', 'GetBukuById', 'CreateBuku', 'UpdateBuku', 'DeleteBuku'];
  const SVC = '/perpustakaan.PerpustakaanService';

  // Satu baris byte protobuf: tag (pink), panjang (kuning), nilai (hijau), keterangan (abu)
  function field(tag, len, data, note) {
    const hex = [tag, len, data].filter(Boolean).join(' ');
    const seg = [[tag, 'pink']];
    if (len) seg.push([` ${len}`, 'warn']);
    if (data) seg.push([` ${data}`, 'res']);
    seg.push([`${' '.repeat(Math.max(2, 68 - hex.length))}← ${note}`, 'dim']);
    return seg;
  }
  const frame = (text) => ({ t: text, c: 'warn' });
  const prefix = (len, note) => [['  00', 'pink'], [` ${len}`, 'warn'], [`        ← ${note}`, 'dim']];

  SIM.register(
    'grpc',
    {
      index: 4,
      title: 'gRPC',
      accent: '#22c55e',
      chips: ['HTTP/2', 'Protocol Buffers', 'Biner', 'Port 50051'],
      ...SIM.layout.single({
        client: { title: 'Client', subtitle: 'Node.js + @grpc/grpc-js' },
        server: { title: 'Server gRPC', subtitle: '@grpc/grpc-js · 0.0.0.0:50051', idle: 'menunggu RPC…' },
      }),
      tables: { buku: BUKU },
      linkState: { net: { open: false, label: 'belum terhubung' } },
    },
    (s) => {
      s.intro({
        title: 'gRPC',
        subtitle: 'Remote Procedure Call buatan Google',
        bullets: [
          'Memanggil fungsi di server seolah-olah fungsi lokal',
          'Kontrak ditulis di file .proto; kode stub dibuat otomatis',
          'Data biner Protocol Buffers di atas HTTP/2: kecil dan cepat',
        ],
      });

      // 1. Kontrak .proto
      s.step('Kontrak .proto', 'Client dan server memuat file perpustakaan.proto yang sama. Client mendapat stub berisi method RPC, server mendaftarkan implementasinya.');
      s.wait(0.6);
      s.inspect({
        kind: 'info',
        title: 'perpustakaan.proto',
        dir: 'dipakai client & server',
        lines: [
          'service PerpustakaanService {',
          '  rpc GetAllBuku  (Kosong)            returns (DaftarBuku);',
          '  rpc GetBukuById (BukuId)            returns (Buku);',
          '  rpc CreateBuku  (BukuInput)         returns (Buku);',
          '  rpc UpdateBuku  (UpdateBukuRequest) returns (Buku);',
          '  rpc DeleteBuku  (BukuId)            returns (Buku);',
          '}',
          'message Buku {',
          '  int32 id = 1;  string judul = 2;  string penulis = 3;  string penerbit = 4;',
          '  int32 tahun_terbit = 5;  string isbn = 6;  int32 stok = 7;',
          '}',
        ],
      });
      s.process('client', 'protoLoader.loadSync(.proto)', 1.6, 'info', true);
      s.process('server', 'protoLoader.loadSync(.proto)', 1.6);
      s.extra('client', { title: 'Stub dari .proto', items: rpc.map((r) => `${r}()`) });
      s.extra('server', { title: 'service PerpustakaanService', items: rpc });
      s.wait(3.2);

      // 2. Koneksi HTTP/2
      s.step('Membuka koneksi HTTP/2', 'Setelah TCP handshake, client mengirim connection preface dan frame SETTINGS. Satu koneksi ini dipakai bersama oleh semua RPC.');
      s.wait(0.6);
      s.inspect({
        kind: 'net',
        title: 'Pembukaan koneksi HTTP/2',
        dir: 'satu kali di awal',
        lines: [
          '# 1. TCP three-way handshake ke port 50051',
          'Client → Server   SYN  ·  Server → Client   SYN-ACK  ·  Client → Server   ACK',
          '',
          '# 2. Connection preface dari client (24 byte):',
          frame('PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n'),
          '',
          '# 3. Kedua pihak bertukar frame SETTINGS di stream 0',
          frame('SETTINGS (stream 0)   →   SETTINGS (stream 0)   ←   SETTINGS ACK'),
          '',
          '# createInsecure(): HTTP/2 tanpa TLS ("h2c"). Di produksi biasanya memakai TLS.',
        ],
      });
      s.packet({ label: 'SYN', kind: 'net', dur: 0.8 });
      s.packet({ dir: 'back', label: 'SYN-ACK', kind: 'net', dur: 0.8 });
      s.packet({ label: 'ACK', kind: 'net', dur: 0.8 });
      s.packet({ label: 'PRI * HTTP/2.0 + SETTINGS', kind: 'net', dur: 1.3 });
      s.packet({ dir: 'back', label: 'SETTINGS', kind: 'net', dur: 1.1 });
      s.packet({ label: 'SETTINGS ACK', kind: 'net', dur: 0.9 });
      s.openLink('net', 'HTTP/2 (h2c) · 1 koneksi TCP :50051');
      s.wait(2);

      // 3. GetAllBuku
      s.step('RPC GetAllBuku', 'Setiap panggilan RPC menjadi satu stream HTTP/2: frame HEADERS berisi nama method, frame DATA berisi pesan protobuf.');
      s.wait(0.6);
      s.activate('client', 0);
      s.log('client', '→ GetAllBuku({})');
      s.packet({
        label: 'HEADERS + DATA',
        sub: 'stream 1',
        inspect: {
          title: 'Frame HTTP/2: request',
          dir: 'Client → Server',
          lines: [
            frame('HEADERS (stream 1)'),
            '  :method: POST',
            `  :path: ${SVC}/GetAllBuku`,
            '  content-type: application/grpc',
            '  te: trailers',
            frame('DATA (stream 1)'),
            prefix('00 00 00 00', 'flag kompresi + panjang pesan = 0 byte'),
            '  # pesan Kosong {} tidak punya isi',
          ],
        },
      });
      s.activate('server', 0);
      s.process('server', 'decode protobuf → GetAllBuku()', 1.2);
      s.flash('buku', 'req');
      s.wait(0.4);
      s.packet({
        dir: 'back',
        label: 'HEADERS + DATA + TRAILERS',
        kind: 'res',
        sub: '210 byte (JSON: 424)',
        inspect: {
          title: 'Frame HTTP/2: response',
          dir: 'Server → Client',
          badge: 'grpc-status 0',
          lines: [
            frame('HEADERS (stream 1)'),
            '  :status: 200',
            '  content-type: application/grpc',
            frame('DATA (stream 1)'),
            prefix('00 00 00 d2', 'panjang = 210 byte (DaftarBuku)'),
            [['  0a 46', 'pink'], [' 08 01 12 0e 4c 61 73 6b 61 72 20 50 65 6c 61 6e 67 69 …', 'res']],
            frame('HEADERS (stream 1, trailers)'),
            '  grpc-status: 0',
            '  # 0 = OK. Status RPC dikirim di trailer, SETELAH data.',
          ],
        },
      });
      s.log('client', '← DaftarBuku · 3 buku', 'res');
      s.wait(3);

      // 4. CreateBuku (bedah byte protobuf)
      s.step('RPC CreateBuku: isi pesan biner', 'Protobuf hanya mengirim nomor field + nilai, tanpa nama field. Hasilnya 66 byte, padahal JSON untuk data yang sama 130 byte.');
      s.wait(0.6);
      s.activate('client', 2);
      s.log('client', '→ CreateBuku(…)');
      s.packet({
        label: 'HEADERS + DATA',
        sub: 'stream 3 · 66 byte',
        inspect: {
          title: 'DATA (stream 3): BukuInput dalam protobuf',
          dir: 'Client → Server',
          badge: '66 byte',
          lines: [
            `:path: ${SVC}/CreateBuku`,
            prefix('00 00 00 42', 'panjang = 66 byte'),
            [['tag (nomor field + tipe)', 'pink'], ['   panjang', 'warn'], ['   nilai', 'res']],
            field('0a', '14', '52 6f 6e 67 67 65 6e 67 20 44 75 6b 75 68 20 50 61 72 75 6b', 'field 1 judul'),
            field('12', '0c', '41 68 6d 61 64 20 54 6f 68 61 72 69', 'field 2 penulis'),
            field('1a', '08', '47 72 61 6d 65 64 69 61', 'field 3 penerbit'),
            field('20', '', 'be 0f', 'field 4 tahun_terbit = 1982'),
            field('2a', '0d', '39 37 38 39 37 39 32 32 32 33 34 37 37', 'field 5 isbn'),
            field('30', '', '02', 'field 6 stok = 2'),
          ],
        },
      });
      s.activate('server', 2);
      s.process('server', 'decode BukuInput → CreateBuku()', 1.2);
      s.addRow('buku', BUKU_BARU);
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: 'HEADERS + DATA + TRAILERS',
        kind: 'res',
        sub: 'stream 3 · 68 byte',
        inspect: {
          title: 'Frame HTTP/2: response',
          dir: 'Server → Client',
          badge: 'grpc-status 0',
          lines: [
            frame('DATA (stream 3)'),
            prefix('00 00 00 44', 'panjang = 68 byte (Buku)'),
            [['  08', 'pink'], [' 04', 'res'], ['   ← field 1 id = 4 (diberikan server)', 'dim']],
            [['  12', 'pink'], [' 14', 'warn'], [' 52 6f 6e 67 67 65 6e 67 20 44 75 6b 75 68 …', 'res']],
            frame('HEADERS (stream 3, trailers)'),
            '  grpc-status: 0',
          ],
        },
      });
      s.log('client', '← Buku · id 4', 'res');
      s.wait(3);

      // 5. UpdateBuku
      s.step('RPC UpdateBuku', 'Field optional yang tidak dikirim tidak memakan byte sama sekali. Mengubah stok cukup dengan pesan 4 byte.');
      s.wait(0.6);
      s.activate('client', 3);
      s.log('client', '→ UpdateBuku({id:4, stok:10})');
      s.packet({
        label: 'HEADERS + DATA',
        sub: 'stream 5 · 4 byte',
        inspect: {
          title: 'DATA (stream 5): UpdateBukuRequest',
          dir: 'Client → Server',
          badge: '4 byte',
          lines: [
            `:path: ${SVC}/UpdateBuku`,
            prefix('00 00 00 04', 'panjang = 4 byte'),
            field('08', '', '04', 'field 1 id = 4'),
            field('38', '', '0a', 'field 7 stok = 10   (tag 0x38 = 7 << 3 | 0)'),
            '',
            '# Bandingkan REST: body {"stok":10} = 11 byte + URL /api/buku/4',
          ],
        },
      });
      s.activate('server', 3);
      s.process('server', 'UpdateBuku() → update(4)', 1.2);
      s.updateRow('buku', 4, { stok: 10 });
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: 'DATA + TRAILERS',
        kind: 'res',
        sub: 'stream 5',
        inspect: {
          title: 'Frame HTTP/2: response',
          dir: 'Server → Client',
          badge: 'grpc-status 0',
          lines: [frame('DATA (stream 5)'), prefix('00 00 00 44', 'Buku (68 byte), stok = 10'), frame('HEADERS (stream 5, trailers)'), '  grpc-status: 0'],
        },
      });
      s.log('client', '← Buku · stok 10', 'res');
      s.wait(2.4);

      // 6. DeleteBuku
      s.step('RPC DeleteBuku', 'Masih memakai koneksi yang sama, kali ini di stream 7. Pesan BukuId hanya 2 byte.');
      s.wait(0.6);
      s.activate('client', 4);
      s.log('client', '→ DeleteBuku({id:4})');
      s.packet({
        label: 'HEADERS + DATA',
        sub: 'stream 7 · 2 byte',
        inspect: {
          title: 'DATA (stream 7): BukuId',
          dir: 'Client → Server',
          badge: '2 byte',
          lines: [`:path: ${SVC}/DeleteBuku`, prefix('00 00 00 02', 'panjang = 2 byte'), field('08', '', '04', 'field 1 id = 4')],
        },
      });
      s.activate('server', 4);
      s.process('server', 'DeleteBuku() → remove(4)', 1.2);
      s.removeRow('buku', 4);
      s.wait(0.7);
      s.packet({
        dir: 'back',
        label: 'DATA + TRAILERS',
        kind: 'res',
        sub: 'stream 7',
        inspect: {
          title: 'Frame HTTP/2: response',
          dir: 'Server → Client',
          badge: 'grpc-status 0',
          lines: [frame('DATA (stream 7)'), prefix('00 00 00 44', 'Buku yang dihapus (68 byte)'), frame('HEADERS (stream 7, trailers)'), '  grpc-status: 0'],
        },
      });
      s.log('client', '← Buku terhapus', 'res');
      s.wait(2.4);

      // 7. Error NOT_FOUND
      s.step('Error: status NOT_FOUND', 'Error gRPC dikirim lewat trailer grpc-status. Karena tidak ada data, server langsung mengirim respons "trailers-only".');
      s.wait(0.6);
      s.activate('client', 1);
      s.log('client', '→ GetBukuById({id:4})');
      s.packet({
        label: 'HEADERS + DATA',
        sub: 'stream 9',
        inspect: {
          title: 'DATA (stream 9): BukuId',
          dir: 'Client → Server',
          lines: [`:path: ${SVC}/GetBukuById`, prefix('00 00 00 02', 'panjang = 2 byte'), field('08', '', '04', 'field 1 id = 4')],
        },
      });
      s.activate('server', 1, 'err');
      s.process('server', 'getById(4) → null → NOT_FOUND', 1.3, 'err');
      s.packet({
        dir: 'back',
        label: 'TRAILERS: status 5',
        kind: 'err',
        sub: 'stream 9 · tanpa DATA',
        inspect: {
          title: 'Respons trailers-only',
          dir: 'Server → Client',
          badge: 'NOT_FOUND (5)',
          lines: [
            frame('HEADERS (stream 9, END_STREAM)'),
            '  :status: 200',
            '  content-type: application/grpc',
            '  grpc-status: 5',
            '  grpc-message: Buku%20dengan%20id%204%20tidak%20ditemukan',
            '',
            '# HTTP-nya tetap 200; hasil RPC ditentukan oleh grpc-status.',
            '# grpc-message di-percent-encode, client mendekodenya kembali.',
          ],
        },
      });
      s.log('client', '← error 5 NOT_FOUND', 'err');
      s.wait(3);

      s.outro({
        title: 'gRPC',
        bullets: [
          'Method remote dipanggil seperti fungsi lokal lewat stub',
          'Protobuf biner: nomor field + nilai, sekitar 2× lebih kecil dari JSON',
          'HTTP/2: banyak RPC berbagi satu koneksi lewat stream',
          'Cocok untuk komunikasi antar-microservice yang butuh performa',
        ],
        footer: 'Kode: gRPC_API/server.js · gRPC_API/perpustakaan.proto',
      });
    },
  );
})();
