// Entidades: jogador, inimigos, itens, efeitos e mastro. Equivale a pasta Entities/ da versao C#.
// Posicao (x, y) = canto superior esquerdo da HITBOX. Velocidades em pixels por frame (60 FPS), como no SMB.
import { TILE, Gfx, Sprites, PixelFont, Input, Audio, PowerState, WHITE } from './core.js';

export const Layer = { Behind: 0, Normal: 1, Front: 2 };
const EPS = 0.01;

// =====================================================================
// Base
// =====================================================================
export class Entity {
  constructor() {
    this.stage = null;
    this.x = 0; this.y = 0;      // posicao atual
    this.px = 0; this.py = 0;    // posicao no frame anterior
    this.vx = 0; this.vy = 0;
    this.w = 16; this.h = 16;
    this.removed = false;
    this.onGround = false;
    this.hitWall = false;
    this.hitCeiling = false;
    this.layer = Layer.Normal;
  }
  get left() { return this.x; }
  get right() { return this.x + this.w; }
  get top() { return this.y; }
  get bottom() { return this.y + this.h; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  get prevBottom() { return this.py + this.h; }
  get map() { return this.stage.map; }
  get interactsWithPlayer() { return false; }

  intersects(o) {
    return this.x < o.x + o.w && o.x < this.x + this.w && this.y < o.y + o.h && o.y < this.y + this.h;
  }
  onTouchPlayer(_p) {}
  update() {}
  draw(_ctx) {}
  drawDebug(ctx) { Gfx.outline(ctx, Math.floor(this.x), Math.floor(this.y), Math.round(this.w), Math.round(this.h), [255, 0, 0, 255]); }

  isOnScreen(margin = 0) {
    const cam = this.stage.camera;
    return this.right >= cam.x - margin && this.left <= cam.x + cam.width + margin;
  }
  isSolidAt(tx, ty) { return this.map.isSolid(tx, ty); }
  /** Somente o jogador ativa blocos invisiveis (batendo de baixo para cima). */
  get canHitInvisibleBlocks() { return false; }
  onHeadBump(_tx, _ty) {}

  applyGravity(g, maxFall) { this.vy = Math.min(this.vy + g, maxFall); }

  moveX(dx) {
    this.hitWall = false;
    if (dx === 0) return;
    this.x += dx;
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.h - EPS) / TILE);
    if (dx > 0) {
      const tx = Math.floor((this.x + this.w - EPS) / TILE);
      for (let ty = top; ty <= bottom; ty++) {
        if (!this.isSolidAt(tx, ty)) continue;
        this.x = tx * TILE - this.w;
        this.hitWall = true;
        break;
      }
    } else {
      const tx = Math.floor(this.x / TILE);
      for (let ty = top; ty <= bottom; ty++) {
        if (!this.isSolidAt(tx, ty)) continue;
        this.x = (tx + 1) * TILE;
        this.hitWall = true;
        break;
      }
    }
  }

  moveY(dy) {
    this.onGround = false;
    this.hitCeiling = false;
    if (dy === 0) return;
    const prevTop = this.y;
    this.y += dy;
    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.w - EPS) / TILE);
    if (dy > 0) {
      const ty = Math.floor((this.y + this.h - EPS) / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (!this.isSolidAt(tx, ty)) continue;
        this.y = ty * TILE - this.h;
        this.onGround = true;
        break;
      }
    } else {
      const ty = Math.floor(this.y / TILE);
      let best = null, bestDist = Infinity;
      for (let tx = left; tx <= right; tx++) {
        const solid = this.isSolidAt(tx, ty)
          || (this.canHitInvisibleBlocks && this.map.isInvisibleBlock(tx, ty) && prevTop >= (ty + 1) * TILE - EPS);
        if (!solid) continue;
        const dist = Math.abs(tx * TILE + TILE / 2 - this.centerX);
        if (dist < bestDist) { bestDist = dist; best = tx; }
      }
      if (best !== null) {
        this.y = (ty + 1) * TILE;
        this.hitCeiling = true;
        this.onHeadBump(best, ty);
      }
    }
  }
}

// =====================================================================
// Jogador
// =====================================================================
export const Frame = { Idle: 0, Walk1: 1, Skid: 4, Jump: 5, Crouch: 6, Die: 7, Climb1: 8, Climb2: 9, Throw: 10 };
/** Ciclo de caminhada: passo, parado, passo, parado... (o quadro parado entre os passos da a sensacao de pisada). */
export const WALK_CYCLE = [Frame.Walk1, Frame.Idle, Frame.Walk1 + 1, Frame.Idle, Frame.Walk1 + 2, Frame.Idle];

const PLAYER_W = 12, SMALL_H = 15, BIG_H = 27;
// Fisica do Super Mario Bros (NES), em pixels/frame.
const WALK_ACCEL = 0.037109375, RUN_ACCEL = 0.0556640625, RELEASE_DECEL = 0.05078125;
const SKID_DECEL = 0.1015625, AIR_TURN_DECEL = 0.0556640625;
const MAX_WALK = 1.5625, MAX_RUN = 2.5625, MAX_FALL = 4.5, RUN_HOLD_FRAMES = 10;
const STAR_COLORS = [null, [255, 120, 120], [120, 255, 120], [120, 170, 255]];

/**
 * O dev controlado pelo jogador. Modos: normal, growing, shrinking, dying, flagSlide, flagHold,
 * walkToCastle, inCastle, pipeEnter, pipeExit.
 */
