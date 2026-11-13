# Mapeamento do Emissor Nacional (portal v1.6.0.0, 09/11/2026)

Fluxo mapeado com Playwright até a tela de conferência, **sem emitir**. HTML de cada etapa em `fixtures-raw/`
(contém dados reais do emitente e do tomador; anonimizar antes de virar fixture de teste).

## Notas gerais

- Componentes: jQuery + **Chosen** (selects estáticos) + **Select2 com busca AJAX** (município, código de tributação).
  O content script roda em mundo isolado e não enxerga o `jQuery` da página. Para disparar `chosen:updated`/`change`
  é preciso injetar código no mundo `MAIN` (`chrome.scripting.executeScript({ world: 'MAIN' })`) ou simular a UI.
- Radios são customizados (`<label><input type=radio>texto<span class="cr">`): o input fica invisível, então
  clique em `input.closest('label')`.
- Campos com máscara (data, CNPJ, valor) precisam de digitação tecla a tecla + `blur` (Tab); `value=` direto não
  dispara as máscaras nem a lógica da página.
- O portal **salva rascunho automaticamente** a cada "Avançar" e a home não oferece botão de excluir rascunho.
- Botão Avançar: `#btnAvancar` só na etapa Pessoas; nas demais é `button.btn-primary` com texto "Avançar" (sem id).
- Erros de validação: `.field-validation-error[data-valmsg-for="<name>"]` com texto "Campo obrigatório".
- Sessão expira em 20 min (`Tempo restante da sessão`).
- O portal tem **Serviços Favoritos** (até 10, `/Perfil/ServicosFavoritos`) e "Emissão Simplificada", que
  preenchem os campos de serviço. A extensão continua útil para tomador + valor + fluxo completo.

## Etapa 1 — Pessoas (`/EmissorNacional/DPS/Pessoas`)

Ordem importa: até responder IBS/CBS, todos os campos ficam desabilitados.

| Passo | Campo | Seletor | Ação |
|---|---|---|---|
| 1 | Preencher IBS/CBS? | `input[name="PreencherInfoIBSCBS"][value="0"]` | Não (fixo) |
| 2 | Data de competência | `#DataCompetencia` | digitar `ddmmaaaa` + Tab → carrega emitente |
| — | Emitir como | `input[name="TipoEmitente"][value="1"]` | já vem Prestador (conferir) |
| 3 | Regime apuração SN | `#SimplesNacional_RegimeApuracaoTributosSN` (Chosen) | `1` = federais e municipal pelo SN; `2`, `3` |
| — | Compra governamental / Destinatário | `EhCompraGovernamental`, `DestinatarioEhOAdquirente` | ficam desabilitados com IBS/CBS = Não |
| — | Tomador local | `input[name="Tomador.LocalDomicilio"][value="1"]` | Brasil (padrão) |
| 3b | Município do emitente (leitura) | `#Prestador_EnderecoNacional_NomeMunicipio` (hidden) | já vem no formato `Nome/UF` (ex.: `Goianésia/GO`); usar como município da prestação quando vazio |
| 4 | CNPJ tomador | `#Tomador_Inscricao` | digitar só dígitos |
| 5 | Buscar | `#btn_Tomador_Inscricao_pesquisar` | preenche `#Tomador_Nome` (readonly) |
| — | Telefone / E-mail | `#Tomador_Telefone`, `#Tomador_Email` | opcionais |
| — | Intermediário | `input[name="Intermediario.LocalDomicilio"][value="0"]` | não informado (padrão) |
| 6 | Avançar | `#btnAvancar` | → `/DPS/Servico?idr=…` |

Ao lado da busca há `#btn_Tomador_Inscricao_historico` (histórico de tomadores do portal).

## Etapa 2 — Serviço (`/EmissorNacional/DPS/Servico?idr=…`)

