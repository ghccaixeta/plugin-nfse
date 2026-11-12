# Contexto — Preenchedor v1

Decisões tomadas na sessão de grilling de 2026-11-09 (uma pergunta por vez) e no mapeamento do portal.

## Abordagem aprovada

Extensão Chrome MV3 que só preenche. Login manual; clique em "Emitir NFS-e" sempre manual. Sem servidor.
Alternativas descartadas: API Sefin Nacional (exige XML assinado + mTLS com A1), gateways pagos.

## Decisões

| # | Decisão |
|---|---|
| Público | Qualquer pessoa pode usar. Sem perfis: um conjunto de padrões e modelos vale para qualquer CNPJ logado. |
| Popup | Sempre mostra todos os campos editáveis, pré-preenchidos (padrões ou modelo). Edição vale só para a nota atual. |
| Modelo | Guarda tudo: tomador (CNPJ, apelido, e-mail, telefone), valor, descrição, município da prestação, código de tributação, NBS. |
| Padrões | Editáveis. Valores iniciais: código 010101, NBS 115029000, regime "federais e municipal pelo Simples Nacional", alíquota 2,01. Sem tela obrigatória de primeiro uso. |
| Alíquota | Visível no popup com o valor padrão; editável. |
| Tomador | Só CNPJ (Brasil). Nome vem da busca do portal. Endereço não informado. |
| Município da prestação | No modelo; padrão = município do emitente (lido do portal na etapa Pessoas). |
| Data de competência | Padrão hoje, editável no popup. |
| Código complementar municipal | Não guardado. Se o portal exigir, parar na etapa Serviço e pedir seleção manual. |
| Campos fixos invisíveis | IBS/CBS = Não; Prestador; intermediário não informado; imunidade/exportação = Não; retenção ISSQN = Não; PIS/COFINS 00 - Nenhum; Não Retidos; valor aproximado = alíquota do Simples. |
| Fluxo | Funciona só a partir da etapa Pessoas; fora dela o popup oferece botão que abre a emissão. Preenche e avança Pessoas → Serviço → Valores e para na Conferência. Sobrescreve campos já digitados. |
| Falha | Para na etapa e mostra o campo que falhou. Sem canal de report. |
| Lote | Uma nota por vez. |
| Import/Export | JSON com modelos + padrões. Import soma modelos; apelido igual → pergunta se substitui; importar padrões é opcional. |
| Stack | TypeScript + Vite. |
| Distribuição | Web Store não listada, conta pessoal do dev, repo privado no GitHub pessoal, nome neutro sem marca Nano, aviso "não oficial". |
| Volume | Baixo (<20 notas/mês, <10 tomadores): lista simples de modelos, sem busca/histórico. |

## Achados do mapeamento (docs/mapeamento-portal.md)

- Pergunta IBS/CBS bloqueia a etapa Pessoas até ser respondida.
- Retenção ISSQN é obrigatória, vem desmarcada e só habilita após digitar o valor.
- Município e código de tributação são Select2 com busca AJAX e correspondência parcial; casar texto exato.
- Chosen/Select2 dependem do jQuery da página → script no mundo MAIN.
- Cada "Avançar" navega para outra URL (estado precisa sobreviver entre páginas).
- O portal tem Serviços Favoritos/Emissão Simplificada; não substitui a extensão (tomador/valor/fluxo).
