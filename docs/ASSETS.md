# Super Dev Star: lista de assets e guia de arte

Tudo fica em `Assets/`, ao lado do código. O build copia essa pasta para junto do executável.
**O jogo roda sem nenhuma imagem**: tudo o que estiver faltando aparece como um retângulo colorido
(placeholder). Ao iniciar, o jogo gera um `missing_assets.txt` na pasta do executável
(`bin/Debug/net8.0/`) com o que ainda falta.

Formato: **PNG com transparência**, sem anti-aliasing, cores sólidas (pixel art).
Áudio: **WAV PCM** (16 bits, 44.1 kHz ou 22.05 kHz). OGG e MP3 não são lidos.

---

## 1. Regras de ouro (para tudo combinar)

| Regra | Valor |
|---|---|
| Resolução do jogo | **256×240** (igual ao NES), escalada ×3 na janela |
| Grade | **16×16 px** por tile. Tudo se alinha a essa grade |
| Altura da tela | 15 tiles. Linhas 0–1 = HUD, linhas 13–14 = chão |
| Contorno | 1 px escuro (quase preto, ex. `#0F0F1A`) em personagens, inimigos e itens |
| Luz | vindo de **cima à esquerda** (realce em cima/esquerda, sombra embaixo/direita) |
| Paleta | 3 a 4 tons por objeto + contorno. Recomendo a paleta do NES ou a "PICO-8" (lospec.com) |
| Direção dos sprites | **Jogador olha para a DIREITA**. **Inimigos olham para a ESQUERDA**. O jogo espelha sozinho |
| Ancoragem | sprites são desenhados com a **base** (pés) no chão e **centralizados** na horizontal |
| Escala | **nunca** desenhe em alta resolução para reduzir depois. Desenhe pixel a pixel no tamanho final |

Ferramentas gratuitas: **LibreSprite**, **Piskel** (navegador), **Aseprite** (pago, o melhor). Para sons: **jsfxr / sfxr** (efeitos 8-bit) e **BeepBox** (música, exporta WAV).

---

## 2. Tema: o mundo da tecnologia

| No Mario | No Super Dev Star | Ideia visual |
|---|---|---|
| Mario pequeno | **Dev Júnior** | personagem 16×16, cabeça grande, fone de ouvido, crachá |
| Mario grande | **Dev Sênior** (tomou café) | 16×32, mesma roupa, mais alto |
| Mario de fogo | **Dev com Firewall** | mesma arte do grande com outra paleta (moletom laranja/vermelho) |
| Cogumelo | **Café** | caneca fumegante |
| Flor de fogo | **Firewall** | muralha de tijolos com chama em cima, animada |
| Estrela | **Sudo Star** | estrela com `#` ou `$` no meio, pisca |
| Cogumelo 1UP | **Backup** | disquete verde |
| Moeda | **Bit coin** | moeda dourada com `1` / `0` |
| Bola de fogo | **Pacote de dados** | quadradinho 8×8 brilhante com `>` |
| Goomba | **Bug** | besouro/inseto marrom-avermelhado com olhos bravos |
| Koopa | **Vírus** | vírus verde com "patinhas"; ao ser pisado vira **cápsula** (o casco) |
| Bloco `?` | **Commit block** | bloco dourado com `?` ou `</>` |
| Tijolo | **Código legado** | tijolo laranja com linhas de "código" |
| Bloco duro (escada) | **Chip / CPU** | quadrado cinza com pinos nas bordas |
| Chão | **Placa-mãe (PCB)** | verde de placa com trilhas douradas |
| Cano | **Duto de cabos** | cano verde (ou azul, de fibra óptica) |
| Mastro | **Antena de deploy** | haste fina com bandeira `</>` |
| Castelo | **Data Center** | prédio cinza com racks, LEDs e porta |
| Nuvens / morros / arbustos | **Nuvens de upload / pilhas de servidores / cabos emaranhados** | ver seção 5 |

