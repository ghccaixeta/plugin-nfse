# Suporte a MEI — Especificação

## Problema

A extensão só sabe emitir como ME/EPP do Simples Nacional: sempre seleciona o regime de apuração (Pessoas) e preenche retenção do ISSQN, PIS/COFINS e alíquota do Simples (Valores). Para emitente MEI, o portal esconde o regime e, segundo o dev, em Valores só pede o valor do serviço — o preenchimento atual para com erro. O painel também exige regime e alíquota, que não se aplicam a MEI.

## Objetivos

- [ ] Emitente MEI chega à Conferência com o mesmo clique em "Preencher".
- [ ] Fluxo ME/EPP inalterado.
- [ ] Se a opção do painel não bater com o emitente do portal, parar com aviso claro em vez de preencher errado.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Emitente não optante do Simples (opção 1) | Ninguém pediu; continua tratado como hoje (erro na etapa). |
| Fixture HTML de emissão MEI | Dev não tem acesso a emitente MEI agora; testes com fakes. Ver "Riscos". |
| Detectar MEI sem opção no painel | Decisão do dev: a escolha fica visível no painel; o portal só confere. |

---

## Critérios de Aceite

### P1: Opção MEI no painel ⭐ MVP

1. **MEI-01** QUANDO o painel abre ENTÃO o card "Simples Nacional" DEVE ter o campo "Enquadramento" com as opções "ME/EPP" e "MEI", vindo dos Padrões (padrão: ME/EPP para quem já usa a extensão).
2. **MEI-02** QUANDO "MEI" está escolhido ENTÃO o painel DEVE esconder "Regime de apuração" e "Alíquota", e "Preencher" NÃO DEVE exigir esses campos.
3. **MEI-03** QUANDO "ME/EPP" está escolhido ENTÃO regime e alíquota DEVEM continuar visíveis e obrigatórios (NFSE-03 inalterado).
4. **MEI-04** QUANDO o usuário salva os Padrões ENTÃO o enquadramento DEVE ser salvo junto, e exportar/importar padrões DEVE incluí-lo. Padrões antigos sem o campo DEVEM ser lidos como ME/EPP.

### P1: Preenchimento MEI ⭐ MVP

5. **MEI-05** QUANDO o preenchimento roda em Pessoas com MEI ENTÃO a extensão NÃO DEVE selecionar o regime; o resto da etapa segue igual (NFSE-04).
6. **MEI-06** QUANDO Pessoas termina de carregar o emitente ENTÃO a extensão DEVE ler `SimplesNacional.Opcao` do portal e, se não bater com o painel (MEI ↔ `2`, ME/EPP ↔ `3`), parar com o aviso "Enquadramento do painel é <Y>, mas o emitente no portal é <X>. Ajuste e preencha de novo." sem clicar em Avançar. Opção do portal vazia/desconhecida não bloqueia.
7. **MEI-07** QUANDO o preenchimento roda em Valores com MEI ENTÃO a extensão DEVE só digitar o valor do serviço e avançar.
8. **MEI-08** QUANDO o preenchimento roda com ME/EPP ENTÃO Pessoas e Valores DEVEM fazer exatamente o que fazem hoje (NFSE-04, NFSE-06).

---

## Design (inline — Medium)

- **Domínio:** `type Enquadramento = 'meepp' | 'mei'`. `Padroes.enquadramento` e `DadosNota.enquadramento`; em `DadosNota`, `regime`/`aliquotaCentesimos` só são validados quando não é MEI (`validarNota`); nos Padrões continuam validados (os campos escondidos mantêm os valores salvos). Leitura de padrões antigos completa `enquadramento: 'meepp'`.
- **Painel:** `<select id="enquadramento">` no card "Simples Nacional"; mudar o valor alterna `hidden` dos campos regime/alíquota. Entra em `Formulario`/`CAMPOS`.
- **Portal:** seletor novo `PESSOAS.opcaoSimples` (`#SimplesNacional_Opcao`, hidden) e `OPCAO_SIMPLES`/`NOME_OPCAO_SIMPLES` em `seletores.ts`. `executarPessoas` pula o regime quando MEI e confere a opção depois de esperar o município do emitente (o emitente já carregou). `executarValores` retorna logo após o valor quando MEI.
- **Erro de enquadramento:** mesmo caminho de erro de etapa que já mostra o banner no portal (NFSE-08).

## Riscos

- O valor `2` = MEI vem da tabela `opSimpNac` do leiaute nacional da DPS (1 não optante, 2 MEI, 3 ME/EPP), **não foi visto no portal com emitente MEI**. A conferência do MEI-06 é justamente a rede de segurança: se estiver errado, o usuário vê o aviso em vez de uma nota errada.
- Campos da etapa Valores para MEI vêm do relato do dev ("só o valor"). Se o portal exigir mais algum campo para MEI, o Avançar é recusado e a extensão já reporta isso (detecção de "portal recusou o Avançar").

## Rastreabilidade

| ID | Teste |
|---|---|
| MEI-01..03 | `tests/popup/formulario.test.ts` (lógica); alternância de campos em `popup.ts` verificada manualmente |
| MEI-04 | `tests/armazenamento/`, `tests/dominio/` (validação e importação) |
| MEI-05, MEI-06, MEI-08 | `tests/portal/` etapa Pessoas com `Acoes` falsas |
| MEI-07, MEI-08 | `tests/portal/` etapa Valores com `Acoes` falsas |
