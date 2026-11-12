# Preenchedor v1 — Especificação

## Problema

Emitir uma NFS-e no Emissor Nacional exige responder ~20 campos em 3 etapas, a maioria igual todo mês. É lento e um código de tributação ou NBS errado obriga a cancelar a nota. A extensão preenche tudo a partir de um modelo e deixa o usuário só conferir e emitir.

## Objetivos

- [ ] Do clique em "Preencher" até a tela de Conferência sem intervenção manual, quando o portal não exige código complementar municipal.
- [ ] Nenhuma requisição de rede feita pela extensão (fora as que o próprio portal dispara ao ser preenchido).
- [ ] Toda falha de preenchimento identifica a etapa e o campo.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Clicar em "Emitir NFS-e" | Nota errada exige cancelamento; conferência é humana. |
| Emissão em lote | Uma nota por vez (decisão do dev). |
| Tomador CPF, exterior ou não informado | v1 só CNPJ Brasil. |
| Preencher IBS/CBS | Resposta fixa "Não" em 2026. |
| Código complementar municipal | Só alguns municípios; usuário seleciona manualmente. |
| Perfis por CNPJ emitente | v2, se pedirem. |
| Navegar sozinho até a emissão | Só funciona a partir da etapa Pessoas. |
| Report de erro / telemetria / servidor | Decisão do dev; privacidade. |
| Ícones, screenshots, política de privacidade, publicação | Feature separada no roadmap. |

---

## Glossário

> Termos canônicos consolidados em `.specs/codebase/CONVENTIONS.md` seção "Glossário".

| Termo | Definição canônica | Fonte |
|---|---|---|
| Modelo | Conjunto salvo de dados de uma nota recorrente. | grilling 2026-11-09 |
| Padrões | Valores globais editáveis usados quando não há modelo e para iniciar modelo novo. | grilling |
| Nota atual | Os valores do popup no momento do clique em "Preencher" (padrões ou modelo + edições). | grilling |
| Preenchimento | Execução das etapas Pessoas → Serviço → Valores até a Conferência. | mapeamento |
| Conferência | Página `/DPS/EmitirNFSe`. | mapeamento |
| Cliente | NÃO usar — usar `Tomador`. | — |
| Template | NÃO usar — usar `Modelo`. | — |

---

## User Stories

### P1: Preencher uma nota até a Conferência ⭐ MVP

**User Story**: Como prestador logado no Emissor Nacional, quero clicar em "Preencher" no popup e ver o portal chegar à Conferência com meus dados, para só conferir e emitir.

**Critérios de Aceite**:

> "Popup" nesta spec = a interface da extensão, exibida no **painel lateral** do Chrome (decisão de 2026-11-09, ver design).

1. **NFSE-01** QUANDO o popup abre ENTÃO DEVE exibir os campos: modelo (seleção), CNPJ do tomador, e-mail, telefone, valor, descrição, data de competência, município da prestação, código de tributação, NBS, regime de apuração e alíquota do Simples, pré-preenchidos com os Padrões (sem modelo) e data de competência = hoje.
2. **NFSE-02** QUANDO o caminho da URL da aba ativa não é `https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas` (comparação ignora query string, ex.: `?idr=`) ENTÃO o popup DEVE desabilitar "Preencher" e mostrar o botão "Abrir emissão de NFS-e", que navega a aba ativa para essa URL.
3. **NFSE-03** QUANDO o usuário clica em "Preencher" com algum campo obrigatório inválido ENTÃO o popup DEVE marcar o campo e não iniciar o preenchimento. Obrigatórios: CNPJ (14 dígitos com DV válido), valor > 0, descrição (1–2000 caracteres), data dd/mm/aaaa válida, código de tributação (6 dígitos), NBS (9 dígitos), regime (1, 2 ou 3), alíquota (0,01–99,99). Município é opcional (vazio = município do emitente) e, se informado, deve ter o formato `Nome/UF`. Valor e alíquota são digitados no formato brasileiro (`1.234,56`; ponto de milhar opcional).
4. **NFSE-04** QUANDO o preenchimento roda na etapa Pessoas ENTÃO a extensão DEVE: responder IBS/CBS = Não; digitar a data de competência; garantir "Prestador" marcado; selecionar o regime; garantir tomador "Brasil"; digitar o CNPJ e acionar a busca; aguardar o nome do tomador; preencher e-mail e telefone se informados; garantir intermediário "não informado"; ler o município do emitente; clicar em Avançar.
5. **NFSE-05** QUANDO a etapa Serviço carrega durante um preenchimento ENTÃO a extensão DEVE: selecionar o município da prestação (o informado ou o do emitente) com correspondência exata de texto `Nome/UF`; selecionar o código de tributação; responder imunidade/exportação = Não; preencher a descrição; selecionar o NBS; clicar em Avançar.
6. **NFSE-06** QUANDO a etapa Valores carrega durante um preenchimento ENTÃO a extensão DEVE: digitar o valor; responder retenção do ISSQN = Não; selecionar PIS/COFINS "00 - Nenhum" e "Não Retidos"; selecionar "Informar alíquota do Simples Nacional"; digitar a alíquota; clicar em Avançar.
7. **NFSE-07** QUANDO a Conferência carrega durante um preenchimento ENTÃO a extensão DEVE encerrar o preenchimento sem interagir com `#btnProsseguir` e exibir na página o aviso "Preenchido. Confira os dados e clique em Emitir NFS-e."
8. **NFSE-08** QUANDO qualquer campo esperado não aparece ou não habilita em até 15 s, ou o portal mostra erro de validação após Avançar, ENTÃO a extensão DEVE encerrar o preenchimento e exibir na página um aviso com a etapa e o nome do campo (ex.: "Etapa Serviço: Código de tributação não encontrado"), sem avançar.
9. **NFSE-09** QUANDO a etapa Serviço exige código complementar municipal ENTÃO a extensão DEVE parar antes de Avançar e exibir "Selecione o Código Complementar Municipal e clique em Avançar para continuar"; QUANDO o usuário avança manualmente ENTÃO a extensão DEVE retomar na etapa Valores.

