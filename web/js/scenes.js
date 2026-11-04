// Telas do jogo. Equivale a pasta Scenes/ da versao C#.
import {
  VW, VH, Gfx, Sprites, PixelFont, Input, Audio, Assets, GameSession, SaveData, PowerState,
  WHITE, YELLOW, BLACK, pad, darken,
} from './core.js';
import { Stage, LevelManager } from './world.js';
import { Player, Frame, WALK_CYCLE, ScorePopup, Explosion } from './entities.js';

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
  'PULAR ............ Z / ESPACO',
  'CORRER / ATIRAR .. X / SHIFT',
  'AGACHAR / CANO ... SETA BAIXO',
  'PAUSA ............ ENTER',
  'TELA CHEIA ....... F',
  'SOM LIGA/DESLIGA . M',
  '',
  'CONTROLE: A PULA, X CORRE',
  'CELULAR: BOTOES NA TELA',
];

export class TitleScene extends Scene {
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
    if (Input.wasPressed('confirm')) {
      Audio.play('menu_select');
      if (this.cursor === 0) this.game.changeScene(new CharacterSelectScene(this.game));
      else this.showControls = true;
    }
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
      CONTROLS.forEach((line, i) => PixelFont.draw(ctx, line, 22, 110 + i * 11, WHITE));
    } else {
      MENU.forEach((item, i) => {
        const y = 128 + i * 16;
        PixelFont.draw(ctx, item, 88, y, WHITE, 1, true);
        if (i === this.cursor && Math.floor(this.frame / 16) % 2 === 0) PixelFont.draw(ctx, '>', 76, y, YELLOW, 1, true);
      });
      PixelFont.drawCentered(ctx, `TOP- ${pad(SaveData.topScore, 6)}`, VW / 2, 184, WHITE, 1, true);
    }
    PixelFont.drawCentered(ctx, '© 2026 SUPER DEV STAR', VW / 2, VH - 12, WHITE, 1, true);
  }
}

// =====================================================================
// Selecao de personagem
// =====================================================================
const COLUMNS = 4, CARD = 52, CARD_GAP = 8;

export class CharacterSelectScene extends Scene {
  enter() {
    this.chars = this.game.characters.list;
    this.cursor = 0;
    this.frame = 0;
    this.background = Assets.image('UI/select_background.png');
    Audio.playMusic('select');
  }
  get slotCount() { return Math.max(this.game.characters.selectSlots, this.chars.length); }
  at(slot) { return slot < this.chars.length ? this.chars[slot] : null; }

  update() {
    this.frame++;
    const before = this.cursor, n = this.slotCount;
    if (Input.wasPressed('left')) this.cursor = (this.cursor + n - 1) % n;
    if (Input.wasPressed('right')) this.cursor = (this.cursor + 1) % n;
    if (Input.wasPressed('up') && this.cursor - COLUMNS >= 0) this.cursor -= COLUMNS;
    if (Input.wasPressed('down') && this.cursor + COLUMNS < n) this.cursor += COLUMNS;
    if (before !== this.cursor) Audio.play('menu_move');
    if (Input.wasPressed('back')) { this.game.changeScene(new TitleScene(this.game)); return; }
    if (Input.wasPressed('confirm')) {
      const c = this.at(this.cursor);
      if (!c || !c.enabled) { Audio.play('bump'); return; }
      Audio.play('menu_select');
      this.game.session = new GameSession(c);
      this.game.changeScene(new LevelIntroScene(this.game, LevelManager.first));
    }
  }

  draw(ctx) {
    if (this.background) ctx.drawImage(this.background, 0, 0);
    else {
      // Fundo "terminal": azul escuro com grade.
      Gfx.rect(ctx, 0, 0, VW, VH, [11, 16, 38, 255]);
      const grid = [30, 50, 90, 255];
      for (let x = 0; x < VW; x += 16) Gfx.rect(ctx, x, 0, 1, VH, grid);
      for (let y = Math.floor(this.frame / 2) % 16; y < VH; y += 16) Gfx.rect(ctx, 0, y, VW, 1, grid);
      // O select_background.png ja traz o titulo desenhado no topo.
      PixelFont.drawCentered(ctx, 'ESCOLHA SEU DEV', VW / 2, 10, YELLOW, 2, true);
    }
    const n = this.slotCount;
    const cols = Math.min(COLUMNS, n), rows = Math.ceil(n / COLUMNS);
    const startX = Math.floor((VW - (cols * CARD + (cols - 1) * CARD_GAP)) / 2), startY = 34;
    const rowH = rows > 1 ? CARD + 4 : CARD + 14;
    for (let i = 0; i < n; i++) {
      this.drawCard(ctx, i, startX + (i % COLUMNS) * (CARD + CARD_GAP), startY + Math.floor(i / COLUMNS) * rowH);
    }
    this.drawInfo(ctx, Math.max(106, startY + rows * rowH + 4));
    PixelFont.drawCentered(ctx, '< > ESCOLHER   ENTER OK   ESC VOLTAR', VW / 2, VH - 12, WHITE);
  }