export class Player extends Entity {
  constructor(character, power) {
    super();
    this.character = character;
    this.power = power;
    this.mode = 'normal';
    this.crouching = false;
    this.facing = 1;
    this.invulnerableTimer = 0;
    this.starTimer = 0;
    this.stompCombo = 0;
    this.w = PLAYER_W;
    this.h = power === PowerState.Small ? SMALL_H : BIG_H;
    this.jumping = false;
    this.jumpPose = false;
    this.gravHold = 0.125;
    this.gravFall = 0.4375;
    this.runHold = 0;
    this.throwTimer = 0;
    this.frame = Frame.Idle;
    this.modeTimer = 0;
    this.animDistance = 0;
    this.walkStep = 0;
    this.wasWalking = false;
    this.skidding = false;
    this.deathByPit = false;
    this.fromPower = power;
    this.toPower = power;
    this.warp = null;
    this.pipeGoal = 0;
    this.pole = null;
  }

  get isBig() { return this.power !== PowerState.Small; }
  get invincible() { return this.starTimer > 0; }
  get canBeHurt() { return this.mode === 'normal' && this.invulnerableTimer === 0 && this.starTimer === 0; }
  get deathFinished() { return this.mode === 'dying' && this.modeTimer > 190; }
  get behindTiles() { return this.mode === 'pipeEnter' || this.mode === 'pipeExit'; }
  get hidden() { return this.mode === 'inCastle'; }
  get canHitInvisibleBlocks() { return true; }

  // ---------------- posicionamento
  placeAtTile(tx, ty) {
    this.x = tx * 16 + (16 - this.w) / 2;
    this.y = (ty + 1) * 16 - this.h;
    this.px = this.x; this.py = this.y;
    this.vx = this.vy = 0;
    this.mode = 'normal';
    this.facing = 1;
  }
  dropAt(tx, ty) {
    this.x = tx * 16 + (16 - this.w) / 2;
    this.y = ty * 16;
    this.px = this.x; this.py = this.y;
    this.vx = this.vy = 0;
    this.mode = 'normal';
  }
  beginPipeExit(pipeTx, pipeTy) {
    this.x = pipeTx * 16 + 16 - this.w / 2;
    this.y = pipeTy * 16;
    this.px = this.x; this.py = this.y;
    this.vx = this.vy = 0;
    this.pipeGoal = pipeTy * 16 - this.h;
    this.mode = 'pipeExit';
    this.frame = Frame.Idle;
    Audio.play('pipe');
  }
  setHeight(h) {
    this.y += this.h - h;
    this.h = h;
  }

  // ---------------- update
  update() {
    switch (this.mode) {
      case 'normal': this.updateNormal(); break;
      case 'growing':
      case 'shrinking': if (--this.modeTimer <= 0) this.mode = 'normal'; break;
      case 'dying': this.updateDying(); break;
      case 'flagSlide': this.updateFlagSlide(); break;
      case 'flagHold': this.updateFlagHold(); break;
      case 'walkToCastle': this.updateWalkToCastle(); break;
      case 'pipeEnter': this.updatePipeEnter(); break;
      case 'pipeExit': this.updatePipeExit(); break;
    }
  }

  updateNormal() {
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.starTimer > 0 && --this.starTimer === 0) this.stage.scene.onStarEnded();
    if (this.throwTimer > 0) this.throwTimer--;

    const left = Input.isDown('left'), right = Input.isDown('right'), down = Input.isDown('down');
    const jumpHeld = Input.isDown('jump'), jumpPressed = Input.wasPressed('jump');
    const runHeld = Input.isDown('run'), runPressed = Input.wasPressed('run');

    // Agachar (so grande, so no chao)
    if (this.isBig && this.onGround) {
      if (down && !this.crouching) this.startCrouch();
      else if (!down && this.crouching) this.tryStand();
    } else if (!this.isBig && this.crouching) {
      this.crouching = false;
    }

    let dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (this.crouching && this.onGround) dir = 0;

    // Correr: o "B" continua valendo alguns frames apos soltar
    this.runHold = runHeld ? RUN_HOLD_FRAMES : Math.max(0, this.runHold - 1);
    const running = this.runHold > 0;
    const max = running ? MAX_RUN : MAX_WALK;

    // Movimento horizontal
    this.skidding = false;
    let vx = this.vx;
    if (dir !== 0) {
      if (this.onGround) this.facing = dir;
      if (vx !== 0 && Math.sign(vx) !== dir) {
        vx += dir * (this.onGround ? SKID_DECEL : AIR_TURN_DECEL);
        this.skidding = this.onGround && Math.sign(vx) !== dir && vx !== 0;
      } else if (Math.abs(vx) < max) {
        vx += dir * (running ? RUN_ACCEL : WALK_ACCEL);
        if (Math.abs(vx) > max) vx = dir * max;
      } else if (this.onGround) {
        // Soltou o botao de correr acima da velocidade de caminhada: desacelera ate o limite.
        vx -= Math.sign(vx) * RELEASE_DECEL;
        if (Math.abs(vx) < max) vx = Math.sign(vx) * max;
      }
    } else if (this.onGround) {
      vx = Math.abs(vx) <= RELEASE_DECEL ? 0 : vx - Math.sign(vx) * RELEASE_DECEL;
    }
    this.vx = vx;

