// ÚNICO lugar com seletores e textos do portal (Emissor Nacional v1.6.0.0).
// Fonte: docs/mapeamento-portal.md. Só CSS válido para querySelector.
// `tests/portal/seletores.test.ts` confere cada seletor contra tests/fixtures/.

/** Campo do portal: seletor CSS + nome mostrado no aviso de erro (NFSE-08). */
export interface Campo {
  css: string;
  nome: string;
}

const radio = (name: string, valor: string, nome: string): Campo => ({
  css: `input[type="radio"][name="${name}"][value="${valor}"]`,
  nome,
});

export const PESSOAS = {
  ibsCbsNao: radio('PreencherInfoIBSCBS', '0', 'Preencher IBS/CBS'),
  dataCompetencia: { css: '#DataCompetencia', nome: 'Data de competência' },
  emitentePrestador: radio('TipoEmitente', '1', 'Emitir como Prestador'),
  regime: { css: '#SimplesNacional_RegimeApuracaoTributosSN', nome: 'Regime de apuração' }, // Chosen
  tomadorBrasil: radio('Tomador.LocalDomicilio', '1', 'Tomador no Brasil'),
  municipioEmitente: { css: '#Prestador_EnderecoNacional_NomeMunicipio', nome: 'Município do emitente' }, // hidden, 'Nome/UF'
  cnpjTomador: { css: '#Tomador_Inscricao', nome: 'CNPJ do tomador' },
  buscarTomador: { css: '#btn_Tomador_Inscricao_pesquisar', nome: 'Buscar tomador' },
  nomeTomador: { css: '#Tomador_Nome', nome: 'Nome do tomador' },
  telefoneTomador: { css: '#Tomador_Telefone', nome: 'Telefone do tomador' },
  emailTomador: { css: '#Tomador_Email', nome: 'E-mail do tomador' },
  intermediarioNaoInformado: radio('Intermediario.LocalDomicilio', '0', 'Intermediário'),
} satisfies Record<string, Campo>;

export const SERVICO = {
  municipioPrestacao: { css: '#LocalPrestacao_CodigoMunicipioPrestacao', nome: 'Município da prestação' }, // Select2 AJAX
  codigoTributacao: { css: '#ServicoPrestado_CodigoTributacaoNacional', nome: 'Código de tributação' }, // Select2 AJAX
  codigoComplementarObrigatorio: {
    css: '[name="ServicoPrestado.CodigoComplementarMunicipalObrigatorio"]', // 'True'/'False'
    nome: 'Código complementar municipal',
  },
  imunidadeNao: radio('ServicoPrestado.HaExportacaoImunidadeNaoIncidencia', '0', 'Imunidade/exportação'),
  descricao: { css: '#ServicoPrestado_Descricao', nome: 'Descrição do serviço' },
  nbs: { css: '#ServicoPrestado_CodigoNBS', nome: 'NBS' }, // Chosen
} satisfies Record<string, Campo>;

export const VALORES = {
  valorServico: { css: '#Valores_ValorServico', nome: 'Valor do serviço' },
  retencaoIssqnNao: radio('ISSQN.HaRetencao', '0', 'Retenção do ISSQN'),
  pisCofinsSituacao: { css: '#TributacaoFederal_PISCofins_SituacaoTributaria', nome: 'Situação do PIS/COFINS' }, // Chosen
  pisCofinsRetencao: { css: '#TributacaoFederal_PISCofins_TipoRetencao', nome: 'Retenção do PIS/COFINS/CSLL' }, // Chosen
  tributosAliquotaSN: radio('ValorTributos.TipoValorTributos', '4', 'Valor aproximado dos tributos'),
  aliquotaSN: { css: '#ValorTributos_AliquotaSN', nome: 'Alíquota do Simples Nacional' },
} satisfies Record<string, Campo>;

/** Valores das opções dos selects (Chosen) fixados pela spec. */
export const OPCOES = {
  pisCofinsNenhum: '0', // "00 - Nenhum"
  pisCofinsNaoRetidos: '0', // "Não Retidos"
} as const;

/** O Chosen cria, ao inicializar, um container irmão com id `<id do select>_chosen`. */
export const CHOSEN = {
  sufixoContainer: '_chosen',
} as const;

export const SELECT2 = {
  campoBusca: '.select2-container--open .select2-search__field',
  opcao: '.select2-container--open .select2-results__option',
  /** Classe que o Select2 v4 põe no <select> ao inicializar: antes disso, `select2('open')` quebra. */
  classeInicializado: 'select2-hidden-accessible',
  /** Classe da opção provisória "Buscando…" enquanto a busca AJAX não volta. */
  classeCarregando: 'loading-results',
} as const;

/** Mensagem de validação do ASP.NET exibida após Avançar (spec: casos limite). */
export const ERRO_VALIDACAO = '.field-validation-error';

const AVANCAR_PESSOAS = '#btnAvancar';
const TEXTO_AVANCAR = 'Avançar';

/**
 * Botão Avançar da etapa: `#btnAvancar` em Pessoas; nas demais um
 * `button.btn-primary` sem id, reconhecido pelo texto.
 */
export function encontrarAvancar(doc: ParentNode = document): HTMLButtonElement | null {
  return (
    doc.querySelector<HTMLButtonElement>(AVANCAR_PESSOAS) ??
    [...doc.querySelectorAll<HTMLButtonElement>('button.btn-primary')].find(
      (b) => b.textContent?.trim() === TEXTO_AVANCAR,
    ) ??
    null
  );
}
