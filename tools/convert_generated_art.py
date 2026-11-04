"""Converte as imagens de 'Imagens Geradas' para os assets do jogo (tamanho real, fundo transparente)."""
import os, numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace("\\", "/") + "/"
SRC = ROOT + "Imagens Geradas/"
OUT = ROOT + "Assets/"

def load(name):
    return np.array(Image.open(SRC + name).convert("RGBA")).astype(np.float32)

def save(arr, rel):
    path = OUT + rel
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path)
    print("salvo", rel, arr.shape[1], "x", arr.shape[0])

# ---------------- remocao de fundo ----------------
def key_green(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (g > 110) & (g > r * 1.35) & (g > b * 1.35)
    a = a.copy(); a[..., 3] = np.where(bg, 0, 255)
    # remove o "vazamento" verde nas bordas
    mx = np.maximum(r, b); a[..., 1] = np.where(g > mx, mx, g)
    return a

def key_flood(a, is_bg_color):
    """Fundo = pixels da cor de fundo conectados a borda da imagem."""
    cand = is_bg_color(a)
    lab, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    a = a.copy(); a[..., 3] = np.where(bg, 0, 255)
    return a

near_black = lambda a: a[..., :3].max(-1) < 30
near_white = lambda a: a[..., :3].min(-1) > 205

# ---------------- reducao ----------------
def downscale(a, w, h):
    """Reduz com media pre-multiplicada e binariza o alfa (pixel art nitido)."""
    w, h = max(1, int(round(w))), max(1, int(round(h)))
    al = a[..., 3:4] / 255.0
    pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1)
    img = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), "RGBA")
    # BOX em float por canal
    chans = [np.array(Image.fromarray(pm[..., c].astype(np.float32), "F").resize((w, h), Image.Resampling.BOX)) for c in range(4)]
    out = np.stack(chans, -1)
    alpha = out[..., 3]
    rgb = np.where(alpha[..., None] > 1, out[..., :3] / np.maximum(alpha[..., None], 1) * 255.0, 0)
    res = np.concatenate([rgb, np.where(alpha > 120, 255, 0)[..., None]], -1)
    return res

def crop(a, box):
    x, y, w, h = box
    return a[y:y + h, x:x + w]

def trim(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    if len(xs) == 0: return a
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def quantize(a, colors=32):
    rgb = Image.fromarray(a[..., :3].astype(np.uint8), "RGB")
    q = np.array(rgb.quantize(colors, method=Image.Quantize.MEDIANCUT).convert("RGB")).astype(np.float32)
    return np.concatenate([q, a[..., 3:4]], -1)

def keep_big_components(a, min_ratio=0.02):
    m = a[..., 3] > 0
    lab, n = ndimage.label(m)
    if n <= 1: return a
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * min_ratio]
    a = a.copy(); a[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0)
    return a

def drop_edge_fragments(a):
    """Remove pedacos de frames vizinhos: componentes (exceto o maior) que tocam a borda lateral."""
    m = a[..., 3] > 0
    lab, n = ndimage.label(m)
    if n <= 1: return a
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    biggest = int(np.argmax(sizes)) + 1
    edge = set(np.unique(np.concatenate([lab[:, 0], lab[:, -1]]))) - {0, biggest}
    a = a.copy(); a[..., 3] = np.where(np.isin(lab, list(edge)), 0, a[..., 3])
    return a

def remove_dark_holes(a, min_area, below=0.6):
    """Apaga areas pretas grandes fechadas na parte de baixo (fundo preso entre os pes da placa)."""
    dark = (a[..., 3] > 0) & (a[..., :3].max(-1) < 30)
    lab, n = ndimage.label(dark)
    if n == 0: return a
    sizes = ndimage.sum(dark, lab, range(1, n + 1))
    cys = ndimage.center_of_mass(dark, lab, range(1, n + 1))
    big = [i + 1 for i, s in enumerate(sizes) if s >= min_area and cys[i][0] > a.shape[0] * below]
    a = a.copy(); a[..., 3] = np.where(np.isin(lab, big), 0, a[..., 3])
    return a

def place(cell_w, cell_h, sprite, anchor_x=None):
    """Sprite com a base no fundo da celula e centralizado (ou anchor_x no centro)."""
    cell = np.zeros((cell_h, cell_w, 4), np.float32)
    sh, sw = sprite.shape[:2]
    ax = sw / 2 if anchor_x is None else anchor_x
    x0 = int(round(cell_w / 2 - ax)); y0 = cell_h - sh
    for yy in range(sh):
        ty = y0 + yy
        if ty < 0 or ty >= cell_h: continue
        for xx in range(sw):
            tx = x0 + xx
            if 0 <= tx < cell_w and sprite[yy, xx, 3] > 0:
                cell[ty, tx] = sprite[yy, xx]
    return cell

