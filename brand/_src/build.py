#!/usr/bin/env python3
"""Builds the Seed brand assets: logo SVGs, banner HTML sources, PNG render wrappers and the brandbook page.
Run from brand/: python3 _src/build.py, then _src/render.sh for the PNGs and the PDF.
Everything is derived from the site: the 21-dot mark is index.html's #seed21 symbol, the tokens are index.html's
:root and css/delta.css, the wordmark is Instrument Sans at weight 600 and -3% tracking, converted to paths."""
import os, glob
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---------------------------------------------------------------- tokens (index.html :root and css/delta.css)
T = dict(bg='#16171A', paper='#121316', card='#25272C', raised='#30333A', panel_solid='#1F2125', well='#111215',
         ink='#F3F4F6', ink2='#D3D6DC', muted='#9DA2AC', faint='#868B95',
         navy='#5B8CFF', navy_deep='#A4C0FF', navy_soft='#52668F', solid='#2E63E7', solid_hover='#4377F5',
         ok='#45DB93', ok_ink='#7BE8B2', bad='#FF7268', bad_ink='#FF9B93', caution='#F3BC58', warn='#E8B45C', err='#FF8B9C',
         prog_a='#F2554C', prog_b='#F6C445', prog_c='#34C17B')

# ---------------------------------------------------------------- the mark: #seed21, first circle is the seed
MARK = [(42.00,56.70,6.91),(50.27,36.69,6.74),(59.20,63.42,6.57),(30.17,46.87,6.39),(67.19,38.70,6.22),(42.97,72.93,6.05),
        (37.37,27.67,5.88),(74.59,59.53,5.70),(22.45,61.21,5.53),(61.95,22.72,5.36),(58.61,80.60,5.18),(20.30,33.54,5.01),
        (82.89,42.79,4.84),(28.42,79.61,4.67),(44.30,13.34,4.49),(78.45,74.97,4.32),(9.52,51.85,4.15),(77.95,21.48,3.98),
        (47.15,92.03,3.80),(21.57,17.25,3.63),(92.69,56.09,3.46)]

def dots(dot, seed, bloom=False, glow=False):
    out = []
    if glow:
        cx, cy, r = MARK[0]
        out.append(f'<radialGradient id="sg"><stop offset="0" stop-color="{seed}" stop-opacity=".42"/><stop offset=".45" stop-color="{seed}" stop-opacity=".16"/><stop offset="1" stop-color="{seed}" stop-opacity="0"/></radialGradient>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r*3.2:.2f}" fill="url(#sg)"/>')
    rmax, rmin = MARK[1][2], MARK[-1][2]
    for i, (cx, cy, r) in enumerate(MARK):
        if i == 0:
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{seed}"/>')
        else:
            op = f' opacity="{0.28 + 0.72 * (r - rmin) / (rmax - rmin):.2f}"' if bloom else ''
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot}"{op}/>')
    return ''.join(out)

def svg(w, h, body, vb=None, extra=''):
    vb = vb or f'0 0 {w} {h}'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}" role="img" aria-label="Seed"{extra}>'
            f'{body}</svg>\n')

# ---------------------------------------------------------------- the wordmark as paths
def wordmark(text='Seed', upm_size=100.0, weight=600, tracking=-0.03):
    f = sorted(glob.glob('fonts/*.woff2'), key=os.path.getsize)
    sans = [p for p in f if TTFont(p)['name'].getDebugName(1) == 'Instrument Sans'][-1]
    font = TTFont(sans)
    font = instancer.instantiateVariableFont(font, {'wght': weight})
    gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font['head'].unitsPerEm
    s = upm_size / upm
    x, parts = 0.0, []
    for ch in text:
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        g.draw(TransformPen(pen, (s, 0, 0, -s, x, 0)))   # y flipped: font units go up, SVG goes down
        parts.append(pen.getCommands())
        x += g.width * s + tracking * upm_size
    cap = font['OS/2'].sCapHeight * s
    return ' '.join(parts), x - tracking * upm_size, cap

WM_D, WM_W, WM_CAP = wordmark()   # wordmark path, its width, cap height, all for a 100-unit em