    // Pulo: altura depende da velocidade horizontal, como no SMB
    if (jumpPressed && this.onGround) {
      const speed = Math.abs(this.vx);
      if (speed < 1) { this.vy = -4; this.gravHold = 0.125; this.gravFall = 0.4375; }
      else if (speed < 2.3125) { this.vy = -4; this.gravHold = 0.1171875; this.gravFall = 0.375; }
      else { this.vy = -5; this.gravHold = 0.15625; this.gravFall = 0.5625; }
      this.jumping = true;
      this.jumpPose = true;
      this.onGround = false;
      Audio.play(this.isBig ? 'jump_big' : 'jump_small');
    }
    if (!jumpHeld) this.jumping = false;
    this.applyGravity(this.jumping && this.vy < 0 ? this.gravHold : this.gravFall, MAX_FALL);

    // Atirar pacote (Firewall)
    if (runPressed && this.power === PowerState.Fire && !this.crouching) this.tryThrow();

    // Colisao com o mapa
    this.moveX(this.vx);
    if (this.hitWall) this.vx = 0;
    const camLeft = this.stage.camera.x;
    if (this.x < camLeft) {
      this.x = camLeft;
      if (this.vx < 0) this.vx = 0;
    }
    this.moveY(this.vy);
    if (this.onGround) {
      this.vy = 0;
      this.jumping = false;
      this.jumpPose = false;
      this.stompCombo = 0;
      this.gravFall = 0.4375;
    }
    if (this.hitCeiling && this.vy < 0) {
      this.vy = 0;
      this.jumping = false;
    }

