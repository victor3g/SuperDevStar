// Inicializacao, carregamento e loop principal (60 passos fixos por segundo, como no NES).
import { VW, VH, Assets, Input, Audio, SaveData, SpriteSheet, parseHex, Gfx, PixelFont, WHITE } from './core.js';
import { LevelManager, ALL_TILE_NAMES } from './world.js';
import { TitleScene } from './scenes.js';

const STEP = 1000 / 60;
const FRAME_COUNT = 11; // frames por folha de personagem

// Imagens fixas do jogo (mesma lista de Core/AssetManifest.cs). As da fase sao carregadas na intro.
const COMMON_IMAGES = [
  ...ALL_TILE_NAMES.map(n => `Tiles/overworld/${n}.png`),
  ...['ground', 'brick', 'hard', 'used'].map(n => `Tiles/underground/${n}.png`),
  'Enemies/bug.png', 'Enemies/virus.png', 'Enemies/virus_shell.png',
  'Items/coin.png', 'Items/coin_spin.png', 'Items/coffee.png', 'Items/firewall.png', 'Items/sudo_star.png',
  'Items/backup.png', 'Items/packet.png',
  'Effects/brick_debris.png', 'Effects/explosion.png', 'Effects/firework.png',
  'Objects/flagpole.png', 'Objects/flagpole_top.png', 'Objects/flag.png',
  'UI/logo.png', 'UI/title_background.png', 'UI/select_background.png', 'UI/hud_coin.png',
  'Backgrounds/overworld_far.png',
];

// ---------------------------------------------------------------- personagens
/** Le assets/Characters/characters.json (aceita linhas de comentario com //). */
async function loadCharacters() {
  const txt = await Assets.loadText('Characters/characters.json');
  let data = { selectSlots: 4, characters: [] };
  if (txt) {
    try {
      data = JSON.parse(txt.split('\n').filter(l => !l.trim().startsWith('//')).join('\n'));
    } catch (e) { console.error('characters.json invalido:', e); }
  }
  const list = (data.characters ?? []).map(c => ({
    id: c.id ?? 'dev', name: c.name ?? 'DEV', role: c.role ?? '', stack: c.stack ?? '',
    description: c.description ?? '', folder: (c.folder || `Characters/${c.id}`).replace(/\/$/, ''),
    color: parseHex(c.color, [224, 72, 72, 255]), enabled: c.enabled !== false,
  }));
  if (!list.length) {
    list.push({ id: 'dev01', name: 'DEV 01', role: 'Full Stack', stack: '', description: 'Personagem padrao.',
      folder: 'Characters/dev01', color: [224, 72, 72, 255], enabled: true });
  }
  await Assets.loadImages(list.flatMap(c => ['small', 'big', 'fire', 'portrait'].map(f => `${c.folder}/${f}.png`)));
  for (const c of list) {
    // A largura do frame vem da imagem (largura / 11): celulas de 16 ou 32 px funcionam.
    const sheet = (file, h) => {
      const img = Assets.image(`${c.folder}/${file}.png`);
      const s = new SpriteSheet(img, img ? Math.max(1, Math.floor(img.width / FRAME_COUNT)) : 16, h, c.color);
      s.placeholderEye = true;
      return s;
    };
    c.small = sheet('small', 16);
    c.big = sheet('big', 32);
    c.fire = sheet('fire', 32);
    c.fireIsFallback = c.fire.isPlaceholder && !c.big.isPlaceholder;
    if (c.fireIsFallback) c.fire = c.big;     // sem fire.png: usa big.png com tom laranja
    c.portrait = Assets.image(`${c.folder}/portrait.png`);
  }
  return { list, selectSlots: data.selectSlots ?? 4 };
}

// ---------------------------------------------------------------- tela e escala
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
canvas.width = VW;
canvas.height = VH;
ctx.imageSmoothingEnabled = false;

/**
 * Escala inteira (pixels nitidos) quando cabe 2x ou mais; em telas pequenas (celular) usa a escala exata
 * para aproveitar a tela toda.
 */
function resize() {
  const portraitTouch = document.body.classList.contains('touch') && window.innerHeight > window.innerWidth;
  const touchBar = portraitTouch ? 195 : 0;   // em pe, os botoes (e a dica de girar) ficam embaixo do jogo
  const availW = window.innerWidth, availH = window.innerHeight - touchBar;
  let scale = Math.min(availW / VW, availH / VH);
  scale = scale >= 2 ? Math.floor(scale) : scale;
  canvas.style.width = `${VW * scale}px`;
  canvas.style.height = `${VH * scale}px`;
}
window.addEventListener('resize', resize);

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}

