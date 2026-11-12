# Preenchedor v1 — Tasks

**Design**: `.specs/features/2026-11-09-preenchedor-v1/design.md`
**Status**: Approved (plan-reviewer: Issues Found → 8 issues + 6 recomendações aplicadas)
**Modo**: horizontal (execução sequencial na própria sessão, sem subagentes — decisão do dev)

---

## Execution Plan

```
Fase 1 Fundação:     T1
Fase 2 Núcleo puro:  T2 → T3 → T4 → T5          (TDD)
Fase 3 Portal:       T6 → T7 → T8 (HITL spike) → T9
Fase 4 Extensão:     T10 → T11 → T12 → T13
Fase 5 Validação:    T14 (HITL ponta a ponta)
```

| Task | Depends on |
|---|---|
| T1 | — |
| T2 | T1 |
| T3 | T2 |
| T4 | T3 |
| T5 | T3 |
| T6 | T1 |
| T7 | T6 |
| T8 | T7 |
| T9 | T7, T2 |
| T10 | T2 |
| T11 | T9, T10 |
| T12 | T3, T5, T10 |
| T13 | T4, T5 |
| T14 | T11, T12, T13 |

---

## Task Breakdown

### T1: Scaffold do projeto e build da extensão

**What**: Projeto TypeScript + Vite + Vitest que gera `dist/` carregável no Chrome com manifest MV3 e entradas vazias.
**Where**: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `src/manifest.json`, `src/popup/index.html`, `src/popup/popup.ts`, `src/opcoes/index.html`, `src/opcoes/opcoes.ts`, `src/background/sw.ts`, `src/content/ponte.ts`, `src/content/preenchedor.ts`, `tests/smoke.test.ts`
**Depends on**: None
**Refs**: infraestrutura (todas)
**Steps**:
- [x] `npm init`; dev deps: `typescript`, `vite`, `vitest`, `jsdom`, `@types/chrome` (+ `@types/node`, só para configs e testes)
- [x] Scripts: `build` = 3 etapas: (1) `vite build` com `root: 'src'` e entradas `popup/index.html`, `opcoes/index.html`, `background/sw.ts` (saída `sw.js`); (2) e (3) um `vite build` em modo lib/IIFE **por content script** (`ponte`, `preenchedor`), com `emptyOutDir: false` — IIFE não aceita múltiplas entradas (no Vite 8 o IIFE já sai sem code splitting; `inlineDynamicImports` é ignorado). `test` (`vitest run`), `typecheck` (`tsc --noEmit` em `tsconfig.json` = `src/` sem tipos do Node, e em `tsconfig.node.json` = configs + testes)
- [x] `manifest.json` conforme seção Manifest do design; copiado para `dist/` no build
- [x] Teste smoke trivial para o runner

> Nota T1: com entrada vazia o Vite remove o `<script>` do HTML do popup/opções; volta sozinho quando `popup.ts`/`opcoes.ts` tiverem código (conferido).
**Done when**: `npm run build` gera `dist/manifest.json`, `dist/sw.js`, `dist/ponte.js`, `dist/preenchedor.js`, `dist/popup/index.html`, `dist/opcoes/index.html` (caminhos usados no manifest); `npm test` e `npm run typecheck` verdes.
**Verify**: `npm run build && ls dist && npm test && npm run typecheck`
**Tests**: smoke

### T2: Domínio — tipos, formatos e etapas

