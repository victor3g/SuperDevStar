# Situação das imagens

Atualizado em 04/11/2026.

**Todas as imagens do jogo estão prontas** (54 PNGs em `Assets/`), incluindo as opcionais:
fundos das telas de título e seleção, sala bônus subterrânea completa e versão Firewall da personagem.

Os sons também estão prontos: são gerados por `tools/generate_audio.py` (23 efeitos e 7 músicas originais).

---

## Originais e o que virou cada um

Todos os originais ficam em `Imagens Geradas/`, e `tools/convert_generated_art.py` gera os arquivos do jogo a partir deles.

| Original | Virou |
|---|---|
| `dev01_small_fire_clouds_night_original.png` | `Characters/dev01/small.png` (Júnior chibi) e as nuvens da noite |
| `dev01_big_original.png` | `Characters/dev01/big.png` (Sênior), mais bandeira, mastro e pacote |
| `dev01_fire_v2_original.png` | `Characters/dev01/fire.png` (Firewall, mesmas proporções da Sênior) |
| `dev01_portrait_original.png` | `Characters/dev01/portrait.png` |
| `tiles_overworld_original.png` / `pipes_original.png` | `Tiles/overworld/*` |
| `tiles_underground_original.png` | `Tiles/underground/ground, brick, hard, used` |
| `underground_rack_background_original.png` | `Decor/server_rack.png` e `Backgrounds/underground_far.png` (a imagem é vertical; foi usada a faixa dos racks e do piso) |
| `ui_title_select_backgrounds_original.png` | `UI/title_background.png` (lado esquerdo) e `UI/select_background.png` (lado direito) |
| `enemies_original.png` | `Enemies/bug, virus, virus_shell` |
| `items_original.png` | `Items/coin, coin_spin, coffee, firewall, sudo_star, backup` |
| `effects_ui_original.png` | `Effects/*`, `UI/hud_coin.png`, `UI/logo.png` |
| `decor_*_original.png`, `background_overworld_far_original.png` | morros, arbustos, Data Center, placa, skyline |
| `dev02_small_v1`, `dev02_big`, `dev02_fire_v2` (gema), `dev02_portrait` | `Characters/dev02/*` (David) |
| `dev03_small_v1`, `dev03_big`, `dev03_fire_v2`, `dev03_portrait` | `Characters/dev03/*` (Victor) |
| `Gema Rosa e Lata Monster Gelada.png` | `Items/gem.png` (David) e `Items/monster.png` (Mariana e Victor) |
| `decor_clouds_original.png`, `dev01_small_v1_original.png` | **sem uso** (substituídos pelas versões novas) |

## Ajustes no código para casar com a arte

* Personagens com células de 32 px de largura, para caber as poses largas (a largura é lida da imagem).
* Hitboxes dos inimigos no tamanho visível (bug 14×12, cápsula 14×9).
* Céu da fase 1-1 noturno (`#041A58`), combinando com o skyline.
* A seleção de personagem não desenha o próprio título quando `select_background.png` existe, porque a imagem já traz "SELECT YOUR CHARACTER".

## Para novos personagens

Cada amigo novo precisa de 4 imagens em `Assets/Characters/<id>/`: `small.png`, `big.png`, `fire.png` e `portrait.png`,
no mesmo formato da dev01 (veja `docs/ASSETS.md`, seção 3), mais um bloco no `characters.json`.
