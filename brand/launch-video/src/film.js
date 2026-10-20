/* The film's motion. One paused GSAP timeline, registered for HyperFrames, built from the #story data the page carries
   (src/story.mjs). Everything moves on the brand's one curve, cubic-bezier(.22,1,.36,1), at the site's lengths: .18s for
   colour, .28s for anything that moves, entrances rising 10px in .5s (60ms a column, 45ms a card), titles sharpening in
   .6s, a press scaling to .97 in 80ms, the fill bar taking .6s, the odometer .55s a digit, the sheen coming round every
   3.2s, the chart line drawing in 1.7s with the area at 1.1s and the tip at 1.8s. A frosted panel only rises, never
   fades, as on the site (index.html: "a frosted card must blur its backdrop from the first frame"), so scenes of panels
   begin and end on a cut. State the site drives from its own clocks (odometer strips, bar widths, the sheen, the dot
   field) is computed here from the timeline's time alone, so any frame can be drawn first and repeats exactly. */
(function () {
  'use strict';
  var root = document.getElementById('root');
  var S = JSON.parse(document.getElementById('story').textContent);
  var decl = JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]');
  var V = {};
  decl.forEach(function (d) { V[d.id] = d.default; });
  try { Object.assign(V, window.__hyperframes && window.__hyperframes.getVariables ? window.__hyperframes.getVariables() : {}); } catch (e) {}

  /* ------------------------------------------------------------ the curve */
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    function dx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    return function (p) {
      if (p <= 0) return 0; if (p >= 1) return 1;
      var t = p, i, e, d;
      for (i = 0; i < 8; i++) { e = sx(t) - p; if (Math.abs(e) < 1e-7) return sy(t); d = dx(t); if (Math.abs(d) < 1e-7) break; t -= e / d; }
      var lo = 0, hi = 1; t = p;
      for (i = 0; i < 40; i++) { e = sx(t); if (Math.abs(e - p) < 1e-7) break; if (e < p) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  var E = bezier(0.22, 1, 0.36, 1);
  var FAST = 0.18, DUR = 0.28;          // --fast: colour; --dur: anything that moves, and every fade
  var tl = gsap.timeline({ paused: true });
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };
  var css = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

  /* ------------------------------------------------------------ timeline helpers (fromTo, so a jump to any time is exact) */
  // an entrance: 10px up in .5s; with fade (text only) it also comes up from transparent, a frosted panel never does
  function rise(el, t, o) { o = o || {}; if (!el || (el.length === 0)) return; var from = { y: 10 }, to = { y: 0, duration: 0.5, ease: E, stagger: o.stagger || 0, immediateRender: o.ir !== false }; if (o.fade) { from.opacity = 0; to.opacity = 1; } tl.fromTo(el, from, to, t); }
  function sharpen(el, t) { tl.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, t); }
  function fadeOut(el, t, d) { if (!el) return; tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: d || DUR, ease: E, immediateRender: false }, t); }
  function press(el, t) {
    tl.fromTo(el, { scale: 1 }, { scale: 0.97, duration: 0.08, ease: E, immediateRender: false }, t);
    tl.fromTo(el, { scale: 0.97 }, { scale: 1, duration: DUR, ease: E, immediateRender: false }, t + 0.08);
  }

  /* ------------------------------------------------------------ state from time */
  var drivers = [];
  function last(events, t) { var k = -1; for (var i = 0; i < events.length; i++) if (events[i][0] <= t + 1e-6) k = i; return k; }
  var digits = function (s) { return s.replace(/[^\d]/g, '').split('').map(Number); };
  var shapeOf = function (s) { return s.replace(/\d/g, '0'); };
  /* the site's odometer (index.html roll()): each digit a strip that slides to the new value in .55s; a change of layout
     (another digit, other text) redraws without the slide. events: [[t, text], ...], the first is the opening text */
  function odo(el, events) {
    var shape = null, strips = [];
    function draw(text) {
      el.innerHTML = text.split('').map(function (c) { return /\d/.test(c) ? '<span class="rd"><span class="rd-s">' + '0123456789'.split('').map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</span></span>' : '<span class="rs">' + (c === ' ' ? '&nbsp;' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;')) + '</span>'; }).join('');
      strips = $$('.rd-s', el); shape = shapeOf(text); el.dataset.roll = text;
    }
    drivers.push(function (t) {
      var k = Math.max(0, last(events, t)), text = events[k][1];
      if (shapeOf(text) !== shape) draw(text);
      var prev = k > 0 ? events[k - 1][1] : null, slide = prev !== null && shapeOf(prev) === shapeOf(text) ? Math.min(1, Math.max(0, (t - events[k][0]) / 0.55)) : 1;
      var dn = digits(text), dp = prev !== null && slide < 1 ? digits(prev) : dn;
      strips.forEach(function (s, i) {
        var p = slide >= 1 ? dn[i] : dp[i] + (dn[i] - dp[i]) * E(slide), shown = Math.round(p);
        s.style.transform = 'translateY(-' + p.toFixed(4) + 'em)';
        // the strip's other nine digits sit clipped out of sight: set dressing to HyperFrames' layout and contrast audits
        for (var j = 0; j < s.children.length; j++) { if (j === shown) s.children[j].removeAttribute('data-layout-ignore'); else s.children[j].setAttribute('data-layout-ignore', ''); }
      });
    });
  }
  function text(el, events) { var cur = null; drivers.push(function (t) { var v = events[Math.max(0, last(events, t))][1]; if (v !== cur) { el.textContent = v; cur = v; } }); }
  function attr(el, name, events) { var cur; drivers.push(function (t) { var v = events[Math.max(0, last(events, t))][1]; if (v !== cur) { if (v === null) el.removeAttribute(name); else el.setAttribute(name, v); cur = v; } }); }
  // a cut: shown inside [a, b), hidden outside
  function shown(el, a, b) { var cur; drivers.push(function (t) { var v = t >= a - 1e-6 && (b == null || t < b - 1e-6) ? '' : 'hidden'; if (v !== cur) { el.style.visibility = v; cur = v; } }); }
  /* the fill bar's width, with the site's .6s transition between values */
  function bar(el, events) {
    drivers.push(function (t) {
      var k = Math.max(0, last(events, t)), to = events[k][1], from = k > 0 ? events[k - 1][1] : to, p = k > 0 ? Math.min(1, Math.max(0, (t - events[k][0]) / 0.6)) : 1;
      el.style.width = (from + (to - from) * E(p)).toFixed(3) + '%';
    });
  }
  /* the slow sheen on a live bar: still for 55% of each 3.2s, then across */
  function sheen(el, t0) {
    drivers.push(function (t) { var ph = (((t - t0) % 3.2) + 3.2) % 3.2 / 3.2, x = ph < 0.55 ? -100 : -100 + 200 * E((ph - 0.55) / 0.45); el.style.setProperty('--sheen', x.toFixed(2) + '%'); });
  }
  /* the dot field, js/bg-dither.js in its fixed-seed mode: the field at second 370 + t */
  drivers.push(function (t) { if (window.BG_DITHER) window.BG_DITHER.seek(370 + t); });

  /* ------------------------------------------------------------ figures */
  var target = +V.raiseTarget, backersEnd = Math.round(+V.raiseBackers), solUsd = +V.solUsd, feePct = parseFloat(V.fee) || 0;
  var sol = function (n) { return n.toFixed(2); };
  var amt = function (n) { return String(Number(n.toFixed(2))); };   // fmtAmt: up to two decimals, no trailing zeros
  var pctTxt = function (n) { return Math.floor(n / target * 100 + 1e-7) + '%'; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var left = function (s) { var d = Math.floor(s / 86400), r = (pad(Math.floor(s % 86400 / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60)); return d ? d + 'd ' + r : r; };
  var secs = function (txt) { var m = txt.match(/(?:(\d+)d )?(\d+):(\d+):(\d+)/); return (+(m[1] || 0)) * 86400 + (+m[2]) * 3600 + (+m[3]) * 60 + (+m[4]); };
  var trim2 = function (v) { return String(Number(v.toFixed(2))); };
  var fmtUsd = function (n) { var a = Math.abs(n); return '$' + (a >= 1e9 ? trim2(n / 1e9) + 'B' : a >= 1e6 ? trim2(n / 1e6) + 'M' : a >= 1e4 ? trim2(n / 1e3) + 'K' : n.toLocaleString('en-US', { maximumFractionDigits: 2 })); };
  $$('[data-tk]').forEach(function (e) { e.textContent = '$' + V.raiseTicker; });
  $$('[data-of]').forEach(function (e) { e.textContent = '/ ' + sol(target) + ' SOL'; });
  $$('[data-backers-n]').forEach(function (e) { e.textContent = String(backersEnd); });
  $$('[data-refund]').forEach(function (e) { e.textContent = amt(+V.backerBuy * (1 + feePct / 100)); });   // the buy and its fee, as the site's toast says
  $$('[data-chart] svg text').forEach(function (e) { if (/^Target /.test(e.textContent)) e.textContent = 'Target ' + target; });
  var music = document.getElementById('music');
  if (music && V.musicVolume != null) music.setAttribute('data-volume', String(V.musicVolume));

  /* ------------------------------------------------------------ the raise card: filling, or running out and refunded */
  function chipUp(el, t) {   // the site's chipUp: 2.4s, in at 15%, drifting to 75%, gone at 100%
    tl.fromTo(el, { opacity: 0, y: 14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.36, ease: E }, t);
    tl.fromTo(el, { y: 0 }, { y: -6, duration: 1.44, ease: E, immediateRender: false }, t + 0.36);
    tl.fromTo(el, { opacity: 1, y: -6 }, { opacity: 0, y: -16, duration: 0.6, ease: E, immediateRender: false }, t + 1.8);
  }
  function card(c, cfg, mode) {
    var q = function (s) { return $(s, c); };
    shown(c, cfg.in);
    rise(q('.rc-id'), cfg.in);
    rise(q('.pp-fill'), cfg.in + 0.06);
    var st = q('[data-st]'), title = q('[data-title]'), chip = q('[data-chip]'), ro = q('[data-readout]'), bi = q('[data-bar]'), time = q('[data-odo="time"]');
    sheen(bi, cfg.in);
    if (mode === 'fill') {
      var buys = cfg.buys, prevRaised = 0, chips = $$('[data-buy]', c);
      var raised = [[-1, sol(0)]], bars = [[-1, 0]], backers = [[-1, '0 backers']];
      // the raise runs on a faster clock than the film: each buy lands hours later, and it fills where the chart says it did
      var s0 = secs(cfg.from), sFill = Math.round(7 * 86400 * (1 - S.chart.fillFrac)), tick = [[-1, left(s0)]];
      buys.forEach(function (b, i) {
        var r = +(target * b.frac).toFixed(2);
        raised.push([b.t, sol(r)]); bars.push([b.t, Math.min(100, r / target * 100)]); backers.push([b.t, Math.round(backersEnd * b.backers) + ' backers']);
        tick.push([b.t, left(Math.round(s0 - (s0 - sFill) * (i + 1) / buys.length) - (i * 37) % 60)]);
        if (chips[i] && (cfg.chips || []).indexOf(i) >= 0) { chips[i].textContent = '+' + sol(r - prevRaised) + ' SOL'; chipUp(chips[i], b.t); }
        prevRaised = r;
      });
      odo(q('[data-odo="raised"]'), raised);
      odo(q('[data-odo="pct"]'), raised.map(function (e) { return [e[0], pctTxt(+e[1])]; }));
      bar(bi, bars);
      odo(q('[data-odo="backers"]'), backers);
      odo(time, tick);
      attr(time, 'class', [[-1, 'num'], [cfg.filled, 'num gone']]);
      text(q('[data-lt]'), [[-1, 'Ends in '], [cfg.filled, 'Filled now']]);   // the site's "Filled 40m ago", a minute in
      text(title, [[-1, 'The raise'], [cfg.filled, 'Filled, seeding']]);
      text(chip, [[-1, 'On pace'], [cfg.filled, '1 of ' + V.seedingSteps + ' steps']]);
      text(st, [[-1, 'Live'], [cfg.filled, 'Filled, seeding']]);
      attr(st, 'class', [[-1, 'st-pill live'], [cfg.filled, 'st-pill filled']]);
    } else {
      // the site's refunded fill card keeps the final raise: what came in, against the target
      var start = +(target * cfg.frac).toFixed(2);
      odo(q('[data-odo="raised"]'), [[-1, sol(start)]]);
      odo(q('[data-odo="pct"]'), [[-1, pctTxt(start)]]);
      bar(bi, [[-1, start / target * 100]]);
      odo(q('[data-odo="backers"]'), [[-1, backersEnd + ' backers']]);
      odo(time, cfg.ticks.map(function (t, i) { return [i ? t : -1, left(cfg.ticks.length - 1 - i)]; }));
      attr(time, 'class', [[-1, 'num'], [cfg.refund, 'num gone']]);
      text(q('[data-lt]'), [[-1, 'Ends in '], [cfg.refund, 'Deadline passed Oct 24, 3:36 PM']]);
      text(title, [[-1, 'The raise'], [cfg.refund, 'Missed target, refunded']]);
      text(chip, [[-1, 'Behind']]);
      attr(chip, 'class', [[-1, 'pace-chip behind'], [cfg.refund, 'pace-chip behind gone']]);
      text(st, [[-1, 'Live'], [cfg.refund, 'Refunded']]);
      attr(st, 'class', [[-1, 'st-pill live'], [cfg.refund, 'st-pill refunded']]);
      attr(ro, 'class', [[-1, 'readout live'], [cfg.refund, 'readout refunded']]);
      attr(c, 'class', [[-1, 'pp live rc'], [cfg.refund, 'pp refunded rc']]);
      // the refund figure: the identity card's "Refunds claimed", rolling up as every wallet takes back what it paid
      var claims = q('[data-odo="claims"]'), row = claims.closest('.pp-stats');
      attr(row, 'class', [[-1, 'pp-stats gone'], [cfg.refund, 'pp-stats']]);   // out of the layout until the page is the refunded one
      odo(claims, [[-1, '0']].concat(cfg.claims.map(function (k) { return [k[0], String(Math.round(backersEnd * k[1]))]; })));
    }
  }

  /* ------------------------------------------------------------ scenes */
  var B = {
    sting: function (s, sec) {
      var svg = $('.sting-mark', sec), cs = $$('circle', svg), seed = cs[0], cx0 = +seed.getAttribute('cx'), cy0 = +seed.getAttribute('cy');
      cs.forEach(function (c) {
        var n = +c.dataset.n;
        if (!n) return;
        var x = +c.getAttribute('cx'), y = +c.getAttribute('cy'), t = s.start + 0.2 + (20 - n) * 0.04;   // the rim first, 40ms apart
        tl.fromTo(c, { opacity: 0, x: (x - cx0) * 0.55, y: (y - cy0) * 0.55, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.5, ease: E }, t);
      });
      // the seed lands last, then brightens from the brand blue to the lit one
      tl.fromTo(seed, { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: E }, s.start + 1.0);
      tl.fromTo(seed, { fill: css('--solid') }, { fill: css('--navy'), duration: FAST, ease: E, immediateRender: false }, s.hit);
      tl.fromTo($('.word', sec), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: E }, s.start + 1.6);
      fadeOut($('.sc', sec), s.out);
    },
    title: function (s, sec) { sharpen($('.l1', sec), s.start + 0.05); sharpen($('.l2', sec), s.start + 0.22); fadeOut($('.sc', sec), s.out); },
    trust: function (s, sec) {
      rise($$('.ka .w', sec), s.a, { stagger: 0.045, fade: true });
      tl.fromTo($('.ka', sec), { color: css('--ink') }, { color: css('--muted'), duration: FAST, ease: E, immediateRender: false }, s.b - 0.1);
      rise($$('.kb .w', sec), s.b, { stagger: 0.045, fade: true });
      fadeOut($('.sc', sec), s.out);
    },
    raise: function (s, sec) {
      var L = s.launch, lc = $('.launch-col', sec), form = $('[data-launch]', sec);
      rise(form, L.in);
      // the founder types the target, one digit at a time; the hint then shows it in dollars, as the site's does
      var input = $('[data-id="fTarget"]', sec), typed = String(target), ev = [[-1, '']], hint = $('[data-hint]', sec);
      typed.split('').forEach(function (ch, i) { ev.push([L.type[0][0] + i * 0.25, typed.slice(0, i + 1)]); });
      drivers.push(function (t) { var v = ev[Math.max(0, last(ev, t))][1]; if (input.value !== v) input.value = v; });
      text(hint, [[-1, hint.textContent], [ev[ev.length - 1][0], fmtUsd(target * solUsd) + ' at $' + Number(solUsd.toPrecision(4)) + ' per SOL']]);
      // and picks the deadline: press, then the chosen segment slides across in --dur
      var seg = $('[data-id="timeSeg"]', sec), btns = $$('button', seg), ind = $('.seg-ind', seg), pick = btns[L.choose], was = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
      press(pick, L.press);
      attr(was, 'aria-pressed', [[-1, 'true'], [L.press + 0.08, 'false']]);
      attr(pick, 'aria-pressed', [[-1, 'false'], [L.press + 0.08, 'true']]);
      tl.fromTo(ind, { x: was.offsetLeft, width: was.offsetWidth }, { x: pick.offsetLeft, width: pick.offsetWidth, duration: DUR, ease: E }, L.press + 0.08);
      $$('.seg', sec).forEach(function (sg) { if (sg === seg) return; var on = $('button[aria-pressed="true"]', sg), i2 = $('.seg-ind', sg); gsap.set(i2, { x: on.offsetLeft, width: on.offsetWidth }); });
      press($('[data-id="openBtn"]', sec), L.open);
      shown(lc, -1, L.out);                       // the form opens the raise: a cut to the raise page's cards
      card($('[data-card]', sec), s.card, 'fill');
    },
    fill: function (s, sec) { card($('[data-card]', sec), s.card, 'fill'); },
    seeded: function (s, sec) {
      var col = $('.seed-col', sec), b = $('.seeded-b', sec), lis = $$('.seed-steps li', sec), crank = $('[data-crank]', sec);
      // the filled page's seeding card; each press runs the next step (seed_step: filled, minted, pooled, then seeded)
      rise($('[data-seeding]', col), s.in);
      shown(col, s.in, s.seeded);
      var state = [['now', '', '', ''], ['done', 'now', '', ''], ['done', 'done', 'now', '']];
      lis.forEach(function (li, i) { attr(li, 'class', state.map(function (row, k) { return [k ? s.presses[k - 1] + 0.08 : -1, row[i] || null]; })); });
      s.presses.forEach(function (t) { press(crank, t); });
      // the last step lands and the page is the seeded page: its status, and its chart drawing itself as the page opens
      var R = s.seeded, ch = $('.chart-col', b);
      shown(b, R);
      rise($('.rc-id', b), R);
      rise($('.pp-chart', ch), R + 0.06);
      var ln = $('.ln', ch), ar = $('.ar', ch), tip = $('.tip', ch), rects = $$('[data-dbars] rect', ch);
      ln.style.strokeDasharray = '1';
      tl.fromTo(ln, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.7, ease: E }, R + 0.3);
      tl.fromTo(ar, { opacity: 0 }, { opacity: 1, duration: 1, ease: E }, R + 1.1);
      tl.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: E }, R + 1.8);
      rects.forEach(function (r, i) { tl.fromTo(r, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.7, ease: E }, R + 0.35 + i * 0.006); });
    },
    refunded: function (s, sec) {
      card($('[data-card]', sec), s, 'refund');
      // the backer's own refund lands: the site's toast, rising in .5s (toastIn)
      var t = $('[data-toast]', sec);
      tl.fromTo(t, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: E }, s.toast);
    },
    numbers: function (s, sec) {
      $$('.stat', sec).forEach(function (st, i) {
        var T = s.items[i], fig = $('.fig', st);
        if (fig.dataset.fig) { var v = String(V[fig.dataset.fig]); odo(fig, [[-1, v.replace(/\d/g, '0')], [T + 0.1, v]]); }
        rise(st, T + 0.05, { fade: true });
        rise($('.lab', st), T + 0.11, { fade: true });
        fadeOut(st, T + s.each - DUR);
      });
    },
    close: function (s, sec) {
      var h = $('h1.t', sec), ec = $('.endcard', sec);
      sharpen($('.l1', sec), s.start + 0.05); sharpen($('.l2', sec), s.start + 0.22);
      fadeOut(h, s.lineOut);
      shown(ec, s.end_);
      rise($('.lockup', ec), s.end_ + 0.05, { fade: true });
      rise($('.url', ec), s.end_ + 0.11, { fade: true });
      rise($('.net', ec), s.end_ + 0.17, { fade: true });
    }
  };

  function build() {
    S.scenes.forEach(function (s) { var sec = document.getElementById('s-' + s.id); if (sec && B[s.kind]) B[s.kind](s, sec); });
    var corner = $('#corner .mark');
    rise(corner, S.corner[0], { fade: true });
    fadeOut(corner, S.corner[1] - DUR);
    // captions sit on a frosted --bar pill, so they rise without a fade and leave on the cut that ends their clip
    $$('.cap').forEach(function (c) { rise($$('.ln', c), +c.dataset.start, { stagger: 0.045 }); });
    // one tween the length of the film carries every time-driven state
    var clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: S.duration, duration: S.duration, ease: 'none', onUpdate: function () { var t = tl.time(); drivers.forEach(function (d) { d(t); }); } }, 0);
    drivers.forEach(function (d) { d(0); });
    window.__timelines["__COMP_ID__"] = tl;   // tools/build.mjs writes each page's own data-composition-id here
    if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
})();
