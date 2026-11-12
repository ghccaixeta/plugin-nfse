# Preenchedor NFS-e Nacional

Extensão do Chrome (Manifest V3) que preenche o formulário do [Emissor Nacional da NFS-e](https://www.nfse.gov.br/EmissorNacional/) a partir de modelos salvos. Extensão **não oficial**.

## O que ela faz

Para quem emite notas parecidas todo mês (prestadores do Simples Nacional, ME/EPP), a extensão troca o preenchimento manual de ~20 campos por: **escolher o modelo → Preencher → conferir → Emitir**.

- **Painel lateral** com todos os campos da nota visíveis e editáveis, preenchidos pelos padrões globais ou pelo modelo escolhido.
- **Modelos** por tomador (CNPJ, apelido, e-mail/telefone, valor, descrição, município, código de tributação, NBS): criar, editar e excluir.
- **Padrões globais** editáveis (código de tributação, NBS, regime, alíquota).
- **Preenchimento automático** das etapas Pessoas → Serviço → Valores, avançando sozinho e **parando na tela de conferência**.
- **Importar/exportar** modelos (e, se quiser, os padrões) em JSON, pela página de opções.

O que ela **não** faz:

- Nunca clica em "Emitir NFS-e". A emissão é sempre sua, depois de conferir.
- Nenhum dado sai do navegador: tudo fica em `chrome.storage.local`, sem servidor e sem telemetria.
- Não cobre emissão em lote, tomador CPF/exterior/não informado nem IBS/CBS.

## Configurar no Chrome

Requisitos: Node.js 22.18 ou mais novo e Chrome 116 ou mais novo.

1. Instale as dependências e gere o build:

   ```bash
   npm install
   npm run build
   ```

   O build sai na pasta `dist/`.

2. Abra `chrome://extensions` no Chrome.
3. Ligue o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta `dist/` do projeto.
5. (Opcional) Fixe a extensão na barra de ferramentas pelo ícone de quebra-cabeça.

Depois de alterar o código, rode `npm run build` de novo e clique em **Recarregar** (↻) no card da extensão em `chrome://extensions`. Recarregue também a aba do portal, para que os content scripts novos sejam injetados.

## Como usar

1. Entre no Emissor Nacional e abra a emissão de uma nota (etapa **Pessoas**).
2. Clique no ícone da extensão para abrir o painel lateral.
3. Escolha um modelo (ou preencha os campos), confira e clique em **Preencher**.
4. A extensão preenche as etapas e para na tela de conferência. Confira a nota e clique em **Emitir NFS-e** você mesmo.

Para importar ou exportar modelos, abra as opções da extensão (botão direito no ícone → **Opções**).

## Desenvolvimento

| Comando | O que faz |
|---|---|
| `npm test` | Testes (Vitest + jsdom) e verificação de vazamento de dados reais |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` | Gera `dist/` |

Estrutura e decisões em `.specs/` (comece por `.specs/project/PROJECT.md` e `.specs/codebase/ARCHITECTURE.md`). Os seletores do portal ficam todos em `src/portal/seletores.ts`; quando o portal mudar, a correção costuma ser ali.