---

## 3. Personagens (você vai produzir)

Pasta: `Assets/Characters/<id>/` (o `<id>` vem do `characters.json`; o primeiro é `dev01`).

| Arquivo | Tamanho | Frames |
|---|---|---|
| `small.png` | **176×16** (ou 352×16) | 11 frames com 16 px de altura (Dev Júnior) |
| `big.png` | **176×32** (ou 352×32) | 11 frames com 32 px de altura (Dev Sênior) |
| `fire.png` *(opcional)* | igual ao `big.png` | mesmas poses, com paleta de "Firewall". Sem ele o jogo tinge o big de laranja |

A largura de cada frame é calculada como **largura da imagem ÷ 11**. Use células de 32 px de largura
quando houver poses largas (derrapando deitada, morrendo deitada, braço esticado), sempre com o corpo
**centralizado** na célula.
| `portrait.png` | **48×48** | retrato para a tela de seleção (rosto/busto, fundo pode ser colorido) |

### Ordem dos 11 frames (da esquerda para a direita, todos olhando para a DIREITA)

| # | Frame | Observação |
|---|---|---|
| 0 | parado | |
| 1 | andando 1 | |
| 2 | andando 2 | |
| 3 | andando 3 | os 3 se repetem em ciclo |
| 4 | derrapando | virando de direção; corpo inclinado para trás |
| 5 | pulando | |
| 6 | agachado | só no big/fire; desenhe na **parte de baixo** do frame de 32 px (~18 px de altura). No small pode deixar vazio |
| 7 | morrendo | só no small; de frente para a câmera, braços para cima |
| 8 | agarrado no mastro 1 | |
| 9 | agarrado no mastro 2 | |
| 10 | arremessando | só no fire; braço esticado para frente |

Dica: o pixel mais baixo dos pés deve ficar na **última linha** do frame, e o corpo centralizado na largura de 16 px.
A hitbox é 12 px de largura × 15 px (small) / 27 px (big), então um pouco de cabelo pode "sobrar".

Para cada amigo novo: crie a pasta, coloque os 4 PNGs e adicione um bloco no
`Assets/Characters/characters.json` (nome, cargo, stack, descrição). A tela de seleção já mostra 4 vagas.

---

## 4. Tiles da fase (16×16)

Pasta: `Assets/Tiles/overworld/` (fase externa). Para o subsolo, `Assets/Tiles/underground/` com os
**mesmos nomes**. Os que faltarem lá usam a versão da overworld.

| Arquivo | Tamanho | O que é |
|---|---|---|
| `ground.png` | 16×16 | chão (placa-mãe). Precisa **repetir sem emenda** na horizontal e na vertical |
| `brick.png` | 16×16 | tijolo quebrável (código legado). Também repete lado a lado |
| `question.png` | **48×16** | bloco `?` com 3 frames de brilho (ciclo 0,0,0,1,2,1) |
| `used.png` | 16×16 | bloco depois de usado (apagado/vazio) |
| `hard.png` | 16×16 | chip/CPU, usado nas escadas e na base do mastro |
| `pipe_top_left.png` / `pipe_top_right.png` | 16×16 cada | boca do cano (2 tiles = 32 px de largura, um pouco mais larga que o corpo) |
| `pipe_left.png` / `pipe_right.png` | 16×16 cada | corpo do cano (repete na vertical) |
| `hpipe_mouth_top.png` / `hpipe_mouth_bottom.png` | 16×16 cada | boca do cano **horizontal** (saída da sala bônus) |
| `hpipe_body_top.png` / `hpipe_body_bottom.png` | 16×16 cada | corpo do cano horizontal |

---

## 5. Cenário / decoração (você vai produzir)