| Passo | Campo | Seletor | Ação |
|---|---|---|---|
| — | País | `#LocalPrestacao_CodigoPaisPrestacao` | já vem `BR` |
| 1 | Município da prestação | `#LocalPrestacao_CodigoMunicipioPrestacao` (Select2 AJAX) | abrir `+ .select2`, digitar nome em `.select2-container--open .select2-search__field`, clicar `.select2-results__option` com texto **exato** `Cidade/UF` (busca "Goianésia" também traz "Goianésia do Pará/PA"). Valor = código IBGE. **Não vem pré-preenchido.** |
| 2 | Código de tributação nacional | `#ServicoPrestado_CodigoTributacaoNacional` (Select2 AJAX, desabilitado até o município) | digitar `010101` → opção `01.01.01 - Análise e desenvolvimento de sistemas.` Valor salvo `01.01.01` |
| — | Código complementar municipal | `#ServicoPrestado_CodigoComplementarMunicipal`; flag `[name="ServicoPrestado.CodigoComplementarMunicipalObrigatorio"]` | Goianésia: `False`, oculto. Se `True` → parar e pedir ao usuário |
| 3 | Imunidade/exportação/não incidência | `input[name="ServicoPrestado.HaExportacaoImunidadeNaoIncidencia"][value="0"]` (clicar label) | Não; habilita descrição e NBS |
| 4 | Descrição | `#ServicoPrestado_Descricao` | texto (máx. 2000) |
| 5 | NBS | `#ServicoPrestado_CodigoNBS` (Chosen, ~918 opções estáticas) | `val('115029000')` + `chosen:updated` + `change` |
| — | Indicador da operação | `#ServicoPrestado_CodigoIndOp` | vazio com IBS/CBS = Não; não exigido |
| 6 | Avançar | `button.btn-primary` com texto "Avançar" | → `/DPS/Tributacao?idr=…` |

## Etapa 3 — Valores (`/EmissorNacional/DPS/Tributacao?idr=…`)

| Passo | Campo | Seletor | Ação |
|---|---|---|---|
| 1 | Valor do serviço | `#Valores_ValorServico` | digitar centavos (`1000` → `10,00`) + Tab; **habilita** os radios de retenção |
| 2 | Retenção ISSQN | `input[name="ISSQN.HaRetencao"][value="0"]` (label) | Não — **obrigatório**, vem desmarcado |
| — | Tributação ISSQN / Regime especial / Suspensão / Benefício | `#ISSQN_*` | travados pelo SN, já vêm corretos |
| 3 | Situação PIS/COFINS | `#TributacaoFederal_PISCofins_SituacaoTributaria` (Chosen) | `0` = 00 - Nenhum |
| 4 | Retenção PIS/COFINS/CSLL | `#TributacaoFederal_PISCofins_TipoRetencao` (Chosen) | `0` = Não Retidos |
| 5 | Valor aproximado dos tributos | `input[name="ValorTributos.TipoValorTributos"][value="4"]` (label) | Informar alíquota do SN (o portal lembra a última escolha) |
| 6 | Alíquota SN | `#ValorTributos_AliquotaSN` | limpar + digitar `201` → `2,01` (portal lembra o último valor) |
| 7 | Avançar | `button.btn-primary` com texto "Avançar" | → `/DPS/EmitirNFSe?idr=…` |

## Etapa 4 — Conferência (`/EmissorNacional/DPS/EmitirNFSe?idr=…`)

Resumo + prévia de valores. Botão final `#btnProsseguir` ("Emitir NFS-e") — **a extensão nunca clica**.
Detectar chegada pela URL `/DPS/EmitirNFSe` ou pela presença de `#btnProsseguir`.

## Spike T8 — primitivas validadas no portal real (09/11/2026)

`src/portal/acoes.ts` + `seletores.ts` compilados como IIFE e injetados com `page.addScriptTag` (mundo MAIN),
percorrendo Pessoas → Serviço → Valores → Conferência sem emitir. Todas as primitivas funcionaram:

| Primitiva | Onde | Resultado lido do campo |
|---|---|---|
| `marcarRadio` (clique no label) | IBS/CBS, intermediário, imunidade, retenção ISSQN, tipo de tributos 4 | marcado |
| `digitarMascarado` | data `09112026` → `09/11/2026` (carrega emitente); CNPJ → `NN.NNN.NNN/NNNN-NN`; valor `123456` → `1.234,56`; alíquota `350` → `3,50` e de volta `201` → `2,01` | sobrescreve o valor anterior |
| `clicar` + `esperar(..., 'preenchido')` | Buscar tomador → `#Tomador_Nome` | nome carregado |
| `selecionarChosen` | regime `1`, NBS `115029000`, PIS/COFINS `0`/`0` | valor e texto do Chosen atualizados |
| `selecionarSelect2Ajax` | município `Goianésia` exato `Goianésia/GO` (código IBGE 5208608); código `010101` prefixo `01.01.01 - ` | opção certa, dropdown fechado |
| `clicarAvancar` | Pessoas (`#btnAvancar`), Serviço e Valores (`button.btn-primary`) | navegou; na Conferência `encontrarAvancar` → `null` |

Descobertas:

- **Máscara = VMasker** (vanilla-masker), não `jquery.mask` (`jQuery.fn.mask` não existe). Ela formata num
  `setTimeout(0)` após o `keyup`. O `change` da data valida o valor na hora: sem ceder o event loop entre as teclas,
  o portal recebia `09112026`, considerava a data inválida e não carregava o emitente. Corrigido em `digitarMascarado`
  (cede um ciclo após cada tecla) com teste de regressão.
- `#DataCompetencia` também tem bootstrap-datepicker (handlers jQuery de keyup/keydown/blur); não atrapalha.
- A flag `ServicoPrestado.CodigoComplementarMunicipalObrigatorio` vem `False` no carregamento e vira `false` depois
  de escolher o código — comparar sem diferenciar maiúsculas.
- Select2 v4 aceita a seleção por `mousedown`/`mouseup`/`click` sintéticos na opção.

## Foco e consulta do CNPJ (T14, 09/11/2026)

- A consulta do tomador roda no `focusout` de `.cpfcnpj-alfanumerico` (`#Tomador_Inscricao`), não só na lupa. Ela é
  ignorada sem aviso se o campo estiver desabilitado/readonly ou se o CNPJ for igual à última consulta
  (`window.UltConsCNC_Inscricao`) no mesmo painel. Falha da API ou CNPJ inexistente → alerta "não foi encontrada".
- O portal usa jQuery 3.3.1, que simula `focusout` a partir de `blur` (captura no `document`).
- Com o documento sem foco (clique no painel lateral da extensão), `blur()` não dispara eventos; a extensão dispara
  `blur`/`focusout` sintéticos nesse caso (`src/portal/acoes.ts`).
- O campo do CNPJ já aceita CNPJ alfanumérico (classe `cpfcnpj-alfanumerico`, `AplicarMascaraCpfCnpjAlfanumerico`).
- `RecuperarOpcaoSN`: se a opção do Simples do emitente não for "3", o portal esconde e limpa o regime de apuração.
- `#SimplesNacional_Opcao` (hidden, Pessoas) traz a opção do emitente depois que ele carrega. Visto no portal: `3` (ME/EPP).
  `2` = MEI e `1` = não optante vêm da tabela `opSimpNac` do leiaute da DPS, **ainda não vistos no portal**. A extensão
  confere essa opção contra o Enquadramento do painel (MEI-06). Valores para MEI (só o valor do serviço) vem de relato do
  usuário, sem fixture.

## Momento de agir (T14, 09/11/2026)

- O Pessoas/Serviço/Valores só ficam utilizáveis depois do `$(document).ready` do portal (registra os handlers de IBS/CBS
  e data) e da inicialização do Select2/Chosen. Um content script em `document_idle` pode rodar antes disso.
- Select2 inicializado = `<select>` com a classe `select2-hidden-accessible`; antes, `select2('open')` lança TypeError.
- A extensão espera o `load` da página antes de preencher; validado sem foco do documento até a Conferência.
