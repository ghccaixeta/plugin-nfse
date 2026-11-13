# Stack

- Extensão Manifest V3 para Chrome 116+ (painel lateral) e Firefox 140+ desktop (barra lateral)
- Build por alvo: `NAVEGADOR=firefox` gera `dist-firefox/` com o manifest convertido por `build/manifest.ts`; mesmo JS/HTML nos dois
- `web-ext` (dev) para lint, execução e assinatura do build Firefox
- TypeScript 7 (strict) + Vite 8: build em 3 etapas — páginas (painel, opções) + service worker como módulos; `ponte` e `preenchedor` como IIFE
- Vitest 5 + jsdom para testes unitários e de seletores contra HTML anonimizado do portal
- Node >= 22.18 (os scripts em `scripts/` rodam `.ts` direto) / npm
- Sem dependências de runtime; UI em HTML + CSS próprio (`src/estilo/tema.css`), sem framework
