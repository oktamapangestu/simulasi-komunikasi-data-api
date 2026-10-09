// Merender setiap skenario menjadi video MP4 (1920×1080, 30 fps).
// Chrome headless menggambar frame demi frame, lalu ffmpeg menyusunnya menjadi video.
//
// Pemakaian:
//   node record.js                 -> semua video
//   node record.js rest grpc       -> hanya skenario tertentu
//   node record.js --snapshot rest 12.5   -> simpan satu frame PNG (untuk pengecekan)

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright-core');

const FPS = 30;
const OUT = path.join(__dirname, 'output');
const URL = `file://${path.join(__dirname, 'index.html')}?rekam`;
const NAMA_FILE = { rest: '1_REST_API', soap: '2_SOAP_API', graphql: '3_GraphQL_API', grpc: '4_gRPC_API', websocket: '5_WebSocket_API' };

async function bukaHalaman() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('Error di halaman:', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.SIM && window.renderFrame);
  return { browser, page };
}

// Ambil isi canvas sebagai PNG
function ambilFrame(page, id, t) {
  return page.evaluate(
    ([id, t]) => {
      window.renderFrame(id, t);
      return document.getElementById('layar').toDataURL('image/png').split(',')[1];
    },
    [id, t],
  );
}

async function rekam(page, id) {
  const durasi = await page.evaluate((id) => SIM.duration(id), id);
  const total = Math.ceil(durasi * FPS);
  const file = path.join(OUT, `${NAMA_FILE[id] || id}.mp4`);
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', file,
  ]);
  const selesai = new Promise((res, rej) => {
    ffmpeg.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg keluar dengan kode ${code}`))));
  });

  const mulai = Date.now();
  for (let i = 0; i < total; i++) {
    const png = Buffer.from(await ambilFrame(page, id, i / FPS), 'base64');
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (i % (FPS * 10) === 0) process.stdout.write(`\r  ${id}: ${Math.round((i / total) * 100)}%   `);
  }
  ffmpeg.stdin.end();
  await selesai;
  console.log(`\r  ${id}: selesai → ${path.relative(process.cwd(), file)} (${durasi.toFixed(1)} detik, ${((Date.now() - mulai) / 1000).toFixed(0)} detik render)`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2);
  const { browser, page } = await bukaHalaman();
  try {
    if (args[0] === '--snapshot') {
      const [, id, ...waktu] = args;
      for (const w of waktu) {
        const file = path.join(OUT, `snapshot_${id}_${w}.png`);
        fs.writeFileSync(file, Buffer.from(await ambilFrame(page, id, Number(w)), 'base64'));
        console.log(file);
      }
      return;
    }
    const semua = await page.evaluate(() => SIM.order);
    const daftar = args.length ? args : semua;
    for (const id of daftar) await rekam(page, id);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
