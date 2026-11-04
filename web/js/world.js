// Mundo: tiles, leitor de fases, decoracao, fundos e Stage (uma area da fase em execucao).
// Equivale a pasta World/ da versao C#.
import { TILE, VW, VH, Assets, Sprites, Gfx, PixelFont, Camera, WHITE, parseHex, Audio } from './core.js';
import {
  Coin, Bug, Virus, Flagpole, Enemy, Item, Coffee, FallingMug, Firewall, SudoStar, Backup, CoinPop, BrickDebris, Layer,
  MovingPlatform, Spring, Spikes, CheckpointPost, Drone,
} from './entities.js';

// ---------------------------------------------------------------- tiles
export const T = {
  Empty: 0, Ground: 1, Brick: 2, Question: 3, Used: 4, Hard: 5, Invisible: 6,
  PipeTopLeft: 7, PipeTopRight: 8, PipeLeft: 9, PipeRight: 10,
  HPipeMouthTop: 11, HPipeMouthBottom: 12, HPipeBodyTop: 13, HPipeBodyBottom: 14,
};
export const Content = { None: 0, Coin: 1, MultiCoin: 2, PowerUp: 3, Star: 4, OneUp: 5 };

export const BUMP_DURATION = 10;
const QUESTION_FRAMES = [0, 0, 0, 1, 2, 1];

export class TileMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = Array.from({ length: width * height }, () => ({
      type: T.Empty, content: Content.None, bump: 0, mcTimer: 0, mcStarted: false, coinsGiven: 0,
    }));
  }
  get widthPx() { return this.width * TILE; }
  get heightPx() { return this.height * TILE; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  at(x, y) { return this.tiles[y * this.width + x]; }

  /** Fora do mapa: laterais sao paredes, acima e abaixo sao vazios (buracos matam). */
  isSolid(x, y) {
    if (x < 0 || x >= this.width) return true;
    if (y < 0 || y >= this.height) return false;
    const t = this.tiles[y * this.width + x].type;
    return t !== T.Empty && t !== T.Invisible;
  }
  isInvisibleBlock(x, y) { return this.inBounds(x, y) && this.at(x, y).type === T.Invisible; }

  update() {
    for (const t of this.tiles) {
      if (t.bump > 0) t.bump--;
      if (t.mcStarted && t.mcTimer > 0) t.mcTimer--;
    }
  }

  draw(ctx, tileSet, cam, frameCounter) {
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(this.width - 1, Math.floor((cam.x + cam.width) / TILE) + 1);
    const qFrame = QUESTION_FRAMES[Math.floor(frameCounter / 8) % QUESTION_FRAMES.length];
    for (let y = 0; y < this.height; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = this.at(x, y);
        if (t.type === T.Empty || t.type === T.Invisible) continue;
        let offset = 0;
        if (t.bump > 0) offset = -Math.sin(((BUMP_DURATION - t.bump) / BUMP_DURATION) * Math.PI) * 5;
        tileSet.draw(ctx, t.type, x * TILE, y * TILE + offset, t.type === T.Question ? qFrame : 0);
      }
    }
  }
}

const TILE_FILES = {
  [T.Ground]: 'ground', [T.Brick]: 'brick', [T.Question]: 'question', [T.Used]: 'used', [T.Hard]: 'hard',
  [T.PipeTopLeft]: 'pipe_top_left', [T.PipeTopRight]: 'pipe_top_right', [T.PipeLeft]: 'pipe_left', [T.PipeRight]: 'pipe_right',
  [T.HPipeMouthTop]: 'hpipe_mouth_top', [T.HPipeMouthBottom]: 'hpipe_mouth_bottom',
  [T.HPipeBodyTop]: 'hpipe_body_top', [T.HPipeBodyBottom]: 'hpipe_body_bottom',
};
export const ALL_TILE_NAMES = Object.values(TILE_FILES);

/**
 * Imagens dos tiles de um tema: Tiles/{tema}/{nome}.png, caindo para Tiles/overworld/{nome}.png.
 */