# =====================================================================
# PERSONAGEM
# =====================================================================
JR_FRAMES = [(31,268,119,255),(193,273,147,250),(373,273,136,250),(546,273,137,250),(718,317,231,201),
             (941,223,178,246),(1131,323,134,195),(1297,421,236,102),(1515,144,190,379),(1702,144,180,379),(1855,302,210,216)]
SR_FRAMES = [(39,209,124,319),(203,218,149,310),(378,222,155,306),(558,222,153,306),(721,290,268,234),
             (934,187,184,267),(1106,304,144,224),(1290,406,258,116),(1501,158,201,375),(1671,158,189,375),(1825,269,243,256)]

def remove_pole(fr):
    """Frames do mastro: apaga a haste (o jogo desenha o proprio mastro) e a bandeira."""
    h = fr.shape[0]
    # a haste e o unico elemento cinza (pouca saturacao) acima da cabeca
    top = fr[: int(h * 0.15)]
    rgb = top[..., :3]
    sat = rgb.max(-1) - rgb.min(-1)
    val = rgb.max(-1)
    gray = (top[..., 3] > 0) & (sat < 30) & (val > 70) & (val < 225)
    cols = np.nonzero(gray.mean(0) > 0.4)[0]
    if len(cols) == 0: return fr, None
    runs = np.split(cols, np.nonzero(np.diff(cols) > 1)[0] + 1)
    band = max(runs, key=len)
    x0, x1 = band.min() - 4, band.max() + 5          # haste com contorno
    fr = fr.copy()
    # A personagem abraca o mastro (bracos/pernas na frente dele), entao a haste FICA no sprite,
    # alinhada com o mastro do jogo. Remove-se so a bandeira e as pontas da haste.
    rgb = fr[..., :3]
    red = (fr[..., 3] > 0) & (rgb[..., 0] > 150) & (rgb[..., 1] < 90) & (rgb[..., 2] < 90)
    red[:, :x1] = False
    red_rows = np.nonzero(red.any(1))[0]
    if len(red_rows):
        fr[: red_rows.max() + 8, x1:, 3] = 0
    # para medir a altura do corpo, ignora uma faixa larga em volta da haste (inclui o contorno preto dela)
    outside = fr[..., 3].copy(); outside[:, max(0, band.min() - 12):band.max() + 13] = 0
    # os limites do corpo ignoram o metal cinza (as pontas da haste sao mais largas que ela);
    # o tenis e branco (mais claro que o metal), entao continua contando
    sat = rgb.max(-1) - rgb.min(-1)
    val = rgb.max(-1)
    metal = (sat < 30) & (val > 90) & (val < 215)
    body_rows = np.nonzero(((outside > 0) & ~metal).any(1))[0]
    fr[: body_rows.min(), :, 3] = 0
    fr[body_rows.max() + 1:, :, 3] = 0
    fr = keep_big_components(fr, 0.03)
    return fr, (x0 + x1) / 2.0

def build_character(src_name, frames, keyer, cell_h, out_rel, pad=0, solo=()):
    """frames = 11 caixas (x, y, w, h) na ordem do jogo. A caixa pode ter folga: o desenho e recortado.
    solo: quadros em que so o desenho principal fica (tira sombra do pulo, poeira e a caveira do 'morrendo')."""
    a = keyer(load(src_name))
    extracted = []
    for i, box in enumerate(frames):
        x, y, w, h = box
        fr = crop(a, (x, y - pad, w, h + pad))
        fr = keep_big_components(fr, 0.2 if i in solo else 0.01)
        fr = drop_edge_fragments(fr)
        fr = trim(fr)
        pole_x = None
        if i in (8, 9):
            fr, pole_x = remove_pole(fr)
        ys, xs = np.nonzero(fr[..., 3] > 0)
        fr = fr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        if pole_x is not None: pole_x -= xs.min()
        extracted.append((fr, pole_x))
    f = cell_h / extracted[0][0].shape[0]                # o frame parado define a escala
    sprites = []
    for fr, pole_x in extracted:
        cx = (np.nonzero(fr[..., 3] > 0)[1].mean())
        fi = min(f, cell_h / fr.shape[0])                # frame mais alto que a celula: reduz um pouco
        small = downscale(fr, fr.shape[1] * fi, fr.shape[0] * fi)
        # no mastro o jogo desenha o sprite com o centro 3px a esquerda da haste
        anchor = (pole_x * fi - 3) if pole_x is not None else cx * fi
        sprites.append((small, anchor))
    cell_w = 16 if max(s.shape[1] for s, _ in sprites) <= 16 else 32
    sheet = np.concatenate([place(cell_w, cell_h, s, anc) for s, anc in sprites], 1)
    sheet = quantize(sheet, 48)                          # 48 cores: o cinza do mastro nao "vira" laranja
    save(sheet, out_rel)