    if (this.onGround) this.checkWarps(down, right);
    if (this.mode !== 'normal') return;
    if (this.top > this.map.heightPx + 8) this.stage.scene.killPlayer(true);
    this.animate();
  }

  startCrouch() {
    this.crouching = true;
    this.setHeight(SMALL_H);
  }
  tryStand() {
    // So levanta se houver espaco acima.
    const ty = Math.floor((this.bottom - BIG_H) / 16);
    const l = Math.floor(this.left / 16), r = Math.floor((this.right - EPS) / 16);
    for (let tx = l; tx <= r; tx++) if (this.map.isSolid(tx, ty)) return;
    this.crouching = false;
    this.setHeight(BIG_H);
  }
  tryThrow() {
    if (this.stage.count(PacketProjectile) >= 2) return;
    this.stage.spawn(new PacketProjectile(this));
    this.throwTimer = 8;
    Audio.play('fireball');
  }
  onHeadBump(tx, ty) { this.stage.hitBlock(tx, ty, this); }

  animate() {
    const walking = this.onGround && !this.crouching && !this.skidding && Math.abs(this.vx) > 0.01;
    if (!walking) this.wasWalking = false;
    if (this.crouching) this.frame = Frame.Crouch;
    else if (!this.onGround) { if (this.jumpPose) this.frame = Frame.Jump; }
    else if (this.skidding) this.frame = Frame.Skid;
    else if (walking) this.animateWalk(this.vx);
    else this.frame = Frame.Idle;
    if (this.throwTimer > 0 && !this.crouching) this.frame = Frame.Throw;
  }
  /** Avanca o ciclo de caminhada conforme a distancia percorrida (mais rapido = passos mais rapidos). */
  animateWalk(vx) {
    if (!this.wasWalking) {
      // comeca sempre com um passo, para a reacao ao botao ser imediata
      this.wasWalking = true;
      this.walkStep = 0;
      this.animDistance = 0;
    }
    this.animDistance += Math.max(Math.abs(vx), 0.6);
    if (this.animDistance >= 6) {
      this.animDistance -= 6;
      this.walkStep = (this.walkStep + 1) % WALK_CYCLE.length;
    }
    this.frame = WALK_CYCLE[this.walkStep];
  }

  // ---------------- poderes e dano
  powerUp(target) {
    if (target <= this.power) return;
    this.fromPower = this.power;
    this.toPower = target;
    if (this.power === PowerState.Small) {
      this.setHeight(BIG_H);
      this.crouching = false;
    }
    this.power = target;
    this.mode = 'growing';
    this.modeTimer = 48;
    Audio.play('powerup');
  }
  hurt() {
    if (!this.canBeHurt) return;
    if (this.power === PowerState.Small) {
      this.stage.scene.killPlayer(false);
      return;
    }
    this.fromPower = this.power;
    this.toPower = PowerState.Small;
    this.power = PowerState.Small;
    this.crouching = false;
    this.setHeight(SMALL_H);
    this.mode = 'shrinking';
    this.modeTimer = 48;
    this.invulnerableTimer = 120;
    Audio.play('pipe');
  }
  giveStar() {
    this.starTimer = 660;
    this.stage.scene.onStarCollected();
  }
  /** Quique ao pisar num inimigo. Segurar pulo deixa o quique mais alto. */
  bounce() {
    this.vy = -4;
    this.jumping = true;
    this.jumpPose = true;
    this.gravHold = 0.125;
    this.gravFall = 0.4375;
  }
  startDeath(pit) {
    this.mode = 'dying';
    this.deathByPit = pit;
    this.modeTimer = 0;
    this.vx = this.vy = 0;
    this.starTimer = 0;
    this.invulnerableTimer = 0;
    if (this.power !== PowerState.Small) {
      this.power = PowerState.Small;
      this.setHeight(SMALL_H);
    }
    this.crouching = false;
    this.frame = Frame.Die;
    this.layer = Layer.Front;
  }
  updateDying() {
    this.modeTimer++;
    if (this.deathByPit) return;
    if (this.modeTimer === 30) this.vy = -5;
    if (this.modeTimer > 30) {
      this.vy = Math.min(this.vy + 0.25, 5);
      this.y += this.vy;
    }
  }

  // ---------------- mastro / fim de fase
  grabFlag(pole) {
    this.pole = pole;
    this.mode = 'flagSlide';
    this.vx = this.vy = 0;
    this.starTimer = 0;
    this.crouching = false;
    if (this.isBig && this.h !== BIG_H) this.setHeight(BIG_H);
    this.x = pole.poleX - this.w + 3;
    this.facing = 1;
    this.modeTimer = 0;
    this.frame = Frame.Climb1;
  }
  updateFlagSlide() {
    this.modeTimer++;
    if (this.bottom < this.pole.bottomY) {
      this.y = Math.min(this.y + 2, this.pole.bottomY - this.h);
      this.frame = Math.floor(this.modeTimer / 4) % 2 === 0 ? Frame.Climb1 : Frame.Climb2;
    } else {
      this.frame = Frame.Climb1;
    }
    if (this.bottom >= this.pole.bottomY - EPS && this.pole.flagDown) {
      this.mode = 'flagHold';
      this.x = this.pole.poleX - 3;
      this.facing = -1;
      this.modeTimer = 24;
    }
  }
  updateFlagHold() {
    if (--this.modeTimer > 0) return;
    this.mode = 'walkToCastle';
    this.facing = 1;
    this.stage.scene.onPlayerLeftPole();
  }
  updateWalkToCastle() {
    this.vx = 1.25;
    this.facing = 1;
    this.applyGravity(0.4375, MAX_FALL);
    this.moveX(this.vx);
    this.moveY(this.vy);
    if (this.onGround) { this.vy = 0; this.animateWalk(this.vx); }
    else this.frame = Frame.Jump;
    const door = this.stage.castleDoor ? this.stage.castleDoor.x * 16 + 8 : this.pole.poleX + 6 * 16;
    if (this.centerX >= door || this.hitWall) this.mode = 'inCastle';
  }

  // ---------------- canos
  checkWarps(down, right) {
    for (const w of this.stage.scene.level.warps) {
      if (w.fromArea.toLowerCase() !== this.stage.data.id.toLowerCase()) continue;
      if (w.direction === 'down' && down) {
        const pipeLeft = w.fromX * 16;
        const onTop = Math.abs(this.bottom - w.fromY * 16) < 1;
        const centered = this.centerX >= pipeLeft + 4 && this.centerX <= pipeLeft + 28;
        if (onTop && centered) { this.startPipeEnter(w); return; }
      } else if (w.direction === 'right' && right) {
        const touching = Math.abs(this.right - w.fromX * 16) < 1;
        const inside = this.bottom > w.fromY * 16 && this.bottom <= (w.fromY + 2) * 16 + 0.5;
        if (touching && inside) { this.startPipeEnter(w); return; }
      }
    }
  }
  startPipeEnter(w) {
    this.warp = w;
    this.mode = 'pipeEnter';
    this.vx = this.vy = 0;
    if (this.crouching) this.tryStand();
    Audio.play('pipe');
    if (w.direction === 'down') {
      this.x = w.fromX * 16 + 16 - this.w / 2;
      this.pipeGoal = this.y + this.h + 2;
      this.frame = Frame.Idle;
    } else {
      this.facing = 1;
      this.pipeGoal = this.x + this.w + 2;
    }
  }
  updatePipeEnter() {
    if (!this.warp) return;
    if (this.warp.direction === 'down') {
      this.y += 1;
      if (this.y < this.pipeGoal) return;
    } else {
      this.x += 1;
      this.animateWalk(1);
      if (this.x < this.pipeGoal) return;
    }
    const warp = this.warp;
    this.warp = null;
    this.stage.scene.beginWarp(warp);
  }
  updatePipeExit() {
    this.y -= 1;
    if (this.y > this.pipeGoal) return;
    this.y = this.pipeGoal;
    this.mode = 'normal';
    this.onGround = true;
  }

  // ---------------- desenho
  sheetFor(power) {
    const c = this.character;
    return power === PowerState.Fire ? c.fire : power === PowerState.Big ? c.big : c.small;
  }
  draw(ctx) {
    if (this.hidden) return;
    if (this.mode === 'dying' && this.deathByPit) return;
    if (this.invulnerableTimer > 0 && this.mode === 'normal' && Math.floor(this.invulnerableTimer / 2) % 2 === 0) return;

    let drawPower = this.power;
    if (this.mode === 'growing' || this.mode === 'shrinking') {
      drawPower = Math.floor(this.modeTimer / 4) % 2 === 0 ? this.toPower : this.fromPower;
    }
    const sheet = this.sheetFor(drawPower);
    let frame = this.frame;
    if (this.mode === 'growing' || this.mode === 'shrinking') frame = Frame.Idle;
    if (drawPower === PowerState.Small && frame === Frame.Crouch) frame = Frame.Idle;

    let tint = null;
    if (drawPower === PowerState.Fire && this.character.fireIsFallback && !sheet.isPlaceholder) tint = [255, 150, 60];
    if (this.starTimer > 0) {
      const speed = this.starTimer < 120 ? 8 : 2;
      tint = STAR_COLORS[Math.floor(this.starTimer / speed) % STAR_COLORS.length];
    }
    sheet.draw(ctx, frame, this.centerX - sheet.fw / 2, this.bottom - sheet.fh, {
      flipX: this.facing < 0,
      tint,
      placeholderHeight: drawPower !== PowerState.Small && this.crouching ? 18 : 0,
    });
  }
  drawDebug(ctx) { Gfx.outline(ctx, Math.floor(this.x), Math.floor(this.y), Math.round(this.w), Math.round(this.h), [255, 255, 0, 255]); }
}

