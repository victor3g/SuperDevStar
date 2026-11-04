# Novo personagem: o que preciso de você

O jogo já tem a vaga pronta (`dev02` no `Assets/Characters/characters.json`, marcada como "EM BREVE").
Para ela virar jogável, faltam **as informações** e **4 imagens**.

## 1. Informações do perfil

Mande (ou preencha direto no `characters.json`):

| Campo | Exemplo (Mariana) |
|---|---|
| Nome (até ~10 letras) | MARIANA |
| Cargo | Full Stack Developer |
| Stack | C# / .NET |
| Descrição (1 a 3 frases) | Transforma café em código e bug em feature... |
| Superpoder | Acha o bug só de olhar o stack trace. |
| Ponto fraco | Reunião que podia ser um e-mail. |
| Frase típica | Deploy na sexta? Só se for urgente. |
| Atributos de 0 a 5 (até 4) | CAFE 5 · DEBUG 5 · DEPLOY 4 · PACIENCIA 3 |
| Cor (para placeholders) | `#48A0E0` |

Dá para trocar os rótulos dos atributos, por exemplo `FRONTEND`, `SQL`, `MEMES`.

## 2. Imagens (mesmo formato da Mariana)

As 4 imagens seguem **exatamente** a diagramação das folhas da Mariana. Assim a conversão é automática.

| Imagem | Como gerar |
|---|---|
| **Júnior** (pequeno) | Personagem **chibi** (cabeça grande, corpo curto), 11 poses lado a lado |
| **Sênior** (grande) | Mesma pessoa com proporção adulta, as mesmas 11 poses |
| **Firewall** | Igual ao Sênior, com a roupa de fogo (moletom laranja/vermelho com chamas) |
| **Retrato** | Rosto e ombros, quadrado |

**As 11 poses, nesta ordem, todas olhando para a DIREITA:**
parado · andando 1 · andando 2 · andando 3 · derrapando · pulando · agachado · morrendo ·
agarrado no mastro 1 · agarrado no mastro 2 · arremessando

**Dicas para o gerador de imagens** (o que deu certo com a Mariana):
- **fundo verde chapado `#00FF00`**;
- **sem textos/rótulos** escritos na imagem;
- poses **bem separadas**, alinhadas pela base (pés na mesma linha);
- pixel art, contorno escuro de 1 pixel, poucas cores, visão lateral;
- peça o Júnior, o Sênior e o Firewall **da mesma pessoa, com a mesma roupa** (só muda o tamanho, e a roupa no Firewall).

Exemplo de pedido:
> Folha de sprites em pixel art, 11 poses lado a lado de [descrição da pessoa: cabelo, pele, roupa, acessórios],
> desenvolvedor(a) de software, visão lateral olhando para a direita, contorno escuro de 1 pixel, poucas cores,
> fundo verde chapado #00FF00, sem texto. Poses: parado, andando 1, andando 2, andando 3, derrapando, pulando,
> agachado, caído (morrendo), agarrado num mastro 1, agarrado num mastro 2, arremessando.

Coloque as imagens em `Imagens Geradas/` e me peça para converter. Eu recorto, removo o fundo, ajusto o tamanho
e ativo o personagem (`"enabled": true`).