def columns(xs, y0, y1):
    """Caixas a partir de faixas de colunas [(x0, x1), ...] e uma faixa de linhas."""
    return [(x0, y0, x1 - x0, y1 - y0) for x0, x1 in xs]

# Junior "chibi" (v2) e versao Firewall - folha dev01_small_fire_clouds_night_original.png
CHIBI_COLS = [(30, 140), (150, 262), (272, 388), (398, 512), (528, 692), (700, 826), (830, 948),
              (955, 1112), (1112, 1240), (1240, 1352), (1352, 1520)]
FIRE_COLS = [(8, 140), (140, 266), (266, 393), (393, 516), (520, 700), (700, 824), (822, 952),
             (950, 1122), (1108, 1242), (1240, 1378), (1345, 1525)]
NEON = "dev01_small_fire_clouds_night_original.png"

# Topo de cada caixa: abaixo dos titulos escritos na imagem (que vao ate x~550),
# mas acima do pulo e do mastro, que sao mais altos.
CHIBI_TOPS = [100, 100, 100, 100, 100, 85, 100, 100, 60, 60, 100]
FIRE_TOPS = [445, 445, 445, 445, 445, 420, 445, 445, 395, 395, 445]
chibi = [(x0, t, x1 - x0, 282 - t) for (x0, x1), t in zip(CHIBI_COLS, CHIBI_TOPS)]
fire = [(x0, t, x1 - x0, 652 - t) for (x0, x1), t in zip(FIRE_COLS, FIRE_TOPS)]

# Firewall v2: mesma diagramacao e proporcoes da Senior (substitui a versao chibi da folha NEON).
FIRE_V2_FRAMES = [(25, 214, 145, 286), (206, 214, 158, 286), (382, 214, 155, 285), (555, 214, 137, 286),
                  (713, 301, 226, 194), (928, 159, 184, 265), (1092, 304, 146, 196), (1256, 381, 230, 119),
                  (1473, 140, 191, 367), (1637, 140, 202, 367), (1816, 243, 249, 257)]

def key_glow(a):
    """Fundo transparente com brilho semitransparente em volta: fica so o desenho opaco."""
    a = a.copy(); a[..., 3] = np.where(a[..., 3] > 200, 255, 0)
    return a

build_character(NEON, chibi, key_green, 16, "Characters/dev01/small.png")
build_character("dev01_big_original.png", SR_FRAMES, key_green, 32, "Characters/dev01/big.png")
build_character("dev01_fire_v2_original.png", FIRE_V2_FRAMES, key_glow, 32, "Characters/dev01/fire.png")

# retrato 48x48 (recorte do rosto/ombros)
p = load("dev01_portrait_original.png")
p = p[40:40 + 860, 197:197 + 860]
save(quantize(downscale(p, 48, 48), 48), "Characters/dev01/portrait.png")

# =====================================================================
# DAVID (dev02)
# =====================================================================
# Junior: fundo transparente, 11 poses em uma linha (rotulos embaixo ficam fora das caixas).
DAVID_SMALL = [(42, 239, 134, 258), (222, 239, 132, 258), (393, 239, 132, 258), (566, 239, 131, 258),
               (707, 287, 220, 210), (953, 195, 162, 255), (1139, 285, 168, 212), (1304, 370, 206, 127),
               (1526, 179, 138, 319), (1696, 168, 137, 330), (1866, 251, 144, 248)]
# Senior: fundo verde, 11 poses (a bola do arremesso e um pedaco separado, entra na ultima caixa).
DAVID_BIG = [(42, 258, 130, 293), (207, 259, 142, 292), (380, 260, 135, 291), (552, 259, 135, 292),
             (702, 320, 226, 231), (975, 215, 170, 276), (1144, 316, 168, 234), (1304, 416, 244, 135),
             (1535, 181, 140, 369), (1698, 174, 140, 376), (1862, 258, 265, 293)]
