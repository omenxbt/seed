/* Seed background: slow weather drawn as ordered-dither dots, in the accent blue, behind the UI.
   One <canvas id="bg-dither"> (first child of body, fixed, z-index -1). The field is long soft bands bent by fbm simplex
   noise, drifting sideways and changing shape over time, with most of its mass low and to the right. It is cut into a
   few tone steps, and an 8x8 Bayer matrix dithers the edge between one step and the next: the lowest step fades out
   through sparser and sparser dots, the higher ones are the same grid at a stronger alpha.
   WebGL draws it in two passes on a full-screen quad: pass 1 writes the field per cell into a small texture, pass 2
   picks each cell's step and paints a crisp square. Noise runs once per cell, not once per pixel, which keeps it cheap.
   Without WebGL a Canvas2D fallback draws a 6px grid at 15fps into a low-res buffer. Plain JS, no dependencies.
   URL flags: ?bg=off disables it; ?bg=2d forces the fallback; ?bg=always keeps it running in a hidden tab (recordings);
   ?bgt=<seconds> starts the field at that moment (repeatable frames). Tunables live in CONFIG.
   window.BG_DITHER exposes the config, the mode, frame timings and seek(seconds) for stepping the field by hand. */
(function () {
  'use strict';

  var CONFIG = {
    pitch: 4,                  // css px between cells
    dot: 2,                    // css px, the square inside each cell
    color: [0x2E, 0x63, 0xE7], // accent blue, the only hue
    alpha: [0.24, 0.78],       // the lowest tone step .. the densest cores
    levels: 4,                 // tone steps above empty
    speed: 6,                  // css px per second of horizontal drift
    evolve: 25,                // seconds for the noise to change shape (its third axis)
    scale: 620,                // css px per noise unit at octave 1 (bigger = larger masses)
    octaves: 4,                // fbm octaves, 1 to 4
    gain: 0.5, lacunarity: 2.05,
    bands: { dir: [0.34, 0.94], count: 1.15, warp: 2.4, flow: 0.02 },   // the bands: direction they stack in, how many per noise unit, how far noise bends them, cycles per second they travel
    mix: { bands: 0.32, noise: 0.56, bias: 0.40 },                      // field = bands * wave + noise * fbm - bias
    hill: { x: 0.86, y: 0.95, rx: 0.74, ry: 0.66, gain: 0.98 },         // the big mass low and to the right, added to the field
    header: { px: 72, fade: 70, floor: 0.2 },   // the top 72px stay almost empty
    foot: { px: 40, fade: 50, floor: 0.3 },     // the foot line of the window stays readable over the hill
    center: { thin: 0.22, radius: 0.55 },        // thin the middle of the viewport by 40%
    fps: 30, dprCap: 2,
    fallback: { pitch: 6, fps: 15, octaves: 3 }
  };

  var params = new URLSearchParams(location.search), flag = params.get('bg');
  var canvas = document.getElementById('bg-dither');
  if (!canvas) return;
  if (flag === 'off') { canvas.style.display = 'none'; return; }
  var motion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------ shared state */
  var W = 0, H = 0, DPR = 1, clock = parseFloat(params.get('bgt')) || 0, lastTick = 0, lastFrame = 0, running = false, onScreen = true, rafId = 0, timerId = 0, resizeTimer = 0;
  var stats = { frames: 0, msTotal: 0, msMax: 0 };   // main-thread cost of draw(), for profiling
  var SEED = 370;                                    // css px offset into the field, so every load opens on the same sky

  /* ------------------------------------------------------------ WebGL path */
  var VS = 'attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.,1.);}';
  var NOISE_GLSL = [
    // 3D simplex noise, Ian McEwan / Ashima Arts (MIT), compacted
    'vec3 m3(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m4(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 pm(vec4 x){return m4(((x*34.)+1.)*x);}vec4 ti(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
    'vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    'vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m3(i);',
    'vec4 p=pm(pm(pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    'float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
    'vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    'vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    'vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    'vec4 nm=ti(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;',
    'vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}'
  ].join('\n');
  // pass 1: one fragment per cell -> the field (0..1) in the red channel. uCell is the cell size in css px; uDrift is css px travelled.
  var FS_FIELD = [
    'precision highp float;varying vec2 v;uniform vec2 uCells,uCss;uniform float uCell,uDrift,uZ,uPhase,uScale,uGain,uLac,uOct;',
    'uniform vec4 uBands;uniform vec3 uMix;uniform vec4 uHill;uniform float uHillGain;uniform vec3 uHead,uFoot;uniform vec2 uCenter;', NOISE_GLSL,
    'float fbm(vec3 p){float s=0.,a=.5,n=0.;for(int i=0;i<4;i++){if(float(i)>=uOct)break;s+=a*sn(p);n+=a;a*=uGain;p*=uLac;}return s/n;}',
    'void main(){vec2 cell=floor(v*uCells);vec2 c=(cell+.5)*uCell;',   // cell centre, css px (row 0 is the top row)
    'vec2 uv=c/uCss;float asp=uCss.x/uCss.y;vec2 p=vec2(c.x+uDrift,c.y)/uScale;',
    'float n=fbm(vec3(p,uZ))*.5+.5;',
    'float wave=.5+.5*sin(3.14159265*(dot(p,uBands.xy)*uBands.z+n*uBands.w-uPhase));',
    'float f=uMix.x*wave+uMix.y*n-uMix.z;',
    'f+=uHillGain*(1.-smoothstep(0.,1.,length((uv-uHill.xy)/uHill.zw)));',
    'float hm=uHead.z+(1.-uHead.z)*smoothstep(uHead.x,uHead.x+uHead.y,c.y);',
    'float fm=uFoot.z+(1.-uFoot.z)*smoothstep(uFoot.x,uFoot.x+uFoot.y,uCss.y-c.y);',
    'float cm=1.-uCenter.x*(1.-smoothstep(0.,uCenter.y,length((uv-.5)*vec2(asp,1.))));',
    'gl_FragColor=vec4(clamp(f,0.,1.)*hm*fm*cm,0.,0.,1.);}'
  ].join('\n');
  // pass 2: tone step per cell through the Bayer matrix, crisp square dot, premultiplied colour. uPitch and uDot are whole device px.
  var FS_DOTS = [
    'precision highp float;uniform sampler2D uTex;uniform vec2 uRes,uCells;uniform float uPitch,uDot,uLevels;uniform vec3 uCol;uniform vec2 uAlpha;',
    // 8x8 Bayer rank 0..63: the low bits of the cell decide the high bits of the rank, which is what spreads the dots out
    'float bayer8(vec2 c){vec2 p=mod(c,8.);float r=0.;for(int i=0;i<3;i++){float k=pow(2.,float(i));float xb=mod(floor(p.x/k),2.),yb=mod(floor(p.y/k),2.);r=r*4.+(abs(xb-yb)*2.+yb);}return r;}',
    'void main(){vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',   // device px, y down
    'vec2 cell=floor(px/uPitch);vec2 loc=px-cell*uPitch;',
    'if(loc.x>=uDot||loc.y>=uDot){gl_FragColor=vec4(0.);return;}',
    'float d=texture2D(uTex,(cell+.5)/uCells).r;float step_=floor(d*uLevels+(bayer8(cell)+.5)/64.);',
    'if(step_<1.){gl_FragColor=vec4(0.);return;}',
    'float a=mix(uAlpha.x,uAlpha.y,(min(step_,uLevels)-1.)/max(uLevels-1.,1.));gl_FragColor=vec4(uCol*a,a);}'
  ].join('\n');

  function makeGL() {
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return null;
    var pF, pS, uF, uS, quad, tex, fb, cellsW = 0, cellsH = 0, pitchPx = 1, dotPx = 1;
    function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function program(fs) { var p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
    function uniforms(p) { var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); } return u; }
    /* everything the context owns; run once, and again if the context is lost and comes back */
    function build() {
      pF = program(FS_FIELD); pS = program(FS_DOTS); uF = uniforms(pF); uS = uniforms(pS);
      quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      tex = gl.createTexture(); fb = gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    }
    try { build(); } catch (e) { if (window.console) console.warn('bg-dither: WebGL shaders did not build, using Canvas2D', e); return null; }
    return {
      mode: 'webgl',
      resize: function () {
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        pitchPx = Math.max(2, Math.round(CONFIG.pitch * DPR)); dotPx = Math.max(1, Math.min(pitchPx - 1, Math.round(CONFIG.dot * DPR)));   // whole device px, so every dot is the same crisp square
        cellsW = Math.ceil(canvas.width / pitchPx); cellsH = Math.ceil(canvas.height / pitchPx);
        gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cellsW, cellsH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      },
      draw: function (time) {
        var c = CONFIG;
        // pass 1: the field per cell
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, cellsW, cellsH); gl.useProgram(pF);
        gl.uniform2f(uF.uCells, cellsW, cellsH); gl.uniform2f(uF.uCss, W, H); gl.uniform1f(uF.uCell, pitchPx / DPR);
        gl.uniform1f(uF.uDrift, time * c.speed + SEED); gl.uniform1f(uF.uZ, time / c.evolve); gl.uniform1f(uF.uPhase, time * c.bands.flow * 2);
        gl.uniform1f(uF.uScale, c.scale); gl.uniform1f(uF.uGain, c.gain); gl.uniform1f(uF.uLac, c.lacunarity); gl.uniform1f(uF.uOct, c.octaves);
        gl.uniform4f(uF.uBands, c.bands.dir[0], c.bands.dir[1], c.bands.count * 2, c.bands.warp); gl.uniform3f(uF.uMix, c.mix.bands, c.mix.noise, c.mix.bias);
        gl.uniform4f(uF.uHill, c.hill.x, c.hill.y, c.hill.rx, c.hill.ry); gl.uniform1f(uF.uHillGain, c.hill.gain);
        gl.uniform3f(uF.uHead, c.header.px, c.header.fade, c.header.floor); gl.uniform3f(uF.uFoot, c.foot.px, c.foot.fade, c.foot.floor);
        gl.uniform2f(uF.uCenter, c.center.thin, c.center.radius);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // pass 2: dots
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(pS);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(uS.uTex, 0);
        gl.uniform2f(uS.uRes, canvas.width, canvas.height); gl.uniform2f(uS.uCells, cellsW, cellsH);
        gl.uniform1f(uS.uPitch, pitchPx); gl.uniform1f(uS.uDot, dotPx); gl.uniform1f(uS.uLevels, c.levels);
        gl.uniform3f(uS.uCol, c.color[0] / 255, c.color[1] / 255, c.color[2] / 255); gl.uniform2f(uS.uAlpha, c.alpha[0], c.alpha[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      onLost: function (lost, restored) {
        canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost(); }, false);
        canvas.addEventListener('webglcontextrestored', function () { try { build(); restored(); } catch (e) {} }, false);
      }
    };
  }

  /* ------------------------------------------------------------ Canvas2D fallback (6px pitch, 15fps, low-res buffer) */
  function makeC2D() {
    var ctx = canvas.getContext('2d'); if (!ctx) return null;
    var fb = CONFIG.fallback, buf = document.createElement('canvas'), bctx = buf.getContext('2d');
    var cellsW = 0, cellsH = 0, img = null, bayer = [];
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var r = 0; for (var i = 0; i < 3; i++) { var xb = (x >> i) & 1, yb = (y >> i) & 1; r = r * 4 + ((xb ^ yb) * 2 + yb); } bayer[y * 8 + x] = (r + 0.5) / 64; }
    // 3D simplex noise (Stefan Gustavson's reference algorithm)
    var grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
    var perm = new Uint8Array(512), p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    for (var i2 = 0; i2 < 512; i2++) perm[i2] = p[i2 & 255];
    function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }
    function sn(xin, yin, zin) {
      var F3 = 1 / 3, G3 = 1 / 6, s = (xin + yin + zin) * F3, i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s), t = (i + j + k) * G3;
      var x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t), i1, j1, k1, i2b, j2, k2;
      if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2b = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2b = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2b = 1; j2 = 0; k2 = 1; } }
      else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2b = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2b = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2b = 1; j2 = 1; k2 = 0; } }
      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3, x2 = x0 - i2b + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3, x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      var ii = i & 255, jj = j & 255, kk = k & 255, n = 0, tt;
      tt = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (tt > 0) { tt *= tt; n += tt * tt * dot3(grad3[perm[ii + perm[jj + perm[kk]]] % 12], x0, y0, z0); }
      tt = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (tt > 0) { tt *= tt; n += tt * tt * dot3(grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12], x1, y1, z1); }
      tt = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (tt > 0) { tt *= tt; n += tt * tt * dot3(grad3[perm[ii + i2b + perm[jj + j2 + perm[kk + k2]]] % 12], x2, y2, z2); }
      tt = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (tt > 0) { tt *= tt; n += tt * tt * dot3(grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12], x3, y3, z3); }
      return 32 * n;
    }
    function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    var col = CONFIG.color;
    return {
      mode: 'canvas2d',
      resize: function () {
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        cellsW = Math.ceil(W / fb.pitch); cellsH = Math.ceil(H / fb.pitch);
        buf.width = cellsW * 2; buf.height = cellsH * 2;   // each cell is 2x2 buffer px; the dot is its top-left px, so it scales up to half the pitch
        img = bctx.createImageData(buf.width, buf.height);
      },
      draw: function (time) {
        var c = CONFIG, data = img.data, asp = W / H, sc = c.scale, drift = time * c.speed + SEED, ez = time / c.evolve, phase = time * c.bands.flow * 2, L = c.levels;
        data.fill(0);
        for (var cy = 0; cy < cellsH; cy++) {
          var y = (cy + 0.5) * fb.pitch, vy = y / H;
          var hm = c.header.floor + (1 - c.header.floor) * smooth(c.header.px, c.header.px + c.header.fade, y);
          var fm = c.foot.floor + (1 - c.foot.floor) * smooth(c.foot.px, c.foot.px + c.foot.fade, H - y);
          for (var cx = 0; cx < cellsW; cx++) {
            var x = (cx + 0.5) * fb.pitch, vx = x / W, px0 = (x + drift) / sc, py0 = y / sc;
            var s = 0, a = 0.5, nn = 0, px2 = px0, py2 = py0, pz = ez;
            for (var o = 0; o < fb.octaves; o++) { s += a * sn(px2, py2, pz); nn += a; a *= c.gain; px2 *= c.lacunarity; py2 *= c.lacunarity; pz *= c.lacunarity; }
            var n = (s / nn) * 0.5 + 0.5;
            var wave = 0.5 + 0.5 * Math.sin(Math.PI * ((px0 * c.bands.dir[0] + py0 * c.bands.dir[1]) * c.bands.count * 2 + n * c.bands.warp - phase));
            var hx = (vx - c.hill.x) / c.hill.rx, hy = (vy - c.hill.y) / c.hill.ry;
            var f = c.mix.bands * wave + c.mix.noise * n - c.mix.bias + c.hill.gain * (1 - smooth(0, 1, Math.sqrt(hx * hx + hy * hy)));
            var dx = (vx - 0.5) * asp, dy = vy - 0.5, cm = 1 - c.center.thin * (1 - smooth(0, c.center.radius, Math.sqrt(dx * dx + dy * dy)));
            var step = Math.floor(Math.min(1, Math.max(0, f)) * hm * fm * cm * L + bayer[(cy & 7) * 8 + (cx & 7)]);
            if (step < 1) continue;
            var al = c.alpha[0] + (c.alpha[1] - c.alpha[0]) * (Math.min(step, L) - 1) / Math.max(L - 1, 1), idx = ((cy * 2) * buf.width + cx * 2) * 4;
            data[idx] = col[0]; data[idx + 1] = col[1]; data[idx + 2] = col[2]; data[idx + 3] = Math.round(al * 255);
          }
        }
        bctx.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, cellsW * fb.pitch * DPR, cellsH * fb.pitch * DPR);
      },
      onLost: function () {}
    };
  }

  /* ------------------------------------------------------------ driver */
  var renderer = flag === '2d' ? null : makeGL();
  if (!renderer) {
    // a canvas that has handed out a WebGL context cannot give a 2D one, so the fallback draws on a fresh copy of it
    var fresh = canvas.cloneNode(false); canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh;
    renderer = makeC2D();
  }
  if (!renderer) return;
  var frameGap = 1000 / (renderer.mode === 'webgl' ? CONFIG.fps : CONFIG.fallback.fps);

  function measure() {
    W = Math.max(1, Math.round(canvas.clientWidth || innerWidth)); H = Math.max(1, Math.round(canvas.clientHeight || innerHeight));
    DPR = Math.min(CONFIG.dprCap, window.devicePixelRatio || 1);
    renderer.resize();
  }
  function draw() { var a = performance.now(); renderer.draw(clock); var ms = performance.now() - a; stats.frames++; stats.msTotal += ms; if (ms > stats.msMax) stats.msMax = ms; }
  /* the field's clock only runs while it is being drawn, so coming back to the tab picks the weather up where it was */
  function tick(now) {
    if (now - lastFrame < frameGap - 1) return;
    clock += Math.min(now - lastTick, 100) / 1000; lastTick = lastFrame = now; draw();
  }
  function frame(now) { rafId = 0; if (!running) return; tick(now); rafId = requestAnimationFrame(frame); }
  function start() {
    if (running || motion.matches) return;
    running = true; lastTick = performance.now();
    if (flag === 'always' && document.hidden) timerId = setInterval(function () { tick(performance.now()); }, frameGap);   // a hidden tab gets no animation frames
    else rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } if (timerId) { clearInterval(timerId); timerId = 0; } }
  function sync() { stop(); if ((flag === 'always' || !document.hidden) && onScreen) start(); }

  measure(); draw();   // one frame straight away: it is the whole show under reduced motion, and the first paint otherwise
  sync();

  addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { measure(); draw(); }, 150); });
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }).observe(canvas);
  renderer.onLost(stop, function () { measure(); draw(); sync(); });

  window.BG_DITHER = { config: CONFIG, mode: renderer.mode, stats: stats, start: start, stop: stop, redraw: function () { measure(); draw(); }, seek: function (t) { clock = +t || 0; draw(); } };
})();
