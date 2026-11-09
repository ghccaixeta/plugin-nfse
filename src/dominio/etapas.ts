import type { Etapa } from './tipos';

/** Host do Emissor Nacional (também em `manifest.json`). */
export const HOST = 'www.nfse.gov.br';
const PREFIXO = '/emissornacional/dps/';

/** NFSE-02: página onde o preenchimento começa. */
export const URL_PESSOAS = `https://${HOST}/EmissorNacional/DPS/Pessoas`;

/** Último segmento do caminho (minúsculo) → etapa. `Tributacao` é a etapa Valores. */
const ETAPA_POR_PAGINA = new Map<string, Etapa>([
  ['pessoas', 'pessoas'],
  ['servico', 'servico'],
  ['tributacao', 'valores'],
  ['emitirnfse', 'conferencia'],
]);

/** Nome da etapa nos avisos (NFSE-08: "Etapa Serviço: ..."). */
export const NOME_ETAPA: Record<Etapa, string> = {
  pessoas: 'Pessoas',
  servico: 'Serviço',
  valores: 'Valores',
  conferencia: 'Conferência',
};

const ORDEM: readonly Etapa[] = ['pessoas', 'servico', 'valores', 'conferencia'];

/** Caminho (minúsculo, sem barra final) de uma página da emissão; senão `null`. */
function caminhoDaEmissao(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.hostname !== HOST) return null;
  const caminho = u.pathname.toLowerCase().replace(/\/+$/, '');
  return caminho.startsWith(PREFIXO) ? caminho : null;
}

/** A URL ainda está nas páginas de emissão (`/EmissorNacional/DPS/...`)? */
export function dentroDaEmissao(url: string): boolean {
  return caminhoDaEmissao(url) !== null;
}

/** Etapa da emissão pela URL (ignora query e hash). Fora do portal → `null`. */
export function etapaDaUrl(url: string): Etapa | null {
  const caminho = caminhoDaEmissao(url);
  return caminho === null ? null : (ETAPA_POR_PAGINA.get(caminho.slice(PREFIXO.length)) ?? null);
}

export function proximaEtapa(etapa: Etapa): Etapa | null {
  return ORDEM[ORDEM.indexOf(etapa) + 1] ?? null;
}

export function etapaAnterior(etapa: Etapa): Etapa | null {
  return ORDEM[ORDEM.indexOf(etapa) - 1] ?? null;
}

/** Aviso no formato da spec (NFSE-08): "Etapa Serviço: <texto>". */
export const avisoDaEtapa = (etapa: Etapa, texto: string) => `Etapa ${NOME_ETAPA[etapa]}: ${texto}`;