build_character("dev02_small_v1_original.png", DAVID_SMALL, lambda a: a, 16, "Characters/dev02/small.png")
build_character("dev02_big_original.png", DAVID_BIG, key_green, 32, "Characters/dev02/big.png")

def strip_boxes(bounds, scale, y0, y1):
    """Caixas a partir das divisas entre os quadros, medidas na imagem reduzida (scale = original / medida)."""
    b = [int(round(v * scale)) for v in bounds]
    return [(b[i], int(y0 * scale), b[i + 1] - b[i], int((y1 - y0) * scale)) for i in range(len(b) - 1)]

# Firewall v2 (gema rosa): 11 poses numa linha, sem rotulos.
DAVID_FIRE = strip_boxes([20, 175, 335, 497, 645, 890, 1072, 1222, 1438, 1575, 1730, 2000], 2138 / 2000, 150, 530)
build_character("dev02_fire_v2_original.png", DAVID_FIRE, key_green, 32, "Characters/dev02/fire.png", solo=(4, 5, 7))

p = load("dev02_portrait_original.png")
p = p[20:20 + 880, 190:190 + 880]
save(quantize(downscale(p, 48, 48), 48), "Characters/dev02/portrait.png")

# =====================================================================
# VICTOR (dev03)
# =====================================================================
# As tres folhas tem 11 poses numa linha com os rotulos embaixo (y > ~505 na medida reduzida).
VICTOR_SMALL = strip_boxes([0, 170, 340, 510, 685, 890, 1065, 1228, 1425, 1585, 1775, 2000], 2159 / 2000, 140, 500)
VICTOR_BIG = strip_boxes([10, 170, 333, 505, 668, 880, 1048, 1205, 1425, 1590, 1745, 2000], 2172 / 2000, 125, 495)
build_character("dev03_small_v1_original.png", VICTOR_SMALL, lambda a: a, 16, "Characters/dev03/small.png", solo=(4, 5, 7))
build_character("dev03_big_original.png", VICTOR_BIG, key_green, 32, "Characters/dev03/big.png", solo=(4, 5, 7))
build_character("dev03_fire_v2_original.png", VICTOR_BIG, key_green, 32, "Characters/dev03/fire.png", solo=(4, 5, 7))

p = load("dev03_portrait_original.png")
p = p[30:30 + 960, 150:150 + 960]
save(quantize(downscale(p, 48, 48), 48), "Characters/dev03/portrait.png")

# =====================================================================
# MASTRO / BANDEIRA / PACOTE (extraidos da folha do Senior)
# =====================================================================
sr = key_green(load("dev01_big_original.png"))
pole_frame = crop(sr, SR_FRAMES[8])
m = pole_frame[..., 3] > 0
band = np.nonzero(m.sum(0) / m.shape[0] > 0.8)[0]
bx0, bx1 = band.min(), band.max() + 1
pole_strip = pole_frame[:, bx0:bx1]
seg_h = int(round((bx1 - bx0) * 16 / 3))          # haste com ~3 px de largura
mid = pole_strip.shape[0] // 2
seg = downscale(pole_strip[mid:mid + seg_h], 3, 16)
save(place(16, 16, seg), "Objects/flagpole.png")
top = downscale(pole_strip[0:seg_h], 3, 16)
topc = place(16, 16, top)
# bolinha no topo (antena) em ciano
for yy in range(0, 5):
    for xx in range(6, 10):
        if (yy in (0, 4)) and xx in (6, 9): continue
        topc[yy, xx] = [60, 200, 255, 255]
save(topc, "Objects/flagpole_top.png")

flag = pole_frame.copy(); flag[:, :bx1 + 2, 3] = 0
flag[int(flag.shape[0] * 0.3):, :, 3] = 0               # so o topo (a bandeira)
flag = trim(keep_big_components(flag, 0.5))
fw = 16; fh = max(1, int(round(flag.shape[0] * 16 / flag.shape[1])))
fl = downscale(flag[:, ::-1], fw, fh)                  # espelhada: presa pela borda direita
cell = np.zeros((16, 16, 4), np.float32); cell[:fh] = fl[:16]
save(quantize(cell, 16), "Objects/flag.png")

thr = crop(sr, SR_FRAMES[10])
r, g, b = thr[..., 0], thr[..., 1], thr[..., 2]
ball = thr.copy()
ball[..., 3] = np.where((thr[..., 3] > 0) & (b > r + 30) & (b > 150), 255, 0)
ball[:, : int(ball.shape[1] * 0.6), 3] = 0
ball = trim(keep_big_components(ball, 0.2))
bs = downscale(ball, 8, 8)
frames = [np.rot90(bs, k) for k in range(4)]
save(np.concatenate(frames, 1), "Items/packet.png")

