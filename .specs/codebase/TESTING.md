# Testes

- Runner: Vitest (`npm test` = Vitest + `scripts/verificar-vazamento.mjs`); `npm run typecheck` cobre `src/` (sem tipos do Node) e testes/configs.
- Domínio, armazenamento, SW: testes unitários puros com fakes de `chrome.storage` (`tests/fakes/chrome-storage.ts`).
- Portal: seletores contra `tests/fixtures/*.html` (HTML real anonimizado, inclusive containers Chosen/Select2); primitivas em jsdom com jQuery/Select2 falsos e timers falsos; etapas com `Acoes` falsas que registram chamadas (`tests/fakes/acoes.ts`).
- Content scripts: ponte e preenchedor em jsdom trocando `CustomEvent`s reais.
- Validação real: no portal via Playwright, injetando `dist/preenchedor.js` e simulando documento sem foco (bloquear eventos de foco `isTrusted` + `hasFocus() = false`) — o Playwright finge foco por padrão. Nunca clicar em `#btnProsseguir`.
- Testes nomeados com o ID do requisito (ex.: `NFSE-03 ...`). Dados de teste sempre fictícios.