def wordmark_el(x, y, size, fill):
    """the path translated so its baseline sits at y and scaled from the 100-unit em to size"""
    k = size / 100.0
    return f'<path transform="translate({x:.2f} {y:.2f}) scale({k:.4f})" d="{WM_D}" fill="{fill}"/>'

# ---------------------------------------------------------------- logo files
os.makedirs('logo', exist_ok=True)
L = {}
# 1 the mark: for dark backgrounds (ink dots, navy seed), for light (charcoal dots, solid blue seed), and the rail's muted take
L['seed-mark-dark']  = svg(1024, 1024, dots(T['ink'], T['navy']), vb='0 0 100 100')
L['seed-mark-light'] = svg(1024, 1024, dots(T['bg'], T['solid']), vb='0 0 100 100')
L['seed-mark-muted'] = svg(1024, 1024, dots(T['navy_soft'], T['navy']), vb='0 0 100 100')

# 2 horizontal lockup: mark box 1.6 x the wordmark size, 8-unit gap, wordmark 600 at -3% (index.html's .brand)
def lockup_h(dot, seed, ink):
    em = 100.0; box = em * 1.6; gap = em * .4
    w = box + gap + WM_W * (em / 100); h = box
    base = box / 2 + WM_CAP * (em / 100) / 2
    body = f'<g transform="translate(0 0) scale({box/100:.4f})">{dots(dot, seed)}</g>' + wordmark_el(box + gap, base, em, ink)
    return svg(round(w * 4), round(h * 4), body, vb=f'0 0 {w:.2f} {h:.2f}')
L['seed-lockup-dark']  = lockup_h(T['ink'], T['navy'], T['ink'])
L['seed-lockup-light'] = lockup_h(T['bg'], T['solid'], T['bg'])

# 3 stacked lockup: the mark above the wordmark, centred
def lockup_v(dot, seed, ink):
    em = 100.0; box = em * 1.9; gap = em * .34
    w = max(box, WM_W); h = box + gap + WM_CAP + em * .22
    mx = (w - box) / 2; wx = (w - WM_W) / 2; base = box + gap + WM_CAP
    body = f'<g transform="translate({mx:.2f} 0) scale({box/100:.4f})">{dots(dot, seed)}</g>' + wordmark_el(wx, base, em, ink)
    return svg(round(w * 4), round(h * 4), body, vb=f'0 0 {w:.2f} {h:.2f}')
L['seed-stacked-dark']  = lockup_v(T['ink'], T['navy'], T['ink'])
L['seed-stacked-light'] = lockup_v(T['bg'], T['solid'], T['bg'])

# 4 one colour: every dot the same, for embroidery, engraving, favicons in a system tray, partner logo walls
for name, c in (('white', '#FFFFFF'), ('black', '#0B0C0E'), ('blue', T['solid'])):
    L[f'seed-mono-{name}'] = svg(1024, 1024, dots(c, c), vb='0 0 100 100')
    L[f'seed-mono-lockup-{name}'] = lockup_h(c, c, c)

# 5 the bloom: the dots fade with their size, the seed glows; the quiet surface version, not a replacement for the mark
L['seed-bloom-dark']  = svg(1024, 1024, dots(T['navy_deep'], T['navy'], bloom=True, glow=True), vb='0 0 100 100')
L['seed-bloom-light'] = svg(1024, 1024, dots(T['navy_soft'], T['solid'], bloom=True, glow=True), vb='0 0 100 100')

# app icon: a rounded square, charcoal with a lit top edge, the mark at 62%; and a blue gradient tile
def icon(bg_body, dot, seed):
    body = ('<defs><linearGradient id="lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/>'
            '<stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{T["navy"]}"/><stop offset="1" stop-color="{T["solid"]}"/></linearGradient></defs>'
            + bg_body + '<rect width="512" height="512" rx="116" fill="url(#lit)"/>'
            f'<g transform="translate(97 97) scale(3.18)">{dots(dot, seed)}</g>')
    return svg(512, 512, body)
L['seed-icon-charcoal'] = icon(f'<rect width="512" height="512" rx="116" fill="{T["bg"]}"/><rect x=".5" y=".5" width="511" height="511" rx="115.5" fill="none" stroke="#fff" stroke-opacity=".1"/>', T['ink'], T['navy'])
L['seed-icon-blue']     = icon('<rect width="512" height="512" rx="116" fill="url(#blue)"/>', '#FFFFFF', '#FFFFFF')
L['seed-icon-light']    = icon(f'<rect width="512" height="512" rx="116" fill="{T["ink"]}"/>', T['bg'], T['solid'])

