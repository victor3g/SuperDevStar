// Telas do jogo. Equivale a pasta Scenes/ da versao C#.
import {
  VW, VH, Gfx, Sprites, PixelFont, Input, Audio, Assets, GameSession, SaveData, PowerState,
  WHITE, YELLOW, BLACK, pad, darken,
} from './core.js';
import { Stage, LevelManager } from './world.js';
import { Player, Frame, WALK_CYCLE, ScorePopup, Explosion, FallingMug } from './entities.js';

class Scene {
  constructor(game) { this.game = game; }
  enter() {}
  exit() {}
  update() {}
  draw(_ctx) {}
}

// =====================================================================
// HUD (layout do SMB)
// =====================================================================
const HUD_COIN_FRAMES = [0, 0, 0, 1, 2, 1];
export const Hud = {
  draw(ctx, session, world, time, frame) {
    let name = session?.character?.name ?? 'DEV';
    if (name.length > 8) name = name.slice(0, 8);
    PixelFont.draw(ctx, name, 16, 8, WHITE, 1, true);
    PixelFont.draw(ctx, pad(session?.score ?? 0, 6), 16, 18, WHITE, 1, true);
    const coin = Sprites.get('UI/hud_coin.png', 8, 8, [252, 200, 40, 255]);
    coin.draw(ctx, HUD_COIN_FRAMES[Math.floor(frame / 8) % HUD_COIN_FRAMES.length], 86, 18);
    PixelFont.draw(ctx, '×' + pad(session?.coins ?? 0, 2), 96, 18, WHITE, 1, true);
    PixelFont.draw(ctx, 'WORLD', 144, 8, WHITE, 1, true);
    PixelFont.drawCentered(ctx, world, 158, 18, WHITE, 1, true);
    PixelFont.draw(ctx, 'TIME', 204, 8, WHITE, 1, true);
    if (time != null) PixelFont.draw(ctx, pad(time, 3), 207, 18, WHITE, 1, true);
  },
};

// =====================================================================
// Titulo
// =====================================================================
const MENU = ['INICIAR JOGO', 'CONTROLES'];
const CONTROLS = [
  'MOVER ............ SETAS / A D',
  'PULAR ............ Z / ESPACO / CIMA',
  'CORRER / ATIRAR .. X / SHIFT',
  'AGACHAR / CANO ... SETA BAIXO',
  'PAUSA ............ ENTER',
  'TELA CHEIA ....... F',
  'SOM LIGA/DESLIGA . M',
  '',
  'CONTROLE: A PULA, X CORRE/ATIRA',
];
const TOUCH_CONTROLS = [
  'LADO ESQUERDO DA TELA:',
  ' ARRASTE PARA ANDAR',
  ' ARRASTE MAIS LONGE = CORRER',
  ' PARA CIMA = PULAR',
  ' PARA BAIXO = AGACHAR / CANO',
  'LADO DIREITO DA TELA:',
  ' TOQUE = PULAR (SEGURE = ALTO)',
  ' DESLIZE = LANCAR PACOTE',
  'TOQUE NO PLACAR = PAUSA',
];
const MENU_Y = 128, MENU_STEP = 16;
const PAUSE_MENU_Y = 196;   // linha do "MENU PRINCIPAL" na tela de pausa

export class TitleScene extends Scene {
  confirm() {
    Audio.play('menu_select');
    if (this.cursor === 0) this.game.changeScene(new CharacterSelectScene(this.game));
    else this.showControls = true;
  }
  /** Toque: no item do menu escolhe ele; em qualquer outro lugar confirma o item atual. */
  onTap(x, y) {
    if (this.showControls) { this.showControls = false; return; }
    const i = Math.floor((y - MENU_Y + 4) / MENU_STEP);
    if (i >= 0 && i < MENU.length && x > 60 && x < 200) this.cursor = i;
    this.confirm();
  }
  enter() {
    this.cursor = 0;
    this.frame = 0;
    this.showControls = false;
    // Sem fundo proprio, usa o skyline da fase.
    this.background = Assets.image('UI/title_background.png') ?? Assets.image('Backgrounds/overworld_far.png');
    this.logo = Assets.image('UI/logo.png');
    Audio.playMusic('title');
  }
  update() {
    this.frame++;
    if (this.showControls) {
      if (Input.wasPressed('confirm') || Input.wasPressed('back')) this.showControls = false;
      return;
    }
    if (Input.wasPressed('up')) { this.cursor = (this.cursor + MENU.length - 1) % MENU.length; Audio.play('menu_move'); }
    if (Input.wasPressed('down')) { this.cursor = (this.cursor + 1) % MENU.length; Audio.play('menu_move'); }
    if (Input.wasPressed('confirm')) this.confirm();
  }
  draw(ctx) {
    if (this.background) ctx.drawImage(this.background, 0, 0, VW, VH, 0, 0, VW, VH);
    else {
      Gfx.rect(ctx, 0, 0, VW, VH, [92, 148, 252, 255]);
      Gfx.rect(ctx, 0, VH - 32, VW, 32, [46, 139, 87, 255]);
    }
    if (this.logo) ctx.drawImage(this.logo, Math.floor((VW - this.logo.width) / 2), 28);
    else {
      Gfx.rect(ctx, 24, 26, VW - 48, 74, [200, 76, 12, 255]);
      Gfx.outline(ctx, 24, 26, VW - 48, 74, [252, 216, 168, 255], 2);
      PixelFont.drawCentered(ctx, 'SUPER DEV', VW / 2, 36, WHITE, 3, true);
      PixelFont.drawCentered(ctx, 'STAR', VW / 2, 64, YELLOW, 3, true);
    }
    if (this.showControls) {
      Gfx.rect(ctx, 12, 104, VW - 24, 120, [0, 0, 0, 200]);
      Gfx.outline(ctx, 12, 104, VW - 24, 120, WHITE);
      (this.game.touch ? TOUCH_CONTROLS : CONTROLS).forEach((line, i) => PixelFont.draw(ctx, line, 20, 110 + i * 11, WHITE));
    } else {
      MENU.forEach((item, i) => {
        const y = MENU_Y + i * MENU_STEP;
        PixelFont.draw(ctx, item, 88, y, WHITE, 1, true);
        if (i === this.cursor && Math.floor(this.frame / 16) % 2 === 0) PixelFont.draw(ctx, '>', 76, y, YELLOW, 1, true);
      });
      PixelFont.drawCentered(ctx, `TOP- ${pad(SaveData.topScore, 6)}`, VW / 2, 184, WHITE, 1, true);
    }
    PixelFont.drawCentered(ctx, '© 2026 SUPER DEV STAR', VW / 2, VH - 12, WHITE, 1, true);
  }
}