export class TileSet {
  constructor(theme) {
    this.theme = theme || 'overworld';
    const dark = this.theme === 'underground';
    const pipe = [0, 168, 68, 255];
    const fallback = {
      [T.Ground]: dark ? [40, 96, 168, 255] : [46, 139, 87, 255],
      [T.Brick]: dark ? [72, 120, 200, 255] : [200, 76, 12, 255],
      [T.Question]: [248, 184, 0, 255],
      [T.Used]: [136, 88, 56, 255],
      [T.Hard]: dark ? [90, 110, 150, 255] : [124, 124, 140, 255],
    };
    this.sheets = {};
    for (const [type, name] of Object.entries(TILE_FILES)) {
      const themed = `Tiles/${this.theme}/${name}.png`;
      const path = this.theme === 'overworld' || Assets.exists(themed) ? themed : `Tiles/overworld/${name}.png`;
      this.sheets[type] = Sprites.get(path, 16, 16, fallback[type] ?? pipe);
    }
  }
  draw(ctx, type, x, y, frame) {
    const sheet = this.sheets[type];
    if (!sheet) return;
    sheet.draw(ctx, frame, x, y);
    if (sheet.isPlaceholder && type === T.Question) PixelFont.draw(ctx, '?', x + 5, y + 4, WHITE);
  }
}

// ---------------------------------------------------------------- leitor de fases
/**
 * Formato texto das fases (docs/LEVEL_FORMAT.md):
 *   [level] name/world/time/start   [area id] theme/music/sky/background
 *   [decor id] nome x y [front]     [map id] linhas do mapa   [warps] main 57 9 down -> bonus 2 2 drop
 */
export function parseLevel(id, text) {
  const level = { id, name: 'HELLO WORLD', world: '1-1', time: 400, startArea: 'main', areas: {}, warps: [] };
  const getArea = name => (level.areas[name] ??= {
    id: name, theme: 'overworld', music: 'overworld', sky: [92, 148, 252, 255], rows: [], decor: [], backgrounds: [],
    castle: 'datacenter',
  });
  let section = 'level', area = null, lineNo = 0;

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    lineNo++;
    const line = raw.trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      const parts = line.slice(1, -1).split(' ').filter(Boolean);
      section = (parts[0] ?? '').toLowerCase();
      if (['area', 'map', 'decor'].includes(section)) area = getArea(parts[1] ?? 'main');
      continue;
    }
    if (section === 'map') {
      if (line && !line.startsWith('//')) area.rows.push(raw.trimEnd());
      continue;
    }
    if (!line || line.startsWith('//')) continue;

    const kv = () => {
      const i = line.indexOf('=');
      if (i < 0) throw new Error(`Fase ${id}, linha ${lineNo}: esperado 'chave = valor'`);
      return [line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()];
    };
    if (section === 'level') {
      const [k, v] = kv();
      if (k === 'name') level.name = v;
      else if (k === 'world') level.world = v;
      else if (k === 'time') level.time = parseInt(v, 10);
      else if (k === 'start') level.startArea = v;
    } else if (section === 'area') {
      const [k, v] = kv();
      if (k === 'theme') area.theme = v.toLowerCase();
      else if (k === 'music') area.music = v;
      else if (k === 'sky') area.sky = parseHex(v, area.sky);
      else if (k === 'castle') area.castle = v;     // decoracao do fim da fase (Decor/<nome>.png)
      else if (k === 'background') {
        const p = v.split(' ').filter(Boolean);
        area.backgrounds.push({ path: p[0], parallax: p[1] ? parseFloat(p[1]) : 0.25, y: p[2] ? parseInt(p[2], 10) : 0 });
      }
    } else if (section === 'decor') {
      const p = line.split(' ').filter(Boolean);
      area.decor.push({ name: p[0], tileX: parseInt(p[1], 10), tileY: parseInt(p[2], 10), front: p[3]?.toLowerCase() === 'front' });
    } else if (section === 'warps') {
      const p = line.split(' ').filter(s => s && s !== '->');
      if (p.length < 8) throw new Error(`Fase ${id}, linha ${lineNo}: warp incompleto`);
      level.warps.push({
        fromArea: p[0], fromX: +p[1], fromY: +p[2], direction: p[3].toLowerCase() === 'right' ? 'right' : 'down',
        toArea: p[4], toX: +p[5], toY: +p[6], exit: p[7].toLowerCase() === 'rise' ? 'rise' : 'drop',
      });
    }
  }
  if (!level.areas[level.startArea]) throw new Error(`Fase ${id}: area inicial '${level.startArea}' nao existe.`);
  for (const a of Object.values(level.areas)) if (!a.rows.length) throw new Error(`Fase ${id}: area '${a.id}' sem [map].`);
  return level;
}

