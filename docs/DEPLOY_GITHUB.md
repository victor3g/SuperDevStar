# Publicar no GitHub Pages (link para jogar em qualquer navegador)

No fim, o jogo fica em um endereço assim:

```
https://SEU-USUARIO.github.io/super-dev-star/
```

Funciona no computador e no celular. Toda vez que você enviar mudanças (`git push`), o GitHub
publica a nova versão sozinho, em 1 ou 2 minutos.

Nada aqui precisa de permissão de administrador: o Git e o GitHub CLI (`gh`) já estão instalados nesta máquina.

> **Público ou privado?** No plano gratuito do GitHub, o Pages só funciona com repositório **público**.
> Isso significa que qualquer pessoa pode ver o código e as imagens, inclusive o retrato da Mariana.
> Combine com ela antes. Se preferir um link fechado, use o itch.io com acesso *Restricted*
> (veja `docs/PUBLICAR_WEB.md`).

---

## Passo 1: criar uma conta no GitHub

Se ainda não tiver, crie em https://github.com/signup (é grátis).

## Passo 2: entrar no GitHub pelo terminal

Abra um terminal na pasta do projeto e rode:

```bash
cd C:\Users\victor.gomes\Documents\Game\SuperDevStar
```
```bash
gh auth login
```

Responda: **GitHub.com** → **HTTPS** → **Yes** (autenticar o Git) → **Login with a web browser**.
Ele mostra um código de 8 letras e abre o navegador. Cole o código e autorize.

## Passo 3: criar o repositório e enviar o projeto

```bash
git init -b main
```
```bash
git add .
```
```bash
git commit -m "Super Dev Star: primeira versao"
```
```bash
gh repo create super-dev-star --public --source=. --push
```

O último comando cria o repositório no seu GitHub e envia todos os arquivos.

## Passo 4: ligar o GitHub Pages (só uma vez)

Pelo terminal:

```bash
gh api -X POST repos/{owner}/super-dev-star/pages -f build_type=workflow
```

Ou pelo site: abra o repositório → **Settings** → **Pages** → em *Build and deployment*,
*Source* = **GitHub Actions**.

## Passo 5: publicar

Como o envio aconteceu antes de ligar o Pages, rode a publicação uma vez:

```bash
gh workflow run deploy-pages.yml
```

Acompanhe na aba **Actions** do repositório (ou com `gh run watch`). Quando ficar verde, o link aparece em
**Settings → Pages** e também com:

```bash
gh api repos/{owner}/super-dev-star/pages --jq .html_url
```

---

## Para atualizar o jogo depois

Sempre que mudar alguma coisa (imagens, fases, código):

```bash
git add .
```
```bash
git commit -m "descreva a mudanca"
```
```bash
git push
```

O GitHub publica sozinho. Se o navegador mostrar a versão antiga, recarregue com `Ctrl+F5`.

## Como funciona

O arquivo `.github/workflows/deploy-pages.yml` roda no GitHub a cada `push` na branch `main`:

1. Roda `python tools/build_web.py`, que copia `Assets/` para `web/assets/`.
2. Envia a pasta `web/` para o GitHub Pages.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| A aba **Actions** mostra erro "Pages not enabled" | Faça o Passo 4 e rode o Passo 5 de novo |
| O link dá 404 | Espere 1–2 minutos após a Action ficar verde; confira se o endereço termina com `/super-dev-star/` |
| Imagens não aparecem | Os nomes de arquivo diferenciam maiúsculas de minúsculas no servidor (`Logo.png` ≠ `logo.png`) |
| `gh: command not found` | Feche e abra o terminal; ou use o GitHub Desktop (https://desktop.github.com), que também não pede administrador |