# =====================================================================
# TILES
# =====================================================================
t = key_flood(load("tiles_overworld_original.png"), near_black)
save(quantize(downscale(crop(t, (53, 186, 235, 208)), 16, 16), 24), "Tiles/overworld/ground.png")
save(quantize(downscale(crop(t, (375, 184, 214, 210)), 16, 16), 24), "Tiles/overworld/brick.png")
q = crop(t, (668, 198, 539, 184)); qw = q.shape[1] / 3
qs = [downscale(q[:, int(i * qw):int((i + 1) * qw)], 16, 16) for i in range(3)]
save(quantize(np.concatenate(qs, 1), 32), "Tiles/overworld/question.png")
save(quantize(downscale(crop(t, (1286, 186, 206, 207)), 16, 16), 24), "Tiles/overworld/used.png")
save(quantize(downscale(crop(t, (641, 577, 257, 245)), 16, 16), 24), "Tiles/overworld/hard.png")

# ---------------- canos ----------------
pa = key_flood(load("pipes_original.png"), near_black)
piece = trim(crop(pa, (284, 230, 87, 137)))            # coluna 2, linha 1: boca + corpo liso
f = 32 / piece.shape[1]
rows16 = int(round(16 / f))
top_tile = downscale(piece[0:rows16], 32, 16)
mid0 = piece.shape[0] // 2 - rows16 // 2
body_tile = downscale(piece[mid0:mid0 + rows16], 32, 16)
top_tile = quantize(top_tile, 16); body_tile = quantize(body_tile, 16)
save(top_tile[:, :16], "Tiles/overworld/pipe_top_left.png")
save(top_tile[:, 16:], "Tiles/overworld/pipe_top_right.png")
save(body_tile[:, :16], "Tiles/overworld/pipe_left.png")
save(body_tile[:, 16:], "Tiles/overworld/pipe_right.png")
# horizontal (boca virada para a esquerda) = vertical girado 90 graus
htop = np.rot90(top_tile, 1); hbody = np.rot90(body_tile, 1)
save(htop[:16], "Tiles/overworld/hpipe_mouth_top.png")
save(htop[16:], "Tiles/overworld/hpipe_mouth_bottom.png")
save(hbody[:16], "Tiles/overworld/hpipe_body_top.png")
save(hbody[16:], "Tiles/overworld/hpipe_body_bottom.png")

# =====================================================================
# DECORACAO
# =====================================================================
bu = key_flood(load("decor_bushes_original.png"), near_black)
s = 32 / 356
for name, box in [("bush_small", (78, 360, 356, 214)), ("bush_medium", (564, 276, 475, 298)), ("bush_large", (1145, 191, 659, 383))]:
    c = trim(crop(bu, box))
    save(quantize(downscale(c, c.shape[1] * s, c.shape[0] * s), 32), f"Decor/{name}.png")

hi = key_flood(load("decor_hills_original.png"), near_black)
for name, box, w in [("hill_small", (85, 375, 610, 296), 48), ("hill_large", (758, 131, 943, 540), 80)]:
    c = trim(crop(hi, box))
    save(quantize(downscale(c, w, c.shape[0] * w / c.shape[1]), 32), f"Decor/{name}.png")

# Nuvens da noite (substituem as diurnas de decor_clouds_original.png, que nao combinavam com o skyline)
nc = key_flood(load(NEON), near_black)
for name, box, w in [("cloud_small", (120, 790, 270, 150), 32), ("cloud_medium", (520, 790, 315, 155), 48),
                     ("cloud_large", (1000, 770, 425, 180), 64)]:
    c = trim(keep_big_components(crop(nc, box), 0.002))
    save(quantize(downscale(c, w, c.shape[0] * w / c.shape[1]), 24), f"Decor/{name}.png")

dc = trim(key_flood(load("decor_datacenter_original.png"), near_black))
save(quantize(downscale(dc, 80, dc.shape[0] * 80 / dc.shape[1]), 32), "Decor/datacenter.png")

sg = trim(remove_dark_holes(key_flood(load("decor_sign_welcome_original.png"), near_black), 3000))
save(quantize(downscale(sg, 64, sg.shape[0] * 64 / sg.shape[1]), 32), "Decor/sign_welcome.png")

