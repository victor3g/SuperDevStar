# Versão web: testar e publicar

A versão para navegador fica em `web/`. É HTML + JavaScript puro: **não precisa instalar nada**
(nem .NET, nem permissão de administrador). Ela roda no computador e no celular (com botões na tela).

## 1. Testar no seu computador

O navegador não abre jogos com módulos JavaScript direto do arquivo (`file://`); é preciso um
servidor local. O Python já instalado resolve:

```bash
cd C:\Users\victor.gomes\Documents\Game\SuperDevStar
```
```bash
python -m http.server 8080 --directory web
```

Depois abra **http://localhost:8080** no navegador. Para parar o servidor, use `Ctrl+C` no terminal.

## 2. Gerar o pacote para publicar

Sempre que mudar imagens em `Assets/` ou o código em `web/`:

```bash
python tools/build_web.py
```

Ele copia `Assets/` para `web/assets/` e gera **`dist/SuperDevStar-web.zip`**.

## 3. Publicar no itch.io (recomendado, grátis)

1. Crie uma conta em https://itch.io (botão *Register*).
2. Vá em **Dashboard → Create new project**.
3. Preencha:
   - **Title:** Super Dev Star
   - **Kind of project:** `HTML`
   - **Uploads:** envie `dist/SuperDevStar-web.zip` e marque **"This file will be played in the browser"**.
   - **Embed options:** *Viewport dimensions* `768 × 720`; marque **Mobile friendly** e **Fullscreen button**.
4. Em **Visibility & access**, escolha uma opção:
   - **Restricted**: só quem você convidar ou quem tiver a senha; bom para jogar entre amigos;
   - **Draft**: só você vê;
   - **Public**: aberto para todo mundo.
5. Clique em **Save** e depois em **View page**. O link fica no formato `https://seu-usuario.itch.io/super-dev-star`.

Para atualizar: gere o zip de novo e, na página do projeto, troque o arquivo em *Uploads*.

### Alternativa: Netlify (link direto, também grátis)

1. Acesse https://app.netlify.com/drop.
2. Arraste a **pasta `web`** inteira para a página.
3. Ele gera um link `https://nome-aleatorio.netlify.app` na hora. Com uma conta (grátis), dá para escolher o nome.

## Sons

Os sons são opcionais. Para adicionar:

1. Coloque os arquivos em `web/assets/Audio/` (o navegador aceita **.mp3**, **.ogg** ou **.wav**).
2. Liste-os em `web/assets/Audio/audio.json`:

```json
{
  "sfx":   { "jump_small": "Sfx/jump_small.mp3", "coin": "Sfx/coin.mp3" },
  "music": { "overworld": "Music/overworld.mp3", "title": "Music/title.mp3" }
}
```

Os nomes esperados estão em `docs/ASSETS.md`, seção 7. Som que não estiver listado simplesmente não toca.
O navegador só libera áudio depois do primeiro clique ou tecla; a música começa nesse momento.

## Controles na versão web

| Ação | Teclado | Celular |
|---|---|---|
| Mover | Setas / A D | ◀ ▶ |
| Pular | Z / Espaço | A |
| Correr / atirar | X / Shift | B |
| Agachar / entrar no cano | Seta para baixo | ▼ |
| Pausa / confirmar | Enter | START |
| Voltar | Esc | ESC |
| Tela cheia | F | botão ⛶ no canto |
| Som liga/desliga | M | botão 🔊 no canto |
| Ver hitboxes | H | |

Controle de videogame (Xbox/PlayStation) também funciona: A pula, X corre.

## Estrutura

```
web/
├─ index.html        página, estilo e botões de toque
├─ js/core.js        constantes, desenho, fonte, entrada, assets, áudio, câmera, sessão
├─ js/world.js       tiles, leitor de fases, cenário, Stage
├─ js/entities.js    jogador, inimigos, itens, efeitos, mastro
├─ js/scenes.js      título, seleção, intro, fase, HUD, game over, final
├─ js/main.js        carregamento e loop (60 passos por segundo)
└─ assets/           cópia de Assets/ (+ Audio/audio.json)
```

O código segue a mesma organização da versão C# (`Core/`, `World/`, `Entities/`, `Scenes/`), com a
mesma física e as mesmas regras. As fases (`assets/Levels/*.txt`) e os personagens (`characters.json`)
usam o mesmo formato nas duas versões.
