import { cnpjValido } from './documentos';
import { nomeDoMunicipio } from './formatos';

export { cnpjValido };
import type { DadosNota, Modelo, Padroes } from './tipos';

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

/** Mensagens dos erros numa linha (importação, repositório). */
export const resumirErros = (erros: ErroCampo[]) => erros.map((e) => e.mensagem).join('; ');

// Regras de NFSE-03, compartilhadas por nota, modelo e padrões (NFSE-10, 16, 19).
// Recebem `unknown` porque também validam JSON importado, com tipos arbitrários.

function dataValida(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

const vazio = (v: unknown) => v === undefined || v === null || v === '';
const textoCom = (re: RegExp) => (v: unknown) => typeof v === 'string' && re.test(v);
const inteiroEntre = (min: number, max: number) => (v: unknown) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const descricaoValida = (v: unknown) =>
  typeof v === 'string' && v.trim().length >= 1 && v.length <= 2000;

const REGRAS = {
  apelido: [
    (v: unknown) => typeof v === 'string' && v.trim() !== '' && v.length <= 60,
    'Informe um apelido de até 60 caracteres',
  ],
  cnpjTomador: [cnpjValido, 'CNPJ inválido'],
  emailTomador: [textoCom(/^[^\s@]+@[^\s@]+$/), 'E-mail inválido'],
  telefoneTomador: [textoCom(/^\d{10,11}$/), 'Telefone deve ter DDD e número (10 ou 11 dígitos)'],
  valorCentavos: [inteiroEntre(1, Number.MAX_SAFE_INTEGER), 'Informe um valor maior que zero'],
  descricao: [descricaoValida, 'Descrição deve ter de 1 a 2000 caracteres'],
  dataCompetencia: [dataValida, 'Data inválida (dd/mm/aaaa)'],
  municipio: [(v: unknown) => typeof v === 'string' && nomeDoMunicipio(v) !== undefined, 'Município deve estar no formato Nome/UF'],
  codigoTributacao: [textoCom(/^\d{6}$/), 'Código de tributação deve ter 6 dígitos'],
  nbs: [textoCom(/^\d{9}$/), 'NBS deve ter 9 dígitos'],
  enquadramento: [(v: unknown) => v === 'meepp' || v === 'mei', 'Enquadramento inválido'],
  regime: [(v: unknown) => v === 1 || v === 2 || v === 3, 'Regime de apuração inválido'],
  aliquotaCentesimos: [inteiroEntre(1, 9999), 'Alíquota deve estar entre 0,01 e 99,99'],
} as const satisfies Record<string, readonly [(v: unknown) => boolean, string]>;

type Campo = keyof typeof REGRAS;

/** Valida `campos` na ordem dada; os listados em `opcionais` podem estar vazios. */
function validar(obj: object, campos: readonly Campo[], opcionais: readonly Campo[]): ErroCampo[] {
  const valores = obj as Record<string, unknown>;
  return campos.flatMap((campo) => {
    const valor = valores[campo];
    if (opcionais.includes(campo) && vazio(valor)) return [];
    const [regra, mensagem] = REGRAS[campo];
    return regra(valor) ? [] : [{ campo, mensagem }];
  });
}

/** MEI-02: MEI não usa regime nem alíquota do Simples. */
const SO_ME_EPP: readonly Campo[] = ['regime', 'aliquotaCentesimos'];

const CAMPOS_NOTA: readonly Campo[] = [
  'cnpjTomador',
  'emailTomador',
  'telefoneTomador',
  'valorCentavos',
  'descricao',
  'dataCompetencia',
  'municipio',
  'codigoTributacao',
  'nbs',
  'enquadramento',
  'regime',
  'aliquotaCentesimos',
];
const CAMPOS_NOTA_MEI = CAMPOS_NOTA.filter((c) => !SO_ME_EPP.includes(c));

export function validarNota(nota: DadosNota): ErroCampo[] {
  return validar(nota, nota.enquadramento === 'mei' ? CAMPOS_NOTA_MEI : CAMPOS_NOTA, [
    'emailTomador',
    'telefoneTomador',
    'municipio',
  ]);
}

/** Campos de um Modelo, na ordem das mensagens (também as chaves aceitas na importação). */
export const CAMPOS_MODELO = [
  'apelido',
  'cnpjTomador',
  'emailTomador',
  'telefoneTomador',
  'valorCentavos',
  'descricao',
  'municipio',
  'codigoTributacao',
  'nbs',
] as const satisfies readonly (keyof Modelo & Campo)[];

/** Campos dos Padrões, na ordem das mensagens (também as chaves aceitas na importação). */
export const CAMPOS_PADROES = [
  'descricao',
  'municipio',
  'codigoTributacao',
  'nbs',
  'enquadramento',
  'regime',
  'aliquotaCentesimos',
] as const satisfies readonly (keyof Padroes & Campo)[];

export function validarModelo(modelo: Modelo): ErroCampo[] {
  return validar(modelo, CAMPOS_MODELO, ['emailTomador', 'telefoneTomador', 'valorCentavos', 'descricao', 'municipio']);
}

export function validarPadroes(padroes: Padroes): ErroCampo[] {
  return validar(padroes, CAMPOS_PADROES, ['descricao', 'municipio', 'enquadramento']);
}
