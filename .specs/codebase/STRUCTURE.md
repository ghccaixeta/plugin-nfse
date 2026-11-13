# Estrutura

```
src/
  manifest.json
  dominio/        # tipos e regras puras: validação, formatos, documentos (DV CNPJ/CPF), etapas, importação
  armazenamento/  # repositório de modelos/padrões sobre chrome.storage.local
  background/     # service worker: pedido por aba (pedidos.ts), abertura do painel por navegador (painel.ts) + wiring (sw.ts)
  content/        # ponte (isolado), preenchedor (MAIN), protocolo dos eventos, banner
  portal/         # seletores.ts, ações (acoes.ts), etapas (pessoas, servico, valores), erros do portal
  popup/          # painel lateral (HTML + TS); formulario.ts é a lógica pura
  opcoes/         # página de importar/exportar
  estilo/         # tema.css compartilhado
  ui/             # utilidades das páginas da extensão ($, mostrarStatus)
build/            # manifest.ts: conversão do manifest para Firefox e alvo do build (NAVEGADOR)
scripts/          # anonimizar-fixtures, verificar-vazamento, dados-sensiveis (definição comum)
tests/
  fixtures/       # HTML anonimizado do portal
  fakes/          # chrome.storage e Acoes falsos
docs/             # mapeamento do portal
```