// =====================================================================
// Selecao de personagem + perfil
// =====================================================================
const COLUMNS = 4, CARD = 52, CARD_GAP = 8;
const GRAY = [150, 150, 170, 255], CYAN = [120, 220, 255, 255], SOFT = [200, 200, 210, 255];
const PLAY_BTN = { x: 52, y: 208, w: 64, h: 16 }, BACK_BTN = { x: 140, y: 208, w: 64, h: 16 };
const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
/** Frases tipicas entre aspas: "Na minha maquina funciona!" "Ai e mais caro!" */
const quoteText = c => c.quotes.map(q => `"${q}"`).join(' ');

export class CharacterSelectScene extends Scene {
  enter() {
    this.chars = this.game.characters.list;
    this.cursor = 0;
    this.frame = 0;
    this.profile = false;       // mostrando o perfil completo do personagem escolhido
    this.background = Assets.image('UI/select_background.png');
    Audio.playMusic('select');
  }
  get slotCount() { return Math.max(this.game.characters.selectSlots, this.chars.length); }
  at(slot) { return slot < this.chars.length ? this.chars[slot] : null; }
  playable(c) { return c && c.enabled; }

  // ---------------- layout das cartas
  cardRect(slot) {
    const n = this.slotCount;
    const cols = Math.min(COLUMNS, n), rows = Math.ceil(n / COLUMNS);
    const startX = Math.floor((VW - (cols * CARD + (cols - 1) * CARD_GAP)) / 2);
    const rowH = rows > 1 ? CARD + 4 : CARD + 14;
    return { x: startX + (slot % COLUMNS) * (CARD + CARD_GAP), y: 34 + Math.floor(slot / COLUMNS) * rowH, w: CARD, h: CARD };
  }
  get infoTop() {
    const rows = Math.ceil(this.slotCount / COLUMNS);
    return Math.max(106, 34 + rows * (rows > 1 ? CARD + 4 : CARD + 14) + 4);
  }

  // ---------------- acoes
  move(delta) {
    const n = this.slotCount;
    const before = this.cursor;
    this.cursor = Math.min(n - 1, Math.max(0, this.cursor + delta));
    if (before !== this.cursor) Audio.play('menu_move');
  }
  choose() {
    const c = this.at(this.cursor);
    if (!this.playable(c)) { Audio.play('bump'); return; }
    Audio.play('menu_select');
    this.profile = true;
    this.scroll = 0;            // rolagem do texto do perfil (quando nao cabe inteiro)
    this.scrollWait = 120;
    this.scrollManual = false;
  }
  play() {
    const c = this.at(this.cursor);
    Audio.play('menu_select');
    this.game.character = c;
    this.game.changeScene(new LevelSelectScene(this.game));
  }

  update() {
    this.frame++;
    if (this.profile) {
      if (Input.wasPressed('confirm')) this.play();
      else if (Input.wasPressed('back')) { this.profile = false; Audio.play('menu_move'); }
      else if (Input.isDown('down')) this.scrollBy(1.5);
      else if (Input.isDown('up')) this.scrollBy(-1.5);
      return;
    }
    if (Input.wasPressed('left')) this.move(-1);
    if (Input.wasPressed('right')) this.move(1);
    if (Input.wasPressed('up') && this.cursor - COLUMNS >= 0) this.move(-COLUMNS);
    if (Input.wasPressed('down') && this.cursor + COLUMNS < this.slotCount) this.move(COLUMNS);
    if (Input.wasPressed('back')) { this.game.changeScene(new TitleScene(this.game)); return; }
    if (Input.wasPressed('confirm')) this.choose();
  }

  /** Toque: na carta seleciona; tocar de novo na mesma abre o perfil. */
  onTap(x, y) {
    if (this.profile) {
      if (inside(PLAY_BTN, x, y)) this.play();
      else if (inside(BACK_BTN, x, y)) { this.profile = false; Audio.play('menu_move'); }
      return;
    }
    for (let i = 0; i < this.slotCount; i++) {
      if (!inside(this.cardRect(i), x, y)) continue;
      if (i === this.cursor) this.choose();
      else { this.cursor = i; Audio.play('menu_move'); }
      return;
    }
    if (y > VH - 18) { this.game.changeScene(new TitleScene(this.game)); return; }   // "VOLTAR" no rodape
    if (y >= this.infoTop) this.choose();
  }
  onSwipe(dir) { if (!this.profile) this.move(dir); }
  /** Rolagem manual do texto do perfil (setas ou arrastar o dedo); a automatica para. */
  scrollBy(dy) {
    this.scrollManual = true;
    this.scroll = Math.max(0, Math.min(this.scrollMax ?? 0, this.scroll + dy));
  }
  onDrag(dy) { if (this.profile) this.scrollBy(-dy); }

  // ---------------- desenho
  drawBackground(ctx) {
    if (this.background) ctx.drawImage(this.background, 0, 0);
    else {
      Gfx.rect(ctx, 0, 0, VW, VH, [11, 16, 38, 255]);
      const grid = [30, 50, 90, 255];
      for (let x = 0; x < VW; x += 16) Gfx.rect(ctx, x, 0, 1, VH, grid);
      for (let y = Math.floor(this.frame / 2) % 16; y < VH; y += 16) Gfx.rect(ctx, 0, y, VW, 1, grid);
      // O select_background.png ja traz o titulo desenhado no topo.
      PixelFont.drawCentered(ctx, 'ESCOLHA SEU DEV', VW / 2, 10, YELLOW, 2, true);
    }
  }

