# Estado

## Decisões

- 2026-11-09: Escopo definido em sessão de grilling (ver `.specs/features/2026-11-09-preenchedor-v1/context.md`).
- 2026-11-09: Portal mapeado (v1.6.0.0) — `docs/mapeamento-portal.md`.

- 2026-11-09: Interface no **painel lateral** (`chrome.sidePanel`) em vez de popup, a pedido do dev. Perguntas via `<dialog>` (suporte de `prompt`/`confirm` no painel não confirmado). Pasta segue `src/popup`.
- 2026-11-13: **Suporte a Firefox** por build separado (`dist-firefox/`, manifest convertido em `build/manifest.ts`) em vez de manifest único cross-browser: mantém o `dist/` do Chrome idêntico e sem avisos de chaves desconhecidas. ID Gecko = UUID `{43c62ad5-ac62-4079-a086-25b9f04f1584}` (escolha do dev; fixo após a 1ª assinatura). Mínimo Firefox 140 (ESR) por causa de `data_collection_permissions`. Spec: `.specs/features/2026-11-13-suporte-firefox/`.
- 2026-11-13: **MEI** escolhido no painel ("Enquadramento", salvo nos Padrões; ausente = ME/EPP) e conferido contra `#SimplesNacional_Opcao` do portal em Pessoas — decisão do dev (opção visível) + rede de segurança. Código `2` = MEI vem do leiaute nacional, não visto no portal; Valores MEI = só o valor (relato do dev). Pendente: fixture/teste real com emitente MEI. Spec: `.specs/features/2026-11-13-suporte-mei/`.

## Lições

- Buscas Select2 do portal retornam correspondências parciais ("Goianésia" → "Goianésia do Pará/PA"); sempre casar texto exato.
- O portal salva rascunho a cada "Avançar" e não permite excluir rascunho pela home.

- 2026-11-09 (T8): a máscara do portal é **VMasker**, que formata num `setTimeout(0)` após o `keyup`; o `change` da data valida na hora. Digitar tudo de forma síncrona fazia o portal ver `09112026`, rejeitar a data e não carregar o emitente. Regra: após cada tecla sintética, ceder o event loop antes da próxima e antes do `change`. Teste de regressão em `tests/portal/acoes.test.ts`.
- Flags booleanas do portal mudam de capitalização em runtime (`False` → `false`); sempre comparar sem diferenciar maiúsculas.

- 2026-11-09 (T14): com o painel lateral, o clique em Preencher deixa o **documento do portal sem foco**. Nesse estado o Chrome move o elemento ativo em `focus()`/`blur()` mas **não dispara** `focus`/`blur`/`focusout` (confirmado no Chrome do dev: `focou: true, focusoutDisparou: 0`). O portal consulta o CNPJ do tomador no `focusout` (jQuery 3.3.1 simula `focusout` a partir do `blur`), então a consulta nunca rodava → "Nome do tomador não encontrado", sem alerta. Regra: ao entrar/sair de campo, se `document.hasFocus()` for falso, disparar `focus`/`focusin` e `blur`/`focusout` sintéticos. O Playwright finge foco (`hasFocus()` sempre true, mesmo com emulação desligada); para reproduzir, bloquear eventos de foco `isTrusted` e fingir `hasFocus() = false`.

- 2026-11-09 (auditoria): um CNPJ real de tomador foi parar num teste unitário escrito à mão, fora das fixtures anonimizadas, e o grep de verificação só olhava `tests/fixtures` (e ele próprio continha fragmentos dos dados reais). Regra: dado real nunca é digitado em teste/spec; `node scripts/verificar-vazamento.mjs` varre TODOS os arquivos versionáveis com padrões lidos de `fixtures-raw/` (ignorado) — rodar antes de commitar.
- 2026-11-09 (code-review): o Avançar do portal é POST; recusa de validação recarrega a mesma etapa. O SW guarda `etapaConcluida`/`etapaIniciada` para distinguir "portal recusou" de "usuário voltou", e o preenchedor só clica depois que a ponte confirma (`nfse:continuar`) que o SW gravou a etapa.

- 2026-11-09 (T14): o content script (`document_idle`) pode rodar antes de o portal terminar de se montar (handlers do `$(document).ready`, inicialização de Select2/Chosen). Disparando no `DOMContentLoaded`, o Serviço quebrava em `select2('open')` com Select2 ainda não inicializado — provável causa também do "Data de competência não habilitou" visto no Chrome do dev. Regra: o preenchedor espera o `load` da página antes de qualquer ação; `selecionarSelect2Ajax` espera a classe `select2-hidden-accessible` no <select>. Validado no portal real sem foco e no tempo mais cedo: Pessoas → Serviço → Valores → Conferência.

## Blockers

(nenhum)

## Preferences

- Perguntas uma por vez.

## Handoff (2026-11-09, 3ª sessão)

- Branch `feature/preenchedor-v1` com 7 commits por área (build, dominio, armazenamento, portal, popup, build/vazamento, docs). T1–T14 concluídas; T14 validado pelo dev no Chrome dele.
- `npm test` (296 testes + verificação de vazamento), typecheck e build verdes. Auditoria: `~/security-audit-skill/plugin-nfse/run-1/REPORT.md`.
- Próximo: fechar a branch (merge em develop ou PR) — decisão do dev.
- Ainda não validado no portal real: a mensagem de recusa do portal (validação após Avançar). Rascunhos de teste criados hoje: "SPIKE T8 - NAO EMITIR" e "TESTE EXTENSAO - NAO EMITIR".
- Lacuna adiada da auditoria: ciclo de vida do pedido por aba (criarPedido sobrescreve pedido em andamento; bfcache; segunda emissão na mesma aba).
- Pendente de decisão do dev: CNPJ alfanumérico (o portal já aceita, classe `cpfcnpj-alfanumerico`).
- Defaults do dev: TDD nas tasks de lógica; sem subagentes na execução; code review extra e security desligados (rodados a pedido nesta sessão).