**What**: `tipos.ts`, `formatos.ts` e `etapas.ts` com testes.
**Where**: `src/dominio/tipos.ts`, `src/dominio/formatos.ts`, `src/dominio/etapas.ts`, `tests/dominio/formatos.test.ts`, `tests/dominio/etapas.test.ts`
**Depends on**: T1
**Refs**: NFSE-02, NFSE-03, NFSE-05
**Steps (TDD)**:
- [x] RED/GREEN `parseMoedaBR`: `'1.234,56'→123456`, `'10'→1000`, `'10,5'→1050`, `'abc'`/`''`→`null`, `'0,00'→0`
- [x] RED/GREEN `parseAliquotaBR`: `'2,01'→201`; `formatarCentavosBR(201)→'2,01'`; `formatarCentavosBR(123456)→'1.234,56'`
- [x] RED/GREEN `formatarCodigoTributacao('010101')→'01.01.01'`; `apenasDigitos`; `hojeBR(new Date(2026,10,9))→'09/11/2026'`
- [x] RED/GREEN `etapaDaUrl` (caminho comparado sem diferenciar maiúsculas; só `https:`): `/DPS/Pessoas`, `/DPS/Pessoas?idr=x`→`pessoas`; `/DPS/Servico?idr=`→`servico`; `/DPS/Tributacao`→`valores`; `/DPS/EmitirNFSe`→`conferencia`; outra→`null`; host diferente de `www.nfse.gov.br` → `null`; `proximaEtapa`
**Done when**: testes nomeados `NFSE-02`/`NFSE-03` verdes.
**Verify**: `npx vitest run tests/dominio`
**Tests**: unit

### T3: Domínio — validação

**What**: `validarNota`, `validarModelo`, `validarPadroes` retornando `{ campo, mensagem }[]`.
**Where**: `src/dominio/validacao.ts`, `tests/dominio/validacao.test.ts`
**Depends on**: T2
**Refs**: NFSE-03, NFSE-10, NFSE-16, NFSE-19
**Steps (TDD)**:
- [x] CNPJ: 14 dígitos + DV (fictício `11222333000181` válido, `11222333000180` inválido — não usar CNPJ real em teste, `11111111111111` inválido)
- [x] Valor > 0; descrição 1–2000; data dd/mm/aaaa existente (`31/02/2026` inválida); código 6 dígitos; NBS 9 dígitos; regime 1–3; alíquota 1–9999 centésimos; município vazio ou `/^.+\/[A-Z]{2}$/`; e-mail opcional com `@`
- [x] Modelo válido: apelido + CNPJ + código + NBS + município(formato); valor/descrição opcionais
- [x] Padrões válidos: código + NBS + regime + alíquota; descrição/município opcionais
**Done when**: testes `NFSE-03 …` verdes.
**Verify**: `npx vitest run tests/dominio/validacao.test.ts`
**Tests**: unit

### T4: Domínio — importação/exportação

**What**: `exportar(padroes, modelos)` e `analisarImportacao(texto, modelosAtuais)`.
**Where**: `src/dominio/importacao.ts`, `tests/dominio/importacao.test.ts`
**Depends on**: T3
**Refs**: NFSE-17, NFSE-18, NFSE-19
**Steps (TDD)**:
- [x] `exportar` → `{ versao: 1, padroes, modelos }`; `nomeArquivoExportacao(data)` → `nfse-modelos-2026-11-09.json`
- [x] `analisarImportacao`: texto não-JSON → erro "Arquivo não é JSON"; `versao != 1` → erro; modelo inválido → erro com apelido/índice; padrões inválidos → erro
- [x] Válido → `{ padroes, novos: Modelo[], conflitos: Modelo[] }` (conflito = apelido já existente); apelido repetido dentro do arquivo também rejeita; chaves desconhecidas são descartadas
- [x] `mesclarModelos(atuais, novos, substituirApelidos)` puro
**Done when**: testes `NFSE-17/18/19` verdes.
**Verify**: `npx vitest run tests/dominio/importacao.test.ts`
**Tests**: unit

### T5: Armazenamento — padrões e modelos

**What**: Repositório sobre `chrome.storage.local` com fake em memória para testes.
**Where**: `src/armazenamento/repositorio.ts`, `tests/fakes/chrome-storage.ts`, `tests/armazenamento/repositorio.test.ts`
**Depends on**: T3
**Refs**: NFSE-10..16
**Steps (TDD)**:
- [x] `lerPadroes()` sem nada salvo → defaults NFSE-15 (`010101`, `115029000`, 1, 201)
- [x] `salvarPadroes` valida (rejeita inválido) e persiste
- [x] `listarModelos` ordenado por apelido; `salvarModelo(m, { substituir })` → erro `ApelidoExistente` se já existe e `substituir=false`; `excluirModelo(apelido)`
- [x] `substituirTudo(padroes?, modelos)` para importação
**Done when**: testes verdes.
**Verify**: `npx vitest run tests/armazenamento`
**Tests**: unit

