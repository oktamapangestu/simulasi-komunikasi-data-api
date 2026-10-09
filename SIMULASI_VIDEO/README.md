# Simulasi Video — Komunikasi Data

Animasi simulasi teknis untuk kelima protokol (REST, SOAP, GraphQL, gRPC, WebSocket) dengan studi kasus CRUD buku perpustakaan yang sama seperti di folder kode.

## Hasil

Folder `output/` berisi video MP4 (1920×1080, 30 fps, tanpa suara):

| File | Isi |
|---|---|
| `1_REST_API.mp4` | TCP handshake, GET/POST/PUT/DELETE, status code 404 |
| `2_SOAP_API.mp4` | Mengambil WSDL, SOAP Envelope tiap operasi, SOAP Fault |
| `3_GraphQL_API.mp4` | Memilih field, parse → validasi → resolver, mutation, 2 jenis error |
| `4_gRPC_API.mp4` | Kontrak .proto, koneksi HTTP/2, bedah byte protobuf, stream, trailer grpc-status |
| `5_WebSocket_API.mp4` | Handshake 101, frame WebSocket, server push ke 2 client, frame Close |

Isi panel **"Isi pesan"** di video diambil dari pesan asli server di folder kode: header HTTP, envelope XML, byte protobuf hasil encode, dan nilai `Sec-WebSocket-Accept`.

## Tampilan di setiap video

- **Kiri atas**: client beserta log request/response
- **Kanan atas**: server, daftar route/operasi yang sedang aktif, dan isi `bukuStore.js` yang ikut berubah
- **Tengah**: paket yang bergerak di jaringan (biru = request, hijau = response, merah = error, ungu = server push)
- **Kiri bawah**: penjelasan langkah
- **Kanan bawah**: isi pesan mentah yang sedang dikirim

## Versi web

`web/simulasi.html` adalah halaman web mandiri (satu file, tanpa server). Bisa dibuka langsung di browser atau di-upload ke hosting statis apa pun, misalnya GitHub Pages atau Netlify. Isinya:

- tab per protokol dan kontrol putar/jeda, slider, kecepatan 0.5×–2×, layar penuh
- daftar langkah yang bisa diklik untuk loncat ke bagian tertentu
- tabel perbandingan yang menyorot protokol yang sedang diputar
- pintasan keyboard: `Spasi` putar/jeda, `←` `→` pindah langkah, `F` layar penuh

Setelah mengubah `engine.js` atau `scenes/*.js`, susun ulang dengan `node build-web.js`.

`index.html` di folder ini adalah halaman yang dipakai `record.js` untuk merender video.

## Merender ulang video

Diperlukan Google Chrome dan `ffmpeg`.

```bash
npm install
node record.js                  # render ulang semua video
node record.js grpc websocket   # hanya video tertentu
node record.js --snapshot rest 20   # simpan 1 frame (detik ke-20) sebagai PNG
```

## Struktur kode

- `engine.js`: mesin animasi (timeline, gambar node, paket, panel)
- `scenes/*.js`: skenario per protokol (urutan langkah, isi pesan, perubahan data)
- `record.js`: merender frame demi frame dengan Chrome headless lalu menyusunnya menjadi MP4 dengan ffmpeg
- `build-web.js` + `web/template.html`: menyusun versi web menjadi satu file HTML
