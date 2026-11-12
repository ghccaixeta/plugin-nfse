import { describe, expect, it } from 'vitest';
import type { DadosNota, Modelo, Padroes } from '../../src/dominio/tipos';
import { cpfValido } from '../../src/dominio/documentos';
import { cnpjValido, validarModelo, validarNota, validarPadroes } from '../../src/dominio/validacao';

// CNPJ fictício com DV válido (exemplo clássico); nunca usar CNPJ real em teste.
const CNPJ = '11222333000181';

const notaValida = (): DadosNota => ({
  cnpjTomador: CNPJ,
  emailTomador: 'financeiro@exemplo.com.br',
  telefoneTomador: '62999990000',
  valorCentavos: 150000,
  descricao: 'Serviços de desenvolvimento de software',
  dataCompetencia: '09/11/2026',
  municipio: 'Goiânia/GO',
  codigoTributacao: '010101',
  nbs: '115029000',
  regime: 1,
  aliquotaCentesimos: 201,
});

const modeloValido = (): Modelo => ({
  apelido: 'Cliente A',
  cnpjTomador: CNPJ,
  codigoTributacao: '010101',
  nbs: '115029000',
});

const padroesValidos = (): Padroes => ({
  codigoTributacao: '010101',
  nbs: '115029000',
  regime: 1,
  aliquotaCentesimos: 201,
});

const campos = (erros: { campo: string }[]) => erros.map((e) => e.campo);