### T6: Fixtures anonimizadas e seletores

**What**: HTML das 4 etapas sem dados pessoais + `seletores.ts` + teste que garante que cada seletor existe na fixture.
**Where**: `scripts/anonimizar-fixtures.mjs`, `tests/fixtures/{pessoas,servico,valores,emitir}.html`, `src/portal/seletores.ts`, `tests/portal/seletores.test.ts`
**Depends on**: T1
**Refs**: NFSE-04..09
**Steps**:
- [x] Script que lê `fixtures-raw/*.html` (salvos como **string JSON** → `JSON.parse` primeiro), troca CNPJs, nomes, e-mail, telefone, endereço, tokens (`idr`, `__RequestVerificationToken`, `accessToken`) por valores fictícios e remove `<script>` inline com dados de sessão. Nomes/endereço reais NÃO ficam no script: vêm de `fixtures-raw/termos-sensiveis.json` (ignorado pelo git, pares `[regex, substituto]`)
- [x] Conferir que nenhum dado real sobra nos arquivos versionáveis: `node scripts/verificar-vazamento.mjs` (os termos ficam em `fixtures-raw/termos-sensiveis.json`, ignorado pelo git)
- [x] `seletores.ts` agrupado por etapa; cada entrada é `{ css, nome }` (nome usado no aviso de erro NFSE-08) (tabela do `docs/mapeamento-portal.md`), só CSS válido: o Avançar de Serviço/Valores é `button.btn-primary` + filtro pelo texto "Avançar" (`:has-text` é sintaxe do Playwright, não CSS)
- [x] Teste jsdom: para cada etapa, cada seletor obrigatório tem `querySelector` não nulo
**Done when**: teste verde e `grep` de dados reais vazio.
**Verify**: `npx vitest run tests/portal/seletores.test.ts && node scripts/verificar-vazamento.mjs`
**Tests**: unit (fixture)

### T7: Portal — primitivas de ação (MAIN)

**What**: `esperar`, `marcarRadio`, `selecionarChosen`, `selecionarSelect2Ajax`, `digitarMascarado`, `clicarAvancar`, `lerValor`, com `FalhaCampo`.
**Where**: `src/portal/acoes.ts`, `tests/portal/acoes.test.ts`
**Depends on**: T6
**Refs**: NFSE-08
**Steps**:
- [x] Interface `Acoes` (para ser substituída por fake nos testes das etapas)
- [x] TDD em jsdom das partes sem jQuery: `esperar` resolve quando o elemento aparece/habilita e lança `FalhaCampo(campo)` após timeout (timers falsos); `marcarRadio` clica no `label`
- [x] Implementação com `window.jQuery` para Chosen/Select2 (validada no T8). `digitarMascarado` já digita caractere a caractere (keydown/keypress/input/keyup) + change + blur, cobrindo os planos A e B; `preencherTexto` e `clicar` adicionados para descrição/e-mail e botão Buscar
- [x] `selecionarChosen` confere que a opção existe e que o valor ficou aplicado; senão `FalhaCampo` (jQuery `val()` com opção inexistente falha em silêncio) — teste jsdom com `<select>` e jQuery falso mínimo
- [x] `digitarMascarado` limpa o campo antes de digitar (portal lembra a alíquota anterior) — teste
- [x] `selecionarSelect2Ajax`: escolhe a opção por texto exato ou prefixo; nenhuma correspondência → `FalhaCampo`
**Done when**: testes verdes; typecheck verde.
**Verify**: `npx vitest run tests/portal/acoes.test.ts && npm run typecheck`
**Tests**: unit (parcial)

### T8: Spike HITL — validar primitivas no portal real

