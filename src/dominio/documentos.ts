// Dígitos verificadores de CNPJ e CPF. Módulo sem imports: também é usado pelos
// scripts em Node (scripts/dados-sensiveis.mjs), que rodam o .ts direto.

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, ...PESOS_DV1];

function digitoVerificador(digitos: number[], pesos: number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + peso * digitos[i]!, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** CNPJ só com dígitos (14), com DV correto e não composto de um único dígito repetido. */
export function cnpjValido(cnpj: unknown): boolean {
  if (typeof cnpj !== 'string' || !/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const d = [...cnpj].map(Number);
  return d[12] === digitoVerificador(d, PESOS_DV1) && d[13] === digitoVerificador(d, PESOS_DV2);
}

/** CPF só com dígitos (11), com DV correto e não composto de um único dígito repetido. */
export function cpfValido(cpf: unknown): boolean {
  if (typeof cpf !== 'string' || !/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = [...cpf].map(Number);
  const dv = (n: number) => {
    const resto = (d.slice(0, n).reduce((soma, x, i) => soma + x * (n + 1 - i), 0) * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === d[9] && dv(10) === d[10];
}