Pasta: `Assets/Decor/`. São imagens **livres** (não colidem), posicionadas no arquivo da fase.
**A base da imagem encosta no fundo do tile indicado**, e a imagem cresce para cima. Os tamanhos
abaixo são os que o mapa da 1-1 espera; pode mudar, desde que a largura e a altura sejam múltiplas de 8.

| Arquivo | Tamanho | Ideia |
|---|---|---|
| `cloud_small.png` | 32×24 | nuvem com seta de upload |
| `cloud_medium.png` | 48×24 | nuvem com ícone de cadeado ou wifi |
| `cloud_large.png` | 64×24 | nuvem longa |
| `hill_small.png` | 48×24 | "morro" feito de pilha de servidores/monitores |
| `hill_large.png` | 80×40 | morro maior, LEDs piscando, cabos |
| `bush_small.png` | 32×16 | arbusto de cabos emaranhados (RJ45, USB) |
| `bush_medium.png` | 48×16 | |
| `bush_large.png` | 64×16 | |
| `sign_welcome.png` | 32×32 | placa `HELLO WORLD` no início da fase |
| `datacenter.png` | **80×80** | o "castelo" final. **Porta no centro da base** (~16×24), onde o jogador entra |
| `server_rack.png` *(opcional)* | 16×32 | decoração da sala subterrânea |

### Como desenhar o cenário para casar com os elementos

1. **Contraste de planos**: o que é sólido (chão, blocos, canos) tem **contorno escuro e cores
   saturadas**. O que é fundo (nuvens, morros, arbustos, skyline) **não tem contorno escuro**, usa
   cores mais claras e menos saturadas, puxadas para a cor do céu. Assim o jogador nunca confunde
   decoração com plataforma.
2. **Céu**: a fase 1-1 usa `#5C94FC` (azul clássico), definido no arquivo da fase (`sky = ...`).
   Se quiser um céu "noite de deploy" (`#1E2A4A`), deixe as nuvens em azul-acinzentado.
3. **Morros e arbustos** encostam no chão (base em `y = 12`). Desenhe a base reta e sem
   transparência na última linha, para não aparecer "flutuando".
4. **Verdes**: o chão (PCB), os arbustos e os canos tendem a ser verdes. Diferencie pelo tom:
   chão verde-escuro com trilhas douradas, arbustos verde-claro sem contorno, canos verde-vivo
   com brilho vertical branco.
5. **Skyline de fundo** *(opcional)*: `Assets/Backgrounds/overworld_far.png` com **512×240**,
   repetível na horizontal (a borda esquerda continua na direita), transparente no céu.
   Prédios de big techs genéricos, torres de celular, satélites. Ele anda a 25% da velocidade da câmera.
   Mantenha os 200 px de cima mais vazios para não brigar com o HUD.
6. **Subsolo** (sala de servidores): fundo preto (`#000000`), tiles em azul/ciano
   (`Tiles/underground/*`), `Backgrounds/underground_far.png` (256×240) com racks e LEDs bem escuros.

---

## 6. Inimigos, itens, efeitos e objetos (podem vir da internet)