**Teste Independente**: `npm run build`, carregar `dist/` no Chrome, logar no portal, abrir Pessoas, escolher um modelo, clicar em Preencher e ver a Conferência com os dados (não emitir).

---

### P1: Gerenciar modelos ⭐ MVP

**User Story**: Como prestador, quero salvar os dados de cada nota recorrente como modelo para reutilizá-los.

**Critérios de Aceite**:

0. **Modelo válido** = apelido não vazio + CNPJ, código de tributação, NBS e município pelas regras de NFSE-03; valor, descrição, e-mail e telefone opcionais. **Padrões válidos** = código, NBS, regime e alíquota pelas regras de NFSE-03; descrição e município opcionais. As mesmas regras valem para salvar (NFSE-10, NFSE-16) e importar (NFSE-19).
1. **NFSE-10** QUANDO o usuário clica em "Salvar como modelo" e informa um apelido ENTÃO o popup DEVE validar como modelo válido e salvar os valores atuais (exceto data, regime e alíquota) como modelo em `chrome.storage.local`.
2. **NFSE-11** QUANDO o usuário escolhe um modelo ENTÃO o popup DEVE substituir os campos do modelo pelos valores salvos, mantendo data, regime e alíquota atuais.
3. **NFSE-12** QUANDO o usuário edita campos após escolher um modelo e clica em "Preencher" ENTÃO o modelo salvo NÃO DEVE mudar; QUANDO clica em "Atualizar modelo" ENTÃO o modelo DEVE ser sobrescrito com os valores atuais.
4. **NFSE-13** QUANDO o usuário exclui um modelo e confirma ENTÃO ele DEVE sumir da lista.
5. **NFSE-14** QUANDO se tenta salvar um apelido já existente com "Salvar como modelo" ENTÃO o popup DEVE pedir confirmação para substituir.

**Teste Independente**: testes unitários do repositório de modelos + uso manual do popup.

---

### P1: Editar padrões ⭐ MVP

**User Story**: Como prestador de outra atividade, quero trocar os valores padrão pelos da minha empresa.

**Critérios de Aceite**:

1. **NFSE-15** QUANDO não há padrões salvos ENTÃO o sistema DEVE usar: código 010101, NBS 115029000, regime 1, alíquota 2,01, descrição vazia, valor vazio, município vazio.
2. **NFSE-16** QUANDO o usuário clica em "Salvar como padrão" ENTÃO código, NBS, regime, alíquota, descrição e município atuais DEVEM virar os padrões.

---

### P2: Importar e exportar

**User Story**: Como prestador, quero exportar meus modelos para outra máquina ou pessoa e importar os recebidos.

**Critérios de Aceite**:

1. **NFSE-17** QUANDO o usuário clica em "Exportar" ENTÃO o sistema DEVE baixar `nfse-modelos-AAAA-MM-DD.json` com `{ versao: 1, padroes, modelos }`.
2. **NFSE-18** QUANDO o usuário importa um arquivo válido ENTÃO o sistema DEVE somar os modelos aos existentes; para cada apelido repetido DEVE perguntar se substitui; e DEVE importar os padrões só se a caixa "Importar também os padrões" estiver marcada.
3. **NFSE-19** QUANDO o arquivo não é JSON, tem `versao` diferente de 1, algum modelo não é um modelo válido, ou os padrões (quando presentes) não são válidos ENTÃO o sistema DEVE rejeitar a importação inteira e informar o motivo, sem alterar nada.

