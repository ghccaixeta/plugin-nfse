# Convenções

- Código, nomes de domínio e mensagens ao usuário em português (ex.: `Modelo`, `Padroes`, `executarPessoas`). Termos técnicos da plataforma em inglês (`storage`, `content script`).
- Arquivos em kebab-case; tipos em PascalCase; funções em camelCase.
- Seletores do portal só em `src/portal/seletores.ts` — nenhum seletor literal fora dele (inclui classes de Chosen/Select2).
- Avisos de falha no formato da spec: `avisoDaEtapa(etapa, texto)` → "Etapa Serviço: …".
- Dependências injetadas para teste (`criarAcoes({ doc, jq })`, `criarRepositorio(area)`, `criarPedidos(area)`, `iniciarPonte({ enviar })`); entradas de content script só iniciam em `www.nfse.gov.br`.
- Testes nunca usam dados reais: CNPJs/CPFs fictícios listados em `scripts/dados-sensiveis.mjs`.

## Glossário

| Termo | Definição |
|---|---|
| Modelo | Conjunto salvo de dados de uma nota recorrente (tomador, valor, descrição, município, código, NBS). |
| Padrões | Valores globais usados quando não há modelo ou para iniciar um modelo novo. |
| Pedido | Preenchimento pendente de uma aba, guardado pelo service worker. |
| Preenchimento | Execução das etapas Pessoas → Serviço → Valores até a conferência. |
| Etapa | Uma das páginas do portal: Pessoas, Serviço, Valores (`Tributacao`), Conferência (`EmitirNFSe`). |
| Conferência | Tela `/DPS/EmitirNFSe` com o botão "Emitir NFS-e"; a extensão nunca clica nele. |
| Ponte / Preenchedor | Content scripts no mundo isolado / no mundo MAIN. |
| Tomador | Cliente da nota (só CNPJ na v1). Não usar "cliente" no código. |
| Enquadramento | Situação do emitente no Simples para a extensão: `meepp` (ME/EPP, padrão) ou `mei`. No portal é `SimplesNacional.Opcao` (3 / 2). |
