// Nucleo do jogo: constantes, cores, desenho, sprites, fonte, entrada, assets, audio, camera e sessao.
// Equivale a pasta Core/ da versao C#.

export const VW = 256;            // resolucao interna (igual ao NES)
export const VH = 240;
export const TILE = 16;           // todos os cenarios seguem esta grade
export const STARTING_LIVES = 3;

// ---------------------------------------------------------------- cores
// Cores sao arrays [r, g, b, a] (a de 0 a 255).
export const WHITE = [255, 255, 255, 255];
export const BLACK = [0, 0, 0, 255];
export const YELLOW = [252, 216, 40, 255];

export function css(c) {
  return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] ?? 255) / 255})`;
}
export function darken(c, f) {
  return [Math.floor(c[0] * f), Math.floor(c[1] * f), Math.floor(c[2] * f), c[3] ?? 255];
}
export function multiply(a, b) {
  return [a[0] * b[0] / 255 | 0, a[1] * b[1] / 255 | 0, a[2] * b[2] / 255 | 0, (a[3] ?? 255) * (b[3] ?? 255) / 255 | 0];
}
export function parseHex(hex, fallback) {
  if (!hex) return fallback;
  const h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return fallback;
  const v = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
  return [...v, h.length === 8 ? parseInt(h.substr(6, 2), 16) : 255];
}

// ---------------------------------------------------------------- desenho
export const Gfx = {
  rect(ctx, x, y, w, h, c) {
    ctx.fillStyle = css(c);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },
  outline(ctx, x, y, w, h, c, t = 1) {
    this.rect(ctx, x, y, w, t, c);
    this.rect(ctx, x, y + h - t, w, t, c);
    this.rect(ctx, x, y, t, h, c);
    this.rect(ctx, x + w - t, y, t, h, c);
  },
  /** Desenho usado quando a imagem nao existe. */
  placeholder(ctx, x, y, w, h, c) {
    this.rect(ctx, x, y, w, h, c);
    this.outline(ctx, x, y, w, h, darken(c, 0.55));
  },
};

// ---------------------------------------------------------------- assets
/**
 * Imagens sao pre-carregadas (o navegador carrega de forma assincrona).
 * Arquivo ausente vira null e o jogo desenha um placeholder colorido.
 */
export const Assets = {
  base: 'assets/',
  images: new Map(),
  missing: new Set(),

  loadImage(path) {
    if (this.images.has(path)) return Promise.resolve(this.images.get(path));
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images.set(path, img); resolve(img); };
      img.onerror = () => { this.images.set(path, null); this.missing.add(path); resolve(null); };
      img.src = this.base + encodeURI(path);
    });
  },
  loadImages(paths) {
    return Promise.all([...new Set(paths)].map(p => this.loadImage(p)));
  },
  image(path) { return this.images.get(path) ?? null; },
  exists(path) { return !!this.images.get(path); },
  async loadText(path) {
    try {
      const r = await fetch(this.base + encodeURI(path), { cache: 'no-cache' });
      return r.ok ? await r.text() : null;
    } catch { return null; }
  },
};

// ---------------------------------------------------------------- sprites
/** Folha de sprites com frames de tamanho fixo, da esquerda para a direita. */
export class SpriteSheet {
  constructor(img, fw, fh, fallback) {
    this.img = img;
    this.fw = fw;
    this.fh = fh;
    this.fallback = fallback;
    this.placeholderEye = false;   // "olho" no placeholder mostra para onde o sprite esta virado
    this.tinted = new Map();
    if (img) {
      this.cols = Math.max(1, Math.floor(img.width / fw));
      this.count = this.cols * Math.max(1, Math.floor(img.height / fh));
    } else {
      this.cols = 1;
      this.count = 1;
    }
  }
  get isPlaceholder() { return !this.img; }

  /** Copia da imagem com uma camada de cor por cima (usado na Sudo Star). */
  tintedImage(color) {
    const key = color.join(',');
    let cv = this.tinted.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = this.img.width;
      cv.height = this.img.height;
      const c = cv.getContext('2d');
      c.drawImage(this.img, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = css([color[0], color[1], color[2], 120]);
      c.fillRect(0, 0, cv.width, cv.height);
      this.tinted.set(key, cv);
    }
    return cv;
  }

  draw(ctx, frame, x, y, { flipX = false, flipY = false, tint = null, placeholderHeight = 0, scale = 1 } = {}) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.img) {
      const h = placeholderHeight > 0 ? placeholderHeight : this.fh;
      const rx = x, ry = y + Math.round((this.fh - h) * scale);
      const rw = Math.round(this.fw * scale), rh = Math.round(h * scale);
      Gfx.placeholder(ctx, rx, ry, rw, rh, tint ? multiply(this.fallback, tint) : this.fallback);
      if (this.placeholderEye) {
        const s = Math.max(1, Math.floor(scale));
        Gfx.rect(ctx, flipX ? rx + 3 * s : rx + rw - 5 * s, flipY ? ry + rh - 6 * s : ry + 3 * s, 2 * s, 3 * s, WHITE);
      }
      return;
    }
    frame = ((frame % this.count) + this.count) % this.count;
    const sx = (frame % this.cols) * this.fw, sy = Math.floor(frame / this.cols) * this.fh;
    const src = tint ? this.tintedImage(tint) : this.img;
    const w = this.fw * scale, h = this.fh * scale;
    if (!flipX && !flipY) {
      ctx.drawImage(src, sx, sy, this.fw, this.fh, x, y, w, h);
      return;
    }
    ctx.save();
    ctx.translate(x + (flipX ? w : 0), y + (flipY ? h : 0));
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(src, sx, sy, this.fw, this.fh, 0, 0, w, h);
    ctx.restore();
  }
}

/** Cache de SpriteSheets compartilhadas. */
export const Sprites = {
  cache: new Map(),
  get(path, fw, fh, fallback) {
    const key = `${path}|${fw}x${fh}|${fallback.join(',')}`;
    let s = this.cache.get(key);
    if (!s) {
      s = new SpriteSheet(Assets.image(path), fw, fh, fallback);
      this.cache.set(key, s);
    }
    return s;
  },
  /** Procura "pasta/nome_tema.png" e cai para "pasta/nome.png". */
  themed(folder, name, theme, fw, fh, fallback) {
    const themed = `${folder}/${name}_${theme}.png`;
    if (theme !== 'overworld' && Assets.exists(themed)) return this.get(themed, fw, fh, fallback);
    return this.get(`${folder}/${name}.png`, fw, fh, fallback);
  },
};

// ---------------------------------------------------------------- fonte
// Fonte pixelada 5x7 embutida. Acentos sao removidos ("Missão" vira "MISSAO").
const GLYPHS = {
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F], '3': [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
  '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], 'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E], 'D': [0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F], 'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F], 'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E], 'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], 'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11], 'N': [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D], 'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E], 'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A], 'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x11, 0x0A, 0x04, 0x04, 0x04], 'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  '-': [0, 0, 0, 0x1F, 0, 0, 0], '.': [0, 0, 0, 0, 0, 0x0C, 0x0C], ',': [0, 0, 0, 0, 0x0C, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04], '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  ':': [0, 0x0C, 0x0C, 0, 0x0C, 0x0C, 0], ';': [0, 0x0C, 0x0C, 0, 0x0C, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10], '*': [0, 0x04, 0x15, 0x0E, 0x15, 0x04, 0],
  '×': [0, 0, 0x11, 0x0A, 0x04, 0x0A, 0x11], '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08], '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08], '{': [0x06, 0x04, 0x04, 0x08, 0x04, 0x04, 0x06],
  '}': [0x0C, 0x04, 0x04, 0x02, 0x04, 0x04, 0x0C], '[': [0x0E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0E],
  ']': [0x0E, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0E], '_': [0, 0, 0, 0, 0, 0, 0x1F],
  '=': [0, 0, 0x1F, 0, 0x1F, 0, 0], '+': [0, 0x04, 0x04, 0x1F, 0x04, 0x04, 0],
  '#': [0x0A, 0x0A, 0x1F, 0x0A, 0x1F, 0x0A, 0x0A], '@': [0x0E, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0E],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03], "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0A, 0x0A, 0, 0, 0, 0, 0], '©': [0x0E, 0x11, 0x17, 0x19, 0x17, 0x11, 0x0E],
};
const GLYPH_CHARS = Object.keys(GLYPHS);
const GLYPH_INDEX = new Map(GLYPH_CHARS.map((c, i) => [c, i]));
const fontAtlases = new Map();

/** Todos os caracteres de uma cor desenhados numa unica imagem (rapido de desenhar). */
function fontAtlas(color) {
  const key = color.join(',');
  let cv = fontAtlases.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = GLYPH_CHARS.length * 6;
    cv.height = 7;
    const c = cv.getContext('2d');
    c.fillStyle = css(color);
    GLYPH_CHARS.forEach((ch, i) => {
      GLYPHS[ch].forEach((bits, r) => {
        for (let col = 0; col < 5; col++) if (bits & (1 << (4 - col))) c.fillRect(i * 6 + col, r, 1, 1);
      });
    });
    fontAtlases.set(key, cv);
  }
  return cv;
}

export const PixelFont = {
  ADVANCE: 6,
  LINE: 10,
  normalize(text) {
    return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  },
  draw(ctx, text, x, y, color, scale = 1, shadow = false) {
    text = this.normalize(text);
    if (shadow) this.raw(ctx, text, x + scale, y + scale, BLACK, scale);
    this.raw(ctx, text, x, y, color, scale);
  },
  raw(ctx, text, x, y, color, scale) {
    const atlas = fontAtlas(color);
    const startX = Math.round(x);
    let cx = startX, cy = Math.round(y);
    for (const ch of text) {
      if (ch === '\n') { cx = startX; cy += this.LINE * scale; continue; }
      const i = GLYPH_INDEX.get(ch);
      if (i !== undefined) ctx.drawImage(atlas, i * 6, 0, 5, 7, cx, cy, 5 * scale, 7 * scale);
      cx += this.ADVANCE * scale;
    }
  },
  measure(text, scale = 1) {
    const lines = this.normalize(text).split('\n');
    const longest = Math.max(...lines.map(l => [...l].length));
    return longest === 0 ? 0 : (longest * this.ADVANCE - 1) * scale;
  },
  drawCentered(ctx, text, cx, y, color, scale = 1, shadow = false) {
    this.draw(ctx, text, cx - this.measure(text, scale) / 2, y, color, scale, shadow);
  },
  drawRight(ctx, text, rx, y, color, scale = 1, shadow = false) {
    this.draw(ctx, text, rx - this.measure(text, scale), y, color, scale, shadow);
  },
  /** Quebra o texto em linhas que cabem em maxWidth pixels. */
  wrap(text, maxWidth, scale = 1) {
    const lines = [];
    if (!text || !text.trim()) return lines;
    const maxChars = Math.max(1, Math.floor((maxWidth / scale + 1) / this.ADVANCE));
    for (const paragraph of text.split('\n')) {
      let cur = '';
      for (const word of paragraph.split(' ').filter(Boolean)) {
        if (cur.length > 0 && cur.length + 1 + word.length > maxChars) { lines.push(cur); cur = ''; }
        cur += (cur ? ' ' : '') + word;
      }
      lines.push(cur);
    }
    return lines;
  },
};

// ---------------------------------------------------------------- entrada
// Mapeamento equivalente ao NES: jump = A, run = B (correr), fire = B (atirar com o Firewall).
// A seta para cima tambem pula. No celular, correr e atirar sao gestos diferentes (veja main.js).
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space', 'KeyK', 'ArrowUp', 'KeyW'], run: ['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyJ'],
  fire: ['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyC'],
  start: ['Enter', 'KeyP'], confirm: ['Enter', 'KeyZ', 'Space'], back: ['Escape', 'Backspace'],
};
// Botoes do controle no layout "standard" do navegador (0 = A, 1 = B, 2 = X, 3 = Y, 8 = Select, 9 = Start).
const PADMAP = {
  left: [14], right: [15], up: [12], down: [13], jump: [0, 12], run: [2, 3], fire: [2, 3],
  start: [9], confirm: [0, 9], back: [1, 8],
};
const BLOCKED_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace']);

export const Input = {
  keys: new Set(),
  tapped: new Set(),     // teclas que desceram desde o ultimo passo (toques rapidos nao se perdem)
  prevKeys: new Set(),
  frameKeys: new Set(),
  touch: new Set(),      // acoes pressionadas nos botoes de toque
  touchTapped: new Set(),
  cur: {},
  prev: {},
  listeners: [],

  init() {
    window.addEventListener('keydown', e => {
      if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
      this.tapped.add(e.code);
      this.listeners.forEach(f => f());
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.touch.clear(); });
  },

  /** Chamado a cada passo de 1/60 s. */
  update() {
    this.prev = this.cur;
    this.prevKeys = this.frameKeys;
    this.frameKeys = new Set([...this.keys, ...this.tapped]);
    this.tapped.clear();
    const pad = [...(navigator.getGamepads?.() ?? [])].find(p => p);
    const c = {};
    for (const action of Object.keys(KEYMAP)) {
      let down = KEYMAP[action].some(k => this.frameKeys.has(k)) || this.touch.has(action) || this.touchTapped.has(action);
      if (!down && pad) {
        down = PADMAP[action].some(b => pad.buttons[b]?.pressed);
        if (!down && pad.axes.length >= 2) {
          if (action === 'left') down = pad.axes[0] < -0.5;
          if (action === 'right') down = pad.axes[0] > 0.5;
          if (action === 'up' || action === 'jump') down = pad.axes[1] < -0.6;
          if (action === 'down') down = pad.axes[1] > 0.5;
        }
      }
      c[action] = down;
    }
    this.touchTapped.clear();
    this.cur = c;
  },
  isDown(a) { return !!this.cur[a]; },
  wasPressed(a) { return !!this.cur[a] && !this.prev[a]; },
  keyPressed(code) { return this.frameKeys.has(code) && !this.prevKeys.has(code); },
  /** Executa f na proxima tecla/toque (navegadores so liberam audio apos interacao). */
  onInteraction(f) { this.listeners.push(f); },
};

// ---------------------------------------------------------------- audio
/**
 * Os sons disponiveis sao listados em assets/Audio/audio.json (mp3, ogg ou wav).
 * Sem o arquivo listado, o som simplesmente nao toca.
 */
export const Audio = {
  manifest: { sfx: {}, music: {} },
  sfxCache: new Map(),
  music: null,
  musicName: null,
  pendingPlay: false,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  muted: false,

  async init() {
    const txt = await Assets.loadText('Audio/audio.json');
    if (txt) {
      try { this.manifest = Object.assign({ sfx: {}, music: {} }, JSON.parse(txt)); } catch { /* json invalido: sem som */ }
    }
    Input.onInteraction(() => this.unlock());
    window.addEventListener('pointerdown', () => this.unlock());
  },
  unlock() {
    if (this.pendingPlay && this.music && !this.muted) {
      this.pendingPlay = false;
      this.music.play().catch(() => { this.pendingPlay = true; });
    }
  },
  play(name) {
    if (this.muted) return;
    const file = this.manifest.sfx[name];
    if (!file) return;
    let base = this.sfxCache.get(name);
    if (!base) {
      base = new window.Audio(Assets.base + 'Audio/' + file);
      this.sfxCache.set(name, base);
    }
    const a = base.cloneNode();
    a.volume = this.sfxVolume;
    a.play().catch(() => {});
  },
  playMusic(name, loop = true) {
    if (this.music && this.musicName === name && !this.music.paused) return;
    this.stopMusic();
    const file = name && this.manifest.music[name];
    if (!file) return;
    this.music = new window.Audio(Assets.base + 'Audio/' + file);
    this.music.loop = loop;
    this.music.volume = this.musicVolume;
    this.musicName = name;
    if (this.muted) return;
    this.music.play().catch(() => { this.pendingPlay = true; });
  },
  stopMusic() {
    if (this.music) this.music.pause();
    this.music = null;
    this.musicName = null;
    this.pendingPlay = false;
  },
  pauseMusic() { this.music?.pause(); },
  resumeMusic() { if (this.music && !this.muted) this.music.play().catch(() => {}); },
  /** "Hurry up" (tempo < 100): musica mais rapida. */
  setMusicSpeed(rate) { if (this.music) this.music.playbackRate = rate; },
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.music?.pause();
    else this.resumeMusic();
  },
};

// ---------------------------------------------------------------- camera
/** Camera horizontal estilo SMB: so anda para a direita, nunca volta. */
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = VW;
    this.height = VH;
    this.lockLeft = true;
  }
  follow(targetCenterX, worldWidth) {
    const desired = targetCenterX - this.width * 0.5;
    if (!this.lockLeft || desired > this.x) this.x = desired;
    this.clamp(worldWidth);
  }
  centerOn(targetCenterX, worldWidth) {
    this.x = targetCenterX - this.width * 0.5;
    this.clamp(worldWidth);
  }
  clamp(worldWidth) {
    this.x = Math.min(Math.max(this.x, 0), Math.max(0, worldWidth - this.width));
  }
  apply(ctx) { ctx.setTransform(1, 0, 0, 1, -Math.round(this.x), -Math.round(this.y)); }
}

// ---------------------------------------------------------------- sessao e recorde
export const PowerState = { Small: 0, Big: 1, Fire: 2 };

/** Estado da partida atual (vidas, pontos, moedas, poder, checkpoint). */
export class GameSession {
  constructor(character) {
    this.character = character;
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.coins = 0;
    this.power = PowerState.Small;
    this.checkpointReached = false;
  }
  addScore(points) { this.score = Math.min(999999, this.score + points); }
  /** Retorna true quando completou 100 moedas (ganhou vida). */
  addCoin() {
    this.coins++;
    if (this.coins < 100) return false;
    this.coins = 0;
    this.lives++;
    return true;
  }
}

/** Recorde salvo no navegador (localStorage). */
export const SaveData = {
  topScore: 0,
  load() {
    try { this.topScore = parseInt(localStorage.getItem('superdevstar.topscore') ?? '0', 10) || 0; } catch { /* modo privado */ }
  },
  submitScore(score) {
    if (score <= this.topScore) return;
    this.topScore = score;
    try { localStorage.setItem('superdevstar.topscore', String(score)); } catch { /* modo privado */ }
  },
};

/** Utilitario: numero com zeros a esquerda. */
export const pad = (n, len) => String(Math.max(0, n)).padStart(len, '0');
