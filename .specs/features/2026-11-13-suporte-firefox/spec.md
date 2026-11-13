# Suporte a Firefox — Especificação

## Problema

A extensão só roda no Chrome. Quem usa Firefox não consegue usar o preenchedor. O código de domínio, armazenamento e preenchimento já é compatível (o Firefox aceita MV3 e o namespace `chrome.*` com promises). O que não roda no Firefox é o manifest (`background.service_worker`, `side_panel`) e a abertura do painel lateral (`chrome.sidePanel`).

## Objetivos

- [ ] `npm run build:firefox` gera `dist-firefox/` carregável no Firefox 140+ sem alterar o build do Chrome.
- [ ] Clicar no ícone da extensão no Firefox abre/fecha a barra lateral com a mesma interface do painel do Chrome.
- [ ] `web-ext lint` sem erros no `dist-firefox/`.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Publicar no AMO / assinar de fato | Exige conta e chaves do dev; só deixamos o script pronto. |
| Firefox para Android | Sem barra lateral; portal é usado no desktop. O `web-ext lint` emite 1 aviso sobre Android (aceito). |
| Firefox < 140 | `data_collection_permissions` (exigido pelo AMO para extensões novas) só existe a partir da 140 (ESR). `world: "MAIN"` exige 128. |
| Polyfill `webextension-polyfill` | Desnecessário: Firefox MV3 já tem `chrome.*` com promises. |
| Mudar comportamento no Chrome | O `dist/` do Chrome deve sair idêntico ao de hoje. |

---

## User Stories

### P1: Build para Firefox ⭐ MVP

**Critérios de Aceite**:

1. **FFX-01** QUANDO o manifest base é convertido para Firefox ENTÃO o resultado DEVE: trocar `background.service_worker` por `background.scripts: ["sw.js"]` (mantendo `type: "module"`); trocar `side_panel` por `sidebar_action` (`default_panel` = mesmo caminho, `default_title` = título da ação, `open_at_install: false`); remover `sidePanel` de `permissions`; trocar `options_page` por `options_ui` (`page` = mesmo caminho, `open_in_tab: true`); remover `minimum_chrome_version`; adicionar `browser_specific_settings.gecko` com `id`, `strict_min_version: "140.0"` e `data_collection_permissions.required: ["none"]`. Todo o resto (nome, versão, content scripts, host_permissions) DEVE ficar igual.
2. **FFX-02** QUANDO a conversão roda ENTÃO o manifest base NÃO DEVE ser mutado.
3. **FFX-03** QUANDO `npm run build:firefox` roda ENTÃO DEVE gerar `dist-firefox/` com o manifest convertido e os mesmos arquivos do build Chrome (popup, opções, `sw.js`, `ponte.js`, `preenchedor.js`).
4. **FFX-04** QUANDO `npm run build` roda ENTÃO `dist/` DEVE continuar idêntico ao atual (manifest Chrome sem alterações).

### P1: Abrir a barra lateral no Firefox ⭐ MVP

5. **FFX-05** QUANDO o service worker inicia num navegador com `sidePanel` ENTÃO DEVE configurar `openPanelOnActionClick: true` (comportamento atual).
6. **FFX-06** QUANDO o background inicia num navegador sem `sidePanel` e com `sidebarAction` ENTÃO DEVE registrar `action.onClicked` chamando `sidebarAction.toggle()` (síncrono, dentro do gesto do usuário).

### P2: Ferramentas e documentação

7. **FFX-07** QUANDO o dev roda `npm run firefox:lint` / `firefox:run` / `firefox:assinar` ENTÃO DEVE executar `web-ext lint`, `web-ext run` e `web-ext sign --channel=unlisted` sobre `dist-firefox/` (assinatura usa `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET` do ambiente, nunca commitadas).
8. **FFX-08** QUANDO alguém lê o README ENTÃO DEVE encontrar uma seção "Configurar no Firefox" com: build, carregar temporária em `about:debugging`, e instalação permanente via `.xpi` assinado (não listado) ou AMO.

---

## Design (inline — Medium)

- **Conversão do manifest:** função pura `manifestParaFirefox(base, opcoes)` em `build/manifest.ts` (fora de `src/`, que não tem tipos de Node; incluída no `tsconfig.node.json`). Testada em `tests/build/manifest.test.ts`.
- **Alvo do build:** variável `NAVEGADOR=firefox` lida por `vite.config.ts` e `vite.content.config.ts` → `outDir` `dist-firefox/` e manifest convertido no plugin `copiarManifest()`.
- **Painel:** `configurarPainel(api)` em `src/background/painel.ts`, recebendo o objeto de API por parâmetro (testável com fake). No Firefox lê `globalThis.browser?.sidebarAction ?? chrome.sidebarAction`.
- **`.gitignore`:** adicionar `dist-firefox/` e `web-ext-artifacts/`.

## Rastreabilidade

| ID | Teste / verificação |
|---|---|
| FFX-01, FFX-02 | `tests/build/manifest.test.ts` |
| FFX-03, FFX-04 | build dos dois alvos + diff do `dist/manifest.json` contra `src/manifest.json` |
| FFX-05, FFX-06 | `tests/background/painel.test.ts` |
| FFX-07 | `npm run firefox:lint` sem erros |
| FFX-08 | revisão manual do README |