# =====================================================================
# FUNDO (skyline) - 240 de altura, espelhado para repetir sem emenda
# =====================================================================
sk = load("background_overworld_far_original.png")
sw = int(round(sk.shape[1] * 240 / sk.shape[0]))
sky = downscale(sk, sw, 240)
sky[..., 3] = 255
sky = np.concatenate([sky, sky[:, ::-1]], 1)
save(quantize(sky, 64), "Backgrounds/overworld_far.png")

# =====================================================================
# Sprites em sequencia de quadros do mesmo tamanho
# =====================================================================
def strip(src, boxes, cell_w, cell_h, out_rel, scale=None, colors=32, bottom=True, keep=0.01, largest_only=False,
          scale_from=None):
    """Cada caixa vira um quadro. scale=None: cada desenho e ajustado ao quadro;
    scale='shared': mesma escala para todos (o maior cabe no quadro), preservando tamanhos relativos.
    scale_from: indices dos quadros que definem a escala compartilhada (os outros sao reduzidos se nao couberem)."""
    parts = []
    for box in boxes:
        c = crop(src, box)
        c = keep_big_components(c, 0.5 if largest_only else keep)
        parts.append(trim(c))
    if scale == 'shared':
        ref = parts if scale_from is None else [parts[i] for i in scale_from]
        f = min(min(cell_w / p.shape[1], cell_h / p.shape[0]) for p in ref)
    cells = []
    for p in parts:
        fit = min(cell_w / p.shape[1], cell_h / p.shape[0])
        fi = min(f, fit) if scale == 'shared' else fit
        s = downscale(p, max(1, p.shape[1] * fi), max(1, p.shape[0] * fi))
        if bottom:
            cells.append(place(cell_w, cell_h, s))
        else:                                            # centralizado na vertical
            cell = place(cell_w, cell_h, s)
            shift = (cell_h - s.shape[0]) // 2
            cells.append(np.roll(cell, -shift, axis=0))
    save(quantize(np.concatenate(cells, 1), colors), out_rel)

# ---------------- Inimigos (fundo transparente com brilho) ----------------
en = load("enemies_original.png")
en[..., 3] = np.where(en[..., 3] > 200, 255, 0)          # remove o brilho semitransparente
strip(en, [(60, 245, 190, 145), (298, 245, 190, 145), (528, 270, 255, 120)], 16, 16, "Enemies/bug.png", scale='shared',
      scale_from=[0, 1])
strip(en, [(925, 225, 200, 220), (1200, 225, 200, 220)], 16, 24, "Enemies/virus.png", scale='shared')
strip(en, [(440, 705, 285, 145), (805, 705, 285, 145)], 16, 16, "Enemies/virus_shell.png", scale='shared')

# ---------------- Itens (fundo verde) ----------------
it = key_green(load("items_original.png"))
strip(it, [(98, 140, 140, 150), (308, 140, 140, 150), (510, 140, 145, 150)], 16, 16, "Items/coin.png", scale='shared')
strip(it, [(825, 145, 135, 140), (1010, 145, 115, 140), (1195, 145, 60, 140), (1330, 145, 120, 140)], 16, 16,
      "Items/coin_spin.png", scale='shared')
strip(it, [(325, 435, 140, 160)], 16, 16, "Items/coffee.png")
strip(it, [(818, 425, 145, 195), (994, 425, 145, 195), (1170, 425, 145, 195), (1345, 425, 145, 195)], 16, 16,
      "Items/firewall.png", scale='shared')
strip(it, [(100, 765, 195, 205), (300, 765, 195, 205), (498, 765, 180, 205), (682, 765, 180, 205)], 16, 16,
      "Items/sudo_star.png", scale='shared')
strip(it, [(1100, 800, 155, 155)], 16, 16, "Items/backup.png")

# Power-ups por personagem: gema rosa (David) e Monster White (Victor). Os brilhos soltos da gema saem.
gm = key_green(load("Gema Rosa e Lata Monster Gelada.png"))
strip(gm, [(150, 220, 660, 520)], 16, 16, "Items/gem.png", largest_only=True)
strip(gm, [(1110, 110, 425, 665)], 16, 16, "Items/monster.png", largest_only=True)

# ---------------- Efeitos e interface ----------------
fx = key_green(load("effects_ui_original.png"))
strip(fx, [(95, 205, 75, 75), (310, 230, 70, 70)], 8, 8, "Effects/brick_debris.png", largest_only=True, bottom=False)
strip(fx, [(480, 150, 140, 185), (628, 150, 170, 195), (800, 145, 215, 215)], 16, 16, "Effects/explosion.png",
      scale='shared', bottom=False)
