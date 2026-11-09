import type { AreaArmazenamento } from '../../src/armazenamento/repositorio';

/** Storage local/sessão em memória (com `remove`, usado pelo SW). */
export type AreaFalsa = AreaArmazenamento & { remove(chaves: string | string[]): Promise<void> };

/**
 * `chrome.storage` em memória. Clona na entrada e na saída, como o storage real
 * (que serializa), para que mutações do chamador não vazem para o "disco".
 */
export function criarStorageFalso(inicial: Record<string, unknown> = {}) {
  const dados = new Map(Object.entries(structuredClone(inicial)));
  const area: AreaFalsa = {
    async get(chaves) {
      const lista = typeof chaves === 'string' ? [chaves] : chaves;
      return Object.fromEntries(
        lista.filter((c) => dados.has(c)).map((c) => [c, structuredClone(dados.get(c))]),
      );
    },
    async set(itens) {
      for (const [c, v] of Object.entries(structuredClone(itens))) dados.set(c, v);
    },
    async remove(chaves) {
      for (const c of typeof chaves === 'string' ? [chaves] : chaves) dados.delete(c);
    },
  };
  return { area, dados };
}
