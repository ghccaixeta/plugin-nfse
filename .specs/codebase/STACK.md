# Stack

- Chrome Extension Manifest V3 (painel lateral, Chrome 116+)
- TypeScript 7 (strict) + Vite 8: build em 3 etapas — páginas (painel, opções) + service worker como módulos; `ponte` e `preenchedor` como IIFE
- Vitest 5 + jsdom para testes unitários e de seletores contra HTML anonimizado do portal
- Node >= 22.18 (os scripts em `scripts/` rodam `.ts` direto) / npm
- Sem dependências de runtime; UI em HTML + CSS próprio (`src/estilo/tema.css`), sem framework
