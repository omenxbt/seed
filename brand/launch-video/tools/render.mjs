/* Renders every cut and format to out/: H.264 MP4s, the MOV master for editing (ProRes 422 HQ, from the 16:9 master
   render) and the 16:9 master with no audio stream. Rebuilds first, so the figures and the site's CSS are current.
     node tools/render.mjs                                   all six, delivery quality
     node tools/render.mjs --only master-16x9 --draft        one, fast
     node tools/render.mjs --variables '{"url":"seed.xyz","musicVolume":0.6}'
   Variables reach the picture through HyperFrames (--variables); musicVolume is written into each page's <audio
   data-volume> here, because the mixer reads the authored attribute, not one set by script. Set HF_CLI to a HyperFrames
   launcher to use it in place of the pinned npx. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CUTS, FORMATS } from '../src/story.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
const P = (...a) => path.join(proj, ...a);
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const vars = JSON.parse(arg('--variables') || '{}');
const only = arg('--only') ? arg('--only').split(',') : null;
const draft = process.argv.includes('--draft');
const cli = process.env.HF_CLI ? [process.env.HF_CLI] : ['npx', '--yes', 'hyperframes@0.8.179'];

execFileSync(process.execPath, [P('tools/build.mjs')], { stdio: 'inherit' });
fs.mkdirSync(P('out'), { recursive: true });

const targets = Object.keys(CUTS).flatMap(c => Object.keys(FORMATS).map(f => `${c}-${f}`)).filter(n => !only || only.includes(n));
for (const name of targets) {
  const dir = P('build', name), page = path.join(dir, 'index.html');
  if (vars.musicVolume != null) fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/(<audio id="music"[^>]*data-volume=")[^"]*"/, `$1${+vars.musicVolume}"`));
  const out = P('out', `seed-${name}.mp4`);
  const args = [...cli.slice(1), 'render', dir, '--fps', '30', '--quality', draft ? 'draft' : 'delivery', '-o', out];
  if (Object.keys(vars).length) args.push('--variables', JSON.stringify(vars));
  console.log(`\n▸ ${name}`);
  const r = spawnSync(cli[0], args, { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`render failed: ${name}`); process.exit(1); }
}

/* the master for editing, and a cut with no audio track at all */
const master = P('out', 'seed-master-16x9.mp4');
if (targets.includes('master-16x9') && fs.existsSync(master)) {
  const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
  ff('-i', master, '-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-vendor', 'apl0', '-c:a', 'pcm_s16le', P('out', 'seed-master-16x9.mov'));
  ff('-i', master, '-map', '0:v', '-c', 'copy', P('out', 'seed-master-16x9-noaudio.mp4'));
}

/* check what came out: duration, frame rate, size, streams */
for (const f of fs.readdirSync(P('out')).filter(f => /\.(mp4|mov)$/.test(f))) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', P('out', f)]));
  const v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  console.log(`${f.padEnd(34)} ${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate}fps ${(+j.format.duration).toFixed(2)}s ${(j.format.size / 1048576).toFixed(1)} MB ${a ? 'audio ' + a.codec_name : 'no audio'}`);
}