for k, v in L.items():
    open(f'logo/{k}.svg', 'w').write(v)

# ---------------------------------------------------------------- PNG wrappers for the logos (rendered by Chrome at 1024 or 512)
os.makedirs('_src/wrap', exist_ok=True)
def wrap_logo(name, bg, size=1024, pad=.16):
    s = int(size * (1 - 2 * pad))
    return (f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;width:{size}px;height:{size}px;background:{bg};overflow:hidden}}'
            f'body{{display:grid;place-items:center}}img{{width:{s}px;height:{s}px;object-fit:contain}}</style>'
            f'<img src="../../logo/{name}.svg">')
LOGO_PNGS = []
for k in L:
    light = k.endswith('-light') or k.endswith('-black') or k == 'seed-icon-light'
    bg = T['ink'] if light else T['bg']
    if k.startswith('seed-icon'):
        open(f'_src/wrap/{k}.html', 'w').write(wrap_logo(k, 'transparent' if False else ('#FFFFFF' if light else T['bg']), 512, 0))
        LOGO_PNGS.append((k, 512))
    else:
        open(f'_src/wrap/{k}.html', 'w').write(wrap_logo(k, bg))
        LOGO_PNGS.append((k, 1024))

# ---------------------------------------------------------------- banners, 1500 x 500
os.makedirs('banner', exist_ok=True)
BASE_CSS = f"""
@import url("../fonts/fonts.css");
:root{{--bg:{T['bg']};--paper:{T['paper']};--card:{T['card']};--raised:{T['raised']};--well:{T['well']};--panel:rgba(31,33,37,.55);--panel-line:rgba(255,255,255,.1);
--ink:{T['ink']};--ink-2:{T['ink2']};--muted:{T['muted']};--faint:{T['faint']};--navy:{T['navy']};--navy-deep:{T['navy_deep']};--navy-soft:{T['navy_soft']};--solid:{T['solid']};
--ok:{T['ok']};--ok-ink:{T['ok_ink']};--bad:{T['bad']};--bad-ink:{T['bad_ink']};--chip:rgba(255,255,255,.06);--hair:rgba(255,255,255,.08);--hair-2:rgba(255,255,255,.17);
--grad-btn:linear-gradient(180deg,#5B8CFF 0%,#2E63E7 100%);--grad-seg:linear-gradient(180deg,rgba(91,140,255,.34),rgba(46,99,231,.2));--seg-line:rgba(91,140,255,.42);
--glow:0 0 0 1px rgba(91,140,255,.32),0 10px 28px -10px rgba(46,99,231,.8);--glow-sm:0 0 14px -4px rgba(46,99,231,.7);--lit:inset 0 1px 0 rgba(255,255,255,.14);
--hatch:repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 1px,transparent 1px 9px);--progress:linear-gradient(90deg,#F2554C,#F6C445 50%,#34C17B);
--sans:'Instrument Sans',system-ui,sans-serif;--serif:'Instrument Serif',Georgia,serif;--mono:'JetBrains Mono',ui-monospace,Menlo,monospace}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1500px;height:500px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15.5px;line-height:1.55;letter-spacing:-.011em;-webkit-font-smoothing:antialiased}}
.b{{position:relative;width:1500px;height:500px;overflow:hidden}}
.num{{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.03em}}
.field{{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.075) 1.1px,transparent 1.2px);background-size:14px 14px}}
.hatch{{position:absolute;inset:0;background:var(--hatch)}}
.glow{{position:absolute;border-radius:50%;filter:blur(90px);background:rgba(46,99,231,.42)}}
.mark{{display:block}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;font-weight:500;white-space:nowrap}}
.btn-ink{{background:var(--grad-btn);color:#fff;box-shadow:var(--lit),var(--glow)}}
.btn-ghost{{background:var(--chip);border:1px solid var(--hair-2);color:var(--ink)}}
.wm{{font-weight:600;letter-spacing:-.03em;color:var(--ink)}}
h1{{font-weight:500;letter-spacing:-.045em;line-height:1.02}}
h1 i{{font-family:var(--serif);font-weight:400;font-style:italic;letter-spacing:-.02em;font-size:1.1em}}
.lockup{{display:flex;align-items:center;gap:12px}}
.lockup .mark{{width:48px;height:48px}}
.lockup .wm{{font-size:30px}}
.statchip{{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:10px;background:var(--chip);border:1px solid var(--hair);font-size:14px;color:var(--ink-2);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}}
.statchip b{{font-weight:500;font-family:var(--mono);letter-spacing:-.03em;color:var(--ink)}}.statchip em{{font-style:normal;color:var(--muted)}}
.rank{{display:inline-grid;place-items:center;min-width:34px;height:26px;padding:0 9px;border-radius:7px;font-family:var(--mono);font-size:13.5px;color:#fff;background:var(--grad-seg);border:1px solid var(--seg-line);box-shadow:var(--lit)}}
.strip{{position:relative;display:inline-block;width:200px;height:22px;border-radius:2px;background:repeating-linear-gradient(90deg,var(--hair-2) 0 2px,transparent 2px 5px);overflow:hidden}}
.strip i{{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(90deg,var(--navy-deep) 0 2px,transparent 2px 5px)}}
.strip.ok i{{background:repeating-linear-gradient(90deg,var(--ok) 0 2px,transparent 2px 5px)}}
.bar{{position:relative;height:3px;border-radius:2px;background:var(--hair-2);overflow:hidden}}.bar i{{position:absolute;left:0;top:0;bottom:0;background:var(--progress)}}
.panel{{background:var(--panel);border:1px solid var(--panel-line);border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.045);backdrop-filter:blur(26px) saturate(130%)}}
.tag{{display:inline-flex;align-items:center;font-size:12px;font-weight:500;border-radius:999px;padding:3px 9px;border:1px solid var(--hair-2);color:var(--muted);background:var(--chip)}}
.tag.ok{{color:var(--ok-ink);border-color:rgba(69,219,147,.3);background:rgba(69,219,147,.14)}}
.tag.live{{color:var(--navy-deep);border-color:var(--seg-line);background:var(--grad-seg)}}
"""

