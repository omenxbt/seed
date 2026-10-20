/* Copies the site's own styling into site/ so every frame is drawn by the product's stylesheets, not a redraw of them:
   index.html's inline <style> (site.css), css/presale.css, css/delta.css, the :root token blocks (tokens.css, a verbatim
   extract), js/bg-dither.js, the three font families from brand/fonts/ and the 21-dot mark from brand/logo/ and index.html.
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
fs.writeFileSync(path.join(out, 'site.css'), `/* verbatim: the inline <style> of index.html */\n${style}`);
for (const f of ['css/presale.css', 'css/delta.css']) fs.copyFileSync(path.join(repo, f), path.join(out, path.basename(f)));
fs.copyFileSync(path.join(repo, 'js/bg-dither.js'), path.join(out, 'bg-dither.js'));

/* the token blocks, exactly as the site writes them */
const roots = [...style.matchAll(/:root\{[\s\S]*?\n\}/g)].map(m => m[0]);
const delta = src('css/delta.css').match(/:root\{[\s\S]*?\n\}/)[0];
fs.writeFileSync(path.join(out, 'tokens.css'), `/* verbatim: the :root blocks of index.html and css/delta.css */\n${roots.join('\n')}\n${delta}\n`);

/* fonts: the site's own files; fonts.css's relative urls keep working beside them */
for (const f of fs.readdirSync(path.join(repo, 'brand/fonts'))) fs.copyFileSync(path.join(repo, 'brand/fonts', f), path.join(out, 'fonts', f));

/* the mark: the kit's SVG for the dot geometry, and the site's own symbols (21, 13, 7 dots) */
fs.copyFileSync(path.join(repo, 'brand/logo/seed-mark-dark.svg'), path.join(out, 'seed-mark-dark.svg'));
const symbols = index.match(/<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="seed7"[\s\S]*?<\/defs><\/svg>/)[0];
fs.writeFileSync(path.join(out, 'mark-symbols.svg.html'), symbols + '\n');

console.log('site/ synced:', fs.readdirSync(out).join(', '));
