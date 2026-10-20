/* The film's motion. One paused GSAP timeline, registered for HyperFrames, built from the #story data the page carries
   (src/story.mjs). Everything is a pure function of the timeline's time, so any frame can be drawn first and repeats.

   The camera. Each UI scene is a stage with perspective holding a camera, and in it the site's own page as the site drew
   it at this format's window (tools/capture-pages.mjs; the beat's state is mounted from its <script type="text/html">).
   The camera's keys (story.mjs) are solved against the page's real layout at load: an element's box, the scale that makes
   it fill the format's focus box, a tilt. Each key eases from wherever the camera is to its pose on the brand's one curve,
   cubic-bezier(.22,1,.36,1): fast off the mark, then a long settle, so a cut reads as a whip and a hold is still a slow
   push. A page fills the screen: every pose is kept where the page covers the whole frame, tilt and all, so no edge of it
   shows until the whip that takes it away. Text frames fly the same camera over their type. From the camera's own path
   each frame gets
   - depth of field: a blur over everything outside an ellipse round the element in focus (#dof, a masked backdrop blur);
   - motion blur: the camera's travel since the last frame, as a directional blur (#mb, an SVG blur on the backdrop).
   Both sit over the page, so a frosted panel keeps its glass (a filter on its ancestor would take it away).

   The site's motion, as the site draws it: entrances rising 10px in .5s (60ms a column, 45ms a card), a press scaling to
   .97 in 80ms, the fill bar taking .6s, the odometer .55s a digit, the sheen coming round every 3.2s, a buy's chip
   (chipUp), the chart line drawing in 1.7s with the area at 1.1s and the tip at 1.8s. Colour takes .18s, anything that
   moves .28s. A frosted panel only moves, never fades. */