def mark_inline(cls, dot, seed, bloom=False, glow=False, style=''):
    return f'<svg class="{cls}" viewBox="0 0 100 100" style="{style}">{dots(dot, seed, bloom, glow)}</svg>'

def banner(name, body, css=''):
    html = f'<!doctype html><html><head><meta charset="utf-8"><title>Seed banner {name}</title><style>{BASE_CSS}{css}</style></head><body><div class="b">{body}</div></body></html>\n'
    open(f'banner/{name}.html', 'w').write(html)

MARK_DARK = mark_inline('mark', T['ink'], T['navy'])
MARK_MUTED = mark_inline('mark', T['navy_soft'], T['navy'])
HERO_P = 'A raise sells its token at a price set by its target. Fill it and the whole raise opens a Meteora pool, locked for good. Miss it and every wallet is refunded, fee included.'

# 01 minimal: the mark alone, large, right of centre, over a faint dot field thinned around it; a small lockup top right
banner('banner-01-minimal',
  f'<div class="field" style="-webkit-mask-image:radial-gradient(60% 90% at 62% 50%,transparent 20%,#000 75%);mask-image:radial-gradient(60% 90% at 62% 50%,transparent 20%,#000 75%)"></div>'
  f'<div class="glow" style="width:520px;height:520px;left:690px;top:-10px;opacity:.55"></div>'
  f'{mark_inline("mark", T["ink"], T["navy"], style="position:absolute;left:600px;top:40px;width:420px;height:420px")}'
  f'<div class="lockup" style="position:absolute;right:56px;top:40px">{MARK_MUTED}<span class="wm">Seed</span></div>')

