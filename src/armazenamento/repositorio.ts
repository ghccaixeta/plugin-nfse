import type { Modelo, Padroes } from '../dominio/tipos';
import { resumirErros, validarModelo, validarPadroes, type ErroCampo } from '../dominio/validacao';

/** Subconjunto de `chrome.storage.StorageArea` usado aqui (permite fake em teste). */
export interface AreaArmazenamento {
  get(chaves: string | string[]): Promise<Record<string, unknown>>;
  set(itens: Record<string, unknown>): Promise<void>;
}

/** NFSE-15: descrição, valor e município começam vazios. */
export const PADROES_INICIAIS: Readonly<Padroes> = Object.freeze({
  codigoTributacao: '010101',
  nbs: '115029000',
  regime: 1,
  aliquotaCentesimos: 201,
});

export class ErroValidacao extends Error {
  constructor(readonly erros: ErroCampo[]) {
    super(resumirErros(erros));
    this.name = 'ErroValidacao';
  }
}

export class ApelidoExistente extends Error {
  constructor(readonly apelido: string) {
    super(`Já existe um modelo com o apelido "${apelido}"`);
    this.name = 'ApelidoExistente';
  }
}

const CHAVE_PADROES = 'padroes';
const CHAVE_MODELOS = 'modelos';

const porApelido = (a: Modelo, b: Modelo) =>
  a.apelido.localeCompare(b.apelido, 'pt-BR', { sensitivity: 'base' });

export function criarRepositorio(area: AreaArmazenamento) {
  async function lerModelos(): Promise<Modelo[]> {
    const { [CHAVE_MODELOS]: modelos } = await area.get(CHAVE_MODELOS);
    return Array.isArray(modelos) ? (modelos as Modelo[]) : [];
  }

  return {
    async lerPadroes(): Promise<Padroes> {
      const { [CHAVE_PADROES]: padroes } = await area.get(CHAVE_PADROES);
      return (padroes as Padroes | undefined) ?? { ...PADROES_INICIAIS };
    },

    async salvarPadroes(padroes: Padroes): Promise<void> {
      const erros = validarPadroes(padroes);
      if (erros.length) throw new ErroValidacao(erros);
      await area.set({ [CHAVE_PADROES]: padroes });
    },

    async listarModelos(): Promise<Modelo[]> {
      return (await lerModelos()).sort(porApelido);
    },

    /** NFSE-10/12/14: `substituir: false` recusa apelido já existente. */
    async salvarModelo(modelo: Modelo, { substituir }: { substituir: boolean }): Promise<void> {
      const erros = validarModelo(modelo);
      if (erros.length) throw new ErroValidacao(erros);
      const modelos = await lerModelos();
      const i = modelos.findIndex((m) => m.apelido === modelo.apelido);
      if (i >= 0 && !substituir) throw new ApelidoExistente(modelo.apelido);
      if (i >= 0) modelos[i] = modelo;
      else modelos.push(modelo);
      await area.set({ [CHAVE_MODELOS]: modelos });
    },

    async excluirModelo(apelido: string): Promise<void> {
      const modelos = await lerModelos();
      await area.set({ [CHAVE_MODELOS]: modelos.filter((m) => m.apelido !== apelido) });
    },

    /** Importação (NFSE-18): grava a lista já mesclada; padrões só se informados. Valida tudo antes. */
    async substituirTudo(padroes: Padroes | undefined, modelos: Modelo[]): Promise<void> {
      const erros = [...(padroes ? validarPadroes(padroes) : []), ...modelos.flatMap(validarModelo)];
      if (erros.length) throw new ErroValidacao(erros);
      await area.set(padroes ? { [CHAVE_PADROES]: padroes, [CHAVE_MODELOS]: modelos } : { [CHAVE_MODELOS]: modelos });
    },
  };
}

export type Repositorio = ReturnType<typeof criarRepositorio>;

/** Repositório real, sobre `chrome.storage.local`. */
export const repositorioLocal = (): Repositorio => criarRepositorio(chrome.storage.local);
