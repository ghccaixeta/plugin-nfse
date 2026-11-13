import { describe, expect, it } from 'vitest';
import type { Modelo, Padroes } from '../../src/dominio/tipos';
import {
  aplicarModelo,
  campoDoFormulario,
  formularioDePadroes,
  lerNota,
  modeloDoFormulario,
  padroesDoFormulario,
  type Formulario,
} from '../../src/popup/formulario';

const HOJE = new Date(2026, 10, 9);
const PADROES: Padroes = { codigoTributacao: '010101', nbs: '115029000', regime: 1, aliquotaCentesimos: 201 };

const preenchido = (extra: Partial<Formulario> = {}): Formulario => ({
  ...formularioDePadroes(PADROES, HOJE),
  cnpjTomador: '11.222.333/0001-81',
  valor: '1.500,00',
  descricao: 'Desenvolvimento',
  ...extra,
});

const MODELO: Modelo = {
  apelido: 'Cliente A',
  cnpjTomador: '11444777000161',
  emailTomador: 'a@b.com',
  valorCentavos: 250000,
  descricao: 'Mensalidade',
  municipio: 'Goiânia/GO',
  codigoTributacao: '010701',
  nbs: '115013000',
};

describe('formularioDePadroes (NFSE-01, NFSE-15)', () => {
  it('NFSE-01 pré-preenche com os padrões, data de hoje e valor/descrição/tomador vazios', () => {
    expect(formularioDePadroes(PADROES, HOJE)).toEqual({
      cnpjTomador: '',
      emailTomador: '',
      telefoneTomador: '',
      valor: '',
      descricao: '',
      dataCompetencia: '09/11/2026',
      municipio: '',
      codigoTributacao: '010101',
      nbs: '115029000',
      regime: '1',
      aliquota: '2,01',
      enquadramento: 'meepp',
    });
  });

  it('NFSE-16 usa descrição e município dos padrões quando existem', () => {
    const f = formularioDePadroes({ ...PADROES, descricao: 'Suporte', municipio: 'Goiânia/GO' }, HOJE);
    expect(f.descricao).toBe('Suporte');
    expect(f.municipio).toBe('Goiânia/GO');
  });
});

describe('aplicarModelo (NFSE-11)', () => {
  it('NFSE-11 troca os campos do modelo e mantém data, regime e alíquota atuais', () => {
    const atual = preenchido({ dataCompetencia: '01/11/2026', regime: '2', aliquota: '3,50' });
    expect(aplicarModelo(atual, MODELO)).toEqual({
      cnpjTomador: '11444777000161',
      emailTomador: 'a@b.com',
      telefoneTomador: '',
      valor: '2.500,00',
      descricao: 'Mensalidade',
      dataCompetencia: '01/11/2026',
      municipio: 'Goiânia/GO',
      codigoTributacao: '010701',
      nbs: '115013000',
      enquadramento: 'meepp',
      regime: '2',
      aliquota: '3,50',
    });
  });

  it('NFSE-11 campos opcionais ausentes no modelo ficam vazios', () => {
    const minimo: Modelo = { apelido: 'B', cnpjTomador: '11444777000161', codigoTributacao: '010101', nbs: '115029000' };
    const f = aplicarModelo(preenchido(), minimo);
    expect([f.valor, f.descricao, f.municipio, f.emailTomador]).toEqual(['', '', '', '']);
  });
});

