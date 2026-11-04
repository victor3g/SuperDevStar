// Controles de toque (celular/tablet). Sem botoes na tela: a propria tela e o controle.
//
//  Na fase:
//   - metade ESQUERDA: "analogico" flutuante. Onde o polegar encosta vira o centro; arrastar anda,
//     arrastar mais longe corre, para cima pula, para baixo agacha/entra no cano.
//   - metade DIREITA: tocar pula (segurar = pulo mais alto); deslizar o dedo lanca pacote (Firewall).
//   - tocar no placar (topo do jogo) pausa.
//  Nos menus: tocar escolhe a opcao (cada tela trata em onTap); deslizar para os lados troca a opcao.
import { VW, VH, Input, Audio } from './core.js';

const DEAD_ZONE = 10;        // px de arrasto antes de comecar a andar
const RUN_DISTANCE = 46;     // arrastar alem disso = correr
const VERTICAL = 30;         // arrasto vertical para pular / agachar
const STICK_RADIUS = 60;     // o centro do analogico acompanha o dedo alem disso
const FLICK_DISTANCE = 26;   // deslizar no lado direito para lancar pacote
const FLICK_TIME = 350;      // ms
const TAP_MOVE = 18;         // nos menus, mais que isso e "arrastar", nao "tocar"
const HUD_HEIGHT = 30;       // pixels do jogo no topo que funcionam como pausa