strip(fx, [(1060, 150, 115, 175), (1176, 150, 165, 195), (1335, 145, 185, 210)], 16, 16, "Effects/firework.png",
      scale='shared', bottom=False)
strip(fx, [(1095, 635, 90, 105), (1210, 635, 100, 110), (1335, 630, 110, 110)], 8, 8, "UI/hud_coin.png", scale='shared')

lg = key_flood(load("effects_ui_original.png"), near_black)
logo = trim(keep_big_components(crop(lg, (40, 490, 945, 440)), 0.02))
lw = min(224, int(round(logo.shape[1] * 80 / logo.shape[0])))
save(quantize(downscale(logo, lw, logo.shape[0] * lw / logo.shape[1]), 48), "UI/logo.png")

# =====================================================================
# Sala bonus (subsolo) e fundos das telas
# =====================================================================
def fit_screen(a, box, w=256, h=240):
    """Recorta a maior area com a proporcao da tela dentro de 'box' (centralizada) e reduz."""
    x, y, bw, bh = box
    if bw / bh > w / h:
        cw = int(round(bh * w / h)); x += (bw - cw) // 2; bw = cw
    else:
        ch = int(round(bw * h / w)); y += (bh - ch) // 2; bh = ch
    out = downscale(crop(a, (x, y, bw, bh)), w, h)
    out[..., 3] = 255
    return out

tu = key_green(load("tiles_underground_original.png"))
for name, box in [("ground", (108, 441, 243, 242)), ("brick", (462, 438, 257, 245)),
                  ("hard", (834, 432, 269, 263)), ("used", (1198, 442, 241, 241))]:
    save(quantize(downscale(trim(crop(tu, box)), 16, 16), 24), f"Tiles/underground/{name}.png")

ur = load("underground_rack_background_original.png")
rack = trim(keep_big_components(crop(key_green(ur), (60, 390, 190, 375)), 0.05))
save(quantize(downscale(rack, 16, 32), 24), "Decor/server_rack.png")
# o fundo e vertical: usa a faixa horizontal com os racks e o piso (abaixo do rotulo escrito)
save(quantize(fit_screen(ur, (330, 290, 958, 931)), 64), "Backgrounds/underground_far.png")

ts = load("ui_title_select_backgrounds_original.png")
save(quantize(fit_screen(ts, (0, 0, 904, 864)), 64), "UI/title_background.png")
save(quantize(fit_screen(ts, (916, 0, 905, 864)), 64), "UI/select_background.png")

# =====================================================================
# FASE 1-3 "NEON GRID" (tema neon)
# =====================================================================
def key_green_strict(a):
    """Fundo verde puro ligado a borda (preserva verdes do desenho: folhas holograficas, capsula)."""
    def is_bg(x):
        r, g, b = x[..., 0], x[..., 1], x[..., 2]
        return (g > 200) & (r < 90) & (b < 90) & (g > r * 2.2) & (g > b * 2.2)
    out = key_flood(a, is_bg)
    # franja verde do antisserrilhado na borda do desenho
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    edge = (out[..., 3] > 0) & (g > 180) & (r < 120) & (b < 120)
    near = ndimage.binary_dilation(out[..., 3] == 0, iterations=2)
    out[..., 3] = np.where(edge & near, 0, out[..., 3])
    return out

def tile16(src, box, rel, colors=32):
    save(quantize(downscale(trim(crop(src, box)), 16, 16), colors), rel)

nb = key_green(load("Sprites de Blocos Cyberpunk em Pixel Art.png"))
tile16(nb, (61, 224, 261, 262), "Tiles/neon/ground.png")
tile16(nb, (395, 224, 262, 262), "Tiles/neon/brick.png")
qx, qw = 731, 767 / 3
save(quantize(np.concatenate([downscale(crop(nb, (int(qx + i * qw), 224, int(qw), 261)), 16, 16) for i in range(3)], 1), 32),
     "Tiles/neon/question.png")
tile16(nb, (1558, 224, 242, 261), "Tiles/neon/used.png")
tile16(nb, (1861, 224, 254, 262), "Tiles/neon/hard.png")

