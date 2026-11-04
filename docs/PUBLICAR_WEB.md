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

Todos os sons (21 efeitos e 7 músicas) são **gerados por código** em `tools/generate_audio.py`.
É um sintetizador no estilo do chip do NES, e todas as melodias são originais (sem direitos autorais de terceiros).

Para mudar um som, edite a função dele no script e gere de novo:

```bash
pip install numpy soundfile
```
```bash
python tools/generate_audio.py
```
```bash
python tools/build_web.py
```

O script grava os efeitos em `Assets/Audio/Sfx/*.wav`, as músicas em `Assets/Audio/Music/*.mp3` e a lista em
`Assets/Audio/audio.json`. O `build_web.py` copia tudo para `web/assets/`.

Para usar um som próprio no lugar de um gerado, coloque o arquivo (.mp3, .ogg ou .wav) em `Assets/Audio/` e
aponte o nome dele no `audio.json`:

```json
{
  "sfx":   { "coin": "Sfx/minha_moeda.mp3" },
  "music": { "overworld": "Music/minha_musica.mp3" }
}
```

O navegador só libera áudio depois do primeiro clique, toque ou tecla; a música começa nesse momento.
A tecla **M** liga e desliga o som.

## Controles na versão web

| Ação | Teclado | Celular (sem botões) |
|---|---|---|
| Mover / correr | Setas / A D (+ X para correr) | arrastar no lado esquerdo (mais longe = correr) |
| Pular | Z / Espaço / ↑ | tocar no lado direito, ou arrastar para cima no esquerdo |
| Atirar pacote (Firewall) | X / Shift / C | deslizar o dedo no lado direito |
| Agachar / entrar no cano | Seta para baixo | arrastar para baixo no lado esquerdo |
| Pausa | Enter | tocar no placar |
| Menus | setas + Enter / Esc | tocar na opção |
| Tela cheia | F | automática no primeiro toque |
| Som liga/desliga | M | |
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