// =====================================================================
// Inimigos (olham para a ESQUERDA por padrao; dormem ate entrar na tela)
// =====================================================================
const ENEMY_GRAVITY = 0.375, ENEMY_MAX_FALL = 4;

export class Enemy extends Entity {
  constructor() {
    super();
    this.dormant = true;
    this.dead = false;
    this.walkSpeed = 0.5;
    this.flippedDeath = false;
  }
  get isActive() { return !this.dead && !this.dormant && !this.removed; }
  get isMovingShell() { return false; }
  get interactsWithPlayer() { return this.isActive; }

  update() {
    const cam = this.stage.camera;
    if (this.dormant) {
      if (this.left > cam.x + cam.width + 8) return;
      this.dormant = false;
    }
    if (this.flippedDeath) {
      this.vy = Math.min(this.vy + ENEMY_GRAVITY, 6);
      this.x += this.vx;
      this.y += this.vy;
      if (this.top > this.map.heightPx + 16) this.removed = true;
      return;
    }
    if (this.right < cam.x - 96 || this.top > this.map.heightPx + 16) {
      this.removed = true;
      return;
    }
    this.updateAlive();
  }
  updateAlive() {}

  walkAndCollide() {
    this.applyGravity(ENEMY_GRAVITY, ENEMY_MAX_FALL);
    const vx = this.vx;
    this.moveX(vx);
    if (this.hitWall) this.vx = -vx;
    this.moveY(this.vy);
    if (this.onGround) this.vy = 0;
  }
  /** Muda a altura da hitbox mantendo os pes no mesmo lugar. */
  setHeight(h) {
    this.y += this.h - h;
    this.h = h;
  }

  /** Morte "de costas" caindo para fora da tela (capsula, pacote, estrela, bloco). */
  killFlipped(dir, points) {
    if (this.flippedDeath) return;
    this.dead = true;
    this.flippedDeath = true;
    this.vx = (dir === 0 ? 1 : Math.sign(dir)) * 0.75;
    this.vy = -3.5;
    this.layer = Layer.Front;
    Audio.play('kick');
    if (points > 0) this.stage.scene.addScore(points, this.centerX, this.top);
  }
  /** O jogador esta caindo e veio de cima. */
  isStompedBy(p) { return p.y > p.py && p.prevBottom <= this.top + 6; }

  onTouchPlayer(p) {
    if (p.invincible) { this.killFlipped(this.centerX >= p.centerX ? 1 : -1, 200); return; }
    if (this.isStompedBy(p)) this.onStomped(p);
    else p.hurt();
  }
  onStomped(_p) {}
  onBumpedFromBelow(fromX) { this.killFlipped(this.centerX >= fromX ? 1 : -1, 100); }
  onFireball(dir) { this.killFlipped(dir, 200); }
}

/** BUG - equivalente ao Goomba. */
export class Bug extends Enemy {
  constructor(tileX, tileY, theme) {
    super();
    this.w = 14;
    this.h = 12;       // tamanho visivel do sprite (16x12)
    this.x = tileX + 1;
    this.y = tileY + 16 - this.h;
    this.vx = -this.walkSpeed;
    this.sheet = Sprites.themed('Enemies', 'bug', theme, 16, 16, [196, 64, 48, 255]);
    this.sheet.placeholderEye = true;
    this.anim = 0;
    this.squash = 0;
  }
  update() {
    if (this.squash > 0) {
      if (--this.squash === 0) this.removed = true;
      return;
    }
    super.update();
  }
  updateAlive() {
    this.walkAndCollide();
    this.anim++;
  }
  onStomped(p) {
    this.dead = true;
    this.squash = 30;
    this.vx = this.vy = 0;
    Audio.play('stomp');
    p.bounce();
    this.stage.scene.awardStomp(p, this.centerX, this.top);
  }
  draw(ctx) {
    const x = this.centerX - 8, y = this.bottom - 16;
    if (this.squash > 0) { this.sheet.draw(ctx, 2, x, y, { placeholderHeight: 8 }); return; }
    let frame = 0, flip = false;
    if (this.sheet.count >= 2) frame = Math.floor(this.anim / 8) % 2;
    else flip = Math.floor(this.anim / 8) % 2 === 1;
    this.sheet.draw(ctx, frame, x, y, { flipX: flip, flipY: this.flippedDeath });
  }
}

/** VIRUS - equivalente ao Koopa. Pisado vira capsula (casco) que pode ser chutada. */
const SHELL_COMBO = [500, 800, 1000, 2000, 4000, 5000, 8000];
const SHELL_SPEED = 3, VIRUS_WALK_H = 14, VIRUS_SHELL_H = 9;

export class Virus extends Enemy {
  constructor(tileX, tileY, theme) {
    super();
    this.w = 14;
    this.h = VIRUS_WALK_H;
    this.x = tileX + 1;
    this.y = tileY + 16 - this.h;
    this.vx = -this.walkSpeed;
    this.walkSheet = Sprites.themed('Enemies', 'virus', theme, 16, 24, [64, 176, 72, 255]);
    this.walkSheet.placeholderEye = true;
    this.shellSheet = Sprites.themed('Enemies', 'virus_shell', theme, 16, 16, [48, 140, 56, 255]);
    this.state = 'walking';
    this.anim = 0;
    this.wakeTimer = 0;
    this.kickGrace = 0;
    this.shellCombo = 0;
  }
  get isMovingShell() { return this.state === 'shellMoving' && !this.dead; }

