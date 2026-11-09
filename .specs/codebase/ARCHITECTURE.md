# Arquitetura

Detalhes e decisões em `.specs/features/2026-11-09-preenchedor-v1/design.md`.

- **Painel lateral** (`src/popup/`, `chrome.sidePanel`) lê/grava modelos e padrões em `chrome.storage.local`, valida a nota e manda `criarPedido` ao service worker e `iniciar` à aba ativa. Fica aberto entre abas e acompanha a aba ativa (Preencher só na etapa Pessoas).
- **Service worker** (`src/background/`) guarda um pedido por aba em `chrome.storage.session` com a etapa esperada e a `fase` (`preenchendo` | `avancando` | `pausado`). Decide a próxima etapa, detecta "portal recusou o Avançar" (a etapa anterior recarregou) e descarta o pedido ao fechar a aba, sair de `/DPS/` ou após 10 min sem atividade. Operações da mesma aba rodam em fila.
- **Ponte** (`src/content/ponte.ts`, mundo isolado) fala com o SW e com o preenchedor via `CustomEvent` (`src/content/protocolo.ts`, `detail` em JSON), e mostra banners em shadow DOM. Só confirma o Avançar (`nfse:continuar`) quando o SW gravou a etapa.
- **Preenchedor** (`src/content/preenchedor.ts`, mundo MAIN) espera o `load` da página, executa a etapa (`src/portal/etapa-*.ts`) com as primitivas de `src/portal/acoes.ts` (jQuery da página para Chosen/Select2; eventos de foco sintéticos quando o documento está sem foco) e responde antes de clicar em Avançar.
- **Opções** (`src/opcoes/`) importa/exporta modelos (o seletor de arquivo fecha o painel).
- Todos os seletores do portal ficam em `src/portal/seletores.ts`. A extensão nunca clica em "Emitir NFS-e".