# Tubos de energia = canos do tema neon (2 blocos de largura)
tb = key_green(load("Tubos de Energia Ciano em Pixel Art.png"))
vt = trim(crop(tb, (247, 98, 392, 696)))
f = 32 / vt.shape[1]; seg = int(round(16 / f))
vtop = quantize(downscale(vt[:seg], 32, 16), 24)
mid = vt.shape[0] // 2 - seg // 2
vbody = quantize(downscale(vt[mid:mid + seg], 32, 16), 24)
save(vtop[:, :16], "Tiles/neon/pipe_top_left.png"); save(vtop[:, 16:], "Tiles/neon/pipe_top_right.png")
save(vbody[:, :16], "Tiles/neon/pipe_left.png"); save(vbody[:, 16:], "Tiles/neon/pipe_right.png")
ht = trim(crop(tb, (879, 287, 702, 352)))
f = 32 / ht.shape[0]; seg = int(round(16 / f))
hmouth = quantize(downscale(ht[:, :seg], 16, 32), 24)
hmid = ht.shape[1] // 2 - seg // 2
hbody = quantize(downscale(ht[:, hmid:hmid + seg], 16, 32), 24)
save(hmouth[:16], "Tiles/neon/hpipe_mouth_top.png"); save(hmouth[16:], "Tiles/neon/hpipe_mouth_bottom.png")
save(hbody[:16], "Tiles/neon/hpipe_body_top.png"); save(hbody[16:], "Tiles/neon/hpipe_body_bottom.png")

# Itens do tema neon: CPU (moeda), escudo (Firewall), asterisco (Sudo Star), capsula (Backup)
ic = key_green_strict(load("Ícones Pixel Neon_ CPU, Escudos e Energia.png"))
strip(ic, [(63, 251, 203, 193)] * 3, 16, 16, "Items/coin_neon.png", largest_only=True)
strip(ic, [(63, 251, 203, 193)] * 4, 16, 16, "Items/coin_spin_neon.png", largest_only=True)
strip(ic, [(int(329 + i * 742 / 4), 249, int(742 / 4), 196) for i in range(4)], 16, 16, "Items/firewall_neon.png", scale='shared')
strip(ic, [(int(1127 + i * 745 / 4), 247, int(745 / 4), 197) for i in range(4)], 16, 16, "Items/sudo_star_neon.png", scale='shared')
strip(ic, [(1939, 243, 164, 201)], 16, 16, "Items/backup_neon.png")

# Inimigos: aranha (Bug do tema neon) e drone voador
sd = key_green(load("Sprites de Aranha e Drone Neon.png"))
strip(sd, [(44, 230, 312, 235), (403, 230, 281, 226), (714, 326, 326, 130)], 16, 16, "Enemies/bug_neon.png",
      scale='shared', scale_from=[0, 1], largest_only=True)
strip(sd, [(1106, 248, 357, 178), (1473, 219, 309, 201), (1820, 229, 288, 206)], 24, 16, "Enemies/drone.png",
      scale='shared', bottom=False)

# Objetos: mola, plataforma flutuante, poste de checkpoint, espinhos
kt = key_green_strict(load("Kit de Sprites Sci-Fi Neon em Pixel Art.png"))
strip(kt, [(298, 326, 216, 234), (48, 408, 225, 152)], 16, 16, "Objects/spring.png", scale='shared', largest_only=True)
pl = trim(keep_big_components(crop(kt, (589, 350, 630, 188)), 0.05))
save(quantize(downscale(pl, 48, pl.shape[0] * 48 / pl.shape[1]), 32), "Objects/platform.png")
strip(kt, [(1283, 161, 219, 403), (1546, 161, 220, 403)], 16, 32, "Objects/checkpoint.png", scale='shared', largest_only=True)
strip(kt, [(1857, 347, 272, 217)], 16, 16, "Objects/spikes.png")

# Decoracao: planta holografica, terminal e o portal (fim da fase, no lugar do Data Center)
dk = key_green_strict(load("Plant Holográfica, Terminal e Portal Neon.png"))
for name, box, w in [("holo_plant", (85, 285, 355, 485), 24), ("terminal", (500, 290, 485, 478), 32),
                     ("portal", (1040, 55, 681, 752), 72)]:
    c = trim(keep_big_components(crop(dk, box), 0.002))
    save(quantize(downscale(c, w, c.shape[0] * w / c.shape[1]), 48), f"Decor/{name}.png")

# Fundo da fase: paisagem neon com 240 de altura, espelhada para repetir sem emenda
nk = load("Paisagem Cyberpunk Neon em Pixel Art.png")
nw = int(round(nk.shape[1] * 240 / nk.shape[0]))
neon = downscale(nk, nw, 240); neon[..., 3] = 255
save(quantize(np.concatenate([neon, neon[:, ::-1]], 1), 64), "Backgrounds/neon_far.png")