  draw(ctx) {
    this.drawBackground(ctx);
    if (this.profile) { this.drawProfile(ctx, this.at(this.cursor)); return; }
    for (let i = 0; i < this.slotCount; i++) this.drawCard(ctx, i, this.cardRect(i));
    this.drawInfo(ctx, this.infoTop);
    const hint = this.game.touch ? 'TOQUE NA CARTA: PERFIL        < VOLTAR' : '< > ESCOLHER   ENTER PERFIL   ESC VOLTAR';
    PixelFont.drawCentered(ctx, hint, VW / 2, VH - 12, WHITE);
  }

  drawCard(ctx, slot, r) {
    const c = this.at(slot), selected = slot === this.cursor;
    Gfx.rect(ctx, r.x, r.y, r.w, r.h, [20, 28, 60, 255]);
    const ix = r.x + 2, iy = r.y + 2, iw = r.w - 4, ih = r.h - 4;
    if (!this.playable(c)) {
      Gfx.rect(ctx, ix, iy, iw, ih, [30, 30, 40, 255]);
      PixelFont.drawCentered(ctx, '?', ix + iw / 2, iy + 10, [90, 90, 110, 255], 3);
      PixelFont.drawCentered(ctx, 'EM BREVE', ix + iw / 2, iy + ih - 10, [120, 120, 140, 255]);
    } else if (c.portrait) {
      ctx.drawImage(c.portrait, ix, iy, iw, ih);
    } else {
      Gfx.rect(ctx, ix, iy, iw, ih, darken(c.color, 0.4));
      c.small.draw(ctx, Frame.Idle, ix + iw / 2 - c.small.fw, iy + 6, { scale: 2 });
      PixelFont.drawCentered(ctx, c.name.slice(0, 6), ix + iw / 2, iy + ih - 9, WHITE, 1, true);
    }
    const border = selected ? (Math.floor(this.frame / 8) % 2 === 0 ? YELLOW : WHITE) : [80, 90, 130, 255];
    Gfx.outline(ctx, r.x, r.y, r.w, r.h, border, selected ? 2 : 1);
    if (selected) PixelFont.drawCentered(ctx, 'V', r.x + r.w / 2, r.y - 9 + Math.floor(this.frame / 10) % 2, YELLOW);
  }

  drawInfo(ctx, top) {
    const px = 8, pw = VW - 16, ph = VH - 20 - top;
    Gfx.rect(ctx, px, top, pw, ph, [0, 0, 0, 170]);
    Gfx.outline(ctx, px, top, pw, ph, [80, 90, 130, 255]);
    const c = this.at(this.cursor);
    if (!this.playable(c)) {
      PixelFont.drawCentered(ctx, 'NOVO DEV CHEGANDO', px + pw / 2, top + 24, GRAY);
      PixelFont.drawCentered(ctx, 'EM BREVE NO TIME!', px + pw / 2, top + 40, GRAY);
      return;
    }
    // Preview animado andando (versao grande). Celulas de 32 px tem o corpo no meio.
    const previewX = px + 12 - (c.big.fw - 16);
    c.big.draw(ctx, WALK_CYCLE[Math.floor(this.frame / 7) % WALK_CYCLE.length], previewX, top + 12, { scale: 2 });
    const tx = Math.max(px + 56, previewX + c.big.fw * 2 + 6), maxW = px + pw - tx - 6;
    let y = top + 8;
    PixelFont.draw(ctx, c.name, tx, y, YELLOW, 1, true);
    y += 12;
    if (c.role) { PixelFont.draw(ctx, c.role, tx, y, WHITE); y += 10; }
    if (c.stack) { PixelFont.draw(ctx, 'STACK: ' + c.stack, tx, y, CYAN); y += 10; }
    y += 4;
    y = this.drawStats(ctx, c, tx, y, 3);
    if (c.quotes.length) {
      y += 2;
      for (const line of PixelFont.wrap(quoteText(c), maxW).slice(0, 2)) { PixelFont.draw(ctx, line, tx, y, SOFT); y += 10; }
    }
  }

  /** Barras de atributos (0 a 5). Rotulos de ate 12 letras. */
  drawStats(ctx, c, x, y, maxLines = 4, lineH = 10) {
    for (const s of (c.stats ?? []).slice(0, maxLines)) {
      PixelFont.draw(ctx, s.label, x, y, SOFT);
      const bx = x + 76;                          // rotulo de ate 12 letras
      for (let i = 0; i < 5; i++) Gfx.rect(ctx, bx + i * 9, y, 7, 7, i < s.value ? YELLOW : [50, 55, 80, 255]);
      y += lineH;
    }
    return y;
  }