| Arquivo | Tamanho | Frames |
|---|---|---|
| `Enemies/bug.png` | 48×16 | andar 1, andar 2, esmagado (achatado na parte de baixo) |
| `Enemies/virus.png` | 32×24 | andar 1, andar 2 (16×24, a cabeça pode passar dos 16 px de altura) |
| `Enemies/virus_shell.png` | 32×16 | cápsula parada, cápsula "acordando" (patinhas para fora) |
| `Enemies/*_underground.png` | mesmos tamanhos | *(opcional)* variantes azuis para o subsolo |
| `Items/coin.png` | 48×16 | 3 frames de brilho |
| `Items/coin_spin.png` | 64×16 | 4 frames girando (moeda que sai do bloco) |
| `Items/coffee.png` | 16×16 | café |
| `Items/firewall.png` | 64×16 | 4 frames (chama/brilho) |
| `Items/sudo_star.png` | 64×16 | 4 frames piscando |
| `Items/backup.png` | 16×16 | disquete verde |
| `Items/packet.png` | 32×8 | 4 frames de 8×8 girando |
| `Effects/brick_debris.png` | 16×8 | 2 frames de 8×8 (pedaço de tijolo) |
| `Effects/explosion.png` | 48×16 | 3 frames (pacote batendo) |
| `Effects/firework.png` | 48×16 | 3 frames (fogos do fim da fase) |
| `Objects/flagpole.png` | 16×16 | segmento do mastro (haste fina **no centro**, repete na vertical) |
| `Objects/flagpole_top.png` | 16×16 | topo (bolinha/antena) |
| `Objects/flag.png` | 16×16 | bandeira, presa na borda **direita** (encosta no mastro) |
| `UI/logo.png` | até 224×80 | logo "SUPER DEV STAR" |
| `UI/hud_coin.png` | 24×8 | moedinha do HUD (3 frames 8×8) |
| `UI/title_background.png` | 256×240 | *(opcional)* fundo da tela de título |
| `UI/select_background.png` | 256×240 | *(opcional)* fundo da tela de seleção |

**Sobre "extrair da internet"**: use pacotes com licença livre, como **Kenney.nl** (CC0, ótimo para
efeitos, UI e itens), **OpenGameArt.org** (confira a licença de cada arquivo) e **itch.io**
(filtre por "free" e leia a licença). **Não use sprites ou sons rippados do Mario**: são da Nintendo, e
mesmo num jogo entre amigos é melhor evitar, principalmente se o jogo for publicado.
Se pegar algo pronto, **recolora para a paleta do jogo** para não destoar.

---

## 7. Sons e músicas

Já existem: todos são gerados por `tools/generate_audio.py` (veja `docs/PUBLICAR_WEB.md`, seção "Sons").
Efeitos em WAV, músicas em MP3, lista em `Assets/Audio/audio.json`.

`Assets/Audio/Sfx/`:
`jump_small` `jump_big` `coin` `bump` `break` `powerup_appear` `powerup` `pipe` `1up` `stomp`
`kick` `fireball` `die` `flagpole` `pause` `hurry` `tick` `firework` `menu_move` `menu_select` `game_over`

`Assets/Audio/Music/` (tocam em loop, exceto `stage_clear`):
`title` `select` `overworld` `underground` `star` `stage_clear` `ending`

---

## 8. Checklist para a 1ª fase com 1 personagem

**Você (personagem + cenário):**
- [ ] `Characters/dev01/small.png` (176×16)
- [ ] `Characters/dev01/big.png` (176×32)
- [ ] `Characters/dev01/fire.png` (176×32, opcional)
- [ ] `Characters/dev01/portrait.png` (48×48)
- [ ] `Decor/cloud_small.png`, `cloud_medium.png`, `cloud_large.png`
- [ ] `Decor/hill_small.png`, `hill_large.png`
- [ ] `Decor/bush_small.png`, `bush_medium.png`, `bush_large.png`
- [ ] `Decor/sign_welcome.png`
- [ ] `Decor/datacenter.png`
- [ ] `Tiles/overworld/ground.png`, `brick.png`, `question.png`, `used.png`, `hard.png`
- [ ] `Tiles/overworld/pipe_*` (4) e `hpipe_*` (4)
- [ ] `Backgrounds/overworld_far.png` (opcional)
- [ ] `Tiles/underground/*` + `Backgrounds/underground_far.png` (opcional, sala bônus)

**Internet / pacotes livres (recolorir):**
- [ ] `Enemies/bug.png`, `virus.png`, `virus_shell.png`
- [ ] `Items/*` (7 arquivos)
- [ ] `Effects/*` (3 arquivos)
- [ ] `Objects/*` (3 arquivos)
- [ ] `UI/logo.png`, `UI/hud_coin.png`
- [ ] Sons e músicas