  updateAlive() {
    this.anim++;
    if (this.kickGrace > 0) this.kickGrace--;
    if (this.state === 'walking') {
      this.walkAndCollide();
    } else if (this.state === 'shell') {
      this.vx = 0;
      this.walkAndCollide();
      if (--this.wakeTimer <= 0) {
        this.state = 'walking';
        this.setHeight(VIRUS_WALK_H);
        this.vx = (this.stage.player.centerX < this.centerX ? -1 : 1) * this.walkSpeed;
      }
    } else {
      this.walkAndCollide();
      if (this.hitWall && this.isOnScreen()) Audio.play('bump');
    }
  }

  onTouchPlayer(p) {
    if (p.invincible) { this.killFlipped(this.centerX >= p.centerX ? 1 : -1, 200); return; }
    const stomp = this.isStompedBy(p);
    if (this.state === 'walking') {
      if (stomp) this.onStomped(p);
      else p.hurt();
    } else if (this.state === 'shell') {
      this.kick(p.centerX < this.centerX ? 1 : -1);
      if (stomp) p.bounce();
      this.stage.scene.addScore(400, this.centerX, this.top);
    } else if (stomp) {
      this.enterShell();
      p.bounce();
      Audio.play('stomp');
      this.stage.scene.awardStomp(p, this.centerX, this.top);
    } else if (this.kickGrace === 0) {
      p.hurt();
    }
  }
  onStomped(p) {
    this.enterShell();
    Audio.play('stomp');
    p.bounce();
    this.stage.scene.awardStomp(p, this.centerX, this.top);
  }
  enterShell() {
    this.state = 'shell';
    this.wakeTimer = 300;
    this.vx = 0;
    this.setHeight(VIRUS_SHELL_H);
  }
  kick(dir) {
    this.state = 'shellMoving';
    this.vx = dir * SHELL_SPEED;
    this.kickGrace = 10;
    this.shellCombo = 0;
    Audio.play('kick');
  }
  /** Pontos pelo proximo inimigo atingido pela capsula. -1 = vida extra. */
  nextShellComboPoints() {
    const i = this.shellCombo++;
    return i < SHELL_COMBO.length ? SHELL_COMBO[i] : -1;
  }
  draw(ctx) {
    if (this.state === 'walking' && !this.flippedDeath) {
      this.walkSheet.draw(ctx, Math.floor(this.anim / 8) % 2, this.centerX - 8, this.bottom - 24, { flipX: this.vx > 0 });
      return;
    }
    const frame = this.state === 'shell' && this.wakeTimer < 80 && Math.floor(this.anim / 4) % 2 === 0 ? 1 : 0;
    this.shellSheet.draw(ctx, frame, this.centerX - 8, this.bottom - 16, { flipY: this.flippedDeath });
  }
}

// =====================================================================
// Itens (saem dos blocos subindo 16px por tras dele)
// =====================================================================
const ITEM_GRAVITY = 0.3;

export class Item extends Entity {
  constructor(blockX, blockY) {
    super();
    this.w = 14;
    this.h = 16;
    this.x = blockX + 1;
    this.y = blockY;
    this.emergeTimer = 0;
  }
  get emerging() { return this.emergeTimer > 0; }
  get interactsWithPlayer() { return !this.emerging && !this.removed; }

  emerge() {
    this.emergeTimer = 32;
    this.layer = Layer.Behind;
    Audio.play('powerup_appear');
  }
  update() {
    if (this.emergeTimer > 0) {
      this.y -= 0.5;
      if (--this.emergeTimer === 0) {
        this.layer = Layer.Normal;
        this.onEmerged();
      }
      return;
    }
    if (this.top > this.map.heightPx + 16 || this.right < this.stage.camera.x - 64) {
      this.removed = true;
      return;
    }
    this.updateItem();
  }
  onEmerged() {}
  updateItem() {}
  /** Bloco atingido embaixo do item: ele pula e vai para longe do impacto. */
  hop(fromX) {
    if (this.emerging) return;
    this.vy = -3.5;
    if ((this.centerX < fromX && this.vx > 0) || (this.centerX > fromX && this.vx < 0)) this.vx = -this.vx;
  }
  onTouchPlayer(p) {
    this.removed = true;
    this.collect(p);
  }
  collect(_p) {}
  moveLikeMushroom() {
    this.applyGravity(ITEM_GRAVITY, 4);
    const vx = this.vx;
    this.moveX(vx);
    if (this.hitWall) this.vx = -vx;
    this.moveY(this.vy);
    if (this.onGround) this.vy = 0;
  }
  drawSprite(ctx, sheet, frame) { sheet.draw(ctx, frame, this.centerX - 8, this.bottom - 16); }
}

/** CAFE - equivalente ao cogumelo. Junior vira Senior. */
export class Coffee extends Item {
  constructor(x, y) { super(x, y); this.sheet = Sprites.get('Items/coffee.png', 16, 16, [140, 80, 40, 255]); }
  onEmerged() { this.vx = 1; }
  updateItem() { this.moveLikeMushroom(); }
  collect(p) {
    this.stage.scene.addScore(1000, this.centerX, this.top);
    if (!p.isBig) p.powerUp(PowerState.Big);
    else Audio.play('powerup');
  }
  draw(ctx) { this.drawSprite(ctx, this.sheet, 0); }
}