(function () {
  'use strict';
  var root = document.getElementById('root');
  var S = JSON.parse(document.getElementById('story').textContent);
  var decl = JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]');
  var V = {};
  decl.forEach(function (d) { V[d.id] = d.default; });
  try { Object.assign(V, window.__hyperframes && window.__hyperframes.getVariables ? window.__hyperframes.getVariables() : {}); } catch (e) {}
  var FPS = S.fps, DT = 1 / FPS, FW = S.size[0], FH = S.size[1];

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
  var FAST = 0.18, DUR = 0.28;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var prog = function (t, t0, d) { return d > 0 ? E(clamp((t - t0) / d, 0, 1)) : (t >= t0 ? 1 : 0); };
  var tl = gsap.timeline({ paused: true });
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };
  var css = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

  /* ------------------------------------------------------------ timeline helpers for the film's own type */
  function rise(el, t, o) { o = o || {}; if (!el || (el.length === 0)) return; var from = { y: 10 }, to = { y: 0, duration: 0.5, ease: E, stagger: o.stagger || 0, immediateRender: o.ir !== false }; if (o.fade) { from.opacity = 0; to.opacity = 1; } tl.fromTo(el, from, to, t); }
  function sharpen(el, t) { tl.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, ease: E }, t); }
  function fadeOut(el, t, d) { if (!el) return; tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: d || DUR, ease: E, immediateRender: false }, t); }

  /* ------------------------------------------------------------ state from time */
  var drivers = [];
  function last(events, t) { var k = -1; for (var i = 0; i < events.length; i++) if (events[i][0] <= t + 1e-6) k = i; return k; }
  var digits = function (s) { return s.replace(/[^\d]/g, '').split('').map(Number); };
  var shapeOf = function (s) { return s.replace(/\d/g, '0'); };
  /* the site's odometer (index.html roll()): each digit a strip that slides to the new value in .55s; another layout (one
     more digit, other text) is drawn without the slide. get() is the element on screen now (a page beat may have been
     mounted since the last frame); events: [[t, text], ...] */
  function odo(get, events) {
    var memo = { el: null, shape: null, strips: [], text: null };
    function draw(el, text) {
      el.innerHTML = text.split('').map(function (c) { return /\d/.test(c) ? '<span class="rd"><span class="rd-s">' + '0123456789'.split('').map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</span></span>' : '<span class="rs">' + (c === ' ' ? '&nbsp;' : c.replace(/&/g, '&amp;').replace(/</g, '&lt;')) + '</span>'; }).join('');
      memo.strips = $$('.rd-s', el); memo.shape = shapeOf(text); memo.el = el;
    }
    drivers.push(function (t) {
      var el = get(t); if (!el) return;
      var k = Math.max(0, last(events, t)), text = events[k][1];
      var prev = k > 0 ? events[k - 1][1] : null, slide = prev !== null && shapeOf(prev) === shapeOf(text) ? clamp((t - events[k][0]) / 0.55, 0, 1) : 1;
      if (el !== memo.el || shapeOf(text) !== memo.shape) draw(el, text);
      var dn = digits(text), dp = prev !== null && slide < 1 ? digits(prev) : dn;
      memo.strips.forEach(function (s, i) {
        var p = slide >= 1 ? dn[i] : dp[i] + (dn[i] - dp[i]) * E(slide), shown = Math.round(p);
        s.style.transform = 'translateY(-' + p.toFixed(4) + 'em)';
        for (var j = 0; j < s.children.length; j++) { if (j === shown) s.children[j].removeAttribute('data-layout-ignore'); else s.children[j].setAttribute('data-layout-ignore', ''); }
      });
    });
  }
  /* the fill bar's width, with the site's .6s transition between values */
  function bar(get, events) {
    drivers.push(function (t) {
      var el = get(t); if (!el) return;
      var k = Math.max(0, last(events, t)), to = events[k][1], from = k > 0 ? events[k - 1][1] : to, p = k > 0 ? prog(t, events[k][0], 0.6) : 1;
      el.style.width = (from + (to - from) * p).toFixed(3) + '%';
    });
  }
  /* a press: .97 in 80ms, then back in --dur */
  function press(get, t0) {
    drivers.push(function (t) {
      if (t < t0 - 1e-6 || t > t0 + 0.4) return;
      var el = get(t); if (!el) return;
      var s = t < t0 + 0.08 ? 1 - 0.03 * prog(t, t0, 0.08) : 0.97 + 0.03 * prog(t, t0 + 0.08, DUR);
      el.style.transform = 'scale(' + s.toFixed(4) + ')';
    });
  }
  /* the slow sheen on a live bar: still for 55% of each 3.2s, then across */
  drivers.push(function (t) { var ph = ((t % 3.2) + 3.2) % 3.2 / 3.2, x = ph < 0.55 ? -100 : -100 + 200 * E((ph - 0.55) / 0.45); root.style.setProperty('--sheen', x.toFixed(2) + '%'); });
  /* the dot field, js/bg-dither.js in its fixed-seed mode: the field at second 370 + t. A page's stage gets the same field
     under its pages, as the site has it under its panels (a panel's glass blurs the stage's own backdrop), drawn on the
     ground, so it covers the field under the stage rather than doubling its dots; the film's own type has no
     glass and plays straight over #bg-dither, so two type scenes can overlap on one field */
  var field = document.getElementById('bg-dither'), GROUND = css('--bg');
  drivers.push(function (t) {
    if (window.BG_DITHER) window.BG_DITHER.seek(370 + t);
    $$('.stage > canvas.field').forEach(function (c) {
      var sc = c.closest('.scene'), a = +sc.dataset.start, b = a + +sc.dataset.duration;
      if (t < a - 1e-6 || t >= b - 1e-6) return;
      if (c.width !== field.width || c.height !== field.height) { c.width = field.width; c.height = field.height; }
      var g = c.getContext('2d'); g.fillStyle = GROUND; g.fillRect(0, 0, c.width, c.height); g.drawImage(field, 0, 0);
    });
  });

  /* ------------------------------------------------------------ cameras */
  var PERSP = S.persp, FOCUS = S.focus;
  var cams = [];
  function mixPose(a, b, u) {
    return { s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * u), fx: a.fx + (b.fx - a.fx) * u, fy: a.fy + (b.fy - a.fy) * u, sx: a.sx + (b.sx - a.sx) * u, sy: a.sy + (b.sy - a.sy) * u, rx: a.rx + (b.rx - a.rx) * u, ry: a.ry + (b.ry - a.ry) * u, dof: a.dof + (b.dof - a.dof) * u, rect: u < 0.5 ? a.rect : b.rect };
  }
  function matrixOf(p) {
    var m = new DOMMatrix().translate(p.sx, p.sy).rotateAxisAngle(1, 0, 0, p.rx).rotateAxisAngle(0, 1, 0, p.ry).scale(p.s).translate(-p.fx, -p.fy);
    var persp = new DOMMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / PERSP, 0, 0, 0, 1]);
    return new DOMMatrix().translate(FW / 2, FH / 2).multiply(persp).translate(-FW / 2, -FH / 2).multiply(m);
  }
  function project(M, x, y) { var q = M.transformPoint(new DOMPoint(x, y, 0, 1)); return [q.x / q.w, q.y / q.w]; }
  /* a point of the frame back on the page's own plane: the camera's matrix on that plane is a homography, inverted */
  function onPage(M, X, Y) {
    var a = M.m11, b = M.m21, c = M.m41, d = M.m12, e = M.m22, f = M.m42, g = M.m14, h = M.m24, i = M.m44;
    var u = (e * i - f * h) * X + (c * h - b * i) * Y + (b * f - c * e), v = (f * g - d * i) * X + (a * i - c * g) * Y + (c * d - a * f), w = (d * h - e * g) * X + (b * g - a * h) * Y + (a * e - b * d);
    return [u / w, v / w];
  }
  /* a page fills the screen: the pose moves its focus point, or past that goes closer, until every corner of the frame
     lands on the page (the page and the frame are both convex, so the whole frame does) */
  function cover(p, W, H) {
    var q = Object.assign({}, p), m = 2;
    for (var n = 0; n < 24; n++) {
      var M = matrixOf(q), cs = [[-m, -m], [FW + m, -m], [-m, FH + m], [FW + m, FH + m]].map(function (c) { return onPage(M, c[0], c[1]); });
      var us = cs.map(function (c) { return c[0]; }), vs = cs.map(function (c) { return c[1]; });
      var u0 = Math.min.apply(null, us), u1 = Math.max.apply(null, us), v0 = Math.min.apply(null, vs), v1 = Math.max.apply(null, vs);
      var over = Math.max((u1 - u0) / W, (v1 - v0) / H);
      if (over > 1) { q.s *= over * 1.002; continue; }
      var du = u0 < 0 ? -u0 : u1 > W ? W - u1 : 0, dv = v0 < 0 ? -v0 : v1 > H ? H - v1 : 0;
      if (Math.abs(du) < 0.05 && Math.abs(dv) < 0.05) break;
      q.fx += du; q.fy += dv;
    }
    return q;
  }
  /* a camera over a world (a page, or a scene's type): keys are solved once, in order, each from the pose the camera has
     when it starts */
  function camera(o) {
    var c = { el: o.el, world: o.world, keys: [], t0: o.t0, t1: o.t1, cuts: [], noMb: !!o.noMb };
    /* over a page, every pose but a free one (the whip out) is kept inside it */
    var fit = function (p, t, k) { return o.size && !(k && k.free) ? cover(p, o.size(t)[0], o.size(t)[1]) : p; };
    c.at = function (t) {
      var p = c.keys[0].from, kk = null;
      for (var i = 0; i < c.keys.length; i++) { var k = c.keys[i]; if (t < k.t - 1e-6) break; p = mixPose(k.from, k.to, prog(t, k.t, k.d)); kk = k; }
      return fit(p, t, kk);
    };
    var prev = null;
    o.keys.forEach(function (k, i) {
      /* the whip out: from wherever the camera is, sideways until the page's right edge has left the frame */
      if (k.away) {
        var fp = c.at(k.t), sz = o.size(k.t), M0 = matrixOf(fp);
        var xr = Math.max.apply(null, [[0, 0], [sz[0], 0], [0, sz[1]], [sz[0], sz[1]]].map(function (q) { return project(M0, q[0], q[1])[0]; }));
        var away = Object.assign({}, fp, { sx: fp.sx - (xr + 80) * 1.1 });
        c.keys.push({ t: k.t, d: k.d, from: fp, to: away, free: true, push: false });
        prev = away; return;
      }
      if (k.full) k = Object.assign({ sel: '.scr', win: true, fill: 1 }, k);
      var R = o.rect(k, prev), box = k.full ? [0, 0, FW, FH] : FOCUS, bw = box[2] - box[0], bh = box[3] - box[1];
      var fill = Math.min(bw / R[2], bh / R[3]), f0 = k.fill * (k.win || k.sel === '.scr' ? 1 : (o.fillK || 1));
      var s = k.s != null ? k.s : clamp((k.fill <= 1 ? Math.min(f0, 1) : f0) * fill, 0.2, 3.6);   // inside the focus box, unless it pushes through
      if (k.smax != null) s = Math.min(s, k.smax);
      var cx = k.center ? FW / 2 : box[0] + bw / 2, cy = k.center ? FH / 2 : box[1] + bh / 2;
      var to = { s: s, fx: R[0] + R[2] * (k.ax != null ? k.ax : 0.5), fy: R[1] + R[3] * (k.ay != null ? k.ay : 0.5), sx: cx + (k.dx || 0), sy: cy + (k.dy || 0), rx: k.rx || 0, ry: k.ry || 0, dof: k.dof || 0, rect: R };
      to = fit(to, k.t + (k.d || 0), k);
      var from;
      if (k.cut || !i) { var f = k.from || {}; from = fit(Object.assign({}, to, { s: to.s * (f.k || 1), sx: to.sx + (f.dx || 0), sy: to.sy + (f.dy || 0), rx: to.rx + (f.rx || 0), ry: to.ry + (f.ry || 0) }), k.t, k); c.cuts.push(k.t); }
      else from = c.at(k.t);
      c.keys.push({ t: k.t, d: k.d, from: from, to: to, free: !!k.free, push: k.fill > 1.5 || !!k.nomb });   // no motion blur on a push or where a key says
      prev = to;
    });
    c.shotStart = function (t) { var s = c.t0; c.cuts.forEach(function (x) { if (x <= t + 1e-6) s = x; }); return s; };
    c.apply = function (t) {
      var p = c.at(t);
      c.el.style.transform = 'translate(' + p.sx.toFixed(2) + 'px,' + p.sy.toFixed(2) + 'px) rotateX(' + p.rx.toFixed(3) + 'deg) rotateY(' + p.ry.toFixed(3) + 'deg) scale(' + p.s.toFixed(5) + ') translate(' + (-p.fx).toFixed(2) + 'px,' + (-p.fy).toFixed(2) + 'px)';
      return p;
    };
    cams.push(c);
    return c;
  }
  /* the corner mark's clear space over the film's own type: a type stage is masked away round the mark while it is up (a
     page stage never is: a masked ancestor takes the glass off its panels, and the mark is never up over a page) */
  drivers.push(function (t) { root.style.setProperty('--cma', S.corner.some(function (w) { return t >= w[0] - 1e-6 && t < w[1] - 1e-6; }) ? '0' : '1'); });

  /* depth of field and motion blur from the camera on screen */
  var dof = document.getElementById('dof'), mb = document.getElementById('mb'), mbg = document.getElementById('mbg');
  var lastDof = null, lastMb = null;
  drivers.push(function (t) {
    /* every camera on screen moves (two scenes overlap at a handoff); depth of field comes from the one coming in, motion
       blur from whichever is travelling (a page whipping away under the next line) */
    var c = null, p = null, on = [];
    cams.forEach(function (x) { if (t >= x.t0 - 1e-6 && t < x.t1 - 1e-6) { p = x.apply(t); c = x; on.push([x, p]); } });
    var dv = 'none', mv = 'none', mbx = 0, mby = 0;
    on.forEach(function (e) {
      var x = e[0], q = e[1], R = q.rect, tp = Math.max(t - DT, x.shotStart(t));
      var kNow = null; x.keys.forEach(function (k) { if (k.t <= t + 1e-6) kNow = k; });
      if (x.noMb || (kNow && kNow.push) || tp >= t - 1e-6) return;
      /* the camera's travel over the last frame, inside the shot (a cut is not travel): how far the element in focus moved
         across the frame, taken over a thirtieth of a second, so the blur is the length it was at 30fps. A zoom moves its
         corners apart, not across, and a directional blur cannot draw that, so it leaves none */
      var a1 = project(matrixOf(q), R[0] + R[2] / 2, R[1] + R[3] / 2), a0 = project(matrixOf(x.at(tp)), R[0] + R[2] / 2, R[1] + R[3] / 2);
      mbx = Math.max(mbx, Math.min(16, Math.abs(a1[0] - a0[0]) * 0.2 * FPS / 30)); mby = Math.max(mby, Math.min(16, Math.abs(a1[1] - a0[1]) * 0.2 * FPS / 30));
    });
    if (Math.max(mbx, mby) > 0.8) mv = mbx.toFixed(1) + ' ' + mby.toFixed(1);
    if (c) {
      var M = matrixOf(p), R = p.rect;
      var pts = [[R[0], R[1]], [R[0] + R[2], R[1]], [R[0], R[1] + R[3]], [R[0] + R[2], R[1] + R[3]], [R[0] + R[2] / 2, R[1] + R[3] / 2]].map(function (q) { return project(M, q[0], q[1]); });
      var db = p.dof * 0.55;
      if (db > 0.3) {
        var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
        var cx = pts[4][0], cy = pts[4][1], rx = (Math.max.apply(null, xs) - Math.min.apply(null, xs)) / 2 * 1.5 + 120, ry = (Math.max.apply(null, ys) - Math.min.apply(null, ys)) / 2 * 1.6 + 110;
        dv = [cx.toFixed(0), cy.toFixed(0), rx.toFixed(0), ry.toFixed(0), db.toFixed(1)].join(' ');
        if (dv !== lastDof) { dof.style.display = 'block'; dof.style.setProperty('--dx', cx.toFixed(0) + 'px'); dof.style.setProperty('--dy', cy.toFixed(0) + 'px'); dof.style.setProperty('--rx', rx.toFixed(0) + 'px'); dof.style.setProperty('--ry', ry.toFixed(0) + 'px'); dof.style.backdropFilter = dof.style.webkitBackdropFilter = 'blur(' + db.toFixed(1) + 'px)'; }
      }
    }
    if (dv === 'none' && lastDof !== 'none') dof.style.display = 'none';
    lastDof = dv;
    if (mv !== lastMb) { if (mv === 'none') mb.style.display = 'none'; else { mb.style.display = 'block'; mbg.setAttribute('stdDeviation', mv); } lastMb = mv; }
  });
  /* ------------------------------------------------------------ the site's pages */
  var TPL = {};
  Array.prototype.forEach.call(document.querySelectorAll('template[data-page]'), function (t) { TPL[t.dataset.page] = t; });
  var META = JSON.parse(document.getElementById('pages').textContent);
  function doc(name) { return TPL[name].content; }
  function textIn(name, sel) { var e = doc(name).querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }
  function scrollable(el, stop) { for (var e = el && el.parentElement; e && e !== stop; e = e.parentElement) { var cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) return e; } return null; }
  /* a screen: one page of the site, its beats mounted as their time comes, its scrolling columns where the story puts them */
  function screen(sec, s) {
    var cam = $('.cam', sec), scr = $('.scr', sec), body = $('.hf-body', sec), cur = null, mounts = 0;
    var scrolls = (s.scroll || []).map(function (k) { return Object.assign({ from: null, to: null }, k); });
    function stateAt(t) { var n = s.states[0][1]; s.states.forEach(function (x) { if (x[0] <= t + 1e-6) n = x[1]; }); return n; }
    function mount(name) {
      if (cur === name) return;
      body.replaceChildren(TPL[name].content.cloneNode(true)); cur = name; mounts++;
      $$('img', body).forEach(function (i) { i.decoding = 'sync'; });   // decoded before the timeline starts (preload), drawn on the frame it mounts
      var m = META.states[name] || {};
      body.className = 'hf-body ' + (m.body || '');
      scr.style.height = cam.style.height = (m.docH || META.window[1]) + 'px';
      $$('[data-hf-scroll]', body).forEach(function (e) { var v = e.getAttribute('data-hf-scroll').split(','); e.scrollTop = +v[0]; e.scrollLeft = +v[1]; });
    }
    /* a column's scroll is a function of time too: where the capture left it before its key, then the key's move */
    function scrollAt(t) {
      scrolls.forEach(function (k) {
        if (k.to == null) return;
        var el = $(k.sel, body), box = el && scrollable(el, scr); if (!box) return;
        box.scrollTop = t < k.t - 1e-6 ? k.from : k.from + (k.to - k.from) * prog(t, k.t, k.d);
      });
    }
    /* each scroll is solved once, on the page it ends on: its column, where the column starts, where the element lands */
    function solveScrolls() {
      var keep = cam.style.transform; cam.style.transform = 'none';
      scrolls.forEach(function (k) {
        cur = null; mount(stateAt(k.t + k.d));
        var el = $(k.sel, body), box = el && scrollable(el, scr); if (!box) return;
        var er = el.getBoundingClientRect(), br = box.getBoundingClientRect();
        k.from = box.scrollTop;
        k.to = clamp(box.scrollTop + (er.top + er.height / 2) - (br.top + br.height * k.place), 0, box.scrollHeight - box.clientHeight);
      });
      cam.style.transform = keep; cur = null;
    }
    var api = {
      sec: sec, cam: cam, scr: scr, body: body, stateAt: stateAt,
      q: function (sel) { return $(sel, body); },
      show: function (t) { mount(stateAt(t)); scrollAt(t); },
      /* an element's box in the page's own pixels, with the camera off */
      rect: function (k, prev) {
        /* where the element is once the move lands; if the page has changed by then, where it is as the move starts */
        var tt = k.t + (k.d || 0);
        api.show(tt);
        if (k.sel !== '.scr' && [].concat(k.sel).some(function (q) { return !$(q, body); })) { tt = k.t + 0.001; api.show(tt); }
        var keep = cam.style.transform; cam.style.transform = 'none';
        var sr = scr.getBoundingClientRect(), r;
        if (k.sel === '.scr') r = [0, 0, sr.width, sr.height];
        else {
          var bs = [].concat(k.sel).map(function (q) { var e = $(q, body); if (!e) throw new Error('no ' + q + ' in ' + cur); return e.getBoundingClientRect(); });
          var x0 = Math.min.apply(null, bs.map(function (b) { return b.left; })), y0 = Math.min.apply(null, bs.map(function (b) { return b.top; }));
          var x1 = Math.max.apply(null, bs.map(function (b) { return b.right; })), y1 = Math.max.apply(null, bs.map(function (b) { return b.bottom; }));
          r = [x0 - sr.left, y0 - sr.top, x1 - x0, y1 - y0];
        }
        cam.style.transform = keep;
        /* a window of the app's size: round the element, or, for the whole page, round what the camera was just on */
        if (k.win) { var w = META.window[0], h = META.window[1]; var cy = k.sel === '.scr' && prev ? prev.fy : r[1] + r[3] / 2; r = [0, clamp(cy - h / 2, 0, Math.max(0, sr.height - h)), w, Math.min(h, sr.height)]; }
        return r;
      }
    };
    solveScrolls();
    drivers.push(function (t) { if (t >= s.start - 1e-6 && t < s.end - 1e-6) api.show(t); });
    var keys = (s.cam || []).map(function (k) { var o = Object.assign({}, k, (k.f || {})[S.format] || {}); return o; });
    var size = function (t) { var m = META.states[stateAt(t)] || {}; return [META.window[0], m.docH || META.window[1]]; };
    api.camera = camera({ el: cam, world: scr, keys: keys, t0: s.start, t1: s.end, rect: api.rect, size: size, fillK: S.fillK });
    return api;
  }
  /* the page's cards rising into place as it opens: 10px in .5s, 60ms a column, 45ms a card down each column */
  function opening(scr, cols, t0) {
    drivers.push(function (t) {
      if (t < t0 - 1e-6 || t > t0 + 1.4) return;
      cols.forEach(function (sel, c) { $$(sel, scr.body).forEach(function (e, i) { var y = 10 * (1 - prog(t, t0 + c * 0.06 + i * 0.045, 0.5)); e.style.transform = y > 0.01 ? 'translateY(' + y.toFixed(2) + 'px)' : ''; }); });
    });
  }
  /* the texts a selector shows in each of a screen's beats, as odometer events */
  function beatTexts(s, sel, keep) {
    var ev = [];
    s.states.forEach(function (x, i) { var v = textIn(x[1], sel); if (v == null) return; if (!ev.length || ev[ev.length - 1][1] !== v) ev.push([i ? x[0] : -1, v]); });
    return keep ? ev.filter(keep) : ev;
  }
  function beatWidths(s, sel) {
    var ev = [];
    s.states.forEach(function (x, i) { var e = doc(x[1]).querySelector(sel); if (!e) return; var w = parseFloat(e.style.width); if (!isNaN(w) && (!ev.length || ev[ev.length - 1][1] !== w)) ev.push([i ? x[0] : -1, w]); });
    return ev;
  }

  /* ------------------------------------------------------------ the film's own type, flown by the same camera */
  /* (a selector matching several elements frames them together: a line's words, not the box they wrap in) */
  function typeCamera(sec, s, keys) { return camera({ el: $('.cam', sec), world: $('.tw', sec), noMb: true, keys: keys.map(function (k) { return Object.assign({ center: true }, k); }), t0: s.start, t1: s.end, rect: function (k) { var w = $('.tw', sec), es = k.sel ? $$(k.sel, sec) : [w], cam = $('.cam', sec); var keep = cam.style.transform; cam.style.transform = 'none'; var wr = w.getBoundingClientRect(), bs = es.map(function (e) { return e.getBoundingClientRect(); }); cam.style.transform = keep; var x0 = Math.min.apply(null, bs.map(function (b) { return b.left; })), y0 = Math.min.apply(null, bs.map(function (b) { return b.top; })), x1 = Math.max.apply(null, bs.map(function (b) { return b.right; })), y1 = Math.max.apply(null, bs.map(function (b) { return b.bottom; })); return [x0 - wr.left, y0 - wr.top, x1 - x0, y1 - y0]; } }); }

  /* ------------------------------------------------------------ figures */
  var feePct = parseFloat(V.fee) || 0;
  var music = document.getElementById('music');
  if (music && V.musicVolume != null) music.setAttribute('data-volume', String(V.musicVolume));

  /* the 21 dots arrive on the spiral one by one, 40ms apart, rim first, each growing from nothing at full opacity (the
     book: never fade the mark), and the seed lands last */
  function dotsArrive(svg, t0, tSeed) {
    var cs = $$('circle', svg), seed = cs[0], cx0 = +seed.getAttribute('cx'), cy0 = +seed.getAttribute('cy');
    cs.forEach(function (c) {
      var n = +c.dataset.n; if (!n) return;
      var x = +c.getAttribute('cx'), y = +c.getAttribute('cy');
      tl.fromTo(c, { x: (x - cx0) * 0.55, y: (y - cy0) * 0.55, scale: 0, transformOrigin: '50% 50%' }, { x: 0, y: 0, scale: 1, duration: 0.5, ease: E }, t0 + (20 - n) * 0.04);
    });
    tl.fromTo(seed, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: E }, tSeed);
  }

  /* ------------------------------------------------------------ scenes */
  var B = {
    sting: function (s, sec) {
      var lock = $('.lockup', sec), svg = $('.sting-mark', sec), seed = $('circle.seed', svg);
      // where the mark sits in the finished lockup, measured before any tween moves it
      var mr = svg.getBoundingClientRect(), rr = root.getBoundingClientRect();
      dotsArrive(svg, s.start + 0.2, s.start + 1.0);
      var lg = $('.word', sec).getBoundingClientRect().width / 2 + parseFloat(getComputedStyle(lock).columnGap || 0) / 2;
      tl.fromTo(svg, { x: lg }, { x: 0, duration: 0.5, ease: E }, s.start + 1.45);
      // the seed brightens from the brand blue to the lit one; the wordmark fades in at 1.6s
      tl.fromTo(seed, { fill: css('--solid') }, { fill: css('--navy'), duration: FAST, ease: E, immediateRender: false }, s.hit);
      tl.fromTo($('.word', sec), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: E }, s.start + 1.6);
      // a slow push on the lockup, then the mark flies to its corner and becomes the mark that stays there; where the next
      // scene is a page (the teaser) the camera pushes through the lockup instead
      var P = 1.05, C = S.cornerBox;
      var mcx = mr.left - rr.left + mr.width / 2, mcy = mr.top - rr.top + mr.height / 2;
      tl.fromTo(lock, { scale: 1 }, { scale: P, duration: s.fly - s.start, ease: E }, s.start);
      if (s.push) { tl.fromTo(lock, { scale: P }, { scale: 9, duration: 0.55, ease: E, immediateRender: false }, s.push); return; }
      var dx = (C[0] + C[2] / 2) - (FW / 2 + (mcx - FW / 2) * P), dy = (C[1] + C[2] / 2) - (FH / 2 + (mcy - FH / 2) * P);
      tl.fromTo(svg, { x: 0, y: 0, scale: 1, transformOrigin: '50% 50%' }, { x: dx / P, y: dy / P, scale: C[2] / (mr.width * P), duration: s.end - s.fly, ease: E, immediateRender: false }, s.fly);
      tl.fromTo($('.word', sec), { opacity: 1, x: 0 }, { opacity: 0, x: -24, duration: DUR, ease: E, immediateRender: false }, s.fly);
      $$('.dot', svg).forEach(function (d) { tl.fromTo(d, { fill: css('--ink') }, { fill: css('--navy-soft'), duration: FAST, ease: E, immediateRender: false }, s.end - 0.3); });
    },
    title: function (s, sec) {
      // the hero's two lines: the first huge, sharpening in; then it settles to its size as the second comes under it
      sharpen($('.l1', sec), s.start + 0.05); sharpen($('.l2', sec), s.l2in);
      typeCamera(sec, s, [
        { t: s.start, cut: true, sel: '.l1', fill: 0.97, d: 0.9, from: { k: 0.9 } },   // in from a little further out: the huge word never passes the safe zone
        { t: s.shrink, sel: 'h1.t', s: 1, d: 0.7 },
        { t: s.shrink + 0.7, sel: 'h1.t', s: 1.045, d: s.out - s.shrink - 0.7 },
        // out: the camera pushes through the title, the lines flying past it and gone before the cut, as the next scene
        // comes in under them; or the title whips away left as the next line comes in from the right
        s.exit === 'whip' ? { t: s.out, sel: 'h1.t', s: 1.045, dx: -FW * 1.1, d: 0.45 } : { t: s.out, sel: 'h1.t', s: 4.4, d: 0.6 }
      ]);
      if (s.exit === 'whip') fadeOut($('h1.t', sec), s.out + 0.02, 0.2); else fadeOut($('h1.t', sec), s.out + 0.1);
    },
    line: function (s, sec) {
      // a line of the script, full screen: its words rise in 45ms apart as the camera arrives, it holds on a slow push,
      // and it leaves the way the next shot comes in. A big line comes in huge and settles (Axiom's title pattern)
      var blk = $('.lb', sec), whip = s.in === 'whip', from = whip ? { dx: FW * 0.32 } : { k: s.big ? 0.9 : 0.55 }, keys, end;
      rise($$('.w', sec), s.start + 0.04, { stagger: 0.045, fade: true });
      if (s.big) {
        end = 0.64;
        keys = [{ t: s.start, cut: true, sel: '.lb .w', fill: 0.98, d: 0.5, from: from }, { t: s.start + 0.4, sel: '.lb .w', fill: end, d: 0.6 }];
      } else {
        // every other line at one size, the type's own (scale 1), or smaller where a set line is wider than the focus box
        // (a line wider than the box comes in a little inside it, so the hold's slow push ends on its edge, not past it)
        keys = [{ t: s.start, cut: true, sel: '.lb .w', fill: 0.94, smax: 1, d: whip ? 0.7 : 1.0, from: from }, { t: s.start + 0.9, sel: '.lb .w', fill: 0.98, smax: 1.04, d: s.out - s.start - 0.9 }];
      }
      // out: through the type into the next shot, which resolves under it, or a whip away left as the next comes in
      var hold = s.big ? { fill: end } : { fill: 0.98, smax: 1.04 };
      if (s.exit === 'whip') { keys.push(Object.assign({ t: s.out, sel: '.lb .w', dx: -FW * 1.1, d: 0.45 }, hold)); fadeOut(blk, s.out + 0.02, 0.2); }
      else { keys.push(Object.assign({ t: s.out, sel: '.lb .w', d: 0.6 }, s.big ? { fill: 3.8 } : { s: 4.4 })); fadeOut(blk, s.out + 0.04); }
      typeCamera(sec, s, keys);
    },
    launch: function (s, sec) {
      var sc = screen(sec, s);
      opening(sc, ['.ws-side > *', '.ws-main > *', '.ws-rail > *'], s.start);
      // the deadline: the chosen segment slides across in --dur after the press (the site's indicator, from beat to beat)
      var seg = function () { return sc.q('#timeSeg .seg-ind'); };
      var pos = function (name) { var e = doc(name).querySelector('#timeSeg .seg-ind'), m = /translateX\(([-\d.]+)px\)/.exec(e.getAttribute('style') || ''); return [m ? +m[1] : 0, parseFloat(e.style.width) || 0]; };
      var before = s.states.filter(function (x) { return x[0] < s.seg; }).pop()[1], after = s.states.filter(function (x) { return x[0] > s.seg; })[0][1], a = pos(before), b = pos(after);
      drivers.push(function (t) { if (t < s.seg + 0.08 - 1e-6 || t > s.seg + 0.6) return; var e = seg(); if (!e) return; var u = prog(t, s.seg + 0.08, DUR); e.style.transform = 'translateX(' + (a[0] + (b[0] - a[0]) * u).toFixed(2) + 'px)'; e.style.width = (a[1] + (b[1] - a[1]) * u).toFixed(2) + 'px'; });
      press(function () { return sc.q('#timeSeg button[data-v="168"]'); }, s.seg);
      press(function () { return sc.q('#openBtn'); }, s.open);
    },
    page: function (s, sec) {
      var sc = screen(sec, s);
      if (s.open != null) opening(sc, ['.pp-side > *', '.pp-main > *', '.pp-rail > *'], s.open);
      var q = function (sel) { return function () { return sc.q(sel); }; };
      ['[data-draised]', '[data-dpct]', '[data-dbackers]', '[data-sraised]', '[data-spct]', '[data-sbackers]', '[data-dtime]', '[data-stime]'].forEach(function (sel) { var ev = beatTexts(s, sel); if (ev.length) odo(q(sel), ev); });
      bar(q('[data-dbar]'), beatWidths(s, '[data-dbar]'));
      // a buy's chip over the readout, as the site's floatChip draws it: in at 15%, drifting to 75%, gone at 100% of 2.4s
      (s.chips || []).forEach(function (i) {
        var t0 = s.buys[i], from = s.states.filter(function (x) { return x[0] < t0 - 1e-6; }).pop()[1], to = s.states.filter(function (x) { return Math.abs(x[0] - t0) < 1e-6; })[0][1];
        var r0 = parseFloat((textIn(from, '[data-draised]') || '0').replace(/,/g, '')), r1 = parseFloat((textIn(to, '[data-draised]') || '0').replace(/,/g, ''));
        var label = '+' + (r1 - r0).toFixed(2) + ' SOL';
        drivers.push(function (t) {
          var host = sc.q('[data-dreadout] .big b'); if (!host) return;
          var c = host.querySelector('.hf-chip[data-k="' + i + '"]');
          var on = t >= t0 - 1e-6 && t < t0 + 2.4;
          if (!on) { if (c) c.remove(); return; }
          if (!c) { c = document.createElement('span'); c.className = 'buy-chip num hf-chip'; c.dataset.k = i; c.textContent = label; host.appendChild(c); }
          var u = t - t0, o, y, k;
          if (u < 0.36) { var p = prog(t, t0, 0.36); o = p; y = 14 * (1 - p); k = 0.9 + 0.1 * p; }
          else if (u < 1.8) { o = 1; y = -6 * prog(t, t0 + 0.36, 1.44); k = 1; }
          else { var p2 = prog(t, t0 + 1.8, 0.6); o = 1 - p2; y = -6 - 10 * p2; k = 1; }
          c.style.opacity = o.toFixed(3); c.style.transform = 'translateY(' + y.toFixed(2) + 'px) scale(' + k.toFixed(3) + ')';
        });
      });
      (s.presses || []).forEach(function (t) { press(q('[data-crank]'), t); });
      // the seeded page's raise chart draws itself as the camera arrives: the line in 1.7s, the area at 1.1s, the tip at 1.8s
      if (s.reveal) {
        var R = s.reveal;
        drivers.push(function (t) {
          if (t < s.seeded - 1e-6) return;
          var ch = sc.q('[data-chartcard]'); if (!ch) return;
          var ln = $('.ln', ch), ar = $('.ar', ch), tip = $('.tip', ch);
          if (ln) { ln.style.strokeDasharray = '1'; ln.style.strokeDashoffset = (1 - prog(t, R + 0.3, 1.7)).toFixed(4); }
          if (ar) ar.style.opacity = prog(t, R + 1.1, 1.0).toFixed(3);
          if (tip) tip.style.opacity = prog(t, R + 1.8, 0.4).toFixed(3);
          $$('[data-dbars] rect', ch).forEach(function (r, i) { r.style.transformOrigin = '50% 100%'; r.style.transformBox = 'fill-box'; r.style.transform = 'scaleY(' + prog(t, R + 0.35 + i * 0.006, 0.7).toFixed(4) + ')'; });
        });
      }
    },
    refund: function (s, sec) {
      var sc = screen(sec, s);
      var q = function (sel) { return function () { return sc.q(sel); }; };
      // the last seconds of the deadline, a second at a time, then the page as the site draws a missed raise
      var tick = function (n) { return '00:00:0' + n; };
      odo(q('[data-dtime]'), s.ticks.map(function (t, i) { return [i ? t : -1, tick(s.ticks.length - 1 - i)]; }));
      odo(q('[data-stime]'), s.ticks.map(function (t, i) { return [i ? t : -1, tick(s.ticks.length - 1 - i)]; }));
      // every backer's refund claimed: the identity card's "Refunds claimed", rolling up to every wallet
      var n = parseInt((textIn('refunded', '.pp-id .pp-stats') || '').replace(/.*Refunds claimed\s*\d+\s*\/\s*(\d+).*/, '$1'), 10) || 0;
      var claimsEl = function () { var dts = $$('.pp-stats dt', sc.body).filter(function (d) { return /Refunds claimed/.test(d.textContent); }); if (!dts.length) return null; var dd = dts[0].nextElementSibling; var sp = dd.querySelector('.hf-claims'); if (!sp) { var em = dd.querySelector('em'); dd.innerHTML = '<span class="hf-claims">0</span> '; if (em) dd.appendChild(em); sp = dd.querySelector('.hf-claims'); } return sp; };
      odo(claimsEl, [[-1, '0']].concat(s.claims.map(function (c) { return [c[0], String(Math.round(n * c[1]))]; })));
    },
    close: function (s, sec) {
      var h = $('h1.t', sec), ec = $('.endcard', sec), lk = $('.endcard .lockup', ec), mk = $('.mark', lk), wd = $('.word', lk);
      sharpen($('.l1', sec), s.start); sharpen($('.l2', sec), s.shrink + 0.2);
      fadeOut(h, s.lineOut);
      var cam = typeCamera(sec, s, [
        // in under the line before it, or from the right as the page before it whips away
        { t: s.start, cut: true, sel: '.l1', fill: 0.97, d: 0.9, from: s.in === 'whip' ? { dx: FW * 0.32 } : { k: 0.6 } },
        { t: s.shrink, sel: 'h1.t', s: 1, d: 0.7 },
        { t: s.end_, sel: '.endcard', s: 1, d: 0.01 },
        { t: s.end_ + 0.02, sel: '.endcard', s: 1.035, d: s.end - s.end_ }
      ]);
      // the end card builds as the Axiom ones do: the mark alone, then the wordmark drawn out from behind it, the URL under.
      // The mark is the corner mark come home: it flies from the corner to where the camera shows the end card's mark as
      // the flight lands, its dots turning from the app bar's blue to ink, and the end card's own mark takes its place there
      var gap = wd.getBoundingClientRect().width / 2 + parseFloat(getComputedStyle(lk).columnGap || 0) / 2;
      var T0 = s.end_ + 0.02, T1 = S.corner[S.corner.length - 1][1], C = S.cornerBox, home = $$('.clip.corner .mark').pop();
      var keep = cam.el.style.transform; cam.el.style.transform = 'none';
      var wr = $('.tw', sec).getBoundingClientRect(), mr = mk.getBoundingClientRect();
      cam.el.style.transform = keep;
      var M = matrixOf(cam.at(T1)), a = project(M, mr.left - wr.left + gap, mr.top - wr.top), b = project(M, mr.right - wr.left + gap, mr.bottom - wr.top);
      tl.fromTo(home, { x: 0, y: 0, scale: 1, transformOrigin: '0 0' }, { x: a[0] - C[0], y: a[1] - C[1], scale: (b[0] - a[0]) / C[2], duration: T1 - T0, ease: E, immediateRender: false }, T0);
      tl.fromTo(home, { color: css('--navy-soft') }, { color: css('--ink'), duration: DUR, ease: E, immediateRender: false }, T0);
      tl.set(ec, { opacity: 0 }, 0); tl.set(ec, { opacity: 1 }, T1);
      tl.fromTo(mk, { x: gap }, { x: 0, duration: 0.6, ease: E }, T1 + 0.08);
      tl.fromTo(wd, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: E }, T1 + 0.3);
      rise($('.url', ec), T1 + 0.42, { fade: true });
      rise($('.net', ec), T1 + 0.52, { fade: true });
    }
  };

  function build() {
    S.scenes.forEach(function (s) { var sec = document.getElementById('s-' + s.id); if (sec && B[s.kind]) B[s.kind](s, sec); });
    var clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: S.duration, duration: S.duration, ease: 'none', onUpdate: function () { var t = tl.time(); drivers.forEach(function (d) { d(t); }); } }, 0);
    drivers.forEach(function (d) { d(0); });
    window.__timelines = window.__timelines || {};
    window.__timelines["__COMP_ID__"] = tl;   // tools/build.mjs writes each page's own data-composition-id here
    if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
  }
  /* every image the pages show, decoded before the timeline is handed over, so a page never paints a frame without one */
  function preload() {
    var srcs = {}; Object.keys(TPL).forEach(function (n) { $$('img[src]', TPL[n].content).forEach(function (i) { srcs[i.getAttribute('src')] = 1; }); });
    window.__hfImages = Object.keys(srcs).map(function (u) { var i = new Image(); i.src = u; return i; });
    return Promise.all(window.__hfImages.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(preload).then(build);
})();