// ---------------------------------------------------------------- controles de toque
function setupTouch() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouch) return;
  document.body.classList.add('touch');

  // Cada dedo na tela aponta para o botao que esta embaixo dele. Assim da para:
  // - usar varios dedos ao mesmo tempo (andar + pular + correr);
  // - deslizar o dedo de um botao para outro (◀ para ▶) sem levantar.
  const pad = document.getElementById('touch');
  const buttons = [...pad.querySelectorAll('[data-actions]')];
  const fingers = new Map();   // pointerId -> botao (ou null)
  const buttonAt = (x, y) => document.elementFromPoint(x, y)?.closest('#touch [data-actions]') ?? null;
  // Vibracao curta ao apertar (Android). So depois de um toque real, senao o navegador recusa.
  const buzz = () => { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(8); };

  const refresh = () => {
    const pressed = new Set();
    for (const btn of fingers.values()) btn?.dataset.actions.split(' ').forEach(a => pressed.add(a));
    for (const a of pressed) if (!Input.touch.has(a)) Input.touchTapped.add(a);
    Input.touch = pressed;
    const held = new Set(fingers.values());
    for (const b of buttons) b.classList.toggle('down', held.has(b));
  };

  pad.addEventListener('pointerdown', e => {
    const btn = buttonAt(e.clientX, e.clientY);
    if (!btn) return;
    e.preventDefault();
    try { pad.setPointerCapture(e.pointerId); } catch { /* alguns navegadores recusam; o toque funciona igual */ }
    fingers.set(e.pointerId, btn);
    buzz();
    refresh();
    Audio.unlock();
  });
  pad.addEventListener('pointermove', e => {
    if (!fingers.has(e.pointerId)) return;
    e.preventDefault();
    const btn = buttonAt(e.clientX, e.clientY);
    if (btn === fingers.get(e.pointerId)) return;
    fingers.set(e.pointerId, btn);
    if (btn) buzz();
    refresh();
  });
  const release = e => {
    if (!fingers.delete(e.pointerId)) return;
    refresh();
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  // Sem menu de "pressionar e segurar" nem selecao de texto nos botoes.
  pad.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------------------------------------------------------------- jogo
const game = {
  session: null,
  characters: null,
  scene: null,
  pending: null,
  debug: false,
  changeScene(s) { this.pending = s; },
};

function step() {
  Input.update();
  if (Input.keyPressed('KeyH')) game.debug = !game.debug;     // hitboxes
  if (game.pending) {
    game.scene?.exit();
    game.scene = game.pending;
    game.pending = null;
    game.scene.enter();
  }
  game.scene?.update();
}

let last = performance.now(), acc = 0, lastRaf = 0;
function tick(now) {
  acc += Math.min(now - last, 250);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) { step(); acc -= STEP; steps++; }
  if (steps === 5) acc = 0;
  if (steps === 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  game.scene?.draw(ctx);
}
function frame(now) {
  lastRaf = performance.now();
  tick(now);
  requestAnimationFrame(frame);
}
// Reserva: se o navegador parar de entregar quadros de animacao (algumas janelas embutidas fazem isso),
// um temporizador mantem o jogo rodando.
function startLoop() {
  requestAnimationFrame(frame);
  setInterval(() => { if (performance.now() - lastRaf > 100) tick(performance.now()); }, STEP);
}

function drawLoading(text) {
  Gfx.rect(ctx, 0, 0, VW, VH, [0, 0, 0, 255]);
  PixelFont.drawCentered(ctx, text, VW / 2, VH / 2 - 4, WHITE);
}

async function boot() {
  resize();
  setupTouch();
  resize();
  Input.init();
  window.addEventListener('keydown', e => {
    // Precisam rodar dentro do evento da tecla (exigencia do navegador).
    if (e.code === 'KeyF') toggleFullscreen();
    if (e.code === 'KeyM') Audio.toggleMute();
  });
  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  document.getElementById('btn-mute')?.addEventListener('click', () => Audio.toggleMute());

  drawLoading('CARREGANDO...');
  SaveData.load();
  await Promise.all([Assets.loadImages(COMMON_IMAGES), LevelManager.init(), Audio.init()]);
  game.characters = await loadCharacters();
  if (Assets.missing.size) console.info('[Assets] faltando:', [...Assets.missing]);

  game.changeScene(new TitleScene(game));
  last = performance.now();
  startLoop();
  window.__game = game;   // facilita depuracao pelo console do navegador
}

boot().catch(e => {
  console.error(e);
  drawLoading('ERRO AO INICIAR: ' + e.message);
});