/** FIREWALL - equivalente a flor de fogo. Permite atirar pacotes de dados. */
export class Firewall extends Item {
  constructor(x, y) { super(x, y); this.sheet = Sprites.get('Items/firewall.png', 16, 16, [240, 100, 40, 255]); this.anim = 0; }
  updateItem() { this.anim++; }
  hop() {}
  collect(p) {
    this.stage.scene.addScore(1000, this.centerX, this.top);
    if (p.power === PowerState.Small) p.powerUp(PowerState.Big);
    else if (p.power === PowerState.Big) p.powerUp(PowerState.Fire);
    else Audio.play('powerup');
  }
  draw(ctx) { this.drawSprite(ctx, this.sheet, Math.floor(this.anim / 4) % 4); }
}

/** SUDO STAR - equivalente a estrela. Invencibilidade temporaria. */
export class SudoStar extends Item {
  constructor(x, y) { super(x, y); this.sheet = Sprites.get('Items/sudo_star.png', 16, 16, [255, 230, 60, 255]); this.anim = 0; }
  onEmerged() { this.vx = 1; this.vy = -4; }
  updateItem() {
    this.anim++;
    this.applyGravity(0.2, 4);
    const vx = this.vx;
    this.moveX(vx);
    if (this.hitWall) this.vx = -vx;
    this.moveY(this.vy);
    if (this.onGround) this.vy = -4.5;
    if (this.hitCeiling) this.vy = 0;
  }
  collect(p) {
    this.stage.scene.addScore(1000, this.centerX, this.top);
    p.giveStar();
  }
  draw(ctx) { this.drawSprite(ctx, this.sheet, Math.floor(this.anim / 3) % 4); }
}

/** BACKUP (disquete) - equivalente ao cogumelo verde. Vida extra. */
export class Backup extends Item {
  constructor(x, y) { super(x, y); this.sheet = Sprites.get('Items/backup.png', 16, 16, [40, 200, 80, 255]); }
  onEmerged() { this.vx = 1; }
  updateItem() { this.moveLikeMushroom(); }
  collect() { this.stage.scene.giveOneUp(this.centerX, this.top); }
  draw(ctx) { this.drawSprite(ctx, this.sheet, 0); }
}

/** Moeda parada no cenario. */
const COIN_FRAMES = [0, 0, 0, 1, 2, 1];
export class Coin extends Entity {
  constructor(tileX, tileY) {
    super();
    this.w = 10;
    this.h = 14;
    this.x = tileX + 3;
    this.y = tileY + 1;
    this.sheet = Sprites.get('Items/coin.png', 16, 16, [252, 200, 40, 255]);
  }
  get interactsWithPlayer() { return !this.removed; }
  onTouchPlayer() {
    this.removed = true;
    this.stage.scene.collectCoin(this.centerX, this.top, false);
  }
  draw(ctx) {
    if (this.sheet.isPlaceholder) { Gfx.placeholder(ctx, this.x, this.y, this.w, this.h, this.sheet.fallback); return; }
    const frame = COIN_FRAMES[Math.floor(this.stage.frameCounter / 8) % COIN_FRAMES.length];
    this.sheet.draw(ctx, frame, this.centerX - 8, this.centerY - 8);
  }
}

// =====================================================================
// Efeitos
// =====================================================================
/** Moeda que pula para fora do bloco. */
export class CoinPop extends Entity {
  constructor(x, y) {
    super();
    this.x = x; this.y = y;
    this.startY = y;
    this.vy = -5;
    this.layer = Layer.Front;
    this.anim = 0;
    this.sheet = Sprites.get('Items/coin_spin.png', 16, 16, [252, 200, 40, 255]);
  }
  update() {
    this.anim++;
    this.vy += 0.3;
    this.y += this.vy;
    if (this.vy > 0 && this.y >= this.startY - 8) {
      this.removed = true;
      this.stage.spawn(new ScorePopup('200', this.centerX, this.y));
    }
  }
  draw(ctx) {
    if (this.sheet.isPlaceholder) {
      const w = [10, 6, 2, 6][Math.floor(this.anim / 3) % 4];
      Gfx.placeholder(ctx, this.x + 8 - w / 2, this.y + 1, w, 14, this.sheet.fallback);
      return;
    }
    this.sheet.draw(ctx, Math.floor(this.anim / 3) % 4, this.x, this.y);
  }
}

/** Pedaco de bloco quebrado. */
export class BrickDebris extends Entity {
  constructor(x, y, vx, vy, theme) {
    super();
    this.w = this.h = 8;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.layer = Layer.Front;
    this.anim = 0;
    this.sheet = Sprites.themed('Effects', 'brick_debris', theme, 8, 8, [200, 76, 12, 255]);
  }
  update() {
    this.anim++;
    this.vy += 0.35;
    this.x += this.vx;
    this.y += this.vy;
    if (this.top > this.stage.map.heightPx + 16) this.removed = true;
  }
  draw(ctx) {
    const step = Math.floor(this.anim / 4) % 4;
    this.sheet.draw(ctx, step % 2, this.x, this.y, { flipX: step >= 2, flipY: step === 1 || step === 2 });
  }
}