  drawProfile(ctx, c) {
    Gfx.rect(ctx, 6, 26, VW - 12, VH - 30, [0, 0, 0, 200]);
    Gfx.outline(ctx, 6, 26, VW - 12, VH - 30, [80, 120, 200, 255]);
    // retrato
    const PORTRAIT = 72;
    if (c.portrait) ctx.drawImage(c.portrait, 14, 34, PORTRAIT, PORTRAIT);
    else c.big.draw(ctx, Frame.Idle, 14 + PORTRAIT / 2 - c.big.fw, 34, { scale: 2 });
    Gfx.outline(ctx, 13, 33, PORTRAIT + 2, PORTRAIT + 2, CYAN);
    // nome, cargo, stack e atributos ao lado do retrato
    const tx = 14 + PORTRAIT + 8, maxW = VW - 14 - tx;
    PixelFont.draw(ctx, c.name, tx, 34, YELLOW, PixelFont.measure(c.name, 2) <= maxW ? 2 : 1, true);
    let y = 52;
    PixelFont.draw(ctx, PixelFont.wrap(c.role, maxW)[0] ?? '', tx, y, WHITE); y += 10;
    if (c.stack) { PixelFont.draw(ctx, PixelFont.wrap(c.stack, maxW)[0], tx, y, CYAN); y += 10; }
    y = this.drawStats(ctx, c, tx, y + 3, 4, 9);
    // textos do perfil (largura toda, abaixo do retrato). Nada e cortado: se nao couber, o texto rola.
    const top = Math.max(y + 3, 34 + PORTRAIT + 6);
    const left = 14, width = VW - 28, LINE = 9;
    const BOTTOM = 204;                                  // abaixo disso ficam os botoes
    const lines = [];                                    // [texto, cor, rotulo]
    const block = (label, text, color) => {
      if (!text) return;
      PixelFont.wrap(label ? `${label} ${text}` : text, width).forEach((l, i) => lines.push([l, color, i === 0 ? label : '']));
      lines.push(null);                                  // espaco entre blocos
    };
    block('SUPERPODER:', c.superpower, WHITE);
    block('PONTO FRACO:', c.weakness, WHITE);
    block('', c.description, SOFT);
    if (c.quotes.length) block('', quoteText(c), CYAN);
    if (lines.at(-1) === null) lines.pop();
    const contentH = lines.reduce((h, l) => h + (l ? LINE : 3), 0);
    this.scrollMax = Math.max(0, contentH - (BOTTOM - top));
    if (this.scrollMax > 0 && !this.scrollManual) {
      // espera, rola devagar ate o fim, espera e volta ao comeco
      if (this.scrollWait > 0) this.scrollWait--;
      else if (this.scroll < this.scrollMax) { this.scroll = Math.min(this.scrollMax, this.scroll + 0.25); if (this.scroll >= this.scrollMax) this.scrollWait = 150; }
      else { this.scroll = 0; this.scrollWait = 150; }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, BOTTOM - top);
    ctx.clip();
    let ly = top - Math.round(this.scroll ?? 0);
    for (const l of lines) {
      if (!l) { ly += 3; continue; }
      const [text, color, label] = l;
      if (ly > top - LINE && ly < BOTTOM) {
        if (label) {
          PixelFont.draw(ctx, label, left, ly, YELLOW);
          PixelFont.draw(ctx, text.slice(label.length), left + PixelFont.measure(label) + 1, ly, color);
        } else PixelFont.draw(ctx, text, left, ly, color);
      }
      ly += LINE;
    }
    ctx.restore();
    if (this.scrollMax > 0) {
      // barrinha de rolagem a direita
      const trackH = BOTTOM - top, barH = Math.max(8, trackH * (trackH / contentH));
      const barY = top + (trackH - barH) * ((this.scroll ?? 0) / this.scrollMax);
      Gfx.rect(ctx, VW - 11, top, 2, trackH, [40, 50, 80, 255]);
      Gfx.rect(ctx, VW - 11, Math.round(barY), 2, Math.round(barH), CYAN);
    }
    // botoes
    const blink = Math.floor(this.frame / 12) % 2 === 0;
    for (const [b, label, on] of [[PLAY_BTN, 'JOGAR', true], [BACK_BTN, 'VOLTAR', false]]) {
      Gfx.rect(ctx, b.x, b.y, b.w, b.h, on ? [30, 90, 40, 255] : [40, 40, 60, 255]);
      Gfx.outline(ctx, b.x, b.y, b.w, b.h, on && blink ? YELLOW : WHITE);
      PixelFont.drawCentered(ctx, label, b.x + b.w / 2, b.y + 5, WHITE);
    }
    if (!this.game.touch) PixelFont.drawCentered(ctx, 'ENTER JOGAR   ESC VOLTAR', VW / 2, 228, GRAY);
  }
}

// =====================================================================
// Escolha de fase. As fases sao independentes (cada uma comeca do zero: 3 vidas, Junior, 0 pontos),
// mas seguem a ordem de levels.txt: a proxima so libera quando a anterior e concluida.
// =====================================================================
const LS_TOP = 50, LS_CARD_H = 40, LS_GAP = 6, LS_VISIBLE = 3;

export class LevelSelectScene extends Scene {
  /** focus: fase que comeca selecionada; unlocked: fase recem-liberada (mostra o aviso). */
  constructor(game, focus = null, unlocked = null) {
    super(game);
    this.focus = focus;
    this.unlocked = unlocked;
  }
  enter() {
    this.frame = 0;
    this.ids = LevelManager.order;
    // comeca na fase pedida ou na primeira liberada e ainda nao concluida
    const firstNew = this.ids.find(id => this.isOpen(id) && !SaveData.isCleared(id));
    this.cursor = Math.max(0, this.ids.indexOf(this.focus ?? firstNew ?? this.ids[0]));
    LevelManager.loadInfo();
    Audio.playMusic('select');
  }
  isOpen(id) { return LevelManager.isUnlocked(id, x => SaveData.isCleared(x)); }
  get first() { return Math.max(0, Math.min(this.cursor - 1, this.ids.length - LS_VISIBLE)); }
  cardRect(i) {
    const row = i - this.first;
    return { x: 20, y: LS_TOP + row * (LS_CARD_H + LS_GAP), w: VW - 40, h: LS_CARD_H };
  }

  move(d) {
    const before = this.cursor;
    this.cursor = Math.max(0, Math.min(this.ids.length - 1, this.cursor + d));
    if (before !== this.cursor) Audio.play('menu_move');
  }
  play() {
    const id = this.ids[this.cursor];
    if (!this.isOpen(id)) { Audio.play('bump'); return; }
    Audio.play('menu_select');
    this.game.session = new GameSession(this.game.character);   // fase independente: comeca do zero
    this.game.session.levelId = id;
    this.game.changeScene(new LevelIntroScene(this.game, id));
  }
  back() {
    Audio.play('menu_move');
    this.game.changeScene(new CharacterSelectScene(this.game));
  }
  update() {
    this.frame++;
    if (Input.wasPressed('up') || Input.wasPressed('left')) this.move(-1);
    if (Input.wasPressed('down') || Input.wasPressed('right')) this.move(1);
    if (Input.wasPressed('confirm')) this.play();
    else if (Input.wasPressed('back')) this.back();
  }
  /** Toque: na fase seleciona; tocar de novo na mesma joga. */
  onTap(x, y) {
    if (y > VH - 18) { this.back(); return; }
    for (let i = this.first; i < Math.min(this.ids.length, this.first + LS_VISIBLE); i++) {
      if (!inside(this.cardRect(i), x, y)) continue;
      if (i === this.cursor) this.play();
      else { this.cursor = i; Audio.play('menu_move'); }
      return;
    }
  }
  onSwipe(dir) { this.move(dir); }