# 02 tagline-led: the hero's line and paragraph, the two buttons, the mark cut by the right edge
banner('banner-02-tagline',
  f'<div class="field" style="-webkit-mask-image:linear-gradient(90deg,transparent 35%,#000 80%);mask-image:linear-gradient(90deg,transparent 35%,#000 80%)"></div>'
  f'<div class="glow" style="width:700px;height:700px;right:-220px;top:-120px;opacity:.5"></div>'
  f'{mark_inline("mark", "rgba(255,255,255,.14)", T["navy"], style="position:absolute;right:-70px;top:-10px;width:560px;height:560px;filter:drop-shadow(0 0 40px rgba(46,99,231,.35))")}'
  f'<div style="position:absolute;left:96px;top:56px;width:860px">'
  f'<div class="lockup" style="margin-bottom:34px">{MARK_MUTED}<span class="wm">Seed</span></div>'
  f'<h1 style="font-size:62px;max-width:12em"><i>Back the idea,</i> at one fixed price.</h1>'
  f'</div>'
  f'<p style="position:absolute;left:500px;bottom:56px;width:470px;color:var(--muted);font-size:18.5px;line-height:1.45">{HERO_P}</p>'
  f'<div style="position:absolute;right:72px;bottom:52px;display:flex;gap:12px"><span class="btn btn-ink" style="height:50px;padding:0 26px;font-size:17px">Start a raise</span><span class="btn btn-ghost" style="height:50px;padding:0 26px;font-size:17px">How it works</span></div>')

# 03 terminal: the top bar's chips and three table rows, as on the Terminal, with the lockup on the left
def row(n, tk, nm, mc, chg, up, raised, target, pct, backers, when, strip_ok, act, act_hot=False):
    state = '<span class="tag ok">Seeded</span>' if strip_ok else '<span class="tag live">Live</span>'
    chg_c = 'var(--ok-ink)' if up else 'var(--bad-ink)'; car = '⌃' if up else '⌄'
    a = f'<span class="btn btn-ink" style="height:34px;padding:0 16px;font-size:13px">{act}</span>' if act_hot else f'<span class="btn btn-ghost" style="height:34px;padding:0 16px;font-size:13px">{act}</span>'
    return (f'<div class="trow"><span class="rank num">{n}</span>'
            f'<span class="av">{mark_inline("", T["navy_deep"], T["navy"])}</span>'
            f'<span class="nm"><b>${tk}</b> <small>{nm}</small><span class="tags">{state}<span class="tag ok">All checks pass</span></span></span>'
            f'<span class="num c">{mc}</span><span class="num c" style="color:{chg_c}">{car} {chg}</span>'
            f'<span class="c"><span class="num" style="font-size:15px">{raised} <em style="color:var(--muted);font-style:normal;font-size:12.5px">/ {target} SOL</em></span><span class="bar" style="width:120px;margin-top:6px"><i style="width:{pct}%"></i></span></span>'
            f'<span class="num c" style="color:var(--muted)">{when}</span>'
            f'<span class="strip{" ok" if strip_ok else ""}"><i style="width:{pct}%"></i></span>{a}</div>')
banner('banner-03-terminal',
  f'<div class="hatch" style="width:14px;left:0"></div><div class="hatch" style="width:14px;right:0;left:auto"></div>'
  f'<div class="field" style="opacity:.6;-webkit-mask-image:linear-gradient(180deg,#000,transparent 70%);mask-image:linear-gradient(180deg,#000,transparent 70%)"></div>'
  f'<div class="lockup" style="position:absolute;left:72px;top:48px">{MARK_MUTED}<span class="wm">Seed</span></div>'
  f'<h1 style="position:absolute;left:72px;top:124px;width:330px;font-size:34px"><i>Back the idea,</i> at one fixed price.</h1>'
  f'<div style="position:absolute;left:440px;top:50px;display:flex;align-items:center;gap:10px">'
  f'<span class="statchip"><b>3</b><em>live</em></span><span class="statchip"><b>$412.8K</b><em>raised</em></span><span class="statchip"><b>$103.8</b><em>SOL</em></span></div>'
  f'<div class="panel" style="position:absolute;left:440px;right:72px;top:110px;bottom:40px;padding:4px 18px;display:flex;flex-direction:column;justify-content:space-around">'
  + row(1, 'OSPR', 'Osprey', '$20.76K', '+19%', True, '64.13', '85.00', 75, 261, '1d 02:56', False, 'Back it', True)
  + row(2, 'HALF', 'Halfmoon', '$62.27K', '+9.7%', True, '300.00', '300.00', 100, 176, 'Seeded', True, 'Trade')
  + row(3, 'CBLT', 'Cobalt', '$57.08K', '-2%', False, '220.00', '220.00', 100, 302, 'Seeded', True, 'Trade')
  + '</div>',
  css='.trow{display:grid;grid-template-columns:40px 36px 190px 84px 76px 136px 76px 104px 1fr;align-items:center;gap:12px;height:108px;border-top:1px solid var(--hair)}.strip{width:104px}'
      '.trow:first-child{border-top:0}.av svg{width:40px;height:40px;background:var(--card);border-radius:50%;padding:6px}'
      '.nm{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px}.nm b{font-weight:500;font-size:16px}.nm small{color:var(--muted);font-size:13px}.nm .tags{flex-basis:100%;display:flex;gap:6px;margin-top:5px}'
      '.c{font-size:15px}.trow .btn{justify-self:end}')