/** Numero de pontos subindo na tela. */
export class ScorePopup extends Entity {
  constructor(text, centerX, y) {
    super();
    this.text = text;
    this.x = centerX;
    this.y = y - 8;
    this.layer = Layer.Front;
    this.life = 0;
  }
  update() {
    this.life++;
    if (this.life < 30) this.y -= 1;
    if (this.life > 45) this.removed = true;
  }
  draw(ctx) { PixelFont.drawCentered(ctx, this.text, this.x, this.y, WHITE, 1, true); }
}

/** Explosao curta (pacote batendo, fogos de artificio). */
export class Explosion extends Entity {
  constructor(centerX, centerY, firework = false) {
    super();
    this.x = centerX - 8;
    this.y = centerY - 8;
    this.layer = Layer.Front;
    this.frameTime = firework ? 8 : 4;
    this.anim = 0;
    this.sheet = Sprites.get(firework ? 'Effects/firework.png' : 'Effects/explosion.png', 16, 16,
      firework ? [255, 120, 200, 255] : [255, 160, 40, 255]);
  }
  update() { if (++this.anim >= this.frameTime * 3) this.removed = true; }
  draw(ctx) {
    const frame = Math.min(2, Math.floor(this.anim / this.frameTime));
    if (this.sheet.isPlaceholder) {
      const s = 6 + frame * 4;
      Gfx.placeholder(ctx, this.x + 8 - s / 2, this.y + 8 - s / 2, s, s, this.sheet.fallback);
      return;
    }
    this.sheet.draw(ctx, frame, this.x, this.y);
  }
}

/** PACOTE DE DADOS - equivalente a bola de fogo. Quica no chao, explode na parede. */
export class PacketProjectile extends Entity {
  constructor(p) {
    super();
    this.w = this.h = 8;
    const dir = p.facing;
    this.x = dir > 0 ? p.right - 2 : p.left - 6;
    this.y = p.top + 4;
    this.vx = dir * 4;
    this.vy = 3;
    this.layer = Layer.Front;
    this.anim = 0;
    this.sheet = Sprites.get('Items/packet.png', 8, 8, [255, 140, 40, 255]);
  }
  update() {
    this.anim++;
    this.applyGravity(0.35, 4);
    const vx = this.vx;
    this.moveX(vx);
    if (this.hitWall) { this.explode(); return; }
    this.moveY(this.vy);
    if (this.onGround) this.vy = -3.5;
    if (!this.isOnScreen(8) || this.top > this.map.heightPx) { this.removed = true; return; }
    for (const e of this.stage.entities) {
      if (e instanceof Enemy && e.isActive && this.intersects(e)) {
        e.onFireball(Math.sign(vx));
        this.explode();
        return;
      }
    }
  }
  explode() {
    this.removed = true;
    Audio.play('bump');
    this.stage.spawn(new Explosion(this.centerX, this.centerY));
  }
  draw(ctx) { this.sheet.draw(ctx, Math.floor(this.anim / 3) % 4, this.x, this.y, { flipX: this.vx < 0 }); }
}

// =====================================================================
// Mastro ("antena de deploy"). 'F' no mapa marca o TOPO; desce ate o primeiro bloco solido.
// =====================================================================
export class Flagpole extends Entity {
  constructor(tileX, topTileY, bottomTileY) {
    super();
    this.poleX = tileX * 16 + 8;
    this.topY = topTileY * 16;
    this.bottomY = bottomTileY * 16;
    this.flagY = this.topY + 16;
    this.lowering = false;
    this.flagDown = false;
    this.x = this.poleX - 1;
    this.y = this.topY;
    this.w = 2;
    this.h = this.bottomY - this.topY;
    this.poleSheet = Sprites.get('Objects/flagpole.png', 16, 16, [80, 200, 80, 255]);
    this.topSheet = Sprites.get('Objects/flagpole_top.png', 16, 16, [80, 220, 120, 255]);
    this.flagSheet = Sprites.get('Objects/flag.png', 16, 16, WHITE);
  }
  touches(p) {
    return p.right >= this.poleX - 1 && p.left <= this.poleX + 1 && p.bottom > this.topY && p.top < this.bottomY;
  }
  /** Quanto mais alto agarrar, mais pontos (como no SMB). */
  scoreFor(p) {
    const f = (this.bottomY - p.bottom) / Math.max(1, this.bottomY - this.topY);
    if (f >= 0.9) return 5000;
    if (f >= 0.6) return 2000;
    if (f >= 0.4) return 800;
    if (f >= 0.15) return 400;
    return 100;
  }
  update() {
    if (!this.lowering || this.flagDown) return;
    this.flagY += 2;
    if (this.flagY >= this.bottomY - 32) {
      this.flagY = this.bottomY - 32;
      this.flagDown = true;
    }
  }
  draw(ctx) {
    for (let y = this.topY + 16; y < this.bottomY; y += 16) {
      if (this.poleSheet.isPlaceholder) Gfx.rect(ctx, this.poleX - 1, y, 2, 16, this.poleSheet.fallback);
      else this.poleSheet.draw(ctx, 0, this.poleX - 8, y);
    }
    if (this.topSheet.isPlaceholder) Gfx.placeholder(ctx, this.poleX - 4, this.topY + 8, 8, 8, this.topSheet.fallback);
    else this.topSheet.draw(ctx, 0, this.poleX - 8, this.topY);
    this.flagSheet.draw(ctx, 0, this.poleX - 16, this.flagY);
    if (this.flagSheet.isPlaceholder) PixelFont.draw(ctx, '</>', this.poleX - 15, this.flagY + 5, [40, 140, 60, 255]);
  }
}
