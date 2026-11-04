"""Gera Assets/Levels/1-2.txt ("LEGACY CODE": fase subterranea na sala de servidores).

Uso: python tools/levels/gen_1_2.py
O mapa pode ser editado a mao depois; o script so garante que todas as linhas tem o mesmo tamanho.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
H = 15


def grid(w):
    return [['.'] * w for _ in range(H)]


def put(g, x, y, c):
    g[y][x] = c


def hline(g, x0, x1, y, c):
    for x in range(x0, x1 + 1):
        put(g, x, y, c)


def vline(g, x, y0, y1, c):
    for y in range(y0, y1 + 1):
        put(g, x, y, c)


def ground(g, x0, x1):
    hline(g, x0, x1, 13, '#')
    hline(g, x0, x1, 14, '#')


def pipe(g, x, top):
    put(g, x, top, '['); put(g, x + 1, top, ']')
    for y in range(top + 1, 13):
        put(g, x, y, '('); put(g, x + 1, y, ')')


def stairs_up(g, x0, n, c='X'):
    for i in range(n):
        vline(g, x0 + i, 12 - i, 12, c)


def stairs_down(g, x0, n, c='X'):
    for i in range(n):
        vline(g, x0 + i, 12 - (n - 1 - i), 12, c)


# =====================================================================
# Area principal: subsolo (sala de servidores)
# =====================================================================
W = 176
m = grid(W)

# chao com buracos
for x0, x1 in [(0, 33), (37, 79), (83, 121), (124, 127), (131, W - 1)]:
    ground(m, x0, x1)
# teto de codigo legado e paredes
hline(m, 6, W - 1, 2, 'B')
vline(m, 0, 2, 12, 'X')
vline(m, W - 1, 2, 12, 'X')
put(m, 3, 12, 'P')

# --- inicio: blocos ? e o primeiro power-up
for x, c in zip(range(10, 15), '?M???'):
    put(m, x, 9, c)
put(m, 14, 12, 'g'); put(m, 16, 12, 'g')

# --- escadinha de chips e parede de tijolos com moedas por cima
stairs_up(m, 19, 3)
vline(m, 26, 10, 12, 'B'); vline(m, 27, 10, 12, 'B')
put(m, 26, 6, 'C')                      # bloco de varias moedas: pule de cima da parede
hline(m, 23, 24, 8, 'o'); hline(m, 29, 30, 8, 'o')

# --- primeiro buraco (34-36): arco de moedas por cima, sem nada no caminho do pulo
hline(m, 33, 37, 9, 'o')
put(m, 42, 12, 'k')

# --- tunel baixo cheio de bugs (teto de tijolos em y=9)
hline(m, 46, 61, 9, 'B')
put(m, 49, 9, '*')                      # Sudo Star escondida no teto do tunel
put(m, 57, 9, 'U')                      # Backup (1UP)
put(m, 52, 9, '?')
for x in (50, 53, 55, 58):
    put(m, x, 12, 'g')
hline(m, 47, 60, 5, 'o')                # moedas em cima do tunel (sobe pelas pontas)

# --- fileira de canos
pipe(m, 64, 11)
pipe(m, 70, 10)
pipe(m, 76, 10)                         # 3 blocos: da para pular parado
put(m, 68, 12, 'g'); put(m, 74, 12, 'g')

# --- buraco 80-82 com degraus
put(m, 79, 10, 'X')
hline(m, 80, 82, 7, 'o')

# --- escada de tijolos ate uma plataforma alta, com virus em cima
put(m, 88, 12, 'K')                     # checkpoint
stairs_up(m, 90, 4, 'B')
hline(m, 94, 100, 8, 'B')
hline(m, 95, 99, 7, 'o')
put(m, 97, 7, 'k')
stairs_down(m, 101, 3, 'B')

# --- fileira de blocos ? com power-up no alto
put(m, 106, 9, '?'); put(m, 108, 9, '?'); put(m, 110, 9, '?')
hline(m, 107, 109, 9, 'B')
put(m, 108, 5, 'M')
for x in (114, 116, 118):
    put(m, x, 12, 'g')

# --- dois buracos com moedas
hline(m, 121, 124, 8, 'o')
hline(m, 127, 131, 8, 'o')
put(m, 125, 12, 'k')

# --- escada de chips (sobe 5, desce 5)
stairs_up(m, 135, 5)
stairs_down(m, 140, 5)
hline(m, 136, 143, 5, 'o')

# --- reta final com inimigos e moedas
for x in (150, 152, 156):
    put(m, x, 12, 'g')
put(m, 160, 12, 'k')
hline(m, 148, 158, 9, 'o')
put(m, 162, 9, 'i')                     # bloco invisivel com moeda

# --- saida: duto horizontal (boca virada para a esquerda) que leva ao lado de fora
put(m, 170, 11, '{'); put(m, 170, 12, '}')
put(m, 171, 11, '~'); put(m, 171, 12, '-')
for y in range(3, 13):
    put(m, 172, y, '('); put(m, 173, y, ')')
vline(m, 174, 3, 12, 'X')

# =====================================================================
# Area de saida: lado de fora, com mastro e Data Center
# =====================================================================
EW = 48
e = grid(EW)
ground(e, 0, EW - 1)
pipe(e, 2, 11)                          # a personagem sobe por este cano
stairs_up(e, 8, 8)
vline(e, 16, 5, 12, 'X')
put(e, 26, 12, 'X')
put(e, 26, 3, 'F')
put(e, 34, 12, 'D')

decor_exit = [('hill_large', 0, 12), ('bush_medium', 20, 12), ('hill_small', 38, 12), ('bush_small', 44, 12),
              ('cloud_small', 6, 3), ('cloud_large', 18, 2), ('cloud_medium', 40, 3)]
decor_main = [('server_rack', x, 12) for x in (5, 23, 44, 85, 104, 132, 147, 165)]

# =====================================================================
out = [
    '// =====================================================================',
    '// SUPER DEV STAR - Fase 1-2 "LEGACY CODE"',
    '// Gerada por tools/levels/gen_1_2.py (pode ser editada a mao)',
    '// Formato em docs/LEVEL_FORMAT.md',
    '// =====================================================================',
    '',
    '[level]',
    'name  = LEGACY CODE',
    'world = 1-2',
    'time  = 400',
    'start = main',
    '',
    '[area main]',
    'theme = underground',
    'music = underground',
    'sky   = #000000',
    'background = Backgrounds/underground_far.png 0.2 0',
    '',
    '[decor main]',
    *[f'{n} {x} {y}' for n, x, y in decor_main],
    '',
    '[map main]',
    *[''.join(r) for r in m],
    '',
    '[area exit]',
    'theme = overworld',
    'music = overworld',
    'sky   = #041A58',
    'background = Backgrounds/overworld_far.png 0.25 0',
    '',
    '[decor exit]',
    *[f'{n} {x} {y}' for n, x, y in decor_exit],
    '',
    '[map exit]',
    *[''.join(r) for r in e],
    '',
    '// saida do subsolo: entrar pela direita no duto horizontal -> sobe pelo cano do lado de fora',
    '[warps]',
    'main 170 11 right -> exit 2 11 rise',
    '',
]
path = os.path.join(ROOT, 'Assets', 'Levels', '1-2.txt')
with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(out))
print('gerado', path)
print('\n'.join(''.join(r) for r in m))
