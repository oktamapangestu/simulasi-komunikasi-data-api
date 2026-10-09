// Skenario 2: SOAP API (SOAP_API/server.js + perpustakaan.wsdl)
(function () {
  const { BUKU, BUKU_BARU } = SIM;
  const ops = ['GetAllBuku', 'GetBukuById', 'CreateBuku', 'UpdateBuku', 'DeleteBuku'];
  const NS = 'http://perpustakaan.example.com/buku';

  // Header HTTP untuk request SOAP
  const httpReq = (op) => [
    'POST /soap/perpustakaan HTTP/1.1',
    'Content-Type: text/xml; charset=utf-8',
    `SOAPAction: "${NS}/${op}"`,
    '',
  ];
  const envBuka = ['<soapenv:Envelope xmlns:soapenv="…/soap/envelope/" xmlns:buk="…/buku">', '  <soapenv:Body>'];
  const envTutup = ['  </soapenv:Body>', '</soapenv:Envelope>'];
  const resBuka = (status = '200 OK') => [
    `HTTP/1.1 ${status}`,
    'Content-Type: text/xml; charset=utf-8',
    '',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    '  <soap:Body>',
  ];
  const resTutup = ['  </soap:Body>', '</soap:Envelope>'];

  SIM.register(
    'soap',
    {
      index: 2,
      title: 'SOAP API',
      accent: '#f59e0b',
      chips: ['SOAP 1.1', 'XML', 'WSDL', 'Port 8000'],
      ...SIM.layout.single({
        client: { title: 'Client', subtitle: 'node-soap client / SoapUI' },
        server: { title: 'Server SOAP', subtitle: 'Node.js + soap · /soap/perpustakaan', idle: 'menunggu SOAP request…' },
      }),
      tables: { buku: BUKU },
      linkState: { net: { open: true, label: 'HTTP/1.1 · TCP :8000', at: -9 } },
      nodeState: { server: { extra: { title: 'Operasi di WSDL (portType)', items: ops, at: -9 } } },
    },
    (s) => {
      s.intro({
        title: 'SOAP API',
        subtitle: 'Simple Object Access Protocol',
        bullets: [
          'Pesan XML dengan struktur baku: Envelope → Header → Body',
          'Kontrak layanan ditulis di WSDL: operasi, tipe data, alamat',
          'Semua operasi dikirim dengan POST ke SATU endpoint yang sama',
        ],
      });

      // 1. WSDL
      s.step('Membaca kontrak WSDL', 'Client mengunduh WSDL untuk mengetahui daftar operasi, tipe data, dan alamat endpoint. Dari sini client membuat proxy.');
      s.wait(0.8);
      s.log('client', '→ GET ?wsdl');
      s.packet({
        label: 'GET ?wsdl',
        inspect: {
          title: 'HTTP Request',
          dir: 'Client → Server',
          lines: ['GET /soap/perpustakaan?wsdl HTTP/1.1', 'Host: localhost:8000'],
        },
      });
      s.process('server', 'kirim perpustakaan.wsdl', 1);
      s.packet({
        dir: 'back',
        label: 'WSDL (XML)',
        kind: 'res',
        inspect: {
          title: 'Dokumen WSDL',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            '<definitions name="PerpustakaanService" targetNamespace="…/buku">',
            '  <types>  <xsd:complexType name="Buku"> id, judul, penulis, … </types>',
            '  <portType name="PerpustakaanPortType">',
            '    <operation name="GetAllBuku"/>   <operation name="GetBukuById"/>',
            '    <operation name="CreateBuku"/>   <operation name="UpdateBuku"/>',
            '    <operation name="DeleteBuku"/>',
            '  </portType>',
            '  <soap:binding style="document" transport="…/soap/http"/>',
            '  <soap:address location="http://localhost:8000/soap/perpustakaan"/>',
            '</definitions>',
          ],
        },
      });
      s.log('client', '← WSDL · 5 operasi', 'res');
      s.extra('client', { title: 'Proxy dari WSDL', items: ops.map((o) => `${o}()`) });
      s.wait(3);

      // 2. GetAllBuku
      s.step('READ: GetAllBuku', 'Nama operasi ditulis sebagai elemen XML di dalam soap:Body. Header SOAPAction juga menyebut operasinya.');
      s.wait(0.8);
      s.activate('client', 0);
      s.log('client', '→ GetAllBuku()');
      s.packet({
        label: '<GetAllBukuRequest/>',
        inspect: { title: 'SOAP Request', dir: 'Client → Server', lines: [...httpReq('GetAllBuku'), ...envBuka, '    <buk:GetAllBukuRequest/>', ...envTutup] },
      });
      s.activate('server', 0);
      s.process('server', 'parse XML → cocokkan operasi', 1);
      s.process('server', 'GetAllBuku() → getAll()', 1);
      s.flash('buku', 'req');
      s.wait(0.4);
      s.packet({
        dir: 'back',
        label: '<GetAllBukuResponse>',
        kind: 'res',
        inspect: {
          title: 'SOAP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            ...resBuka(),
            `    <GetAllBukuResponse xmlns="${NS}">`,
            '      <buku><id>1</id><judul>Laskar Pelangi</judul>…<stok>5</stok></buku>',
            '      <buku><id>2</id><judul>Bumi Manusia</judul>…<stok>3</stok></buku>',
            '      <buku><id>3</id><judul>Negeri 5 Menara</judul>…<stok>4</stok></buku>',
            '    </GetAllBukuResponse>',
            ...resTutup,
          ],
        },
      });
      s.log('client', '← GetAllBukuResponse · 3 buku', 'res');
      s.wait(2.8);

      // 3. CreateBuku
      s.step('CREATE: CreateBuku', 'Setiap field buku menjadi elemen XML. Pesannya jauh lebih panjang daripada JSON untuk data yang sama.');
      s.wait(0.8);
      s.activate('client', 2);
      s.log('client', '→ CreateBuku(…)');
      s.packet({
        label: '<CreateBukuRequest>',
        sub: 'XML 434 byte (JSON: 130)',
        inspect: {
          title: 'SOAP Request',
          dir: 'Client → Server',
          lines: [
            ...httpReq('CreateBuku'),
            ...envBuka,
            '    <buk:CreateBukuRequest>',
            '      <buk:judul>Ronggeng Dukuh Paruk</buk:judul>  <buk:stok>2</buk:stok>',
            '      <buk:penulis>Ahmad Tohari</buk:penulis>  <buk:penerbit>Gramedia</buk:penerbit>',
            '      <buk:tahunTerbit>1982</buk:tahunTerbit>  <buk:isbn>9789792223477</buk:isbn>',
            '    </buk:CreateBukuRequest>',
            ...envTutup,
          ],
        },
      });
      s.activate('server', 2);
      s.process('server', 'validasi tipe sesuai XSD', 1);
      s.process('server', 'CreateBuku() → create()', 1);
      s.addRow('buku', BUKU_BARU);
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: '<CreateBukuResponse>',
        kind: 'res',
        inspect: {
          title: 'SOAP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            ...resBuka(),
            `    <CreateBukuResponse xmlns="${NS}">`,
            '      <pesan>Buku berhasil ditambahkan</pesan>',
            '      <buku><id>4</id><judul>Ronggeng Dukuh Paruk</judul>…<stok>2</stok></buku>',
            '    </CreateBukuResponse>',
            ...resTutup,
          ],
        },
      });
      s.log('client', '← CreateBukuResponse · id 4', 'res');
      s.wait(2.6);

      // 4. UpdateBuku
      s.step('UPDATE: UpdateBuku', 'Tetap POST ke endpoint yang sama. Yang berubah hanya elemen di dalam Body dan header SOAPAction.');
      s.wait(0.8);
      s.activate('client', 3);
      s.log('client', '→ UpdateBuku(id 4)');
      s.packet({
        label: '<UpdateBukuRequest>',
        inspect: {
          title: 'SOAP Request',
          dir: 'Client → Server',
          lines: [
            ...httpReq('UpdateBuku'),
            ...envBuka,
            '    <buk:UpdateBukuRequest>',
            '      <buk:id>4</buk:id>  <buk:stok>10</buk:stok>',
            '    </buk:UpdateBukuRequest>',
            ...envTutup,
          ],
        },
      });
      s.activate('server', 3);
      s.process('server', 'UpdateBuku() → update(4)');
      s.updateRow('buku', 4, { stok: 10 });
      s.wait(0.5);
      s.packet({
        dir: 'back',
        label: '<UpdateBukuResponse>',
        kind: 'res',
        inspect: {
          title: 'SOAP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            ...resBuka(),
            `    <UpdateBukuResponse xmlns="${NS}">`,
            '      <pesan>Buku berhasil diperbarui</pesan>',
            '      <buku><id>4</id>…<stok>10</stok></buku>',
            '    </UpdateBukuResponse>',
            ...resTutup,
          ],
        },
      });
      s.log('client', '← UpdateBukuResponse', 'res');
      s.wait(2.4);

      // 5. DeleteBuku
      s.step('DELETE: DeleteBuku', 'Menghapus buku id 4. Tidak ada method DELETE, karena SOAP hanya memakai POST.');
      s.wait(0.8);
      s.activate('client', 4);
      s.log('client', '→ DeleteBuku(id 4)');
      s.packet({
        label: '<DeleteBukuRequest>',
        inspect: {
          title: 'SOAP Request',
          dir: 'Client → Server',
          lines: [...httpReq('DeleteBuku'), ...envBuka, '    <buk:DeleteBukuRequest><buk:id>4</buk:id></buk:DeleteBukuRequest>', ...envTutup],
        },
      });
      s.activate('server', 4);
      s.process('server', 'DeleteBuku() → remove(4)');
      s.removeRow('buku', 4);
      s.wait(0.7);
      s.packet({
        dir: 'back',
        label: '<DeleteBukuResponse>',
        kind: 'res',
        inspect: {
          title: 'SOAP Response',
          dir: 'Server → Client',
          badge: '200 OK',
          lines: [
            ...resBuka(),
            `    <DeleteBukuResponse xmlns="${NS}">`,
            '      <pesan>Buku berhasil dihapus</pesan>',
            '      <buku><id>4</id><judul>Ronggeng Dukuh Paruk</judul>…</buku>',
            '    </DeleteBukuResponse>',
            ...resTutup,
          ],
        },
      });
      s.log('client', '← DeleteBukuResponse', 'res');
      s.wait(2.4);

      // 6. Fault
      s.step('Error: SOAP Fault', 'Buku id 4 sudah tidak ada. SOAP melaporkan error dengan elemen soap:Fault di dalam Body, dikirim dengan HTTP 500.');
      s.wait(0.8);
      s.activate('client', 1);
      s.log('client', '→ GetBukuById(id 4)');
      s.packet({
        label: '<GetBukuByIdRequest>',
        inspect: {
          title: 'SOAP Request',
          dir: 'Client → Server',
          lines: [...httpReq('GetBukuById'), ...envBuka, '    <buk:GetBukuByIdRequest><buk:id>4</buk:id></buk:GetBukuByIdRequest>', ...envTutup],
        },
      });
      s.activate('server', 1, 'err');
      s.process('server', 'getById(4) → null → throw Fault', 1.3, 'err');
      s.packet({
        dir: 'back',
        label: '<soap:Fault>',
        kind: 'err',
        sub: 'HTTP 500',
        inspect: {
          title: 'SOAP Fault',
          dir: 'Server → Client',
          badge: '500',
          lines: [
            ...resBuka('500 Internal Server Error'),
            '    <soap:Fault>',
            '      <faultcode>soap:Client</faultcode>',
            '      <faultstring>Buku dengan id 4 tidak ditemukan</faultstring>',
            '    </soap:Fault>',
            ...resTutup,
          ],
        },
      });
      s.log('client', '← soap:Fault (soap:Client)', 'err');
      s.wait(3);

      s.outro({
        title: 'SOAP API',
        bullets: [
          'Format pesan baku: Envelope, Header (opsional), Body, Fault',
          'Kontrak WSDL membuat client bisa dibuat otomatis (proxy)',
          'Satu endpoint; operasi dibedakan lewat elemen Body & SOAPAction',
          'Pesan besar, tetapi ketat dan tervalidasi: populer di sistem enterprise',
        ],
        footer: 'Kode: SOAP_API/server.js · SOAP_API/perpustakaan.wsdl',
      });
    },
  );
})();
