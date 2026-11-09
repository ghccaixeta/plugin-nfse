// Números no formato brasileiro: ponto de milhar opcional, vírgula decimal com até 2 casas.
const NUMERO_BR = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** `'1.234,56'` → `123456` (centavos). Texto inválido → `null`. */
export function parseMoedaBR(texto: string): number | null {
  const m = NUMERO_BR.exec(texto.trim());
  if (!m) return null;
  const inteiro = Number(apenasDigitos(m[1]!));
  const decimal = Number((m[2] ?? '').padEnd(2, '0'));
  return inteiro * 100 + decimal;
}

/** `'2,01'` → `201` (centésimos de ponto percentual). Mesmo formato da moeda. */
export const parseAliquotaBR = parseMoedaBR;

/** `123456` → `'1.234,56'`. */
export function formatarCentavosBR(centavos: number): string {
  const inteiro = Math.floor(centavos / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimal = (centavos % 100).toString().padStart(2, '0');
  return `${inteiro},${decimal}`;
}

/** `'010101'` → `'01.01.01'`, como o portal exibe no início da opção. */
export function formatarCodigoTributacao(codigo: string): string {
  return apenasDigitos(codigo).match(/\d{1,2}/g)?.join('.') ?? '';
}

/** 'Goianésia/GO' → 'Goianésia'; fora do formato 'Nome/UF' → undefined. */
export function nomeDoMunicipio(municipio: string): string | undefined {
  return /^(.+)\/[A-Z]{2}$/.exec(municipio)?.[1];
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Data local como `dd/mm/aaaa`. */
export function hojeBR(agora: Date = new Date()): string {
  return `${doisDigitos(agora.getDate())}/${doisDigitos(agora.getMonth() + 1)}/${agora.getFullYear()}`;
}

/** Data local como `aaaa-mm-dd`. */
export function dataISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}