  draw(ctx) {
    Gfx.rect(ctx, 0, 0, VW, VH, [11, 16, 38, 255]);
    const grid = [24, 36, 72, 255];
    for (let x = 0; x < VW; x += 16) Gfx.rect(ctx, x, 0, 1, VH, grid);
    for (let y = Math.floor(this.frame / 2) % 16; y < VH; y += 16) Gfx.rect(ctx, 0, y, VW, 1, grid);
    PixelFont.drawCentered(ctx, 'ESCOLHA A FASE', VW / 2, 10, YELLOW, 2, true);
    const c = this.game.character;
    if (c) PixelFont.drawCentered(ctx, `DEV: ${c.name}   RECORDE ${pad(SaveData.topScore, 6)}`, VW / 2, 32, SOFT);
    for (let i = this.first; i < Math.min(this.ids.length, this.first + LS_VISIBLE); i++) this.drawCard(ctx, i, this.cardRect(i));
    // setas quando ha mais fases fora da tela
    if (this.first > 0) PixelFont.drawCentered(ctx, '^', VW / 2, LS_TOP - 9, CYAN);
    if (this.first + LS_VISIBLE < this.ids.length) PixelFont.drawCentered(ctx, 'V', VW / 2, LS_TOP + LS_VISIBLE * (LS_CARD_H + LS_GAP) - 4, CYAN);
    if (this.unlocked && Math.floor(this.frame / 20) % 3 !== 0) {
      const w = LevelManager.info[this.unlocked]?.world ?? this.unlocked;
      PixelFont.drawCentered(ctx, `FASE ${w} LIBERADA!`, VW / 2, 200, [120, 255, 140, 255], 1, true);
    }
    const hint = this.game.touch ? 'TOQUE: SELECIONA / JOGA     < VOLTAR' : 'SETAS ESCOLHER  ENTER JOGAR  ESC VOLTAR';
    PixelFont.drawCentered(ctx, hint, VW / 2, VH - 12, WHITE);
  }
  drawCard(ctx, i, r) {
    const id = this.ids[i], info = LevelManager.info[id] ?? { name: '...', world: id };
    const open = this.isOpen(id), done = SaveData.isCleared(id), selected = i === this.cursor;
    Gfx.rect(ctx, r.x, r.y, r.w, r.h, open ? [16, 24, 56, 240] : [20, 20, 28, 240]);
    // miniatura: um pedaco do fundo da fase
    const img = info.background && Assets.image(info.background);
    const tw = 56, th = r.h - 6;
    if (img) ctx.drawImage(img, Math.floor(img.width * 0.08), Math.floor(img.height * 0.3), tw * 2, th * 2, r.x + 3, r.y + 3, tw, th);
    else Gfx.rect(ctx, r.x + 3, r.y + 3, tw, th, [40, 60, 110, 255]);
    if (!open) Gfx.rect(ctx, r.x + 3, r.y + 3, tw, th, [0, 0, 0, 170]);
    const tx = r.x + tw + 10;
    PixelFont.draw(ctx, info.world, tx, r.y + 5, open ? YELLOW : GRAY);
    PixelFont.draw(ctx, info.name, tx + 24, r.y + 5, open ? WHITE : GRAY);
    if (done) {
      PixelFont.draw(ctx, 'CONCLUIDA', tx, r.y + 18, [120, 255, 140, 255]);
      PixelFont.draw(ctx, `MELHOR ${pad(SaveData.cleared[id], 6)}`, tx, r.y + 28, SOFT);
    } else if (open) {
      PixelFont.draw(ctx, 'NOVA!', tx, r.y + 18, CYAN);
    } else {
      const prev = this.ids[i - 1];
      PixelFont.draw(ctx, 'BLOQUEADA', tx, r.y + 18, GRAY);
      PixelFont.draw(ctx, `CONCLUA A ${LevelManager.info[prev]?.world ?? prev}`, tx, r.y + 28, GRAY);
      // cadeado sobre a miniatura
      const lx = r.x + 3 + tw / 2 - 5, ly = r.y + 16;
      Gfx.outline(ctx, lx + 2, ly - 6, 6, 7, GRAY);
      Gfx.rect(ctx, lx, ly, 10, 9, GRAY);
    }
    const border = selected ? (Math.floor(this.frame / 8) % 2 === 0 ? YELLOW : WHITE) : [70, 80, 120, 255];
    Gfx.outline(ctx, r.x, r.y, r.w, r.h, border, selected ? 2 : 1);
  }
}

// =====================================================================
// Intro da fase ("WORLD 1-1  x 3") - tambem carrega a fase
// =====================================================================
export class LevelIntroScene extends Scene {
  constructor(game, levelId, timeUp = false) {
    super(game);
    this.levelId = levelId;
    this.timeUp = timeUp;
  }
  enter() {
    Audio.stopMusic();
    this.timer = this.timeUp ? 240 : 150;
    this.level = null;
    this.error = null;
    LevelManager.load(this.levelId).then(l => { this.level = l; }).catch(e => { this.error = e.message; console.error(e); });
  }
  update() {
    if (this.error) {
      if (Input.wasPressed('confirm') || Input.wasPressed('back')) this.game.changeScene(new LevelSelectScene(this.game, this.levelId));
      return;
    }
    if (this.timer > 0) this.timer--;
    if (this.timeUp && this.timer <= 150) this.timeUp = false;
    if (this.timer <= 0 && this.level) this.game.changeScene(new GameplayScene(this.game, this.level));
  }
  draw(ctx) {
    Gfx.rect(ctx, 0, 0, VW, VH, BLACK);
    Hud.draw(ctx, this.game.session, this.level?.world ?? this.levelId, null, 0);
    if (this.error) {
      PixelFont.drawCentered(ctx, 'ERRO AO CARREGAR A FASE', VW / 2, 80, [255, 90, 90, 255]);
      PixelFont.wrap(this.error, VW - 24).forEach((l, i) => PixelFont.drawCentered(ctx, l, VW / 2, 100 + i * 10, WHITE));
      PixelFont.drawCentered(ctx, 'ENTER PARA VOLTAR', VW / 2, 200, WHITE);
    } else if (this.timeUp) {
      PixelFont.drawCentered(ctx, 'TIME UP', VW / 2, 110, WHITE, 2);
    } else if (this.level) {
      PixelFont.drawCentered(ctx, `WORLD ${this.level.world}`, VW / 2, 80, WHITE);
      PixelFont.drawCentered(ctx, this.level.name, VW / 2, 94, [120, 220, 255, 255]);
      const s = this.game.session;
      const sheet = s.power === PowerState.Fire ? s.character.fire : s.power === PowerState.Big ? s.character.big : s.character.small;
      sheet.draw(ctx, Frame.Idle, 108 - sheet.fw / 2, 136 - sheet.fh);
      PixelFont.draw(ctx, `×  ${s.lives}`, 126, 126, WHITE);
    } else {
      PixelFont.drawCentered(ctx, 'CARREGANDO...', VW / 2, 110, WHITE);
    }
  }
}