  drawCard(ctx, slot, x, y) {
    const c = this.at(slot), selected = slot === this.cursor;
    Gfx.rect(ctx, x, y, CARD, CARD, [20, 28, 60, 255]);
    const ix = x + 2, iy = y + 2, iw = CARD - 4, ih = CARD - 4;
    if (!c) {
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
    Gfx.outline(ctx, x, y, CARD, CARD, border, selected ? 2 : 1);
    if (selected) PixelFont.drawCentered(ctx, 'V', x + CARD / 2, y - 9 + Math.floor(this.frame / 10) % 2, YELLOW);
  }

  drawInfo(ctx, top) {
    const px = 8, pw = VW - 16, ph = VH - 20 - top;
    Gfx.rect(ctx, px, top, pw, ph, [0, 0, 0, 170]);
    Gfx.outline(ctx, px, top, pw, ph, [80, 90, 130, 255]);
    const c = this.at(this.cursor);
    const gray = [150, 150, 170, 255];
    if (!c) {
      PixelFont.drawCentered(ctx, 'SLOT VAZIO', px + pw / 2, top + 20, gray);
      PixelFont.drawCentered(ctx, 'ADICIONE O PERSONAGEM EM', px + pw / 2, top + 40, gray);
      PixelFont.drawCentered(ctx, 'CHARACTERS.JSON', px + pw / 2, top + 52, gray);
      return;
    }
    // Preview animado andando (versao grande). Celulas de 32 px tem o corpo no meio.
    const previewX = px + 12 - (c.big.fw - 16);
    c.big.draw(ctx, WALK_CYCLE[Math.floor(this.frame / 7) % WALK_CYCLE.length], previewX, top + 12, { scale: 2 });
    const tx = Math.max(px + 56, previewX + c.big.fw * 2 + 6);
    let y = top + 8;
    PixelFont.draw(ctx, c.name, tx, y, YELLOW, 1, true);
    y += 12;
    if (c.role) { PixelFont.draw(ctx, c.role, tx, y, WHITE); y += 10; }
    if (c.stack) { PixelFont.draw(ctx, 'STACK: ' + c.stack, tx, y, [120, 220, 255, 255]); y += 10; }
    y += 4;
    for (const line of PixelFont.wrap(c.description, px + pw - tx - 6)) {
      if (y > top + ph - 10) break;
      PixelFont.draw(ctx, line, tx, y, [200, 200, 210, 255]);
      y += 10;
    }
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
      if (Input.wasPressed('confirm') || Input.wasPressed('back')) this.game.changeScene(new TitleScene(this.game));
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
  }
  get session() { return this.game.session; }

  enter() {
    this.time = this.level.time;
    this.player = new Player(this.session.character, this.session.power);
    this.stage = this.getStage(this.level.startArea);
    this.player.stage = this.stage;
    let spawn = this.stage.playerSpawn;
    if (this.session.checkpointReached && this.stage.checkpoint) spawn = this.stage.checkpoint;
    this.player.placeAtTile(spawn.x, spawn.y);
    this.stage.camera.centerOn(this.player.centerX, this.stage.map.widthPx);
    this.playAreaMusic();
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
      if (Input.wasPressed('start')) { this.state = 'playing'; Audio.resumeMusic(); Audio.play('pause'); }
      else if (Input.wasPressed('back')) { Audio.stopMusic(); this.game.changeScene(new TitleScene(this.game)); }
      return;
    }
    if (this.state === 'warping') { this.updateWarp(); return; }
    if (this.state === 'playing' && (Input.wasPressed('start') || Input.wasPressed('back'))) {
      this.state = 'paused';
      Audio.pauseMusic();
      Audio.play('pause');
      return;
    }

    const p = this.player;
    const frozen = p.mode === 'growing' || p.mode === 'shrinking' || p.mode === 'dying';
    p.px = p.x;
    p.py = p.y;
    p.update();
    if (this.state === 'warping') return;

    this.stage.update(frozen);
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
  goToNextLevel() {
    this.session.power = this.player.power;
    this.session.checkpointReached = false;
    const next = LevelManager.next(this.level.id);
    if (next) this.game.changeScene(new LevelIntroScene(this.game, next));
    else {
      SaveData.submitScore(this.session.score);
      this.game.changeScene(new EndingScene(this.game));
    }
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
  onStarCollected() { Audio.playMusic('star'); }
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
    if (this.state === 'paused') {
      Gfx.rect(ctx, 0, 0, VW, VH, [0, 0, 0, 140]);
      PixelFont.drawCentered(ctx, 'PAUSA', VW / 2, 100, WHITE, 2, true);
      PixelFont.drawCentered(ctx, 'ENTER - CONTINUAR', VW / 2, 130, WHITE);
      PixelFont.drawCentered(ctx, 'ESC - MENU PRINCIPAL', VW / 2, 142, WHITE);
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
    if (--this.timer <= 0 || (this.timer < 240 && Input.wasPressed('confirm'))) this.game.changeScene(new TitleScene(this.game));
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
      this.game.changeScene(new TitleScene(this.game));
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
