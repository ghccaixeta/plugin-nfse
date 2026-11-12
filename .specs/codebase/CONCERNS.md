# Riscos

- **Fragilidade a mudanças do portal** (alta): seletores, ordem de habilitação de campos e componentes JS podem mudar sem aviso. Mitigação: seletores centralizados, testes com fixtures (inclusive containers Chosen/Select2), mensagem de erro com o campo que falhou.
- **Momento de agir**: o content script pode rodar antes de o portal terminar o `$(document).ready` e inicializar Chosen/Select2. Mitigação: esperar o `load` e a inicialização de cada widget.
- **Foco**: com o painel lateral, o documento do portal fica sem foco e o Chrome não dispara eventos de foco; a consulta do CNPJ depende do `focusout`. Mitigação: eventos sintéticos em `mudarFoco`.
- **Recarga de página entre etapas**: cada "Avançar" é um POST que navega; o progresso vive no SW (`chrome.storage.session`).
- **Buscas AJAX (Select2)**: dependem de rede e retornam correspondências parciais (casamento exato/prefixo).
- **Sem homologação**: testes ponta a ponta só no portal de produção, gerando rascunhos que a home não deixa excluir.
- **Reforma tributária (IBS/CBS)**: a resposta fixa "Não" pode deixar de ser aceita.
- **CNPJ alfanumérico**: o portal já aceita (classe `cpfcnpj-alfanumerico`); a validação da extensão ainda exige 14 dígitos (decisão pendente).
- **Regime de apuração**: se a opção do Simples do emitente não for "3", o portal esconde e limpa o campo de regime.
- **Ciclo de vida do pedido** (lacuna da auditoria): Preencher de novo sobrescreve pedido em andamento; voltar/avançar do navegador e bfcache não foram analisados.
- **Dados reais no repositório**: capturas em `fixtures-raw/` (ignorado). `npm test` roda `scripts/verificar-vazamento.mjs`.
