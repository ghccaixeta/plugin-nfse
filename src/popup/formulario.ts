// Lógica pura do popup. O formulário guarda o texto dos campos (como o usuário
// vê); `lerNota` converte para `DadosNota` e valida (NFSE-03).
import { apenasDigitos, formatarCentavosBR, hojeBR, parseAliquotaBR, parseMoedaBR } from '../dominio/formatos';
import type { DadosNota, Modelo, Padroes, Regime } from '../dominio/tipos';
import { validarNota, type ErroCampo } from '../dominio/validacao';

/** Texto de cada campo do popup; as chaves são também os ids dos inputs. */
export interface Formulario {
  cnpjTomador: string;
  emailTomador: string;
  telefoneTomador: string;
  valor: string; // '1.234,56'
  descricao: string;
  dataCompetencia: string; // dd/mm/aaaa
  municipio: string; // 'Nome/UF' ou vazio
  codigoTributacao: string;
  nbs: string;
  regime: string; // '1' | '2' | '3'
  aliquota: string; // '2,01'
}

export type CampoFormulario = keyof Formulario;

/** Campos do formulário, na ordem da tela; são também os ids dos inputs. */
export const CAMPOS = [
  'cnpjTomador',
  'emailTomador',
  'telefoneTomador',
  'valor',
  'descricao',
  'dataCompetencia',
  'municipio',
  'codigoTributacao',
  'nbs',
  'regime',
  'aliquota',
] as const satisfies readonly CampoFormulario[];

// Garante em compilação que CAMPOS cobre todos os campos de Formulario.
const _camposCompletos: Exclude<CampoFormulario, (typeof CAMPOS)[number]> extends never ? true : never = true;
void _camposCompletos;

export type LeituraNota = { ok: true; nota: DadosNota } | { ok: false; erros: ErroCampo[] };

/** Campo de `DadosNota` → campo do formulário onde o erro aparece. */
const CAMPO_DO_FORMULARIO: Partial<Record<keyof DadosNota, CampoFormulario>> = {
  valorCentavos: 'valor',
  aliquotaCentesimos: 'aliquota',
};

/** Campo de nota/modelo/padrões (como a validação nomeia) → id do campo no popup. */
export function campoDoFormulario(campo: string): CampoFormulario | null {
  const mapeado = Object.hasOwn(CAMPO_DO_FORMULARIO, campo) ? CAMPO_DO_FORMULARIO[campo as keyof DadosNota]! : campo;
  return (CAMPOS as readonly string[]).includes(mapeado) ? (mapeado as CampoFormulario) : null;
}

const MENSAGEM_ILEGIVEL: Partial<Record<CampoFormulario, string>> = {
  valor: 'Valor inválido (ex.: 1.234,56)',
  aliquota: 'Alíquota inválida (ex.: 2,01)',
};


const ouVazio = (texto: string | undefined) => texto ?? '';
const semVazio = (texto: string) => texto.trim() || undefined;
/** Texto → centavos; vazio → undefined; ilegível → NaN (a validação rejeita). */
const numeroBR = (texto: string, parse: (t: string) => number | null) =>
  texto.trim() ? (parse(texto) ?? Number.NaN) : undefined;

/** NFSE-01/15: formulário inicial, sem modelo, com a data de hoje. */
export function formularioDePadroes(padroes: Padroes, hoje: Date): Formulario {
  return {
    cnpjTomador: '',
    emailTomador: '',
    telefoneTomador: '',
    valor: '',
    descricao: ouVazio(padroes.descricao),
    dataCompetencia: hojeBR(hoje),
    municipio: ouVazio(padroes.municipio),
    codigoTributacao: padroes.codigoTributacao,
    nbs: padroes.nbs,
    regime: String(padroes.regime),
    aliquota: formatarCentavosBR(padroes.aliquotaCentesimos),
  };
}

/** NFSE-11: troca os campos do modelo, mantendo data, regime e alíquota. */
export function aplicarModelo(form: Formulario, modelo: Modelo): Formulario {
  return {
    ...form,
    cnpjTomador: modelo.cnpjTomador,
    emailTomador: ouVazio(modelo.emailTomador),
    telefoneTomador: ouVazio(modelo.telefoneTomador),
    valor: modelo.valorCentavos === undefined ? '' : formatarCentavosBR(modelo.valorCentavos),
    descricao: ouVazio(modelo.descricao),
    municipio: ouVazio(modelo.municipio),
    codigoTributacao: modelo.codigoTributacao,
    nbs: modelo.nbs,
  };
}

export function lerNota(form: Formulario): LeituraNota {
  const nota: DadosNota = {
    cnpjTomador: apenasDigitos(form.cnpjTomador),
    emailTomador: semVazio(form.emailTomador),
    telefoneTomador: semVazio(apenasDigitos(form.telefoneTomador)),
    valorCentavos: numeroBR(form.valor, parseMoedaBR) ?? Number.NaN,
    descricao: form.descricao.trim(),
    dataCompetencia: form.dataCompetencia.trim(),
    municipio: semVazio(form.municipio),
    codigoTributacao: form.codigoTributacao.trim(),
    nbs: form.nbs.trim(),
    regime: Number(form.regime) as Regime,
    aliquotaCentesimos: numeroBR(form.aliquota, parseAliquotaBR) ?? Number.NaN,
  };

  const erros = validarNota(nota).map(({ campo, mensagem }) => {
    const doFormulario = campoDoFormulario(campo)!;
    const ilegivel = Number.isNaN(nota[campo as keyof DadosNota]) && form[doFormulario].trim() !== '';
    return { campo: doFormulario, mensagem: (ilegivel && MENSAGEM_ILEGIVEL[doFormulario]) || mensagem };
  });
  return erros.length ? { ok: false, erros } : { ok: true, nota };
}

/** NFSE-10: tudo menos data, regime e alíquota. Validação fica com o repositório. */
export function modeloDoFormulario(form: Formulario, apelido: string): Modelo {
  return {
    apelido: apelido.trim(),
    cnpjTomador: apenasDigitos(form.cnpjTomador),
    emailTomador: semVazio(form.emailTomador),
    telefoneTomador: semVazio(apenasDigitos(form.telefoneTomador)),
    valorCentavos: numeroBR(form.valor, parseMoedaBR),
    descricao: semVazio(form.descricao),
    municipio: semVazio(form.municipio),
    codigoTributacao: form.codigoTributacao.trim(),
    nbs: form.nbs.trim(),
  };
}

/** NFSE-16. */
export function padroesDoFormulario(form: Formulario): Padroes {
  return {
    codigoTributacao: form.codigoTributacao.trim(),
    nbs: form.nbs.trim(),
    regime: Number(form.regime) as Regime,
    aliquotaCentesimos: numeroBR(form.aliquota, parseAliquotaBR) ?? Number.NaN,
    descricao: semVazio(form.descricao),
    municipio: semVazio(form.municipio),
  };
}