# 04 the dot field: an atmospheric gradient of dots, a blue bloom, the stacked lockup off centre to the right
banner('banner-04-dotfield',
  f'<div class="field" style="background-size:12px 12px;-webkit-mask-image:radial-gradient(70% 120% at 72% 55%,#000 10%,rgba(0,0,0,.25) 50%,transparent 85%);mask-image:radial-gradient(70% 120% at 72% 55%,#000 10%,rgba(0,0,0,.25) 50%,transparent 85%)"></div>'
  f'<div class="field" style="background-image:radial-gradient(rgba(91,140,255,.55) 1.2px,transparent 1.3px);background-size:12px 12px;-webkit-mask-image:radial-gradient(28% 60% at 72% 55%,#000 0,rgba(0,0,0,.4) 45%,transparent 75%);mask-image:radial-gradient(28% 60% at 72% 55%,#000 0,rgba(0,0,0,.4) 45%,transparent 75%)"></div>'
  f'<div class="glow" style="width:620px;height:620px;left:770px;top:-70px;opacity:.6"></div>'
  f'<div style="position:absolute;left:1080px;top:0;height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">'
  f'{mark_inline("mark", T["ink"], T["navy"], bloom=True, glow=True, style="width:230px;height:230px")}<span class="wm" style="font-size:54px;line-height:1">Seed</span></div>'
  f'<p style="position:absolute;left:96px;top:64px;color:var(--muted);font-size:19px;max-width:38ch;line-height:1.45">A launchpad for raises on Solana. One fixed price, a pool locked for good, or everyone refunded.</p>')

# 05 split: a hatched left panel carrying the mark, a plain right half with the line and the lockup
banner('banner-05-split',
  f'<div style="position:absolute;left:0;top:0;bottom:0;width:560px;background:var(--paper);border-right:1px solid var(--hair-2)"><div class="hatch" style="opacity:1"></div>'
  f'{mark_inline("mark", T["ink"], T["navy"], style="position:absolute;left:160px;top:50px;width:240px;height:240px")}</div>'
  f'<div class="field" style="left:560px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 70%);mask-image:linear-gradient(90deg,transparent,#000 70%);opacity:.7"></div>'
  f'<div style="position:absolute;left:640px;top:0;height:500px;display:flex;flex-direction:column;justify-content:center;gap:28px;width:800px">'
  f'<div class="lockup">{MARK_MUTED}<span class="wm">Seed</span></div>'
  f'<h1 style="font-size:58px"><i>Back the idea,</i><br>at one fixed price.</h1>'
  f'<div style="display:flex;align-items:center;gap:14px"><span class="btn btn-ink" style="height:46px;padding:0 24px;font-size:16px">Start a raise</span><span style="color:var(--muted);font-size:17px">Raises on Solana, paired with SOL or USDC.</span></div></div>')

BANNERS = ['banner-01-minimal', 'banner-02-tagline', 'banner-03-terminal', 'banner-04-dotfield', 'banner-05-split']

# ---------------------------------------------------------------- the brandbook
exec(open('_src/brandbook.py').read())
print('wrote', len(L), 'logo svgs,', len(BANNERS), 'banner sources')
open('_src/manifest.txt', 'w').write('\n'.join(f'{k} {s}' for k, s in LOGO_PNGS) + '\n')