export const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export function setupTouch(game, canvas) {
  if (!isTouchDevice()) return false;
  document.body.classList.add('touch');

  const layer = document.getElementById('touch-layer');
  const base = document.getElementById('stick-base');
  const knob = document.getElementById('stick-knob');
  const ring = document.getElementById('tap-ring');

  let stick = null;                 // { id, ox, oy, x, y }
  const jumpers = new Map();        // id -> { x0, y0, t0, fired }
  const menuTaps = new Map();       // id -> { x0, y0, t0 }

  const buzz = (ms = 8) => { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); };
  const inGame = () => game.scene?.isGameplay && !game.scene.paused;

  /** Converte a posicao do dedo para coordenadas do jogo (256x240). */
  const toGame = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return { x: (x - r.left) / r.width * VW, y: (y - r.top) / r.height * VH, inside: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom };
  };

  // ---------------------------------------------------------------- estado -> acoes
  const refresh = () => {
    const pressed = new Set();
    if (stick) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > DEAD_ZONE) pressed.add(dx < 0 ? 'left' : 'right');
      if (ax > RUN_DISTANCE) pressed.add('run');
      if (dy < -VERTICAL && ay > ax * 0.7) { pressed.add('up'); pressed.add('jump'); }
      if (dy > VERTICAL && ay > ax) pressed.add('down');
    }
    if (jumpers.size) pressed.add('jump');
    for (const a of pressed) if (!Input.touch.has(a)) Input.touchTapped.add(a);
    Input.touch = pressed;
  };

  const drawStick = () => {
    if (!stick) { base.classList.remove('show'); knob.classList.remove('show'); return; }
    base.style.left = `${stick.ox}px`; base.style.top = `${stick.oy}px`;
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(d, STICK_RADIUS) / d;
    knob.style.left = `${stick.ox + dx * k}px`; knob.style.top = `${stick.oy + dy * k}px`;
    base.classList.add('show'); knob.classList.add('show');
  };
  const showRing = (x, y) => {
    ring.style.left = `${x}px`; ring.style.top = `${y}px`;
    ring.classList.add('show');
  };

  // ---------------------------------------------------------------- tela cheia e paisagem
  const goFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
      .catch(() => {});
  };

  // ---------------------------------------------------------------- eventos
  layer.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { layer.setPointerCapture(e.pointerId); } catch { /* sem captura o toque funciona igual */ }
    goFullscreen();
    Audio.unlock();
    const { clientX: x, clientY: y } = e;

    if (!inGame()) {
      menuTaps.set(e.pointerId, { x0: x, y0: y, t0: performance.now() });
      return;
    }
    const g = toGame(x, y);
    if (g.inside && g.y < HUD_HEIGHT) {          // toque no placar = pausa
      Input.touchTapped.add('start');
      return;
    }
    if (x < window.innerWidth / 2 && !stick) {
      stick = { id: e.pointerId, ox: x, oy: y, x, y };
      drawStick();
    } else {
      jumpers.set(e.pointerId, { x0: x, y0: y, t0: performance.now(), fired: false });
      showRing(x, y);
      buzz();
    }
    refresh();
  });

  layer.addEventListener('pointermove', e => {
    const { clientX: x, clientY: y } = e;
    if (stick && e.pointerId === stick.id) {
      e.preventDefault();
      stick.x = x; stick.y = y;
      // o centro acompanha o dedo: nao precisa voltar o polegar para trocar de direcao
      const dx = x - stick.ox, dy = y - stick.oy, d = Math.hypot(dx, dy);
      if (d > STICK_RADIUS) { stick.ox = x - dx / d * STICK_RADIUS; stick.oy = y - dy / d * STICK_RADIUS; }
      drawStick();
      refresh();
      return;
    }
    const j = jumpers.get(e.pointerId);
    if (j && !j.fired && performance.now() - j.t0 < FLICK_TIME && Math.hypot(x - j.x0, y - j.y0) > FLICK_DISTANCE) {
      j.fired = true;                            // deslizou: lanca pacote
      Input.touchTapped.add('fire');
      buzz(15);
    }
  });

  const release = e => {
    if (stick && e.pointerId === stick.id) { stick = null; drawStick(); refresh(); return; }
    if (jumpers.delete(e.pointerId)) {
      if (!jumpers.size) ring.classList.remove('show');
      refresh();
      return;
    }
    const t = menuTaps.get(e.pointerId);
    if (!t) return;
    menuTaps.delete(e.pointerId);
    if (e.type === 'pointercancel') return;
    const dx = e.clientX - t.x0, dy = e.clientY - t.y0;
    const scene = game.scene;
    if (Math.abs(dx) > TAP_MOVE * 2 && Math.abs(dx) > Math.abs(dy)) {
      // deslizar para os lados nos menus
      if (scene?.onSwipe) scene.onSwipe(dx < 0 ? -1 : 1);
      else Input.touchTapped.add(dx < 0 ? 'left' : 'right');
    } else if (Math.hypot(dx, dy) < TAP_MOVE) {
      const g = toGame(e.clientX, e.clientY);
      if (scene?.onTap) scene.onTap(g.x, g.y, g.inside);
      else Input.touchTapped.add('confirm');
    }
  };
  layer.addEventListener('pointerup', release);
  layer.addEventListener('pointercancel', release);

  // ---------------------------------------------------------------- sem zoom, sem menus do navegador
  const block = e => e.preventDefault();
  document.addEventListener('gesturestart', block);
  document.addEventListener('gesturechange', block);
  document.addEventListener('dblclick', block);
  document.addEventListener('contextmenu', block);
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  // Ao trocar de app (ou desligar a tela), solta tudo.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    stick = null; jumpers.clear(); menuTaps.clear();
    drawStick(); ring.classList.remove('show');
    refresh();
  });
  return true;
}

/** Dica dos controles nas primeiras partidas (some depois de alguns segundos). */
export function showTouchHelp() {
  const help = document.getElementById('touch-help');
  if (!help || !document.body.classList.contains('touch')) return;
  let shown = 0;
  try { shown = parseInt(localStorage.getItem('superdevstar.touchhelp') ?? '0', 10) || 0; } catch { /* modo privado */ }
  if (shown >= 3) return;
  try { localStorage.setItem('superdevstar.touchhelp', String(shown + 1)); } catch { /* modo privado */ }
  help.classList.remove('fade');
  help.classList.add('show');
  setTimeout(() => help.classList.add('fade'), 6000);
  setTimeout(() => help.classList.remove('show', 'fade'), 7000);
}