**What**: Rodar as primitivas do T7 no portal (via Playwright `evaluate`, que roda no mundo MAIN) para confirmar máscara, Chosen e Select2.
**Where**: ajustes em `src/portal/acoes.ts`; resultado em `docs/mapeamento-portal.md`
**Depends on**: T7
**Refs**: NFSE-04..06
**Tipo**: HITL (dev faz login)
**Steps**:
- [x] Build IIFE temporário de `acoes.ts` + `seletores.ts` expondo `window.__nfseAcoes` (`npx vite build` em modo lib para `scratchpad`), injetado com `page.addScriptTag({ content })` — testa o mesmo código que vai para a extensão
- [x] Dev loga; abrir Pessoas
- [x] Testar `digitarMascarado` em data e CNPJ; a máscara é VMasker (assíncrona) → `digitarMascarado` passou a ceder o event loop após cada tecla (bug encontrado e corrigido com teste)
- [x] Testar `selecionarSelect2Ajax` (município exato, código por prefixo) e `selecionarChosen` (regime, NBS, PIS/COFINS)
- [x] Parar antes da Conferência ou nela; nunca emitir
**Done when**: as 3 primitivas funcionam no portal real e o resultado está registrado no mapeamento.
**Verify**: evidência do Playwright (valores lidos dos campos após cada primitiva).

### T9: Portal — etapas

**What**: `executarPessoas`, `executarServico`, `executarValores` e detecção de código complementar.
**Where**: `src/portal/etapa-pessoas.ts`, `src/portal/etapa-servico.ts`, `src/portal/etapa-valores.ts`, `src/portal/codigo-complementar.ts`, `tests/portal/etapas.test.ts`, `tests/fakes/acoes.ts`
**Depends on**: T7, T2
**Refs**: NFSE-04, NFSE-05, NFSE-06, NFSE-09
**Steps (TDD com `Acoes` falsas que registram chamadas)** — as etapas NÃO clicam em Avançar: devolvem `ResultadoEtapa` e o preenchedor (T11) responde e então avança:
- [x] Pessoas: ordem exata da NFSE-04; e-mail/telefone só se informados; retorna `municipioEmitente`
- [x] Serviço: município do pedido ou do emitente; código por prefixo `01.01.01 - `; imunidade Não; descrição; NBS; se código complementar obrigatório (flag comparada sem diferenciar maiúsculas: `false`/`False`/`true`/`True`, testar ambos) → retorna `{ pausa: 'codigoComplementar' }` sem avançar
- [x] Valores: valor → retenção Não → PIS/COFINS 0 → retenção 0 → tipo 4 → alíquota → Avançar
- [x] `FalhaCampo` de qualquer ação propaga com o nome do campo
**Done when**: testes `NFSE-04/05/06/09` verdes.
**Verify**: `npx vitest run tests/portal/etapas.test.ts`
**Tests**: unit

### T10: Service worker — pedido por aba

**What**: Máquina de estados do pedido em `storage.session`.
**Where**: `src/background/pedidos.ts` (lógica pura sobre storage injetado), `src/background/sw.ts` (wiring), `tests/background/pedidos.test.ts`
**Depends on**: T2
**Refs**: NFSE-07, NFSE-08, NFSE-09, casos limite
**Steps (TDD)**:
- [x] `criarPedido(tabId, dados, agora)`; `obterPedido(tabId, url, agora)` → `{ executar: etapa, dados, municipioEmitente? }`, `{ conferencia: true }` (e apaga), `{ erro: 'etapaInesperada' }` (e apaga) ou `null` (sem pedido / expirado >10 min, apagando)
- [x] `urlMudou(tabId, url)`: URL fora de `/EmissorNacional/DPS/` apaga o pedido (cobre ir para a home e começar outra emissão durante a pausa); Serviço recarregado durante a pausa → `null` sem apagar
- [x] `concluirEtapa(tabId, proxima, extras)`; `pausar(tabId)` (código complementar → próxima esperada = valores); `encerrar(tabId)`
- [x] Wiring: `runtime.onMessage` (`criarPedido`, `obterPedido`, `concluirEtapa`, `pausar`, `encerrar`) usando `sender.tab.id` (popup envia `tabId` explícito); `tabs.onRemoved` apaga; `tabs.onUpdated` com `changeInfo.url` chama `urlMudou`
**Done when**: testes verdes.
**Verify**: `npx vitest run tests/background`
**Tests**: unit

### T11: Content scripts — ponte, preenchedor e banner

