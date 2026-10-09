// Skenario 5: WebSocket API (WebSocket_API/server.js)
(function () {
  const { BUKU, BUKU_BARU } = SIM;
  const KOLOM = [
    { key: 'id', label: 'ID', w: 56 },
    { key: 'judul', label: 'JUDUL' },
    { key: 'stok', label: 'STOK', w: 76, align: 'right' },
  ];

  // Potong JSON panjang menjadi beberapa baris (di batas koma)
  function potong(json, max = 74) {
    const out = [];
    let line = '';
    for (const part of json.split(/(?<=,)/)) {
      if (line && (line + part).length > max) {
        out.push(line);
        line = ` ${part}`;
      } else line += part;
    }
    out.push(line);
    return out;
  }

  // Isi panel untuk satu frame WebSocket (teks). Frame dari client wajib di-mask.
  function frame(obj, dariClient) {
    const json = JSON.stringify(obj);
    const len = json.length;
    const ext = len > 125 ? 2 : 0;
    const mask = dariClient ? 4 : 0;
    const rincian = [`2 byte dasar`, ext && `${ext} byte panjang diperluas`, mask && `${mask} byte mask-key`].filter(Boolean).join(' + ');
    return {
      badge: `${len} byte`,
      lines: [
        { t: `FIN=1 · opcode=0x1 (teks) · MASK=${dariClient ? 1 : 0} · panjang payload=${len}`, c: 'warn' },
        `# header frame ${2 + ext + mask} byte: ${rincian}`,
        '',
        ...potong(json),
      ],
    };
  }

  // Data lengkap seperti di bukuStore.js (untuk menghitung panjang payload yang sebenarnya)
  const BUKU_LENGKAP = [
    { id: 1, judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', penerbit: 'Bentang Pustaka', tahunTerbit: 2005, isbn: '9789793062792', stok: 5 },
    { id: 2, judul: 'Bumi Manusia', penulis: 'Pramoedya Ananta Toer', penerbit: 'Hasta Mitra', tahunTerbit: 1980, isbn: '9789799731234', stok: 3 },
    { id: 3, judul: 'Negeri 5 Menara', penulis: 'Ahmad Fuadi', penerbit: 'Gramedia', tahunTerbit: 2009, isbn: '9789792248616', stok: 4 },
  ];
  const bukuJson = (b) => ({ id: b.id, judul: b.judul, penulis: b.penulis, penerbit: 'Gramedia', tahunTerbit: 1982, isbn: '9789792223477', stok: b.stok });

  SIM.register(
    'websocket',
    {
      index: 5,
      title: 'WebSocket',
      accent: '#a78bfa',
      chips: ['RFC 6455', 'Full-duplex', 'JSON', 'Port 8080'],
      nodes: [
        { id: 'a', kind: 'client', compact: true, x: 70, y: 135, w: 500, h: 215, title: 'Client A', subtitle: 'admin · tab 1', logTitle: 'Log' },
        {
          id: 'b', kind: 'client', compact: true, x: 70, y: 365, w: 500, h: 285, title: 'Client B', subtitle: 'pengamat · tab 2',
          table: 'bukuB', columns: KOLOM, rowH: 36, tableTitle: 'Tabel di layar (data lokal)', emptyText: '(belum memuat data)',
        },
        {
          id: 'server', kind: 'server', x: 1350, y: 140, w: 500, h: 495, title: 'Server WebSocket', subtitle: 'Node.js + ws · :8080/ws',
          table: 'buku', status: true, tableTitle: 'bukuStore.js (memori)', idle: 'mendengarkan pesan…',
        },
      ],
      links: [
        { id: 'la', from: 'a', to: 'server', by: -90 },
        { id: 'lb', from: 'b', to: 'server', by: 90 },
      ],
      tables: { buku: BUKU, bukuB: [] },
      linkState: { la: { open: false, label: 'belum terhubung' }, lb: { open: false, label: 'belum terhubung' } },
      nodeState: { server: { extra: { title: 'wss.clients (koneksi aktif)', items: [], at: -9 } } },
    },
    (s) => {
      const klien = (items) => s.extra('server', { title: 'wss.clients (koneksi aktif)', items });

      s.intro({
        title: 'WebSocket',
        subtitle: 'Koneksi dua arah yang tetap terbuka',
        bullets: [
          'Diawali HTTP biasa, lalu "di-upgrade" menjadi koneksi WebSocket',
          'Full-duplex: server bisa mengirim pesan kapan saja tanpa diminta',
          'Cocok untuk aplikasi realtime: chat, notifikasi, dashboard live',
        ],
      });

      // 1. Handshake client A
      s.step('Handshake: upgrade dari HTTP', 'Client A mengirim request HTTP biasa dengan header Upgrade. Server membalas 101 Switching Protocols, lalu koneksi berganti protokol.');
      s.wait(0.6);
      s.log('a', '→ GET /ws (Upgrade)');
      s.packet({
        link: 'la',
        label: 'GET /ws  Upgrade',
        inspect: {
          title: 'HTTP Upgrade Request',
          dir: 'Client A → Server',
          lines: [
            'GET /ws HTTP/1.1',
            'Host: localhost:8080',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
            'Sec-WebSocket-Version: 13',
          ],
        },
      });
      s.process('server', 'SHA-1(Key + GUID) → base64', 1.3);
      s.packet({
        link: 'la',
        dir: 'back',
        label: '101 Switching Protocols',
        kind: 'res',
        inspect: {
          title: 'HTTP Upgrade Response',
          dir: 'Server → Client A',
          badge: '101',
          lines: [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
            '',
            '# Accept = base64( SHA1( Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" ) )',
            '# Mulai sekarang koneksi TCP ini berbicara dengan frame WebSocket, bukan HTTP.',
          ],
        },
      });
      s.openLink('la', 'WebSocket · full-duplex');
      s.log('a', '← 101 · terhubung', 'res');
      klien(['Client A']);
      s.wait(2.8);

      // 2. Client B terhubung dan memuat data
      s.step('Client B terhubung & memuat data', 'Client B melakukan handshake yang sama, lalu mengirim pesan getAll. Pesan dikirim sebagai frame teks berisi JSON.');
      s.wait(0.6);
      s.inspect({ kind: 'req', title: 'HTTP Upgrade (Client B)', dir: 'Client B ↔ Server', lines: ['GET /ws HTTP/1.1', 'Upgrade: websocket', 'Sec-WebSocket-Key: …', '', 'HTTP/1.1 101 Switching Protocols'] });
      s.packet({ link: 'lb', label: 'GET /ws  Upgrade', dur: 1.2 });
      s.packet({ link: 'lb', dir: 'back', label: '101', kind: 'res', dur: 1.2 });
      s.openLink('lb', 'WebSocket · full-duplex');
      klien(['Client A', 'Client B']);
      s.wait(0.8);
      const reqB = { requestId: 1, aksi: 'getAll' };
      s.packet({ link: 'lb', label: 'aksi: getAll', inspect: { title: 'Frame WebSocket (teks, di-mask)', dir: 'Client B → Server', ...frame(reqB, true) } });
      s.process('server', "switch (aksi) → case 'getAll'", 1.1);
      s.flash('buku', 'req');
      s.packet({
        link: 'lb',
        dir: 'back',
        label: 'respons: 3 buku',
        kind: 'res',
        inspect: {
          title: 'Frame WebSocket (teks, tanpa mask)',
          dir: 'Server → Client B',
          ...frame({ tipe: 'respons', requestId: 1, aksi: 'getAll', status: 'sukses', data: BUKU_LENGKAP }, false),
        },
      });
      s.setRows('bukuB', BUKU);
      s.wait(2.6);

      // 3. Client A menambah buku → broadcast
      s.step('CREATE + server push', 'Client A menambah buku. Server menyimpan, lalu mem-broadcast notifikasi ke SEMUA client, termasuk Client B yang tidak meminta apa pun.');
      s.wait(0.6);
      const create = { requestId: 1, aksi: 'create', data: { judul: BUKU_BARU.judul, penulis: BUKU_BARU.penulis, penerbit: 'Gramedia', tahunTerbit: 1982, isbn: '9789792223477', stok: 2 } };
      s.log('a', '→ aksi: create');
      s.packet({ link: 'la', label: 'aksi: create', inspect: { title: 'Frame WebSocket (teks, di-mask)', dir: 'Client A → Server', ...frame(create, true) } });
      s.process('server', 'create() → broadcast()', 1.2);
      s.addRow('buku', BUKU_BARU);
      const notifTambah = { tipe: 'notifikasi', event: 'buku.ditambahkan', data: bukuJson(BUKU_BARU) };
      s.packet({ link: 'la', dir: 'back', label: 'notifikasi', kind: 'push', parallel: true });
      s.packet({ link: 'lb', dir: 'back', label: 'notifikasi', kind: 'push', inspect: { title: 'Frame notifikasi (server push)', dir: 'Server → semua client', ...frame(notifTambah, false) } });
      s.addRow('bukuB', BUKU_BARU);
      s.log('a', '← notifikasi buku.ditambahkan', 'push');
      s.wait(0.3);
      s.packet({ link: 'la', dir: 'back', label: 'respons: sukses', kind: 'res', dur: 1.4 });
      s.log('a', '← respons create: sukses', 'res');
      s.wait(2.6);

      // 4. Update → broadcast
      s.step('UPDATE + server push', 'Client A mengubah stok. Tabel di layar Client B langsung ikut berubah tanpa refresh dan tanpa polling.');
      s.wait(0.6);
      const update = { requestId: 2, aksi: 'update', id: 4, data: { stok: 10 } };
      s.log('a', '→ aksi: update');
      s.packet({ link: 'la', label: 'aksi: update', inspect: { title: 'Frame WebSocket (teks, di-mask)', dir: 'Client A → Server', ...frame(update, true) } });
      s.process('server', 'update(4) → broadcast()', 1.1);
      s.updateRow('buku', 4, { stok: 10 });
      const notifUbah = { tipe: 'notifikasi', event: 'buku.diperbarui', data: bukuJson({ ...BUKU_BARU, stok: 10 }) };
      s.packet({ link: 'la', dir: 'back', label: 'notifikasi', kind: 'push', parallel: true });
      s.packet({ link: 'lb', dir: 'back', label: 'notifikasi', kind: 'push', inspect: { title: 'Frame notifikasi (server push)', dir: 'Server → semua client', ...frame(notifUbah, false) } });
      s.updateRow('bukuB', 4, { stok: 10 }, 'push');
      s.log('a', '← notifikasi buku.diperbarui', 'push');
      s.wait(0.3);
      s.packet({ link: 'la', dir: 'back', label: 'respons: sukses', kind: 'res', dur: 1.4 });
      s.log('a', '← respons update: sukses', 'res');
      s.wait(2.4);

      // 5. Delete → broadcast
      s.step('DELETE + server push', 'Client A menghapus buku id 4. Notifikasi buku.dihapus membuat baris itu hilang juga di Client B.');
      s.wait(0.6);
      const hapus = { requestId: 3, aksi: 'delete', id: 4 };
      s.log('a', '→ aksi: delete');
      s.packet({ link: 'la', label: 'aksi: delete', inspect: { title: 'Frame WebSocket (teks, di-mask)', dir: 'Client A → Server', ...frame(hapus, true) } });
      s.process('server', 'remove(4) → broadcast()', 1.1);
      s.removeRow('buku', 4);
      const notifHapus = { tipe: 'notifikasi', event: 'buku.dihapus', data: bukuJson({ ...BUKU_BARU, stok: 10 }) };
      s.packet({ link: 'la', dir: 'back', label: 'notifikasi', kind: 'push', parallel: true });
      s.packet({ link: 'lb', dir: 'back', label: 'notifikasi', kind: 'push', inspect: { title: 'Frame notifikasi (server push)', dir: 'Server → semua client', ...frame(notifHapus, false) } });
      s.removeRow('bukuB', 4);
      s.log('a', '← notifikasi buku.dihapus', 'push');
      s.wait(0.3);
      s.packet({ link: 'la', dir: 'back', label: 'respons: sukses', kind: 'res', dur: 1.4 });
      s.log('a', '← respons delete: sukses', 'res');
      s.wait(2.4);

      // 6. Menutup koneksi
      s.step('Menutup koneksi', 'Saat tab Client B ditutup, browser mengirim frame Close (opcode 0x8). Server membalas Close, lalu Client B dikeluarkan dari daftar koneksi aktif.');
      s.wait(0.6);
      s.packet({
        link: 'lb',
        label: 'Close 1001',
        kind: 'net',
        inspect: {
          kind: 'net',
          title: 'Frame Close (kontrol)',
          dir: 'Client B → Server',
          lines: [
            { t: 'FIN=1 · opcode=0x8 (close) · MASK=1 · panjang payload=2', c: 'warn' },
            '# payload = kode status 2 byte',
            [['03 e9', 'pink'], ['   ← 1001 "going away" (halaman ditutup)', 'dim']],
            '',
            '# Opcode lain: 0x1 teks · 0x2 biner · 0x9 ping · 0xA pong',
          ],
        },
      });
      s.packet({ link: 'lb', dir: 'back', label: 'Close', kind: 'net', dur: 1.3 });
      s.closeLink('lb', 'koneksi ditutup');
      klien(['Client A']);
      s.wait(3);

      s.outro({
        title: 'WebSocket',
        bullets: [
          'Handshake HTTP sekali (101 Switching Protocols), lalu koneksi tetap terbuka',
          'Pesan dikirim dalam frame dengan header kecil, hanya 2–14 byte',
          'Full-duplex: server bisa push notifikasi ke semua client',
          'Format pesan (aksi, requestId, tipe) dirancang sendiri oleh developer',
        ],
        footer: 'Kode: WebSocket_API/server.js · WebSocket_API/index.html',
      });
    },
  );
})();