---

## Casos Limite

- QUANDO a busca do CNPJ não retorna nome em 15 s ENTÃO aplica-se NFSE-08 (campo "Nome do tomador").
- QUANDO a busca do município retorna várias opções e nenhuma com texto exato `Nome/UF` ENTÃO aplica-se NFSE-08 (campo "Município da prestação").
- QUANDO o código de tributação não tem opção que comece com o código formatado (`01.01.01`) ENTÃO aplica-se NFSE-08.
- QUANDO o NBS não existe na lista do portal ENTÃO aplica-se NFSE-08.
- QUANDO o usuário fecha a aba ou navega para fora de `/DPS/` durante o preenchimento ENTÃO o preenchimento DEVE ser descartado e não retomar em outra emissão.
- QUANDO um preenchimento pendente tem mais de 10 minutos ENTÃO DEVE ser descartado.
- QUANDO o usuário abre Pessoas sem ter clicado em "Preencher" ENTÃO a extensão NÃO DEVE tocar no formulário.
- QUANDO uma página da emissão carrega e não é a etapa esperada pelo preenchimento pendente (ex.: a mesma etapa recarregou com erro de validação, ou o usuário voltou) ENTÃO o preenchimento DEVE ser encerrado com o aviso de NFSE-08, sem preencher de novo (evita loop). Exceção: na pausa de NFSE-09, a etapa esperada passa a ser Valores.
- QUANDO, após clicar em Avançar, a URL não muda em 15 s e há `.field-validation-error` visível ENTÃO aplica-se NFSE-08 com o rótulo do campo com erro.
- QUANDO o formulário já tem valores digitados ENTÃO a extensão DEVE sobrescrever os campos que ela preenche.

---

## Rastreabilidade de Requisitos

| ID | Story | Fase | Status |
|---|---|---|---|
| NFSE-01 | P1 Preencher | Execute | Verified |
| NFSE-02 | P1 Preencher | Execute | Verified |
| NFSE-03 | P1 Preencher | Execute | Verified |
| NFSE-04 | P1 Preencher | Execute | Verified |
| NFSE-05 | P1 Preencher | Execute | Verified |
| NFSE-06 | P1 Preencher | Execute | Verified |
| NFSE-07 | P1 Preencher | Execute | Verified |
| NFSE-08 | P1 Preencher | Execute | Verified |
| NFSE-09 | P1 Preencher | Execute | Verified |
| NFSE-10 | P1 Modelos | Execute | Verified |
| NFSE-11 | P1 Modelos | Execute | Verified |
| NFSE-12 | P1 Modelos | Execute | Verified |
| NFSE-13 | P1 Modelos | Execute | Verified |
| NFSE-14 | P1 Modelos | Execute | Verified |
| NFSE-15 | P1 Padrões | Execute | Verified |
| NFSE-16 | P1 Padrões | Execute | Verified |
| NFSE-17 | P2 Import/Export | Execute | Verified |
| NFSE-18 | P2 Import/Export | Execute | Verified |
| NFSE-19 | P2 Import/Export | Execute | Verified |

**Cobertura:** 19 total, 19 mapeados em tasks (ver `tasks.md` § Cobertura) e verificados por testes nomeados com o ID + T14 no portal.

---

## Critérios de Sucesso

- [ ] `npm test` e `npm run typecheck` verdes.
- [ ] Uma nota real do dev preenchida pela extensão até a Conferência e emitida manualmente com os dados corretos.

---

## Notas Técnicas

- Seletores e ordem de habilitação: `docs/mapeamento-portal.md`.
- Cada Avançar navega; o pedido de preenchimento vive em `chrome.storage.session` com id da aba e timestamp.
- Chosen/Select2 exigem o jQuery da página → script executado no mundo `MAIN`.
- Permissões: `storage`, `tabs`, `sidePanel` (sem `scripting`: os content scripts são declarados); host `https://www.nfse.gov.br/EmissorNacional/*`.
- Scopes de commit: `popup`, `portal`, `dominio`, `armazenamento`, `build`, `docs`.

---

## Self-Review

- [x] Placeholder scan — sem TBD/TODO/seções vazias
- [x] Consistência interna — regras de modelo válido unificadas para salvar e importar
- [x] Scope check — focada em um plano único
- [x] Ambiguity check — URL, formato numérico, etapa esperada e detecção de erro após Avançar definidos
- [x] YAGNI — descrição/município nos padrões mantidos conscientemente (baratos, dentro da definição de Padrões)

**Reviewer:** `spec-document-reviewer` subagent (Large) — Approved com 7 recomendações; 6 aplicadas.
**Status:** Approved
**Data:** 2026-11-09
