import { describe, expect, it } from 'vitest';
import {
  analisarImportacao,
  exportar,
  mesclarModelos,
  nomeArquivoExportacao,
} from '../../src/dominio/importacao';
import type { Modelo, Padroes } from '../../src/dominio/tipos';

const CNPJ = '11222333000181'; // fictício com DV válido

const padroes: Padroes = { codigoTributacao: '010101', nbs: '115029000', regime: 1, aliquotaCentesimos: 201 };
const modelo = (apelido: string, extra: Partial<Modelo> = {}): Modelo => ({
  apelido,
  cnpjTomador: CNPJ,
  codigoTributacao: '010101',
  nbs: '115029000',
  ...extra,
});

const arquivo = (conteudo: unknown) => JSON.stringify(conteudo);

describe('exportar (NFSE-17)', () => {
  it('NFSE-17 gera { versao: 1, padroes, modelos }', () => {
    const modelos = [modelo('A')];
    expect(exportar(padroes, modelos)).toEqual({ versao: 1, padroes, modelos });
  });

  it('NFSE-17 nome do arquivo usa a data local AAAA-MM-DD', () => {
    expect(nomeArquivoExportacao(new Date(2026, 10, 9))).toBe('nfse-modelos-2026-11-09.json');
    expect(nomeArquivoExportacao(new Date(2027, 0, 1))).toBe('nfse-modelos-2027-01-01.json');
  });

  it('NFSE-17/18 exportação reimportada não gera erro e só traz conflitos', () => {
    const modelos = [modelo('A'), modelo('B')];
    const r = analisarImportacao(JSON.stringify(exportar(padroes, modelos)), modelos);
    expect(r).toEqual({ ok: true, padroes, novos: [], conflitos: modelos });
  });
});

describe('analisarImportacao (NFSE-18)', () => {
  it('NFSE-18 separa modelos novos dos que conflitam com apelidos existentes', () => {
    const r = analisarImportacao(
      arquivo({ versao: 1, padroes, modelos: [modelo('Novo'), modelo('Existente', { valorCentavos: 10 })] }),
      [modelo('Existente'), modelo('Outro')],
    );
    expect(r).toEqual({
      ok: true,
      padroes,
      novos: [modelo('Novo')],
      conflitos: [modelo('Existente', { valorCentavos: 10 })],
    });
  });

  it('NFSE-18 padrões são opcionais no arquivo', () => {
    const r = analisarImportacao(arquivo({ versao: 1, modelos: [modelo('A')] }), []);
    expect(r).toEqual({ ok: true, padroes: undefined, novos: [modelo('A')], conflitos: [] });
  });

  it('NFSE-18 campo null conta como ausente (não vira 0,00 ao aplicar o modelo)', () => {
    const r = analisarImportacao(arquivo({ versao: 1, modelos: [{ ...modelo('A'), valorCentavos: null, descricao: null }] }), []);
    expect(r).toEqual({ ok: true, padroes: undefined, novos: [modelo('A')], conflitos: [] });
    if (r.ok) expect(r.novos[0]).not.toHaveProperty('valorCentavos');
  });

  it('NFSE-18 descarta chaves desconhecidas dos modelos e padrões', () => {
    const r = analisarImportacao(
      arquivo({ versao: 1, padroes: { ...padroes, lixo: 1 }, modelos: [{ ...modelo('A'), lixo: 'x' }] }),
      [],
    );
    expect(r).toEqual({ ok: true, padroes, novos: [modelo('A')], conflitos: [] });
  });
});

describe('analisarImportacao — rejeições (NFSE-19)', () => {
  const erroDe = (texto: string) => {
    const r = analisarImportacao(texto, []);
    if (r.ok) throw new Error('esperava rejeição');
    return r.erro;
  };

  it('NFSE-19 texto que não é JSON', () => {
    expect(erroDe('{ não é json')).toBe('Arquivo não é JSON');
  });

  it.each([
    ['versao 2', { versao: 2, modelos: [] }],
    ['sem versao', { modelos: [] }],
    ['versao como texto', { versao: '1', modelos: [] }],
    ['array no topo', [1]],
    ['null', null],
  ])('NFSE-19 %s → versão não suportada', (_, conteudo) => {
    expect(erroDe(arquivo(conteudo))).toMatch(/versão/i);
  });

  it('NFSE-19 sem lista de modelos', () => {
    expect(erroDe(arquivo({ versao: 1, padroes }))).toMatch(/modelos/i);
  });

  it('NFSE-19 modelo inválido identifica apelido e posição', () => {
    const erro = erroDe(arquivo({ versao: 1, modelos: [modelo('A'), modelo('Ruim', { nbs: '1' })] }));
    expect(erro).toContain('Ruim');
    expect(erro).toContain('2');
    expect(erro).toContain('NBS');
  });

  it('NFSE-19 modelo que não é objeto identifica a posição', () => {
    expect(erroDe(arquivo({ versao: 1, modelos: ['x'] }))).toContain('1');
  });

  it('NFSE-19 apelido repetido dentro do arquivo', () => {
    expect(erroDe(arquivo({ versao: 1, modelos: [modelo('A'), modelo('A')] }))).toContain('A');
  });

  it('NFSE-19 padrões presentes e inválidos', () => {
    expect(erroDe(arquivo({ versao: 1, padroes: { ...padroes, regime: 9 }, modelos: [] }))).toMatch(
      /padrões/i,
    );
  });
});

describe('mesclarModelos (NFSE-18)', () => {
  const atuais = [modelo('A', { valorCentavos: 1 }), modelo('B', { valorCentavos: 1 })];
  const novos = [modelo('C')];
  const conflitoB = modelo('B', { valorCentavos: 2 });

  it('NFSE-18 soma os novos e substitui só os apelidos confirmados', () => {
    expect(mesclarModelos(atuais, novos, [conflitoB])).toEqual([
      modelo('A', { valorCentavos: 1 }),
      modelo('B', { valorCentavos: 2 }),
      modelo('C'),
    ]);
  });

  it('NFSE-18 mantém o atual quando o conflito não é confirmado', () => {
    expect(mesclarModelos(atuais, novos, [])).toEqual([...atuais, modelo('C')]);
  });

  it('não altera os arrays recebidos', () => {
    const copia = structuredClone(atuais);
    mesclarModelos(atuais, novos, [conflitoB]);
    expect(atuais).toEqual(copia);
  });
});
