"""Gera Assets/Levels/1-3.txt ("NEON GRID": a cidade virtual em neon).

Uso: python tools/levels/gen_1_3.py
O mapa pode ser editado a mao depois; o script so garante que todas as linhas tem o mesmo tamanho.

Elementos novos desta fase (funcionam em qualquer fase):
  J mola            ^ espinhos         d drone voador
  = plataforma que vai e volta na horizontal (3 blocos, o caractere marca a ponta esquerda)
  | plataforma que sobe e desce
Regra de dificuldade: nenhum degrau com mais de 3 blocos sem mola; buracos sem plataforma tem no maximo 3 blocos.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
H = 15
W = 214


def grid(w):
    return [['.'] * w for _ in range(H)]


m = grid(W)


def put(x, y, c):
    m[y][x] = c


def hline(x0, x1, y, c):
    for x in range(x0, x1 + 1):
        put(x, y, c)


def vline(x, y0, y1, c):
    for y in range(y0, y1 + 1):
        put(x, y, c)


def ground(x0, x1):
    hline(x0, x1, 13, '#')
    hline(x0, x1, 14, '#')


def tube(x, top):
    """Tubo de energia (cano). top = linha da boca; maximo 3 blocos de altura."""
    put(x, top, '['); put(x + 1, top, ']')
    for y in range(top + 1, 13):
        put(x, y, '('); put(x + 1, y, ')')


def row(x, y, text):
    for i, c in enumerate(text):
        if c != ' ':
            put(x + i, y, c)


# ---------------------------------------------------------------- chao (buracos entre os trechos)
for x0, x1 in [(0, 24), (28, 52), (67, 90), (94, 150), (154, 158), (162, W - 1)]:
    ground(x0, x1)

# ---------------------------------------------------------------- 1. chegada na grade
put(2, 12, 'P')
row(10, 9, '?BMB?')
put(20, 12, 'g')

# ---------------------------------------------------------------- 2. espinhos, tubo e a primeira mola
row(32, 12, '^^')
row(31, 9, 'oooo')
tube(38, 10)
put(42, 12, 'g'); put(45, 12, 'g')
put(48, 12, 'J')                         # mola: leva ate a plataforma secreta la em cima
row(46, 5, 'XXBUBX')
row(46, 4, 'oooooo')

# ---------------------------------------------------------------- 3. buraco grande com plataformas flutuantes
put(54, 10, '=')                         # vai de 54 a 58
put(61, 8, '=')                          # vai de 61 a 65
row(57, 5, 'ooo')
put(64, 4, 'd')

# ---------------------------------------------------------------- 4. tubos de energia e drones
tube(70, 11)
tube(76, 10)
tube(82, 10)
put(73, 12, 'g'); put(79, 12, 'g')
row(86, 9, 'B?MB')
put(85, 4, 'd'); put(92, 6, 'd')

# ---------------------------------------------------------------- 5. checkpoint
put(100, 12, 'K')
row(103, 9, '?C?')

# ---------------------------------------------------------------- 6. campo de espinhos com plataforma por cima
row(112, 12, '^^^^^^^')
put(111, 10, '=')                        # vai de 111 a 115 e cobre os espinhos
row(112, 6, 'ooooooo')
put(116, 3, 'd')

# ---------------------------------------------------------------- 7. plato (escada de 1 em 1) com blocos
for i in range(3):
    vline(122 + i, 12 - i, 12, 'X')
for x in range(125, 132):
    vline(x, 10, 12, 'X')
for i in range(3):
    vline(132 + i, 10 + i, 12, 'X')
row(126, 6, '?M?')
put(127, 9, 'g'); put(130, 9, 'g')

# ---------------------------------------------------------------- 8. muro de firewall: so passa com a mola
put(139, 12, 'J')
vline(142, 7, 12, 'X')
vline(143, 7, 12, 'X')
row(140, 3, 'ooo')
put(148, 4, 'd'); put(156, 7, 'd')

# ---------------------------------------------------------------- 9. buracos curtos e a estrela
row(168, 9, 'B*B')
row(166, 12, '^^')
put(174, 12, 'g'); put(176, 12, 'g'); put(178, 12, 'g')
put(172, 5, 'd')

# ---------------------------------------------------------------- 10. escada final, mastro e portal
for i in range(8):
    vline(186 + i, 12 - i, 12, 'X')
vline(194, 5, 12, 'X')
put(202, 12, 'X')
put(202, 3, 'F')
put(208, 12, 'D')

decor = [('holo_plant', 6, 12), ('terminal', 13, 12), ('holo_plant', 29, 12), ('terminal', 43, 12),
         ('holo_plant', 69, 12), ('terminal', 88, 12), ('holo_plant', 97, 12), ('terminal', 105, 12),
         ('holo_plant', 136, 12), ('terminal', 146, 12), ('holo_plant', 164, 12), ('terminal', 181, 12),
         ('holo_plant', 197, 12)]

out = [
    '// =====================================================================',
    '// SUPER DEV STAR - Fase 1-3 "NEON GRID"',
    '// Gerada por tools/levels/gen_1_3.py (pode ser editada a mao)',
    '// Formato em docs/LEVEL_FORMAT.md',
    '// =====================================================================',
    '',
    '[level]',
    'name  = NEON GRID',
    'world = 1-3',
    'time  = 400',
    'start = main',
    '',
    '[area main]',
    'theme = neon',
    'music = neon',
    'sky   = #12052E',
    'background = Backgrounds/neon_far.png 0.2 0',
    'castle = portal',
    '',
    '[decor main]',
    *[f'{n} {x} {y}' for n, x, y in decor],
    '',
    '[map main]',
    *[''.join(r) for r in m],
    '',
]
path = os.path.join(ROOT, 'Assets', 'Levels', '1-3.txt')
with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(out))
print('\n'.join(''.join(r) for r in m))
