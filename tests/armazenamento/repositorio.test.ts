import { beforeEach, describe, expect, it } from 'vitest';
import {
  ApelidoExistente,
  ErroValidacao,
  PADROES_INICIAIS,
  criarRepositorio,
} from '../../src/armazenamento/repositorio';
import type { Modelo, Padroes } from '../../src/dominio/tipos';
import { criarStorageFalso } from '../fakes/chrome-storage';

const CNPJ = '11222333000181'; // fictício com DV válido

const modelo = (apelido: string, extra: Partial<Modelo> = {}): Modelo => ({
  apelido,
  cnpjTomador: CNPJ,
  codigoTributacao: '010101',
  nbs: '115029000',
  ...extra,
});

let storage: ReturnType<typeof criarStorageFalso>;
let repo: ReturnType<typeof criarRepositorio>;

beforeEach(() => {
  storage = criarStorageFalso();
  repo = criarRepositorio(storage.area);
});

describe('padrões (NFSE-15, NFSE-16)', () => {
  it('NFSE-15 sem nada salvo usa 010101, 115029000, regime 1, alíquota 2,01, descrição e município vazios', async () => {
    expect(await repo.lerPadroes()).toEqual({
      codigoTributacao: '010101',
      nbs: '115029000',
      regime: 1,
      aliquotaCentesimos: 201,
    });
    expect(PADROES_INICIAIS.descricao).toBeUndefined();
    expect(PADROES_INICIAIS.municipio).toBeUndefined();
  });

  it('NFSE-16 salvarPadroes persiste e lerPadroes devolve', async () => {
    const novos: Padroes = {
      codigoTributacao: '010701',
      nbs: '115013000',
      regime: 2,
      aliquotaCentesimos: 350,
      descricao: 'Suporte',
      municipio: 'Goiânia/GO',
    };
    await repo.salvarPadroes(novos);
    expect(await criarRepositorio(storage.area).lerPadroes()).toEqual(novos);
  });

  it('NFSE-16 salvarPadroes rejeita inválido sem gravar', async () => {
    const promessa = repo.salvarPadroes({ ...PADROES_INICIAIS, nbs: '1' });
    await expect(promessa).rejects.toBeInstanceOf(ErroValidacao);
    await expect(promessa).rejects.toMatchObject({ erros: [{ campo: 'nbs' }] });
    expect(storage.dados.has('padroes')).toBe(false);
  });

  it('NFSE-15 devolver os defaults não permite mutar a constante', async () => {
    const p = await repo.lerPadroes();
    p.nbs = 'x';
    expect((await repo.lerPadroes()).nbs).toBe('115029000');
  });
});

describe('modelos (NFSE-10, NFSE-12, NFSE-13, NFSE-14)', () => {
  it('lista vazia sem nada salvo', async () => {
    expect(await repo.listarModelos()).toEqual([]);
  });

  it('NFSE-10 salvarModelo persiste e listarModelos ordena por apelido (pt-BR, sem diferenciar maiúsculas)', async () => {
    await repo.salvarModelo(modelo('beta'), { substituir: false });
    await repo.salvarModelo(modelo('Álvaro'), { substituir: false });
    await repo.salvarModelo(modelo('Gama'), { substituir: false });
    expect((await repo.listarModelos()).map((m) => m.apelido)).toEqual(['Álvaro', 'beta', 'Gama']);
  });

  it('NFSE-10 salvarModelo rejeita modelo inválido sem gravar', async () => {
    await expect(repo.salvarModelo(modelo('A', { cnpjTomador: '1' }), { substituir: false })).rejects.toBeInstanceOf(
      ErroValidacao,
    );
    expect(await repo.listarModelos()).toEqual([]);
  });

  it('NFSE-14 apelido existente sem substituir lança ApelidoExistente e não altera', async () => {
    await repo.salvarModelo(modelo('A', { valorCentavos: 1 }), { substituir: false });
    await expect(repo.salvarModelo(modelo('A', { valorCentavos: 2 }), { substituir: false })).rejects.toBeInstanceOf(
      ApelidoExistente,
    );
    expect(await repo.listarModelos()).toEqual([modelo('A', { valorCentavos: 1 })]);
  });

  it('NFSE-12/14 com substituir sobrescreve o modelo do mesmo apelido', async () => {
    await repo.salvarModelo(modelo('A', { valorCentavos: 1 }), { substituir: false });
    await repo.salvarModelo(modelo('B'), { substituir: false });
    await repo.salvarModelo(modelo('A', { valorCentavos: 2 }), { substituir: true });
    expect(await repo.listarModelos()).toEqual([modelo('A', { valorCentavos: 2 }), modelo('B')]);
  });

  it('NFSE-13 excluirModelo remove só o apelido indicado', async () => {
    await repo.salvarModelo(modelo('A'), { substituir: false });
    await repo.salvarModelo(modelo('B'), { substituir: false });
    await repo.excluirModelo('A');
    expect(await repo.listarModelos()).toEqual([modelo('B')]);
  });

  it('excluirModelo de apelido inexistente não faz nada', async () => {
    await repo.salvarModelo(modelo('A'), { substituir: false });
    await repo.excluirModelo('Z');
    expect(await repo.listarModelos()).toEqual([modelo('A')]);
  });
});

describe('substituirTudo (NFSE-18)', () => {
  it('NFSE-18 grava modelos e padrões quando informados', async () => {
    const padroes: Padroes = { ...PADROES_INICIAIS, regime: 3 };
    await repo.substituirTudo(padroes, [modelo('X')]);
    expect(await repo.lerPadroes()).toEqual(padroes);
    expect(await repo.listarModelos()).toEqual([modelo('X')]);
  });

  it('NFSE-19 substituirTudo recusa modelo ou padrões inválidos sem gravar nada', async () => {
    await expect(repo.substituirTudo(undefined, [modelo('X', { nbs: '1' })])).rejects.toBeInstanceOf(ErroValidacao);
    await expect(repo.substituirTudo({ ...PADROES_INICIAIS, regime: 9 as never }, [])).rejects.toBeInstanceOf(ErroValidacao);
    expect(storage.dados.size).toBe(0);
  });

  it('NFSE-18 sem padrões mantém os padrões atuais', async () => {
    const padroes: Padroes = { ...PADROES_INICIAIS, regime: 2 };
    await repo.salvarPadroes(padroes);
    await repo.substituirTudo(undefined, [modelo('X')]);
    expect(await repo.lerPadroes()).toEqual(padroes);
  });
});