**What**: Ligação SW ↔ ponte (isolado) ↔ preenchedor (MAIN) e banners de sucesso/erro/pausa.
**Where**: `src/content/ponte.ts`, `src/content/preenchedor.ts`, `src/content/banner.ts`, `src/content/protocolo.ts`, `tests/content/ponte.test.ts`
**Depends on**: T9, T10
**Refs**: NFSE-07, NFSE-08, NFSE-09
**Steps**:
- [x] `protocolo.ts`: nomes e formatos dos `CustomEvent` (`nfse:executar`, `nfse:resultado`)
- [x] Ponte: ao carregar e ao receber `iniciar`, pede pedido ao SW; trata `executar`/`erro`/`conferencia`; repassa resultado; mostra banner
- [x] Handshake: preenchedor emite `nfse:pronto` ao registrar o listener e em resposta ao `nfse:ping` que a ponte emite ao iniciar (cobre qualquer ordem de carga); ponte só dispara `nfse:executar` após `nfse:pronto`; resultado sem execução em andamento é ignorado (ordem de carga entre mundos não é garantida). `detail` sempre string JSON
- [x] Preenchedor: escuta `nfse:executar`, chama a etapa, emite `nfse:resultado` ok antes de clicar em Avançar; pode emitir um segundo `nfse:resultado` de falha depois (erro de validação), e a ponte então chama `encerrar`
- [x] Erro de validação após Avançar: se a URL não mudar em 15 s e houver `.field-validation-error` → resultado de falha com o rótulo
- [x] Banner em shadow DOM; textos da spec
- [x] Teste jsdom da ponte com SW falso: conferência → banner de sucesso; erro → banner com etapa/campo + `encerrar`; falha após ok → `encerrar`; `etapaInesperada` → banner de erro; executar só após `nfse:pronto`
**Done when**: testes verdes; `npm run build` verde.
**Verify**: `npx vitest run tests/content && npm run build`
**Tests**: unit

### T12: Popup

**What**: Formulário da nota, modelos, padrões, Preencher e Abrir emissão.
**Where**: `src/popup/index.html`, `src/popup/popup.ts`, `src/popup/popup.css`, `src/popup/formulario.ts`, `tests/popup/formulario.test.ts`
**Depends on**: T3, T5, T10
**Refs**: NFSE-01, NFSE-02, NFSE-03, NFSE-10..16
**Steps**:
- [x] `formulario.ts` puro (o formulário guarda texto): `formularioDePadroes(padroes, hoje)`, `aplicarModelo(form, modelo)` (mantém data/regime/alíquota), `lerNota(form)` (converte + valida), `modeloDoFormulario(form, apelido)`, `padroesDoFormulario(form)`, `campoDoFormulario` — TDD
- [x] UI: campos da NFSE-01, select de modelos, botões Salvar como modelo / Atualizar modelo / Excluir / Salvar como padrão / Preencher / Abrir emissão / link Importar/Exportar (`runtime.openOptionsPage`)
- [x] Salvar/Atualizar modelo usam `validarModelo`; `ApelidoExistente` → `confirm` para substituir (NFSE-14); Excluir pede `confirm` (NFSE-13)
- [x] Preencher: valida (erros por campo), `criarPedido` no SW, `tabs.sendMessage(tabId, 'iniciar')`; se falhar com "Receiving end does not exist" (aba aberta antes de instalar/recarregar a extensão) → mensagem "Recarregue a página do portal e tente de novo" e `encerrar` com `tabId` (senão o pedido ficaria pendente e o recarregamento começaria a preencher sozinho); fecha o popup em sucesso
- [x] Aba fora de Pessoas → Preencher desabilitado + botão que faz `tabs.update` para a URL de Pessoas
- [x] Rodapé: "Extensão não oficial, sem vínculo com a Receita Federal ou o Emissor Nacional."
**Done when**: testes `NFSE-01/11/12` verdes; build verde; popup abre no Chrome.
**Verify**: `npx vitest run tests/popup && npm run build`
**Tests**: unit (lógica) + manual (UI)

> Smoke em navegador real (dist servido localmente + `chrome.*` falso): validação, salvar/aplicar modelo, Preencher, aba fora de Pessoas e aba sem ponte OK, sem erro de runtime. Falta abrir como extensão (T14). Popup tem ~870px de altura (Chrome limita a 600px → rolagem).

