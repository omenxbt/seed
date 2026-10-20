/* Copies the site's own pieces the film draws with into site/: the :root token blocks (tokens.css, a verbatim extract of
   index.html's and css/delta.css's), js/bg-dither.js, the three font families from brand/fonts/ (with fonts-extra/), and the 21-dot mark from
   brand/logo/ and index.html. The site's stylesheets themselves come resolved per format from tools/capture-pages.mjs.
   Run it again whenever the site changes; tools/build.mjs runs it first. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = path.resolve(here, '../site');
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
const src = p => fs.readFileSync(path.join(repo, p), 'utf8');

const index = src('index.html');
const style = index.match(/<style>([\s\S]*?)<\/style>/)[1];
fs.copyFileSync(path.join(repo, 'js/bg-dither.js'), path.join(out, 'bg-dither.js'));

/* the token blocks, exactly as the site writes them */
const roots = [...style.matchAll(/:root\{[\s\S]*?\n\}/g)].map(m => m[0]);
const delta = src('css/delta.css').match(/:root\{[\s\S]*?\n\}/)[0];
fs.writeFileSync(path.join(out, 'tokens.css'), `/* verbatim: the :root blocks of index.html and css/delta.css */\n${roots.join('\n')}\n${delta}\n`);

/* fonts: the site's own files; fonts.css's relative urls keep working beside them. fonts-extra/ adds the few glyphs the
   pages use that the latin subsets leave out, cut from the same fonts, so nothing falls back to a system face */
for (const f of fs.readdirSync(path.join(repo, 'brand/fonts'))) fs.copyFileSync(path.join(repo, 'brand/fonts', f), path.join(out, 'fonts', f));
const extra = path.resolve(here, '../fonts-extra');
for (const f of fs.readdirSync(extra)) if (f.endsWith('.woff2')) fs.copyFileSync(path.join(extra, f), path.join(out, 'fonts', f));
fs.appendFileSync(path.join(out, 'fonts', 'fonts.css'), '\n' + fs.readFileSync(path.join(extra, 'fonts-extra.css'), 'utf8'));

/* the mark: the kit's SVG for the dot geometry, and the site's own symbols (21, 13, 7 dots) */
fs.copyFileSync(path.join(repo, 'brand/logo/seed-mark-dark.svg'), path.join(out, 'seed-mark-dark.svg'));
const symbols = index.match(/<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="seed7"[\s\S]*?<\/defs><\/svg>/)[0];
fs.writeFileSync(path.join(out, 'mark-symbols.svg.html'), symbols + '\n');

console.log('site/ synced:', fs.readdirSync(out).join(', '));