// =====================================================================
// Gameplay
// =====================================================================
const STOMP_POINTS = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
const FRAMES_PER_TIME_UNIT = 24; // 1 unidade de tempo do SMB = 0,4 s

export class GameplayScene extends Scene {
  constructor(game, level) {
    super(game);
    this.level = level;
    this.stages = {};
    this.state = 'playing';   // playing, paused, dying, warping, flag, tally, fireworks, cleared
    this.timer = 0;
    this.timeTick = 0;
    this.fireworks = 0;
    this.timeAtFlag = 0;
    this.hurry = false;
    this.timeUp = false;
    this.warp = null;
    this.hint = null;          // { text, timer } mensagem curta no topo da tela
    this.lastPower = null;
    this.growthItemName = 'CAFE'; // ultimo item que fez virar Senior (cafe, Monster, gema...)
    this.mugTimer = 0;             // proxima caneca de cafe caindo (so personagens com coffeeHurts)
    this.mugHintShown = false;
    // Trocou de app / aba: pausa sozinho.
    this.onVisibility = () => { if (document.hidden && this.state === 'playing') this.pause(); };
  }
  get session() { return this.game.session; }
  get isGameplay() { return true; }
  get paused() { return this.state === 'paused'; }

  pause() {
    this.state = 'paused';
    Audio.pauseMusic();
    Audio.play('pause');
  }
  resume() {
    this.state = 'playing';
    Audio.resumeMusic();
    Audio.play('pause');
  }
  /** Toque com o jogo pausado: "MENU PRINCIPAL" volta ao titulo; qualquer outro lugar continua. */
  onTap(x, y) {
    if (!this.paused) return;
    if (y >= PAUSE_MENU_Y - 6 && y <= PAUSE_MENU_Y + 12) { Audio.stopMusic(); this.game.changeScene(new LevelSelectScene(this.game, this.level.id)); }
    else this.resume();
  }
  showHint(text, frames = 240) { this.hint = { text, timer: frames }; }

  /** Avisos quando o poder muda (o do Firewall ensina a atirar). */
  checkPowerHints() {
    const p = this.player;
    if (this.lastPower !== null && p.power > this.lastPower) {
      if (p.power === PowerState.Fire) {
        this.showHint(this.game.touch ? 'FIREWALL! DESLIZE O DEDO PARA ATIRAR' : 'FIREWALL! APERTE X PARA ATIRAR', 300);
      } else if (p.power === PowerState.Big) this.showHint(`${this.growthItemName}! AGORA VOCE E SENIOR`);
    }
    this.lastPower = p.power;
  }

  exit() { document.removeEventListener('visibilitychange', this.onVisibility); }

  enter() {
    document.addEventListener('visibilitychange', this.onVisibility);
    this.time = this.level.time;
    this.player = new Player(this.session.character, this.session.power);
    this.stage = this.getStage(this.level.startArea);
    this.player.stage = this.stage;
    let spawn = this.stage.playerSpawn;
    if (this.session.checkpointReached && this.stage.checkpoint) spawn = this.stage.checkpoint;
    this.player.placeAtTile(spawn.x, spawn.y);
    this.stage.camera.centerOn(this.player.centerX, this.stage.map.widthPx);
    this.mugTimer = 360;                                             // primeira caneca ~6 s apos entrar
    this.playAreaMusic();
  }

  /**
   * Evento do David (personagem com "coffeeHurts"): de tempos em tempos uma caneca de cafe cai
   * perto dele, um pouco a frente de onde ele esta indo. Encostar machuca, entao e preciso desviar.
   */
  updateMugs() {
    const p = this.player, st = this.stage;
    if (!p.character.coffeeHurts || this.state !== 'playing' || p.mode !== 'normal') return;
    if (--this.mugTimer > 0) return;
    this.mugTimer = 480 + Math.floor(Math.random() * 360);          // a cada 8 a 14 segundos
    if (st.flagpole && p.centerX > st.flagpole.poleX - 128) return;  // perto do fim: deixa em paz
    if (st.entities.filter(e => e instanceof FallingMug && !e.removed).length >= 2) return;
    const cam = st.camera, map = st.map;
    for (let tries = 0; tries < 6; tries++) {
      const aim = p.centerX + p.vx * 40 + Math.random() * 72 - 28;
      const cx = Math.max(cam.x + 16, Math.min(cam.x + VW - 16, aim));
      const tx = Math.floor(cx / 16);
      let ty = 3;                                                   // abaixo do placar
      while (ty < map.height && map.isSolid(tx, ty)) ty++;          // subsolo: comeca abaixo do teto
      if (ty * 16 > p.top - 32) continue;                           // sem espaco acima do jogador
      st.spawn(new FallingMug(tx * 16 + 8, ty * 16));
      if (!this.mugHintShown) {
        this.mugHintShown = true;
        this.showHint(`${p.character.name} NAO PODE TOMAR CAFE! DESVIE`, 240);
      }
      return;
    }
    this.mugTimer = 60;                                             // sem espaco agora: tenta de novo em 1 s
  }
  getStage(id) {
    if (!this.stages[id]) {
      const data = this.level.areas[id];
      if (!data) throw new Error(`Area '${id}' nao existe na fase ${this.level.id}.`);
      this.stages[id] = new Stage(this, data);
    }
    return this.stages[id];
  }
  playAreaMusic() {
    Audio.playMusic(this.player.invincible ? 'star' : this.stage.data.music);
    if (this.hurry) Audio.setMusicSpeed(1.25);
  }