> **Ajuste pós-T12 (pedido do dev): painel lateral.** Manifest com `side_panel` + `sidePanel`; SW abre o painel no clique do ícone; o painel acompanha a aba ativa, não fecha após Preencher e usa `<dialog>` no lugar de `prompt()`/`confirm()`. Smoke em navegador real (360px, `chrome.*` falso): salvar/substituir/cancelar/Esc/excluir pelo diálogo, troca de aba habilita/desabilita Preencher, nenhum diálogo nativo aberto.

> **Repaginação visual (mockup do dev):** `src/estilo/tema.css` (tokens escuro/claro, cards, campos, botões, `<dialog>`), painel com cabeçalho, botões de ícone para modelo, prefixo R$/sufixo %, rodapé fixo; "Abrir emissão" dentro da dica (NFSE-02) e aviso legal no fim do conteúdo. Conferido em navegador real a 360px e 260px (sem rolagem horizontal), claro/escuro, erros, diálogo e opções.

### T13: Página de opções — importar/exportar

**What**: Exportar JSON e importar com conflitos e caixa de padrões.
**Where**: `src/opcoes/index.html`, `src/opcoes/opcoes.ts`
**Depends on**: T4, T5
**Refs**: NFSE-17, NFSE-18, NFSE-19
**Steps**:
- [x] Exportar: `Blob` + `<a download>` com `nomeArquivoExportacao`
- [x] Importar: `<input type=file>` → `analisarImportacao` → erro mostra motivo; conflitos → `confirm` por apelido; caixa "Importar também os padrões" → `substituirTudo`
**Done when**: build verde; export → import do mesmo arquivo funciona manualmente sem alterar nada.
**Verify**: `npm run build` + roteiro manual
**Tests**: lógica coberta no T4; UI manual

> Smoke em navegador real: exportar → reimportar o mesmo arquivo (conflito mantido) → arquivo inválido rejeitado sem alterar → importar com padrões. OK, sem erro de runtime.

### T14: Validação ponta a ponta (HITL)

**What**: Carregar `dist/` no Chrome, logar e preencher uma nota até a Conferência.
**Where**: —
**Depends on**: T11, T12, T13
**Refs**: NFSE-01..19
**Tipo**: HITL
**Steps**:
- [x] Chrome (116+) → `chrome://extensions` → modo desenvolvedor → carregar `dist/`; recarregar a aba do portal; clicar no ícone abre o painel lateral
- [x] Pausa do código complementar não testável em Goianésia (não exige); coberta por teste unitário
- [x] Criar o modelo do tomador real; Preencher na etapa Pessoas; chegar à Conferência com banner de sucesso
- [x] Forçar erro (NBS inexistente via edição) → banner com etapa/campo
- [x] Exportar, excluir modelo, importar de volta
- [x] Não emitir (ou, se o dev quiser, emitir uma nota real verdadeira)
**Done when**: roteiro completo com evidência (screenshots) e sem nota emitida indevidamente.
**Verify**: screenshots em `.playwright-mcp/` (não commitadas)

> Validado em 09/11/2026: o dev rodou o fluxo no Chrome dele pela extensão real até a Conferência (sem emitir). Antes disso, a ponte simulada + preenchedor real chegaram à Conferência no portal sem foco do documento e com disparo no DOMContentLoaded.

---

## Cobertura de requisitos

| Requisito | Tasks |
|---|---|
| NFSE-01 | T12, T14 |
| NFSE-02 | T2, T12 |
| NFSE-03 | T2, T3, T12 |
| NFSE-04 | T8, T9 |
| NFSE-05 | T8, T9 |
| NFSE-06 | T8, T9 |
| NFSE-07 | T10, T11 |
| NFSE-08 | T7, T10, T11 |
| NFSE-09 | T9, T10, T11 |
| NFSE-10..14 | T3, T5, T12 |
| NFSE-15..16 | T5, T12 |
| NFSE-17..19 | T4, T13 |
| Caso limite: busca CNPJ/município/código/NBS sem resultado | T7, T9 |
| Caso limite: fechar aba / sair de `/DPS/` / >10 min | T10 |
| Caso limite: Pessoas sem pedido não é tocada | T10, T11 |
| Caso limite: sobrescrever campos já digitados | T7 |
| Caso limite: etapa inesperada / erro após Avançar | T10, T11 |

Sem requisito descoberto.