describe('lerNota (NFSE-02, NFSE-03, NFSE-12)', () => {
  it('NFSE-02/03 converte valor e alíquota BR, CNPJ e telefone só dígitos', () => {
    const r = lerNota(preenchido({ telefoneTomador: '(62) 99999-0000', emailTomador: ' a@b.com ' }));
    expect(r).toEqual({
      ok: true,
      nota: {
        cnpjTomador: '11222333000181',
        emailTomador: 'a@b.com',
        telefoneTomador: '62999990000',
        valorCentavos: 150000,
        descricao: 'Desenvolvimento',
        dataCompetencia: '09/11/2026',
        municipio: undefined,
        codigoTributacao: '010101',
        nbs: '115029000',
        enquadramento: 'meepp',
        regime: 1,
        aliquotaCentesimos: 201,
      },
    });
  });

  it('NFSE-03 marca valor e alíquota ilegíveis no próprio campo do formulário', () => {
    const r = lerNota(preenchido({ valor: 'dez reais', aliquota: '2.01' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.map((e) => e.campo)).toEqual(['valor', 'aliquota']);
  });

  it('NFSE-03 erros da validação apontam para os campos do formulário', () => {
    const r = lerNota(preenchido({ cnpjTomador: '11.222.333/0001-80', dataCompetencia: '31/02/2026', regime: '9' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.map((e) => e.campo)).toEqual(['cnpjTomador', 'dataCompetencia', 'regime']);
  });

  it('NFSE-12 não altera o formulário recebido', () => {
    const f = preenchido();
    const copia = { ...f };
    lerNota(f);
    expect(f).toEqual(copia);
  });
});

describe('modeloDoFormulario (NFSE-10)', () => {
  it('NFSE-10 guarda os valores atuais exceto data, regime e alíquota', () => {
    const m = modeloDoFormulario(preenchido({ municipio: 'Goiânia/GO', emailTomador: 'a@b.com' }), ' Cliente A ');
    expect(m).toEqual({
      apelido: 'Cliente A',
      cnpjTomador: '11222333000181',
      emailTomador: 'a@b.com',
      telefoneTomador: undefined,
      valorCentavos: 150000,
      descricao: 'Desenvolvimento',
      municipio: 'Goiânia/GO',
      codigoTributacao: '010101',
      nbs: '115029000',
    });
    expect(m).not.toHaveProperty('dataCompetencia');
    expect(m).not.toHaveProperty('regime');
  });

  it('NFSE-10 valor vazio fica fora do modelo; valor ilegível vira inválido (NaN)', () => {
    expect(modeloDoFormulario(preenchido({ valor: '' }), 'A').valorCentavos).toBeUndefined();
    expect(modeloDoFormulario(preenchido({ valor: 'x' }), 'A').valorCentavos).toBeNaN();
  });
});

describe('padroesDoFormulario (NFSE-16)', () => {
  it('NFSE-16 código, NBS, regime, alíquota, descrição e município atuais', () => {
    expect(padroesDoFormulario(preenchido({ municipio: 'Goiânia/GO', regime: '3', aliquota: '4,5' }))).toEqual({
      codigoTributacao: '010101',
      nbs: '115029000',
      regime: 3,
      aliquotaCentesimos: 450,
      descricao: 'Desenvolvimento',
      municipio: 'Goiânia/GO',
      enquadramento: 'meepp',
    });
  });

  it('MEI-04 salva o enquadramento MEI', () => {
    expect(padroesDoFormulario(preenchido({ enquadramento: 'mei' })).enquadramento).toBe('mei');
  });
});

describe('campoDoFormulario', () => {
  it('mapeia campos da validação para os ids do popup', () => {
    expect(campoDoFormulario('valorCentavos')).toBe('valor');
    expect(campoDoFormulario('aliquotaCentesimos')).toBe('aliquota');
    expect(campoDoFormulario('cnpjTomador')).toBe('cnpjTomador');
    expect(campoDoFormulario('apelido')).toBeNull();
    expect(campoDoFormulario('constructor')).toBeNull();
    expect(campoDoFormulario('toString')).toBeNull();
    expect(campoDoFormulario('hasOwnProperty')).toBeNull();
  });
});

describe('Enquadramento MEI (MEI-01..04)', () => {
  it('MEI-01 vem dos padrões; padrões antigos sem o campo viram ME/EPP', () => {
    expect(formularioDePadroes({ ...PADROES, enquadramento: 'mei' }, HOJE).enquadramento).toBe('mei');
    expect(formularioDePadroes(PADROES, HOJE).enquadramento).toBe('meepp');
  });

  it('MEI-02 com MEI, regime e alíquota não são exigidos (nem se ilegíveis)', () => {
    const r = lerNota(preenchido({ enquadramento: 'mei', regime: '', aliquota: 'abc' }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.nota.enquadramento).toBe('mei');
  });

  it('MEI-03 com ME/EPP, alíquota vazia continua bloqueando', () => {
    const r = lerNota(preenchido({ enquadramento: 'meepp', aliquota: '' }));
    expect(r.ok ? [] : r.erros.map((e) => e.campo)).toEqual(['aliquota']);
  });

  it('MEI-01 trocar de modelo mantém o enquadramento atual', () => {
    expect(aplicarModelo(preenchido({ enquadramento: 'mei' }), MODELO).enquadramento).toBe('mei');
  });
});