  update() {
    if (this.state === 'paused') {
      if (Input.wasPressed('start')) this.resume();
      else if (Input.wasPressed('back')) { Audio.stopMusic(); this.game.changeScene(new LevelSelectScene(this.game, this.level.id)); }
      return;
    }
    if (this.hint && --this.hint.timer <= 0) this.hint = null;
    if (this.state === 'warping') { this.updateWarp(); return; }
    if (this.state === 'playing' && (Input.wasPressed('start') || Input.wasPressed('back'))) {
      this.pause();
      return;
    }
    this.checkPowerHints();

    const p = this.player;
    const frozen = p.mode === 'growing' || p.mode === 'shrinking' || p.mode === 'dying';
    p.px = p.x;
    p.py = p.y;
    p.update();
    if (this.state === 'warping') return;

    this.stage.update(frozen);
    if (!frozen) this.stage.resolvePlatforms();
    if (!frozen) this.updateMugs();
    if (!frozen && p.mode === 'normal') {
      this.stage.resolvePlayerInteractions();
      this.checkFlagpole();
      this.checkCheckpoint();
    }
    if (p.mode !== 'dying') this.stage.camera.follow(p.centerX, this.stage.map.widthPx);
    this.stage.cleanup();

    switch (this.state) {
      case 'playing': this.updateTime(); break;
      case 'dying': if (p.deathFinished) this.onLifeLost(); break;
      case 'flag': if (p.mode === 'inCastle') this.state = 'tally'; break;
      case 'tally': this.updateTally(); break;
      case 'fireworks': this.updateFireworks(); break;
      case 'cleared': if (--this.timer <= 0) this.goToNextLevel(); break;
    }
  }

  updateTime() {
    if (this.player.mode !== 'normal') return;
    if (++this.timeTick < FRAMES_PER_TIME_UNIT) return;
    this.timeTick = 0;
    this.time--;
    if (this.time === 100 && !this.hurry) {
      this.hurry = true;
      Audio.play('hurry');
      Audio.setMusicSpeed(1.25);
    }
    if (this.time <= 0) {
      this.time = 0;
      this.timeUp = true;
      this.killPlayer(false);
    }
  }
  checkCheckpoint() {
    const cp = this.stage.checkpoint;
    if (this.session.checkpointReached || !cp) return;
    if (this.stage.data.id.toLowerCase() !== this.level.startArea.toLowerCase()) return;
    if (this.player.centerX >= cp.x * 16) this.session.checkpointReached = true;
  }
  checkFlagpole() {
    const pole = this.stage.flagpole;
    if (!pole || !pole.touches(this.player)) return;
    this.addScore(pole.scoreFor(this.player), pole.poleX + 12, this.player.top);
    this.timeAtFlag = this.time;
    this.player.grabFlag(pole);
    pole.lowering = true;
    Audio.stopMusic();
    Audio.play('flagpole');
    this.state = 'flag';
  }
  updateTally() {
    if (this.time > 0) {
      const step = Math.min(this.time, 2);
      this.time -= step;
      this.session.addScore(50 * step);
      if (this.time % 6 === 0) Audio.play('tick');
      return;
    }
    const digit = this.timeAtFlag % 10;
    this.fireworks = [1, 3, 6].includes(digit) ? digit : 0;
    this.timer = 30;
    this.state = 'fireworks';
  }
  updateFireworks() {
    if (--this.timer > 0) return;
    if (this.fireworks > 0) {
      this.fireworks--;
      const door = this.stage.castleDoor;
      const baseX = door ? door.x * 16 + 8 : this.stage.camera.x + 200;
      this.stage.spawn(new Explosion(baseX + Math.floor(Math.random() * 97) - 48, 40 + Math.floor(Math.random() * 61), true));
      Audio.play('firework');
      this.session.addScore(500);
      this.timer = 30;
      return;
    }
    this.state = 'cleared';
    this.timer = 150;
  }
  /** Fase concluida: salva o progresso e volta para a escolha de fase (ja na proxima). */
  goToNextLevel() {
    const id = this.level.id, next = LevelManager.next(id);
    const allDoneBefore = LevelManager.order.every(x => SaveData.isCleared(x));
    const firstTime = SaveData.clearLevel(id, this.session.score);
    const allDone = LevelManager.order.every(x => SaveData.isCleared(x));
    if (allDone && !allDoneBefore) { this.game.changeScene(new EndingScene(this.game)); return; }
    this.game.changeScene(new LevelSelectScene(this.game, next ?? id, firstTime && next ? next : null));
  }
  onLifeLost() {
    this.session.lives--;
    this.session.power = PowerState.Small;
    if (this.session.lives <= 0) {
      SaveData.submitScore(this.session.score);
      this.game.changeScene(new GameOverScene(this.game));
    } else {
      this.game.changeScene(new LevelIntroScene(this.game, this.level.id, this.timeUp));
    }
  }

  // ---------------- canos
  beginWarp(warp) {
    this.warp = warp;
    this.state = 'warping';
    this.timer = 40;
    Audio.stopMusic();
  }
  updateWarp() {
    this.timer--;
    if (this.timer === 20) {
      this.stage = this.getStage(this.warp.toArea);
      this.player.stage = this.stage;
      if (this.warp.exit === 'rise') this.player.beginPipeExit(this.warp.toX, this.warp.toY);
      else this.player.dropAt(this.warp.toX, this.warp.toY);
      this.stage.camera.x = 0;
      this.stage.camera.centerOn(this.player.centerX, this.stage.map.widthPx);
    }
    if (this.timer <= 0) {
      this.state = 'playing';
      this.playAreaMusic();
    }
  }

