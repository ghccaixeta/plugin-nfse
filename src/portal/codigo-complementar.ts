/**
 * NFSE-09: valor da flag `CodigoComplementarMunicipalObrigatorio`. O portal
 * usa `False` no carregamento e `false` depois de escolher o código.
 */
export function codigoComplementarObrigatorio(valorFlag: string): boolean {
  return valorFlag.trim().toLowerCase() === 'true';
}
