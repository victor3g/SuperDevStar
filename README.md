# Super Dev Star

Plataforma 2D no estilo Super Mario Bros (NES), em **C# + MonoGame**, com os personagens sendo
devs amigos e todo o universo girando em torno de tecnologia.

* Física copiada dos valores do SMB1: aceleração, corrida segurando B, derrapagem, pulo com altura
  variável que depende da velocidade, quique ao pisar, etc.
* Júnior → Sênior (Café) → Firewall (atira pacotes), Sudo Star (invencível), Backup (1UP)
* Bugs (goomba) e Vírus (koopa com cápsula chutável e combo de pontos)
* Blocos ?, tijolos quebráveis, bloco de várias moedas, bloco invisível
* Canos com sala bônus subterrânea, checkpoint, tempo, "hurry up", mastro com pontuação por altura,
  contagem do tempo restante e fogos de artifício
* Tela de título, **seleção de personagem**, intro da fase, pausa, game over, final e recorde salvo

## Como rodar

1. Instale o **.NET 8 SDK**: https://dotnet.microsoft.com/download (ou `winget install Microsoft.DotNet.SDK.8`)
2. Na pasta do projeto:

```bash
dotnet run
```

Na primeira vez ele baixa o pacote MonoGame pelo NuGet. Não precisa instalar o MGCB/Content Pipeline:
as imagens são PNGs lidos direto da pasta `Assets/`.

Para gerar um executável para distribuir aos amigos:

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false
```

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Mover | Setas / A D | D-pad / analógico |
| Pular (A) | Z / Espaço / K | A |
| Correr / atirar (B) | X / Shift / J | X ou Y |
| Agachar / entrar no cano | Seta para baixo | Baixo |
| Pausa | Enter / P | Start |
| Tela cheia | F11 | |
| Ver hitboxes | F1 | |

## Estrutura

```
SuperDevStar/
├─ Program.cs, SuperDevStarGame.cs   loop principal, render 256x240 escalado
├─ Core/          input, carregamento de assets, fonte pixel, áudio, câmera, sessão, sprites
├─ Characters/    definição de personagens (lida de characters.json)
├─ World/         tiles, mapa, leitor de fases, decoração, Stage (área em execução)
├─ Entities/      Player, inimigos, itens, efeitos, mastro
├─ Scenes/        título, seleção, intro, gameplay, HUD, game over, final
├─ Assets/        PNG, WAV, fases e personagens (copiados para o build)
└─ docs/          ASSETS.md (lista de imagens + guia de arte), LEVEL_FORMAT.md
```

## Adicionando conteúdo

* **Novo personagem**: pasta `Assets/Characters/<id>/` com os sprites + um bloco no
  `Assets/Characters/characters.json`. Veja `docs/ASSETS.md`, seção 3.
* **Nova fase**: crie `Assets/Levels/1-2.txt` e adicione `1-2` em `levels.txt`. Veja `docs/LEVEL_FORMAT.md`.
* **O que falta desenhar**: veja `docs/IMAGENS_FALTANDO.md`, ou rode o jogo e abra `bin/Debug/net8.0/missing_assets.txt`.
* **Arte gerada por IA**: as imagens originais ficam em `Imagens Geradas/`.
  O `tools/convert_generated_art.py` (Python + Pillow + SciPy) recorta, remove o fundo e reduz para o tamanho do jogo.
