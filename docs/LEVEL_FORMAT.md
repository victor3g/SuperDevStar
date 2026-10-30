# Formato das fases

As fases ficam em `Assets/Levels/<id>.txt`; a ordem delas está em `Assets/Levels/levels.txt`.
É texto puro: dá para editar no VS Code com uma fonte monoespaçada.

```
[level]
name  = HELLO WORLD      // nome mostrado antes da fase
world = 1-1              // texto do HUD
time  = 400              // tempo (1 unidade = 0,4 s, como no SMB)
start = main             // area inicial

[area main]
theme = overworld        // pasta de tiles: Tiles/<theme>/
music = overworld        // Audio/Music/<music>.wav
sky   = #5C94FC          // cor do ceu
background = Backgrounds/overworld_far.png 0.25 0   // imagem  parallax  y

[decor main]
cloud_small 8 3          // Decor/cloud_small.png, x=8, base no fundo da linha 3
hill_large 0 12 front    // "front" desenha na frente do jogador

[map main]
....linhas do mapa....

[warps]
main 57 9 down -> bonus 2 2 drop
bonus 13 11 right -> main 163 11 rise
```

Comentários começam com `//` (fora do `[map]`). O mapa deve ter **15 linhas** (altura da tela).
Linhas curtas são completadas com vazio.

## Legenda do mapa (1 caractere = 1 tile de 16×16)

| Char | Elemento |
|---|---|
| `.` | vazio |
| `#` | chão |
| `B` | tijolo (código legado) |
| `C` | tijolo com várias moedas (dá moedas por ~4 s) |
| `m` | tijolo com power-up (Café ou Firewall) |
| `*` | tijolo com Sudo Star |
| `U` | tijolo com Backup (1UP) |
| `?` | bloco ? com moeda |
| `M` | bloco ? com power-up (Café se Júnior, Firewall se Sênior) |
| `X` | bloco duro (chip), para escadas |
| `I` | bloco invisível com 1UP |
| `i` | bloco invisível com moeda |
| `[` `]` | boca do cano (esquerda, direita) |
| `(` `)` | corpo do cano (esquerda, direita) |
| `{` `}` | boca do cano horizontal (cima, baixo) |
| `~` `-` | corpo do cano horizontal (cima, baixo) |
| `o` | moeda solta |
| `g` | Bug (goomba) |
| `k` | Vírus (koopa) |
| `P` | início do jogador (em pé neste tile) |
| `K` | checkpoint: passou desta coluna, renasce aqui |
| `F` | **topo** do mastro; ele desce até o primeiro bloco sólido abaixo |
| `D` | porta do Data Center (o castelo é desenhado centralizado aqui) |

## Warps (canos)

`origem x y direção -> destino x y modo`

* `down`: entra apertando **baixo** em cima do cano cujo `[` está em `(x, y)`.
* `right`: entra apertando **direita** encostado na boca `{` em `(x, y)`.
* `drop`: aparece caindo no tile `(x, y)` do destino.
* `rise`: sobe de dentro do cano cujo `[` está em `(x, y)` do destino.

O mapa da 1-1 é gerado por um script (para manter todas as linhas do mesmo tamanho), mas pode ser
editado à mão sem problema.
