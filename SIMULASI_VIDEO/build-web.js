// Menyusun versi web simulasi menjadi satu file HTML mandiri:
// template.html + engine.js + scenes/*.js digabung (inline) supaya bisa dibuka atau di-hosting di mana saja.
//
//   node build-web.js
//
// Hasil:
//   web/simulasi.html  -> halaman lengkap (buka langsung di browser / upload ke hosting)
//   web/artifact.html  -> isi halaman tanpa <html>/<head>/<body> (untuk dipublikasikan sebagai Artifact)

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baca = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const SCENES = ['rest', 'soap', 'graphql', 'grpc', 'websocket'];

const scripts = ['engine.js', ...SCENES.map((s) => `scenes/${s}.js`)]
  .map((f) => `<script>\n/* ${f} */\n${baca(f).replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .join('\n');

const isi = baca('web/template.html').replace('<!-- SCRIPTS -->', scripts);

fs.writeFileSync(path.join(dir, 'web/artifact.html'), isi);
fs.writeFileSync(
  path.join(dir, 'web/simulasi.html'),
  `<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${isi}\n</body>\n</html>\n`,
);
console.log(`web/simulasi.html & web/artifact.html (${(Buffer.byteLength(isi) / 1024).toFixed(0)} KB)`);
