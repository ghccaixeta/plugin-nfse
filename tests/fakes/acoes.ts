import { FalhaCampo, type Acoes } from '../../src/portal/acoes';
import type { Campo } from '../../src/portal/seletores';

export type Chamada = [metodo: string, campo?: string, ...args: unknown[]];

/**
 * Ações falsas: registram cada chamada (método, nome do campo, argumentos).
 * `valores` alimenta `lerValor`; `falharEm` faz a ação daquele campo lançar FalhaCampo.
 */
export function criarAcoesFalsas(opcoes: { valores?: Record<string, string>; falharEm?: string } = {}) {
  const chamadas: Chamada[] = [];
  const registrar = async (metodo: string, campo: Campo, ...args: unknown[]) => {
    chamadas.push([metodo, campo.nome, ...args]);
    if (opcoes.falharEm === campo.nome) throw new FalhaCampo(campo.nome);
  };
  const acoes: Acoes = {
    esperar: async (campo, condicao) => {
      await registrar('esperar', campo, condicao);
      return {} as HTMLElement;
    },
    marcarRadio: (campo) => registrar('marcarRadio', campo),
    selecionarChosen: (campo, valor) => registrar('selecionarChosen', campo, valor),
    selecionarSelect2Ajax: (campo, termo, criterio) => registrar('selecionarSelect2Ajax', campo, termo, criterio),
    digitarMascarado: (campo, texto) => registrar('digitarMascarado', campo, texto),
    preencherTexto: (campo, texto) => registrar('preencherTexto', campo, texto),
    clicar: (campo) => registrar('clicar', campo),
    clicarAvancar: async () => {
      chamadas.push(['clicarAvancar']);
    },
    lerValor: (campo) => {
      chamadas.push(['lerValor', campo.nome]);
      return opcoes.valores?.[campo.nome] ?? '';
    },
  };
  return { acoes, chamadas };
}
