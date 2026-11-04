// Inicializacao, carregamento e loop principal (60 passos fixos por segundo, como no NES).
import { VW, VH, Assets, Input, Audio, SaveData, SpriteSheet, parseHex, Gfx, PixelFont, WHITE } from './core.js';
import { LevelManager, ALL_TILE_NAMES } from './world.js';
import { TitleScene } from './scenes.js';
import { setupTouch, showTouchHelp } from './touch.js';

const STEP = 1000 / 60;
const FRAME_COUNT = 11; // frames por folha de personagem

// Imagens fixas do jogo (mesma lista de Core/AssetManifest.cs). As da fase sao carregadas na intro.
const COMMON_IMAGES = [
  ...ALL_TILE_NAMES.map(n => `Tiles/overworld/${n}.png`),
  ...['ground', 'brick', 'hard', 'used'].map(n => `Tiles/underground/${n}.png`),
  ...ALL_TILE_NAMES.map(n => `Tiles/neon/${n}.png`),
  ...['coin', 'coin_spin', 'firewall', 'sudo_star', 'backup'].map(n => `Items/${n}_neon.png`),
  'Enemies/bug_neon.png', 'Enemies/drone.png', 'Backgrounds/neon_far.png',
  'Objects/spring.png', 'Objects/platform.png', 'Objects/checkpoint.png', 'Objects/spikes.png',
  'Enemies/bug.png', 'Enemies/virus.png', 'Enemies/virus_shell.png',
  'Items/coin.png', 'Items/coin_spin.png', 'Items/coffee.png', 'Items/firewall.png', 'Items/sudo_star.png',
  'Items/backup.png', 'Items/packet.png', 'Items/gem.png', 'Items/monster.png',
  'Effects/brick_debris.png', 'Effects/explosion.png', 'Effects/firework.png',
  'Objects/flagpole.png', 'Objects/flagpole_top.png', 'Objects/flag.png',
  'UI/logo.png', 'UI/title_background.png', 'UI/select_background.png', 'UI/hud_coin.png',
  'Backgrounds/overworld_far.png',
];

// ---------------------------------------------------------------- personagens
/**
 * Regras de jogo de cada dev, usadas quando o characters.json nao traz os campos "powerups" / "coffeeHurts"
 * (assim o perfil pode ser trocado inteiro sem perder a regra do David).
 */
const CHARACTER_RULES = {
  dev01: { powerups: ['coffee', 'monster'] },
  dev02: { powerups: ['gem'], coffeeHurts: true },     // David nao pode tomar cafe
  dev03: { powerups: ['monster', 'coffee'] },
};

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
    description: c.description ?? '', superpower: c.superpower ?? '', weakness: c.weakness ?? '',
    // frases tipicas: "quotes": ["...", "..."] (ou "quote": "..." no formato antigo)
    quotes: [].concat(c.quotes ?? c.quote ?? []).filter(Boolean),
    // atributos do perfil: [{ "label": "CAFE", "value": 0..5 }]
    stats: (c.stats ?? []).map(s => ({ label: String(s.label ?? '').slice(0, 12), value: Math.max(0, Math.min(5, s.value | 0)) })),
    // item que faz virar Senior: um ou mais de "coffee", "monster", "gem" (sorteado a cada bloco)
    powerups: [].concat(c.powerups ?? CHARACTER_RULES[c.id]?.powerups ?? 'coffee').filter(k => ['coffee', 'monster', 'gem'].includes(k)),
    // true: canecas de cafe caem do ceu e machucam (o David nao pode tomar cafe)
    coffeeHurts: (c.coffeeHurts ?? CHARACTER_RULES[c.id]?.coffeeHurts) === true,
    folder: (c.folder || `Characters/${c.id}`).replace(/\/$/, ''),
    color: parseHex(c.color, [224, 72, 72, 255]), enabled: c.enabled !== false,
  }));
  for (const c of list) {
    if (c.coffeeHurts) c.powerups = c.powerups.filter(k => k !== 'coffee');   // cafe nunca vira item dele
    if (!c.powerups.length) c.powerups = [c.coffeeHurts ? 'gem' : 'coffee'];
  }
  if (!list.length) {
    list.push({ id: 'dev01', name: 'DEV 01', role: 'Full Stack', stack: '', description: 'Personagem padrao.',
      folder: 'Characters/dev01', color: [224, 72, 72, 255], enabled: true, powerups: ['coffee'] });
  }
  // Personagens desativados ("enabled": false) aparecem como "EM BREVE" e nao carregam imagens.
  await Assets.loadImages(list.filter(c => c.enabled).flatMap(c => ['small', 'big', 'fire', 'portrait'].map(f => `${c.folder}/${f}.png`)));
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
 * Computador: escala inteira (pixels nitidos). Celular: ocupa a tela inteira (escala exata).
 */
function resize() {
  const touch = document.body.classList.contains('touch');
  let scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  if (!touch && scale >= 2) scale = Math.floor(scale);
  canvas.style.width = `${Math.floor(VW * scale)}px`;
  canvas.style.height = `${Math.floor(VH * scale)}px`;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('fullscreenchange', resize);

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
}

// ---------------------------------------------------------------- jogo
const game = {
  session: null,
  characters: null,
  scene: null,
  pending: null,
  debug: false,
  touch: false,      // jogando pelo celular (as telas mostram textos de toque em vez de teclas)
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
    if (game.scene.isGameplay) showTouchHelp();
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
  game.touch = setupTouch(game, canvas);
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