/** Imagens que uma fase usa (para pre-carregar antes de jogar). */
export function levelImagePaths(level) {
  const paths = [];
  for (const a of Object.values(level.areas)) {
    for (const d of a.decor) paths.push(`Decor/${d.name}.png`);
    for (const b of a.backgrounds) paths.push(b.path);
    if (a.rows.some(r => r.includes('D'))) paths.push(`Decor/${a.castle}.png`);
  }
  return paths;
}

/** Ordem das fases em assets/Levels/levels.txt. */
export const LevelManager = {
  info: {},   // { id: { id, name, world, background } } lido do cabecalho de cada fase (tela de fases)
  /** Le so o cabecalho das fases (nome e fundo) para a tela de escolha de fase. */
  async loadInfo() {
    await Promise.all(this.order.map(async id => {
      if (this.info[id]) return;
      const text = (await Assets.loadText(`Levels/${id}.txt`)) ?? '';
      const get = key => text.match(new RegExp(String.raw`^\s*${key}\s*=\s*(.+?)\s*(//.*)?$`, 'm'))?.[1];
      const bg = get('background')?.split(' ')[0];
      this.info[id] = { id, name: get('name') ?? id, world: get('world') ?? id, background: bg };
    }));
    await Assets.loadImages(Object.values(this.info).map(i => i.background).filter(Boolean));
  },
  /** A fase esta liberada? A primeira sempre; as outras quando a anterior foi concluida. */
  isUnlocked(id, isCleared) {
    const i = this.order.indexOf(id);
    return i === 0 || (i > 0 && isCleared(this.order[i - 1]));
  },
  order: ['1-1'],
  async init() {
    const txt = await Assets.loadText('Levels/levels.txt');
    if (txt) {
      const ids = txt.replace(/\r/g, '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('//'));
      if (ids.length) this.order = ids;
    }
  },
  get first() { return this.order[0]; },
  next(id) {
    const i = this.order.indexOf(id);
    return i >= 0 && i + 1 < this.order.length ? this.order[i + 1] : null;
  },
  async load(id) {
    const text = await Assets.loadText(`Levels/${id}.txt`);
    if (text == null) throw new Error(`Fase nao encontrada: assets/Levels/${id}.txt`);
    const level = parseLevel(id, text);
    await Assets.loadImages(levelImagePaths(level));
    return level;
  },
};

// ---------------------------------------------------------------- decoracao e fundos
/** Tamanho/cor dos placeholders de decoracao enquanto a arte nao existe. */
const DECOR_CATALOG = {
  cloud_small: [32, 24, [255, 255, 255, 160]], cloud_medium: [48, 24, [255, 255, 255, 160]], cloud_large: [64, 24, [255, 255, 255, 160]],
  hill_small: [48, 24, [40, 110, 80, 200]], hill_large: [80, 40, [40, 110, 80, 200]],
  bush_small: [32, 16, [60, 170, 90, 200]], bush_medium: [48, 16, [60, 170, 90, 200]], bush_large: [64, 16, [60, 170, 90, 200]],
  datacenter: [80, 80, [150, 150, 170, 255]], sign_welcome: [32, 32, [220, 200, 150, 255]], server_rack: [16, 32, [70, 70, 90, 255]],
};

/** Elemento decorativo ancorado pela BASE (a imagem cresce para cima). */
export class DecorInstance {
  constructor(name, x, bottomY, centered, front) {
    Object.assign(this, { name, x, bottomY, centered, front });
  }
  draw(ctx, cam) {
    const img = Assets.image(`Decor/${this.name}.png`);
    const info = DECOR_CATALOG[this.name] ?? [16, 16, [255, 0, 255, 120]];
    const w = img ? img.width : info[0], h = img ? img.height : info[1];
    const x = this.centered ? this.x - w / 2 : this.x, y = this.bottomY - h;
    if (x + w < cam.x - 4 || x > cam.x + cam.width + 4) return;
    if (img) ctx.drawImage(img, Math.floor(x), Math.floor(y));
    else Gfx.placeholder(ctx, Math.floor(x), Math.floor(y), w, h, info[2]);
  }
}

/** Camada de fundo repetida na horizontal, com parallax (coordenadas de tela). */
export class BackgroundLayer {
  constructor(data) { this.data = data; }
  draw(ctx, cam) {
    const img = Assets.image(this.data.path);
    if (!img || !img.width) return;
    let offset = -(cam.x * this.data.parallax) % img.width;
    if (offset > 0) offset -= img.width;
    for (let x = offset; x < cam.width; x += img.width) ctx.drawImage(img, Math.round(x), this.data.y);
  }
}

// ---------------------------------------------------------------- Stage
/**
 * Estado em tempo de execucao de uma area da fase: tiles, entidades, camera e cenario.
 */
export class Stage {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.theme = data.theme;
    const height = data.rows.length;
    const width = Math.max(...data.rows.map(r => r.length));
    this.map = new TileMap(width, height);
    this.tiles = new TileSet(data.theme);
    this.camera = new Camera();
    this.entities = [];
    this.toAdd = [];
    this.decor = [];
    this.backgrounds = data.backgrounds.map(b => new BackgroundLayer(b));
    this.flagpole = null;
    this.playerSpawn = { x: 2, y: 12 };
    this.checkpoint = null;
    this.castleDoor = null;
    this.frameCounter = 0;

    let flagTop = null;
    for (let y = 0; y < height; y++) {
      const row = data.rows[y];
      for (let x = 0; x < width; x++) {
        const c = x < row.length ? row[x] : '.';
        if (c === 'F') flagTop = { x, y };
        else this.build(c, x, y);
      }
    }
    if (flagTop) {
      let bottom = flagTop.y + 1;
      while (bottom < height && !this.map.isSolid(flagTop.x, bottom)) bottom++;
      this.flagpole = new Flagpole(flagTop.x, flagTop.y, bottom);
      this.flagpole.stage = this;
    }
    for (const d of data.decor) this.decor.push(new DecorInstance(d.name, d.tileX * TILE, (d.tileY + 1) * TILE, false, d.front));
    if (this.castleDoor) {
      this.decor.push(new DecorInstance(data.castle ?? 'datacenter', this.castleDoor.x * TILE + TILE / 2, (this.castleDoor.y + 1) * TILE, true, false));
    }
    this.flushSpawns();
  }

  get player() { return this.scene.player; }

  build(c, x, y) {
    const t = this.map.at(x, y);
    const set = (type, content = Content.None) => { t.type = type; t.content = content; };
    switch (c) {
      case '#': set(T.Ground); break;
      case 'B': set(T.Brick); break;
      case 'C': set(T.Brick, Content.MultiCoin); break;
      case 'm': set(T.Brick, Content.PowerUp); break;
      case '*': set(T.Brick, Content.Star); break;
      case 'U': set(T.Brick, Content.OneUp); break;
      case '?': set(T.Question, Content.Coin); break;
      case 'M': set(T.Question, Content.PowerUp); break;
      case 'X': set(T.Hard); break;
      case 'I': set(T.Invisible, Content.OneUp); break;
      case 'i': set(T.Invisible, Content.Coin); break;
      case '[': set(T.PipeTopLeft); break;
      case ']': set(T.PipeTopRight); break;
      case '(': set(T.PipeLeft); break;
      case ')': set(T.PipeRight); break;
      case '{': set(T.HPipeMouthTop); break;
      case '}': set(T.HPipeMouthBottom); break;
      case '~': set(T.HPipeBodyTop); break;
      case '-': set(T.HPipeBodyBottom); break;
      case 'o': this.spawn(new Coin(x * TILE, y * TILE)); break;
      case 'g': this.spawn(new Bug(x * TILE, y * TILE, this.theme)); break;
      case 'k': this.spawn(new Virus(x * TILE, y * TILE, this.theme)); break;
      case 'P': this.playerSpawn = { x, y }; break;
      case 'K': this.checkpoint = { x, y }; this.spawn(new CheckpointPost(x * TILE, y * TILE)); break;
      // fase 1-3 (tema neon) - funcionam em qualquer fase
      case 'J': this.spawn(new Spring(x * TILE, y * TILE)); break;
      case '^': this.spawn(new Spikes(x * TILE, y * TILE)); break;
      case 'd': this.spawn(new Drone(x * TILE, y * TILE)); break;
      case '=': this.spawn(new MovingPlatform(x * TILE, y * TILE + 4, 'h', 64)); break;
      case '|': this.spawn(new MovingPlatform(x * TILE, y * TILE + 4, 'v', 80)); break;
      case 'D': this.castleDoor = { x, y }; break;
    }
  }

  spawn(e) {
    e.stage = this;
    e.applyTheme?.(this.theme);
    this.toAdd.push(e);
  }

  /**
   * Plataformas e molas (entidades com platformTop): so seguram quem cai de cima.
   * Chamado depois que o jogador e as entidades se moveram.
   */
  resolvePlatforms() {
    const p = this.player;
    for (const e of this.entities) {
      if (e.removed || e.platformTop === undefined) continue;
      e.rider = false;
      if (p.mode !== 'normal' || p.vy < 0) continue;
      const top = e.platformTop;
      if (p.right <= e.left + 1 || p.left >= e.right - 1) continue;
      if (p.prevBottom > top + 4 || p.bottom < top) continue;
      p.y = top - p.h;
      p.vy = 0;
      p.onGround = true;
      p.jumping = false;
      p.jumpPose = false;
      p.springRise = 0;
      e.rider = true;
      e.onLanded?.(p);
    }
  }
  flushSpawns() {
    if (!this.toAdd.length) return;
    for (const e of this.toAdd) { e.px = e.x; e.py = e.y; }
    this.entities.push(...this.toAdd);
    this.toAdd = [];
  }
  count(cls) {
    let n = 0;
    for (const e of this.entities) if (!e.removed && e instanceof cls) n++;
    for (const e of this.toAdd) if (!e.removed && e instanceof cls) n++;
    return n;
  }

  update(frozen) {
    this.flushSpawns();
    if (frozen) return;
    this.frameCounter++;
    this.map.update();
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.removed) continue;
      e.px = e.x;
      e.py = e.y;
      e.update();
    }
    this.flagpole?.update();
    this.resolveEnemyCollisions();
    this.flushSpawns();
  }

  resolvePlayerInteractions() {
    const p = this.player;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.removed || !e.interactsWithPlayer) continue;
      if (p.mode !== 'normal') break;
      if (p.intersects(e)) e.onTouchPlayer(p);
    }
  }

  resolveEnemyCollisions() {
    const list = this.entities;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!(a instanceof Enemy) || !a.isActive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!(b instanceof Enemy) || !b.isActive) continue;
        if (!a.isActive) break;
        if (!a.intersects(b)) continue;
        if (a.isMovingShell && b.isMovingShell) {
          a.killFlipped(Math.sign(a.centerX - b.centerX), 500);
          b.killFlipped(Math.sign(b.centerX - a.centerX), 500);
        } else if (a.isMovingShell) this.shellKill(a, b);
        else if (b.isMovingShell) this.shellKill(b, a);
        else {
          // Inimigos que se encostam viram para lados opostos.
          const left = a.centerX <= b.centerX ? a : b;
          const right = left === a ? b : a;
          if (left.vx > 0) left.vx = -left.vx;
          if (right.vx < 0) right.vx = -right.vx;
        }
      }
    }
  }

  shellKill(shell, victim) {
    const points = shell.nextShellComboPoints();
    victim.killFlipped(Math.sign(shell.vx), points > 0 ? points : 0);
    if (points < 0) this.scene.giveOneUp(victim.centerX, victim.top);
  }

  /** O jogador bateu a cabeca no tile (tx, ty). */
  hitBlock(tx, ty, player) {
    if (!this.map.inBounds(tx, ty)) return;
    const t = this.map.at(tx, ty);
    switch (t.type) {
      case T.Question:
      case T.Invisible:
        this.spawnContent(tx, ty, t.content === Content.None ? Content.Coin : t.content, player);
        t.type = T.Used;
        t.content = Content.None;
        t.bump = BUMP_DURATION;
        this.bumpEntitiesAbove(tx, ty);
        break;
      case T.Brick:
        if (t.content === Content.MultiCoin) {
          if (!t.mcStarted) { t.mcStarted = true; t.mcTimer = 240; }
          this.spawnContent(tx, ty, Content.Coin, player);
          t.coinsGiven++;
          t.bump = BUMP_DURATION;
          if (t.mcTimer <= 0 || t.coinsGiven >= 15) { t.type = T.Used; t.content = Content.None; }
          this.bumpEntitiesAbove(tx, ty);
        } else if (t.content !== Content.None) {
          this.spawnContent(tx, ty, t.content, player);
          t.type = T.Used;
          t.content = Content.None;
          t.bump = BUMP_DURATION;
          this.bumpEntitiesAbove(tx, ty);
        } else if (player.isBig) {
          t.type = T.Empty;
          t.bump = 0;
          this.breakBrick(tx, ty);
          this.bumpEntitiesAbove(tx, ty);
        } else {
          t.bump = BUMP_DURATION;
          Audio.play('bump');
          this.bumpEntitiesAbove(tx, ty);
        }
        break;
      default:
        Audio.play('bump');
    }
  }

  breakBrick(tx, ty) {
    Audio.play('break');
    this.scene.addScore(50, 0, 0, false);
    const cx = tx * TILE + 4, cy = ty * TILE + 4;
    this.spawn(new BrickDebris(cx - 4, cy - 4, -1, -6, this.theme));
    this.spawn(new BrickDebris(cx + 4, cy - 4, 1, -6, this.theme));
    this.spawn(new BrickDebris(cx - 4, cy + 4, -1, -4, this.theme));
    this.spawn(new BrickDebris(cx + 4, cy + 4, 1, -4, this.theme));
  }

  spawnContent(tx, ty, content, player) {
    const emerge = item => { this.spawn(item); item.emerge(); };
    switch (content) {
      case Content.Coin:
      case Content.MultiCoin:
        this.spawn(new CoinPop(tx * TILE, ty * TILE - TILE));
        this.scene.collectCoin(tx * TILE + 8, ty * TILE, false);
        break;
      case Content.PowerUp:
        if (player.isBig) emerge(new Firewall(tx * TILE, ty * TILE));
        else {
          // cada dev tem o seu item: cafe, Monster ou gema rosa (sorteado quando ha mais de um)
          const kinds = player.character.powerups ?? ['coffee'];
          emerge(new Coffee(tx * TILE, ty * TILE, kinds[Math.floor(Math.random() * kinds.length)]));
        }
        break;
      case Content.Star: emerge(new SudoStar(tx * TILE, ty * TILE)); break;
      case Content.OneUp: emerge(new Backup(tx * TILE, ty * TILE)); break;
    }
  }

  /** Inimigos em cima de um bloco atingido morrem; itens pulam; moedas sao coletadas. */
  bumpEntitiesAbove(tx, ty) {
    const top = ty * TILE, left = tx * TILE, right = left + TILE, fromX = left + TILE / 2;
    for (const e of this.entities) {
      if (e.removed || e.right <= left || e.left >= right || Math.abs(e.bottom - top) > 3) continue;
      if (e instanceof Enemy) { if (e.isActive) e.onBumpedFromBelow(fromX); }
      else if (e instanceof Item) e.hop(fromX);
      else if (e instanceof Coin) {
        e.removed = true;
        this.spawn(new CoinPop(e.x - 1, e.y));
        this.scene.collectCoin(e.centerX, e.top, false);
      }
    }
  }

  cleanup() { this.entities = this.entities.filter(e => !e.removed); }

  draw(ctx, debug) {
    // Ceu e fundos (coordenadas de tela)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Gfx.rect(ctx, 0, 0, VW, VH, this.data.sky);
    for (const bg of this.backgrounds) bg.draw(ctx, this.camera);

    // Mundo (coordenadas do mapa)
    this.camera.apply(ctx);
    for (const d of this.decor) if (!d.front) d.draw(ctx, this.camera);
    const p = this.player;
    const playerHere = p && p.stage === this;
    for (const e of this.entities) if (e.layer === Layer.Behind && !e.removed) e.draw(ctx);
    if (playerHere && p.behindTiles) p.draw(ctx);
    this.map.draw(ctx, this.tiles, this.camera, this.frameCounter);
    this.flagpole?.draw(ctx);
    for (const e of this.entities) if (e.layer === Layer.Normal && !e.removed) e.draw(ctx);
    if (playerHere && !p.behindTiles) p.draw(ctx);
    for (const e of this.entities) if (e.layer === Layer.Front && !e.removed) e.draw(ctx);
    for (const d of this.decor) if (d.front) d.draw(ctx, this.camera);
    if (debug) {
      for (const e of this.entities) if (!e.removed) e.drawDebug(ctx);
      if (playerHere) p.drawDebug(ctx);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