describe('cnpjValido (NFSE-03)', () => {
  it('NFSE-03 aceita CNPJ com DV correto', () => {
    expect(cnpjValido(CNPJ)).toBe(true);
  });

  it.each([
    ['DV errado', '11222333000180'],
    ['todos iguais', '11111111111111'],
    ['zeros', '00000000000000'],
    ['13 dígitos', '1122233300018'],
    ['15 dígitos', '112223330001811'],
    ['com máscara', '11.222.333/0001-81'],
    ['vazio', ''],
  ])('NFSE-03 rejeita %s', (_, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});

describe('validarNota (NFSE-03)', () => {
  it('NFSE-03 nota válida não tem erros', () => {
    expect(validarNota(notaValida())).toEqual([]);
  });

  it('NFSE-03 telefone com DDD (10 ou 11 dígitos) é aceito', () => {
    expect(validarNota({ ...notaValida(), telefoneTomador: '6233334444' })).toEqual([]);
    expect(validarNota({ ...notaValida(), telefoneTomador: '62999990000' })).toEqual([]);
  });

  it('NFSE-03 e-mail, telefone e município são opcionais', () => {
    const { emailTomador, telefoneTomador, municipio, ...nota } = notaValida();
    expect(validarNota(nota)).toEqual([]);
    expect(validarNota({ ...nota, emailTomador: '', municipio: '' })).toEqual([]);
  });

  it.each<[string, Partial<DadosNota>, keyof DadosNota]>([
    ['CNPJ inválido', { cnpjTomador: '11222333000180' }, 'cnpjTomador'],
    ['valor zero', { valorCentavos: 0 }, 'valorCentavos'],
    ['valor negativo', { valorCentavos: -1 }, 'valorCentavos'],
    ['valor fracionado', { valorCentavos: 10.5 }, 'valorCentavos'],
    ['descrição vazia', { descricao: '' }, 'descricao'],
    ['descrição só com espaços', { descricao: '   ' }, 'descricao'],
    ['descrição > 2000', { descricao: 'a'.repeat(2001) }, 'descricao'],
    ['data inexistente', { dataCompetencia: '31/02/2026' }, 'dataCompetencia'],
    ['data fora do formato', { dataCompetencia: '2026-11-09' }, 'dataCompetencia'],
    ['data com mês 13', { dataCompetencia: '01/13/2026' }, 'dataCompetencia'],
    ['código com 5 dígitos', { codigoTributacao: '01010' }, 'codigoTributacao'],
    ['código com pontos', { codigoTributacao: '01.01.01' }, 'codigoTributacao'],
    ['NBS com 8 dígitos', { nbs: '11502900' }, 'nbs'],
    ['regime 4', { regime: 4 as never }, 'regime'],
    ['alíquota zero', { aliquotaCentesimos: 0 }, 'aliquotaCentesimos'],
    ['alíquota 100,00', { aliquotaCentesimos: 10000 }, 'aliquotaCentesimos'],
    ['município sem UF', { municipio: 'Goiânia' }, 'municipio'],
    ['município com UF minúscula', { municipio: 'Goiânia/go' }, 'municipio'],
    ['e-mail sem @', { emailTomador: 'financeiro.exemplo.com' }, 'emailTomador'],
    ['telefone curto', { telefoneTomador: '6299999' }, 'telefoneTomador'],
    ['telefone com máscara', { telefoneTomador: '(62) 99999-0000' }, 'telefoneTomador'],
  ])('NFSE-03 marca %s', (_, alteracao, campo) => {
    expect(campos(validarNota({ ...notaValida(), ...alteracao }))).toEqual([campo]);
  });

  it('NFSE-03 aceita limites: descrição de 2000, alíquota 0,01 e 99,99, 29/02 em ano bissexto', () => {
    expect(validarNota({ ...notaValida(), descricao: 'a'.repeat(2000) })).toEqual([]);
    expect(validarNota({ ...notaValida(), aliquotaCentesimos: 1 })).toEqual([]);
    expect(validarNota({ ...notaValida(), aliquotaCentesimos: 9999 })).toEqual([]);
    expect(validarNota({ ...notaValida(), dataCompetencia: '29/02/2028' })).toEqual([]);
    expect(campos(validarNota({ ...notaValida(), dataCompetencia: '29/02/2026' }))).toEqual([
      'dataCompetencia',
    ]);
  });

  it('NFSE-03 reporta todos os campos inválidos de uma vez, com mensagem', () => {
    const erros = validarNota({ ...notaValida(), cnpjTomador: '', nbs: '' });
    expect(campos(erros)).toEqual(['cnpjTomador', 'nbs']);
    for (const e of erros) expect(e.mensagem).not.toBe('');
  });
});

describe('validarModelo (NFSE-10, NFSE-19)', () => {
  it('NFSE-10 modelo mínimo é válido (valor, descrição, e-mail, telefone e município opcionais)', () => {
    expect(validarModelo(modeloValido())).toEqual([]);
  });

  it('NFSE-10 modelo completo é válido', () => {
    expect(
      validarModelo({
        ...modeloValido(),
        emailTomador: 'a@b.com',
        telefoneTomador: '62999990000',
        valorCentavos: 1000,
        descricao: 'Mensalidade',
        municipio: 'Goiânia/GO',
      }),
    ).toEqual([]);
  });

  it.each<[string, Partial<Modelo>, string]>([
    ['apelido vazio', { apelido: '  ' }, 'apelido'],
    ['CNPJ inválido', { cnpjTomador: '123' }, 'cnpjTomador'],
    ['código inválido', { codigoTributacao: 'abc' }, 'codigoTributacao'],
    ['NBS inválido', { nbs: '1' }, 'nbs'],
    ['município fora do formato', { municipio: 'Goiânia' }, 'municipio'],
    ['valor informado zero', { valorCentavos: 0 }, 'valorCentavos'],
    ['descrição > 2000', { descricao: 'a'.repeat(2001) }, 'descricao'],
    ['e-mail sem @', { emailTomador: 'x' }, 'emailTomador'],
    ['apelido com mais de 60 caracteres', { apelido: 'a'.repeat(61) }, 'apelido'],
    ['telefone que não é texto', { telefoneTomador: { x: 1 } as never }, 'telefoneTomador'],
  ])('NFSE-19 marca %s', (_, alteracao, campo) => {
    expect(campos(validarModelo({ ...modeloValido(), ...alteracao }))).toEqual([campo]);
  });

  it('NFSE-19 rejeita campos com tipo errado (vindos de JSON importado)', () => {
    const lixo = { apelido: 1, cnpjTomador: null, codigoTributacao: 10101, nbs: [] } as unknown as Modelo;
    expect(campos(validarModelo(lixo))).toEqual(['apelido', 'cnpjTomador', 'codigoTributacao', 'nbs']);
  });
});

describe('validarPadroes (NFSE-16, NFSE-19)', () => {
  it('NFSE-16 padrões mínimos são válidos (descrição e município opcionais)', () => {
    expect(validarPadroes(padroesValidos())).toEqual([]);
    expect(validarPadroes({ ...padroesValidos(), descricao: '', municipio: '' })).toEqual([]);
  });

  it.each<[string, Partial<Padroes>, string]>([
    ['código inválido', { codigoTributacao: '' }, 'codigoTributacao'],
    ['NBS inválido', { nbs: '' }, 'nbs'],
    ['regime 0', { regime: 0 as never }, 'regime'],
    ['regime como texto', { regime: '1' as never }, 'regime'],
    ['alíquota zero', { aliquotaCentesimos: 0 }, 'aliquotaCentesimos'],
    ['município fora do formato', { municipio: 'GO' }, 'municipio'],
    ['descrição > 2000', { descricao: 'a'.repeat(2001) }, 'descricao'],
  ])('NFSE-16 marca %s', (_, alteracao, campo) => {
    expect(campos(validarPadroes({ ...padroesValidos(), ...alteracao }))).toEqual([campo]);
  });
});

describe('cpfValido', () => {
  it('aceita CPF com DV correto (só dígitos) e rejeita o resto', () => {
    expect(cpfValido('52998224725')).toBe(true); // CPF fictício clássico de exemplo
    expect(cpfValido('52998224724')).toBe(false);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('529.982.247-25')).toBe(false);
  });
});
