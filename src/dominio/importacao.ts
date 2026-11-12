import type { ArquivoExportado, Modelo, Padroes } from './tipos';
import { dataISO } from './formatos';
import { CAMPOS_MODELO, CAMPOS_PADROES, resumirErros, validarModelo, validarPadroes } from './validacao';

type ResultadoImportacao =
  | { ok: true; padroes?: Padroes; novos: Modelo[]; conflitos: Modelo[] }
  | { ok: false; erro: string };

export function exportar(padroes: Padroes, modelos: Modelo[]): ArquivoExportado {
  return { versao: 1, padroes, modelos };
}

/** `nfse-modelos-AAAA-MM-DD.json` com a data local. */
export function nomeArquivoExportacao(data: Date): string {
  return `nfse-modelos-${dataISO(data)}.json`;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Copia só as chaves conhecidas; `null` conta como ausente. Descarta o resto do JSON. */
function apenas<T>(obj: Record<string, unknown>, chaves: readonly string[]): T {
  return Object.fromEntries(chaves.filter((c) => obj[c] != null).map((c) => [c, obj[c]])) as T;
}

const falha = (erro: string): ResultadoImportacao => ({ ok: false, erro });

/**
 * NFSE-18/19: valida o arquivo inteiro antes de qualquer alteração. Qualquer
 * problema rejeita tudo; senão separa modelos novos dos que repetem apelido.
 */
export function analisarImportacao(texto: string, modelosAtuais: Modelo[]): ResultadoImportacao {
  let conteudo: unknown;
  try {
    conteudo = JSON.parse(texto);
  } catch {
    return falha('Arquivo não é JSON');
  }

  if (!ehObjeto(conteudo) || conteudo.versao !== 1) {
    return falha('Versão do arquivo não suportada (esperada: 1)');
  }
  if (!Array.isArray(conteudo.modelos)) return falha('Arquivo sem a lista de modelos');

  let padroes: Padroes | undefined;
  if (conteudo.padroes !== undefined) {
    if (!ehObjeto(conteudo.padroes)) return falha('Padrões inválidos');
    padroes = apenas<Padroes>(conteudo.padroes, CAMPOS_PADROES);
    const erros = validarPadroes(padroes);
    if (erros.length) return falha(`Padrões inválidos: ${resumirErros(erros)}`);
  }

  const modelos: Modelo[] = [];
  const apelidos = new Set<string>();
  for (const [i, bruto] of conteudo.modelos.entries()) {
    const posicao = `Modelo nº ${i + 1}`;
    if (!ehObjeto(bruto)) return falha(`${posicao} inválido`);
    const modelo = apenas<Modelo>(bruto, CAMPOS_MODELO);
    const erros = validarModelo(modelo);
    if (erros.length) return falha(`${posicao} ("${String(modelo.apelido)}"): ${resumirErros(erros)}`);
    if (apelidos.has(modelo.apelido)) return falha(`Apelido repetido no arquivo: "${modelo.apelido}"`);
    apelidos.add(modelo.apelido);
    modelos.push(modelo);
  }

  const existentes = new Set(modelosAtuais.map((m) => m.apelido));
  return {
    ok: true,
    padroes,
    novos: modelos.filter((m) => !existentes.has(m.apelido)),
    conflitos: modelos.filter((m) => existentes.has(m.apelido)),
  };
}

/**
 * NFSE-18: soma os `novos` aos `atuais` e troca os atuais pelos `substitutos`
 * (conflitos que o usuário mandou substituir), mantendo a ordem dos atuais.
 */
export function mesclarModelos(
  atuais: readonly Modelo[],
  novos: readonly Modelo[],
  substitutos: readonly Modelo[],
): Modelo[] {
  const porApelido = new Map(substitutos.map((m) => [m.apelido, m]));
  return [...atuais.map((m) => porApelido.get(m.apelido) ?? m), ...novos];
}