  // ---------------- API usada pelas entidades
  addScore(points, x, y, popup = true) {
    this.session.addScore(points);
    if (popup) this.stage.spawn(new ScorePopup(String(points), x, y));
  }
  awardStomp(p, x, y) {
    const i = p.stompCombo++;
    if (i < STOMP_POINTS.length) this.addScore(STOMP_POINTS[i], x, y);
    else this.giveOneUp(x, y);
  }
  collectCoin(x, y, popup) {
    Audio.play('coin');
    this.session.addScore(200);
    if (this.session.addCoin()) Audio.play('1up');
    if (popup) this.stage.spawn(new ScorePopup('200', x, y));
  }
  giveOneUp(x, y) {
    this.session.lives++;
    Audio.play('1up');
    this.stage.spawn(new ScorePopup('1UP', x, y));
  }
  killPlayer(pit) {
    if (this.player.mode === 'dying') return;
    this.player.startDeath(pit);
    Audio.stopMusic();
    Audio.play('die');
    this.state = 'dying';
  }
  onStarCollected() {
    Audio.playMusic('star');
    this.showHint('SUDO STAR: MODO ROOT ATIVADO!', 180);
  }
  onStarEnded() {
    Audio.playMusic(this.stage.data.music);
    if (this.hurry) Audio.setMusicSpeed(1.25);
  }
  onPlayerLeftPole() { Audio.playMusic('stage_clear', false); }

  draw(ctx) {
    const black = this.state === 'warping' && this.timer <= 32 && this.timer > 8;
    if (black) Gfx.rect(ctx, 0, 0, VW, VH, BLACK);
    else this.stage.draw(ctx, this.game.debug);
    Hud.draw(ctx, this.session, this.level.world, this.time, this.stage.frameCounter);
    if (this.hint && Math.floor(this.hint.timer / 20) % 4 !== 0) {
      Gfx.rect(ctx, 0, 32, VW, 13, [0, 0, 0, 150]);
      PixelFont.drawCentered(ctx, this.hint.text, VW / 2, 35, YELLOW, 1, true);
    }
    if (this.state === 'paused') {
      // pausa com a lista de comandos (teclado ou toque)
      Gfx.rect(ctx, 0, 0, VW, VH, [0, 0, 0, 170]);
      PixelFont.drawCentered(ctx, 'PAUSA', VW / 2, 34, WHITE, 2, true);
      const lines = this.game.touch ? TOUCH_CONTROLS : CONTROLS;
      Gfx.rect(ctx, 10, 54, VW - 20, lines.length * 11 + 10, [10, 16, 40, 230]);
      Gfx.outline(ctx, 10, 54, VW - 20, lines.length * 11 + 10, [80, 120, 200, 255]);
      lines.forEach((line, i) => PixelFont.draw(ctx, line, 18, 60 + i * 11, WHITE));
      if (this.game.touch) {
        PixelFont.drawCentered(ctx, 'TOQUE PARA CONTINUAR', VW / 2, PAUSE_MENU_Y - 14, YELLOW);
        Gfx.outline(ctx, 66, PAUSE_MENU_Y - 4, 124, 14, WHITE);
        PixelFont.drawCentered(ctx, 'ESCOLHER FASE', VW / 2, PAUSE_MENU_Y, WHITE);
      } else {
        PixelFont.drawCentered(ctx, 'ENTER - CONTINUAR', VW / 2, PAUSE_MENU_Y - 12, YELLOW);
        PixelFont.drawCentered(ctx, 'ESC - ESCOLHER FASE', VW / 2, PAUSE_MENU_Y, WHITE);
      }
    }
  }
}

// =====================================================================
// Game over e final
// =====================================================================
export class GameOverScene extends Scene {
  enter() {
    this.timer = 300;
    Audio.stopMusic();
    Audio.play('game_over');
  }
  update() {
    if (--this.timer <= 0 || (this.timer < 240 && Input.wasPressed('confirm'))) {
      this.game.changeScene(new LevelSelectScene(this.game, this.game.session?.levelId));
    }
  }
  draw(ctx) {
    Gfx.rect(ctx, 0, 0, VW, VH, BLACK);
    Hud.draw(ctx, this.game.session, '-', null, 0);
    PixelFont.drawCentered(ctx, 'GAME OVER', VW / 2, 104, WHITE, 2);
    PixelFont.drawCentered(ctx, 'SEGMENTATION FAULT (CORE DUMPED)', VW / 2, 132, [255, 90, 90, 255]);
  }
}

/** Tela exibida quando a ultima fase de levels.txt e concluida. */
export class EndingScene extends Scene {
  enter() {
    this.frame = 0;
    Audio.playMusic('ending');
  }
  update() {
    this.frame++;
    if (this.frame > 120 && Input.wasPressed('confirm')) {
      Audio.stopMusic();
      this.game.changeScene(new LevelSelectScene(this.game, LevelManager.order.at(-1)));
    }
  }
  draw(ctx) {
    const s = this.game.session, green = [120, 255, 140, 255];
    Gfx.rect(ctx, 0, 0, VW, VH, BLACK);
    Hud.draw(ctx, s, '-', null, this.frame);
    PixelFont.drawCentered(ctx, 'DEPLOY EM PRODUCAO', VW / 2, 60, green, 2, true);
    PixelFont.drawCentered(ctx, 'CONCLUIDO!', VW / 2, 82, green, 2, true);
    PixelFont.drawCentered(ctx, `OBRIGADO, ${s.character.name}!`, VW / 2, 120, WHITE);
    PixelFont.drawCentered(ctx, 'TODOS OS BUGS FORAM CORRIGIDOS.', VW / 2, 134, WHITE);
    PixelFont.drawCentered(ctx, '(ATE A PROXIMA SPRINT...)', VW / 2, 146, [170, 170, 190, 255]);
    PixelFont.drawCentered(ctx, `PONTOS  ${pad(s.score, 6)}`, VW / 2, 172, YELLOW);
    if (this.frame > 120 && Math.floor(this.frame / 20) % 2 === 0) PixelFont.drawCentered(ctx, 'PRESSIONE ENTER', VW / 2, 204, WHITE);
  }
}
