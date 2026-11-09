/** Regime de apuração do Simples Nacional, como o portal numera as opções. */
export type Regime = 1 | 2 | 3;

export type Etapa = 'pessoas' | 'servico' | 'valores' | 'conferencia';

/** Nota atual: valores do popup no momento do clique em "Preencher". */
export interface DadosNota {
  cnpjTomador: string; // 14 dígitos
  emailTomador?: string;
  telefoneTomador?: string;
  valorCentavos: number; // > 0
  descricao: string;
  dataCompetencia: string; // dd/mm/aaaa
  municipio?: string; // 'Nome/UF'; vazio = município do emitente
  codigoTributacao: string; // 6 dígitos
  nbs: string; // 9 dígitos
  regime: Regime;
  aliquotaCentesimos: number; // 2,01 → 201
}

/** NFSE-10: o modelo não guarda data, regime nem alíquota. */
export interface Modelo {
  apelido: string;
  cnpjTomador: string;
  emailTomador?: string;
  telefoneTomador?: string;
  valorCentavos?: number;
  descricao?: string;
  municipio?: string;
  codigoTributacao: string;
  nbs: string;
}

export interface Padroes {
  codigoTributacao: string;
  nbs: string;
  regime: Regime;
  aliquotaCentesimos: number;
  descricao?: string;
  municipio?: string;
}

/** Preenchimento pendente de uma aba, guardado pelo service worker. */
export interface Pedido {
  dados: DadosNota;
  etapaEsperada: Etapa;
  /** Última atividade (criação, etapa concluída ou pausa): a validade conta daqui. */
  atualizadoEm: number;
  municipioEmitente?: string;
  /**
   * preenchendo: a etapa esperada foi (ou vai ser) entregue para preencher;
   * avancando: a anterior foi concluída e o Avançar foi clicado;
   * pausado: NFSE-09, o usuário escolhe o código complementar e avança sozinho.
   */
  fase: 'preenchendo' | 'avancando' | 'pausado';
}

export interface ArquivoExportado {
  versao: 1;
  padroes: Padroes;
  modelos: Modelo[];
}

/**
 * Resultado do preenchimento de uma etapa. As etapas não clicam em Avançar:
 * quem chama responde o resultado e então avança (design, passo 3).
 */
export type ResultadoEtapa =
  | { municipioEmitente?: string } // preenchida: quem chama avança
  | { pausa: 'codigoComplementar' }; // NFSE-09

/** O que a ponte manda o preenchedor executar (resposta do SW → evento nfse:executar). */
export interface PedidoExecucao {
  etapa: Exclude<Etapa, 'conferencia'>;
  dados: DadosNota;
  municipioEmitente?: string;
}
